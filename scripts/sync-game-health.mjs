#!/usr/bin/env node

/**
 * sync-game-health.mjs
 *
 * Bi-weekly sync for Attrition's Game Health telemetry.
 *
 * Every run queries the GA4 Data API for the *non-overlapping* period since the
 * last stored snapshot and persists it as an immutable, dated file:
 *
 *   assets/data/game-health/snapshots/<period_end>.json   one file per period
 *   assets/data/game-health/index.json                    manifest + commander catalog
 *   assets/data/game-health/history.csv                   one KPI row per period
 *   assets/data/game-health/war-ledger.csv                aggregated completed-War rows
 *   assets/data/game-health.json                          copy of the latest snapshot (legacy URL)
 *
 * Because periods never overlap, counts can be summed across snapshots for an
 * all-time view without double counting. Sections that GA4 cannot supply are
 * written as null with a provenance note rather than copied from older data.
 *
 * Usage:
 *   node scripts/sync-game-health.mjs                  sync the next period (needs GA4_SERVICE_ACCOUNT_KEY)
 *   node scripts/sync-game-health.mjs --rebuild        rebuild index/csv/latest from stored snapshots only
 *   PERIOD_START=2026-10-01 PERIOD_END=2026-10-14 node scripts/sync-game-health.mjs   explicit period
 *
 * Zero dependencies: Node 18+ built-ins only.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSign } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = resolve(__dirname, '../assets/data');
const HISTORY_DIR = resolve(DATA_ROOT, 'game-health');
const SNAPSHOT_DIR = resolve(HISTORY_DIR, 'snapshots');
const INDEX_PATH = resolve(HISTORY_DIR, 'index.json');
const LATEST_PATH = resolve(DATA_ROOT, 'game-health.json');

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '501489186';
const RAW_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;
const SCHEMA_VERSION = '2.0.0';
const MAX_PERIOD_DAYS = 62;

export const COMMANDERS = [
  {
    id: 'quartermaster',
    name: 'Marcel de Brie',
    title: 'The Quartermaster',
    portrait: '/assets/images/attrition/commanders/quartermaster.jpg',
    strategy: 'High card value weight (0.84) and a narrow gamble band (0.85). Careful reserve management pays off.',
  },
  {
    id: 'attritionist',
    name: 'Bastien de Herve',
    title: 'The Attritionist',
    portrait: '/assets/images/attrition/commanders/attritionist.jpg',
    strategy: 'Heavy deck sustainability penalty (-36). Grinds human players into late-game exhaustion.',
  },
  {
    id: 'analyst',
    name: 'Matthias von Greyerz',
    title: 'The Analyst',
    portrait: '/assets/images/attrition/commanders/analyst.jpg',
    strategy: 'High win-rate weight (56) and pool strength (0.16). Highly predictable, and exploited by human players.',
  },
  {
    id: 'gambler',
    name: 'Sir Edmund Gloucester',
    title: 'The Gambler',
    portrait: '/assets/images/attrition/commanders/gambler.jpg',
    strategy: 'Broadest gamble band (1.35) and zero depletion penalty. High variance, near-even results.',
  },
  {
    id: 'cornered-general',
    name: 'Lorenzo di Taleggio',
    title: 'The Cornered General',
    portrait: '/assets/images/attrition/commanders/cornered-general.jpg',
    strategy: 'Severe desperation bonus (58 at <= 3 cards). Counter-attacks with lethal intensity.',
  },
];

export const TURN_BUCKETS = [
  { label: '1 – 15 Turns (Abrupt Collapse)', min: 1, max: 15 },
  { label: '16 – 30 Turns (Modal Pacing)', min: 16, max: 30 },
  { label: '31 – 41 Turns (Extended Sieges)', min: 31, max: 41 },
  { label: '42 – 51 Turns (The Marathon Zone)', min: 42, max: 51 },
  { label: '52+ Turns (Beyond the Ceiling)', min: 52, max: Infinity },
];

/** Surfaces grouped the way the original exploration reported them. */
export const SURFACE_GROUPS = {
  field_manual: 'Field Manual & Rules',
  rules: 'Field Manual & Rules',
  chronicle: 'The Chronicle',
  profile: 'Hall of Valor & Profiles',
  achievements: 'Hall of Valor & Profiles',
  settings: 'Settings & Telemetry Consent',
  table: 'Card Table',
};

/** GA4 custom-dimension candidates, in preference order, keyed by our meaning. */
const DIMENSION_CANDIDATES = {
  commander: ['commander_id', 'commander'],
  outcome: ['outcome'],
  turns: ['turns'],
  battles: ['battles'],
  largest_deficit: ['largest_deficit'],
  comeback: ['comeback'],
  player_reinforcements: ['player_reinforcements'],
  anomalies: ['anomalies_observed'],
  challenger: ['challenger'],
  escalated: ['escalated_to_battle'],
  surface: ['surface', 'surface_id'],
  achievement: ['achievement_id'],
};

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;
const isoDate = (date) => date.toISOString().slice(0, 10);
const parseDate = (value) => new Date(`${value}T00:00:00Z`);
const addDays = (value, days) => isoDate(new Date(parseDate(value).getTime() + days * DAY_MS));
const daysBetween = (start, end) => Math.round((parseDate(end) - parseDate(start)) / DAY_MS) + 1;

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

export function loadSnapshots() {
  if (!existsSync(SNAPSHOT_DIR)) return [];
  return readdirSync(SNAPSHOT_DIR)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort()
    .map((file) => readJson(resolve(SNAPSHOT_DIR, file)))
    .filter(Boolean);
}

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

/* ------------------------------------------------------------------ */
/* Derived publications                                                */
/* ------------------------------------------------------------------ */

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header, rows) {
  return `${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

export function publish(snapshots) {
  const sorted = [...snapshots].sort((a, b) => a.meta.period_end.localeCompare(b.meta.period_end));
  const latest = sorted.at(-1);

  writeJson(INDEX_PATH, {
    schema_version: SCHEMA_VERSION,
    property_id: PROPERTY_ID,
    sync_cadence: 'bi-weekly',
    cadence_days: 14,
    updated_at: latest?.meta.generated_at ?? null,
    latest: latest?.meta.snapshot_id ?? null,
    next_sync_scheduled: nextScheduledSync(new Date()),
    notes: [
      'Snapshots cover non-overlapping periods, so counts may be summed across periods.',
      'Rates must be recomputed from summed counts, never averaged.',
      'A null section means GA4 could not supply it for that period; it is never back-filled from older data.',
    ],
    commanders: COMMANDERS,
    snapshots: sorted.map((snapshot) => ({
      id: snapshot.meta.snapshot_id,
      path: `snapshots/${snapshot.meta.snapshot_id}.json`,
      period_start: snapshot.meta.period_start,
      period_end: snapshot.meta.period_end,
      period_days: snapshot.meta.period_days,
      generated_at: snapshot.meta.generated_at,
      source: snapshot.meta.source,
      completed_wars: snapshot.kpis?.completed_wars ?? null,
      human_win_rate_pct: snapshot.kpis?.human_win_rate_pct ?? null,
    })),
  });

  const commanderColumns = COMMANDERS.flatMap((c) => [`${c.id}_player_wins`, `${c.id}_opponent_wins`]);
  writeFileSync(
    resolve(HISTORY_DIR, 'history.csv'),
    toCsv(
      [
        'snapshot_id', 'period_start', 'period_end', 'period_days', 'source',
        'completed_wars', 'player_wins', 'opponent_wins', 'ties', 'human_win_rate_pct',
        'wars_started', 'wars_abandoned', 'active_users',
        'player_reinforcements', 'player_rescues', 'player_failed_rescues', 'player_tie_battles',
        ...commanderColumns,
      ],
      sorted.map((s) => {
        const byId = Object.fromEntries((s.commanders ?? []).map((c) => [c.id, c]));
        const player = s.battles?.player;
        return [
          s.meta.snapshot_id, s.meta.period_start, s.meta.period_end, s.meta.period_days, s.meta.source,
          s.kpis?.completed_wars, s.kpis?.player_wins, s.kpis?.opponent_wins, s.kpis?.ties, s.kpis?.human_win_rate_pct,
          s.kpis?.wars_started, s.kpis?.wars_abandoned, s.kpis?.active_users,
          player?.total, player?.success, player?.failure, player?.tie_battle,
          ...COMMANDERS.flatMap((c) => [byId[c.id]?.player_wins, byId[c.id]?.opponent_wins]),
        ];
      }),
    ),
    'utf-8',
  );

  const ledgerColumns = ['commander', 'outcome', 'turns', 'battles', 'largest_deficit', 'comeback', 'player_reinforcements', 'anomalies', 'count'];
  writeFileSync(
    resolve(HISTORY_DIR, 'war-ledger.csv'),
    toCsv(
      ['snapshot_id', 'period_start', 'period_end', ...ledgerColumns],
      sorted.flatMap((s) =>
        (s.war_ledger ?? []).map((row) => [s.meta.snapshot_id, s.meta.period_start, s.meta.period_end, ...ledgerColumns.map((key) => row[key])]),
      ),
    ),
    'utf-8',
  );

  if (latest) writeJson(LATEST_PATH, latest);
  return latest;
}

/** The cron fires on the 1st and 15th (UTC). */
function nextScheduledSync(from) {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const candidates = [
    Date.UTC(year, month, 1), Date.UTC(year, month, 15),
    Date.UTC(year, month + 1, 1), Date.UTC(year, month + 1, 15),
  ];
  return new Date(candidates.find((time) => time > from.getTime())).toISOString();
}

/* ------------------------------------------------------------------ */
/* GA4                                                                 */
/* ------------------------------------------------------------------ */

async function getGoogleAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(privateKey, 'base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

function ga4Client(accessToken) {
  const base = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}`;
  const call = async (path, body) => {
    const res = await fetch(`${base}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`GA4 ${path} ${res.status}: ${(await res.text()).slice(0, 400)}`);
    return res.json();
  };
  return {
    metadata: () => call('/metadata'),
    report: (body) => call(':runReport', { limit: 100000, ...body }),
  };
}

const eventFilter = (name) => ({ filter: { fieldName: 'eventName', stringFilter: { value: name, matchType: 'EXACT' } } });

/** Rows as plain objects keyed by our dimension/metric aliases. */
function rowsOf(report, dimensionKeys, metricKeys) {
  return (report.rows ?? []).map((row) => {
    const record = {};
    dimensionKeys.forEach((key, i) => (record[key] = row.dimensionValues[i]?.value ?? null));
    metricKeys.forEach((key, i) => (record[key] = Number(row.metricValues[i]?.value ?? 0)));
    return record;
  });
}

const numeric = (value) => {
  const n = Number(value);
  return value === null || value === '(not set)' || !Number.isFinite(n) ? null : n;
};

/* ------------------------------------------------------------------ */
/* Snapshot assembly                                                   */
/* ------------------------------------------------------------------ */

export function assembleSnapshot({ periodStart, periodEnd, dims, totals, ledger, reinforcements, surfaces, achievements, abandonments, notes }) {
  const sources = {};
  const kpis = {};

  // Completed Wars from the ledger (commander x outcome at minimum).
  let commanders = null;
  let wars = null;
  let playStats = null;
  let warLedger = null;
  if (ledger) {
    const counts = Object.fromEntries(COMMANDERS.map((c) => [c.id, { player: 0, opponent: 0, tie: 0 }]));
    let unattributed = 0;
    for (const row of ledger) {
      const bucket = counts[row.commander];
      const key = row.outcome === 'player_win' ? 'player' : row.outcome === 'opponent_win' ? 'opponent' : row.outcome === 'tie' ? 'tie' : null;
      if (!key) continue;
      if (bucket) bucket[key] += row.count;
      else unattributed += row.count;
    }
    if (unattributed) notes.push(`${unattributed} completed Wars carried no recognised commander_id and are excluded from commander splits.`);
    const abandonedBy = Object.fromEntries((abandonments ?? []).map((row) => [row.commander, row.count]));
    commanders = COMMANDERS.map((c) => {
      const { player, opponent, tie } = counts[c.id];
      const total = player + opponent + tie;
      return {
        id: c.id,
        player_wins: player,
        opponent_wins: opponent,
        ties: tie,
        total_wars: total,
        player_win_rate_pct: pct(player, total),
        opponent_win_rate_pct: pct(opponent, total),
        abandoned: abandonments ? abandonedBy[c.id] ?? 0 : null,
      };
    });
    sources.commanders = 'ga4-data-api';

    const decided = ledger.filter((row) => ['player_win', 'opponent_win', 'tie'].includes(row.outcome));
    const sum = (predicate) => decided.filter(predicate).reduce((total, row) => total + row.count, 0);
    kpis.completed_wars = sum(() => true);
    kpis.player_wins = sum((row) => row.outcome === 'player_win');
    kpis.opponent_wins = sum((row) => row.outcome === 'opponent_win');
    kpis.ties = sum((row) => row.outcome === 'tie');
    kpis.human_win_rate_pct = pct(kpis.player_wins, kpis.completed_wars);
    kpis.ai_win_rate_pct = pct(kpis.opponent_wins, kpis.completed_wars);
    const analyst = commanders.find((c) => c.id === 'analyst');
    kpis.analyst_vulnerability_pct = analyst?.player_win_rate_pct ?? null;

    if (dims.turns) {
      const withTurns = decided.filter((row) => numeric(row.turns) !== null);
      const histogram = {};
      for (const row of withTurns) histogram[row.turns] = (histogram[row.turns] ?? 0) + row.count;
      const total = withTurns.reduce((t, row) => t + row.count, 0);
      wars = {
        turns_histogram: histogram,
        buckets: TURN_BUCKETS.map((b) => {
          const count = withTurns.filter((row) => numeric(row.turns) >= b.min && numeric(row.turns) <= b.max).reduce((t, row) => t + row.count, 0);
          return { label: b.label, min: b.min, max: Number.isFinite(b.max) ? b.max : null, count, pct: pct(count, total) };
        }),
      };
      sources.wars = 'ga4-data-api';
    }

    const ledgerMax = (key, predicate = () => true) => {
      const values = decided.filter(predicate).map((row) => numeric(row[key])).filter((v) => v !== null);
      return values.length ? Math.max(...values) : null;
    };
    const ledgerSum = (key, predicate = () => true) =>
      dims[key] ? decided.filter(predicate).reduce((t, row) => t + (numeric(row[key]) ?? 0) * row.count, 0) : null;
    const playerWin = (row) => row.outcome === 'player_win';
    playStats = {
      wars_fought: kpis.completed_wars,
      wars_won: kpis.player_wins,
      comeback_victories: dims.comeback ? sum((row) => playerWin(row) && numeric(row.comeback) === 1) : null,
      greatest_comeback: dims.largest_deficit ? ledgerMax('largest_deficit', playerWin) : null,
      battles_fought: ledgerSum('battles'),
      longest_war: dims.turns ? ledgerMax('turns') : null,
      reinforcements_sent: ledgerSum('player_reinforcements'),
      astronomical_anomalies_observed: ledgerSum('anomalies'),
    };
    warLedger = decided.map((row) => ({
      commander: row.commander,
      outcome: row.outcome,
      turns: numeric(row.turns),
      battles: numeric(row.battles),
      largest_deficit: numeric(row.largest_deficit),
      comeback: numeric(row.comeback),
      player_reinforcements: numeric(row.player_reinforcements),
      anomalies: numeric(row.anomalies),
      count: row.count,
    }));
    sources.war_ledger = 'ga4-data-api';
  }

  if (totals) {
    kpis.wars_started = totals.war_started ?? 0;
    kpis.wars_abandoned = totals.war_abandoned ?? 0;
    kpis.completion_rate_pct = pct(kpis.completed_wars ?? totals.war_resolved ?? 0, kpis.wars_started);
    kpis.active_users = totals.activeUsers ?? null;
    kpis.sessions = totals.sessions ?? null;
    kpis.achievement_unlocks = totals.achievement_unlocked ?? 0;
    kpis.achievement_observations = totals.achievement_observed ?? 0;
    kpis.campaigns_resolved = totals.campaign_resolved ?? 0;
    if (kpis.completed_wars === undefined) kpis.completed_wars = totals.war_resolved ?? 0;
    sources.kpis = 'ga4-data-api';
  }

  let battles = null;
  if (reinforcements) {
    const side = (challenger) => {
      const rows = reinforcements.filter((row) => row.challenger === challenger);
      const count = (predicate) => rows.filter(predicate).reduce((t, row) => t + row.count, 0);
      const success = count((row) => row.outcome === 'success');
      const failure = count((row) => row.outcome === 'failure');
      const tieBattle = count((row) => row.outcome === 'tie' && row.escalated === '1');
      const tieAttrition = count((row) => row.outcome === 'tie' && row.escalated !== '1');
      const total = success + failure + tieBattle + tieAttrition;
      return {
        success, failure, tie_battle: tieBattle, tie_attrition: tieAttrition, total,
        success_pct: pct(success, total), failure_pct: pct(failure, total), tie_battle_pct: pct(tieBattle, total),
      };
    };
    battles = { player: side('player'), opponent: side('opponent') };
    sources.battles = 'ga4-data-api';
    if (playStats) playStats.successful_reinforcements = battles.player.success;
  }

  let surfaceRows = null;
  if (surfaces) {
    surfaceRows = surfaces
      .filter((row) => row.surface && row.surface !== '(not set)')
      .map((row) => ({ surface: row.surface, group: SURFACE_GROUPS[row.surface] ?? row.surface, opens: row.eventCount, sessions: row.sessions, users: row.totalUsers }))
      .sort((a, b) => b.sessions - a.sessions);
    sources.surfaces = 'ga4-data-api';
  }

  const snapshotId = periodEnd;
  return {
    meta: {
      schema_version: SCHEMA_VERSION,
      telemetry_schema_version: '3',
      ruleset_version: '2026.09.1',
      property_id: PROPERTY_ID,
      snapshot_id: snapshotId,
      period_start: periodStart,
      period_end: periodEnd,
      period_days: daysBetween(periodStart, periodEnd),
      generated_at: new Date().toISOString(),
      source: 'ga4-data-api',
      dimensions_resolved: dims,
      sources,
      notes,
      status: Object.keys(sources).length ? 'healthy' : 'degraded',
    },
    kpis: Object.keys(kpis).length ? kpis : null,
    commanders,
    wars,
    battles,
    play_stats: playStats,
    achievements: achievements ? achievements.filter((row) => row.achievement !== '(not set)').map((row) => ({ id: row.achievement, unlocks: row.count })).sort((a, b) => b.unlocks - a.unlocks) : null,
    surfaces: surfaceRows,
    war_ledger: warLedger,
  };
}

async function syncPeriod(periodStart, periodEnd) {
  let creds;
  try {
    creds = JSON.parse(RAW_KEY);
  } catch {
    creds = JSON.parse(Buffer.from(RAW_KEY, 'base64').toString('utf-8'));
  }
  console.log(`[sync] Authenticating ${creds.client_email}`);
  const ga4 = ga4Client(await getGoogleAccessToken(creds.client_email, creds.private_key));
  const dateRanges = [{ startDate: periodStart, endDate: periodEnd }];
  const notes = [];

  // Discover which custom dimensions are registered instead of guessing names.
  const available = new Set((await ga4.metadata()).dimensions.map((d) => d.apiName));
  const dims = {};
  for (const [key, candidates] of Object.entries(DIMENSION_CANDIDATES)) {
    const found = candidates.map((name) => `customEvent:${name}`).find((api) => available.has(api));
    dims[key] = found ?? null;
    if (!found) notes.push(`GA4 custom dimension for "${candidates[0]}" is not registered; dependent fields are null.`);
  }
  console.log('[sync] Resolved dimensions:', dims);

  const attempt = async (label, run) => {
    try {
      return await run();
    } catch (error) {
      notes.push(`${label} unavailable: ${error.message.slice(0, 200)}`);
      console.warn(`[sync] ${label} failed:`, error.message);
      return null;
    }
  };

  const totals = await attempt('Event totals', async () => {
    const byEvent = rowsOf(
      await ga4.report({
        dateRanges,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: ['war_started', 'war_resolved', 'war_abandoned', 'campaign_resolved', 'achievement_unlocked', 'achievement_observed', 'reinforcement_resolved', 'surface_opened'] },
          },
        },
      }),
      ['event'],
      ['count'],
    );
    const audience = rowsOf(await ga4.report({ dateRanges, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }] }), [], ['activeUsers', 'sessions'])[0] ?? {};
    return { ...Object.fromEntries(byEvent.map((row) => [row.event, row.count])), ...audience };
  });

  const ledgerKeys = ['commander', 'outcome', 'turns', 'battles', 'largest_deficit', 'comeback', 'player_reinforcements', 'anomalies'].filter((key) => dims[key]);
  const ledger = dims.commander && dims.outcome
    ? await attempt('War ledger', async () =>
        rowsOf(
          await ga4.report({ dateRanges, dimensions: ledgerKeys.map((key) => ({ name: dims[key] })), metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter('war_resolved') }),
          ledgerKeys,
          ['count'],
        ))
    : null;

  const reinforcements = dims.challenger && dims.outcome
    ? await attempt('Reinforcements', async () => {
        const keys = ['challenger', 'outcome', ...(dims.escalated ? ['escalated'] : [])];
        return rowsOf(
          await ga4.report({ dateRanges, dimensions: keys.map((key) => ({ name: dims[key] })), metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter('reinforcement_resolved') }),
          keys,
          ['count'],
        );
      })
    : null;

  const surfaces = dims.surface
    ? await attempt('Surfaces', async () =>
        rowsOf(
          await ga4.report({
            dateRanges,
            dimensions: [{ name: dims.surface }],
            metrics: [{ name: 'eventCount' }, { name: 'sessions' }, { name: 'totalUsers' }],
            dimensionFilter: eventFilter('surface_opened'),
          }),
          ['surface'],
          ['eventCount', 'sessions', 'totalUsers'],
        ))
    : null;

  const achievements = dims.achievement
    ? await attempt('Achievements', async () =>
        rowsOf(
          await ga4.report({ dateRanges, dimensions: [{ name: dims.achievement }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter('achievement_unlocked') }),
          ['achievement'],
          ['count'],
        ))
    : null;

  const abandonments = dims.commander
    ? await attempt('Abandonments', async () =>
        rowsOf(
          await ga4.report({ dateRanges, dimensions: [{ name: dims.commander }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter('war_abandoned') }),
          ['commander'],
          ['count'],
        ))
    : null;

  return assembleSnapshot({ periodStart, periodEnd, dims, totals, ledger, reinforcements, surfaces, achievements, abandonments, notes });
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

async function main() {
  const snapshots = loadSnapshots();
  console.log(`[sync] ${snapshots.length} stored snapshot(s) in ${SNAPSHOT_DIR}`);

  if (process.argv.includes('--rebuild') || !RAW_KEY) {
    if (!RAW_KEY) console.log('[sync] GA4_SERVICE_ACCOUNT_KEY is not set; rebuilding derived files from stored snapshots only.');
    const latest = publish(snapshots);
    console.log(`[sync] Published index/history/latest (latest: ${latest?.meta.snapshot_id ?? 'none'}).`);
    return;
  }

  const yesterday = isoDate(new Date(Date.now() - DAY_MS));
  const lastEnd = snapshots.at(-1)?.meta.period_end;
  const periodStart = process.env.PERIOD_START || (lastEnd ? addDays(lastEnd, 1) : addDays(yesterday, -13));
  let periodEnd = process.env.PERIOD_END || yesterday;
  if (daysBetween(periodStart, periodEnd) > MAX_PERIOD_DAYS) {
    periodEnd = addDays(periodStart, MAX_PERIOD_DAYS - 1);
    console.log(`[sync] Catching up: capping this run at ${MAX_PERIOD_DAYS} days (${periodStart} – ${periodEnd}).`);
  }
  if (periodStart > periodEnd) {
    console.log(`[sync] Nothing to sync: last period already ends ${lastEnd}.`);
    publish(snapshots);
    return;
  }

  console.log(`[sync] Querying GA4 property ${PROPERTY_ID} for ${periodStart} – ${periodEnd}`);
  const snapshot = await syncPeriod(periodStart, periodEnd);
  writeJson(resolve(SNAPSHOT_DIR, `${snapshot.meta.snapshot_id}.json`), snapshot);
  const others = snapshots.filter((s) => s.meta.snapshot_id !== snapshot.meta.snapshot_id);
  publish([...others, snapshot]);
  console.log(`[sync] Stored snapshot ${snapshot.meta.snapshot_id}: ${snapshot.kpis?.completed_wars ?? 0} completed Wars.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('[sync] Fatal:', error);
    process.exit(1);
  });
}
