import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assembleSnapshot } from './sync-game-health.mjs';

const dims = {
  commander: 'customEvent:commander_id',
  outcome: 'customEvent:outcome',
  turns: 'customEvent:turns',
  battles: 'customEvent:battles',
  largest_deficit: 'customEvent:largest_deficit',
  comeback: 'customEvent:comeback',
  player_reinforcements: 'customEvent:player_reinforcements',
  anomalies: 'customEvent:anomalies_observed',
  challenger: 'customEvent:challenger',
  escalated: 'customEvent:escalated_to_battle',
  surface: 'customEvent:surface',
  achievement: 'customEvent:achievement_id',
};

const ledger = [
  { commander: 'analyst', outcome: 'player_win', turns: '22', battles: '2', largest_deficit: '4', comeback: '1', player_reinforcements: '3', anomalies: '0', count: 2 },
  { commander: 'analyst', outcome: 'opponent_win', turns: '44', battles: '5', largest_deficit: '9', comeback: '0', player_reinforcements: '6', anomalies: '1', count: 1 },
  { commander: 'gambler', outcome: 'tie', turns: '12', battles: '1', largest_deficit: '2', comeback: '0', player_reinforcements: '1', anomalies: '0', count: 1 },
  { commander: '(not set)', outcome: 'player_win', turns: '30', battles: '0', largest_deficit: '0', comeback: '0', player_reinforcements: '0', anomalies: '0', count: 1 },
];

function build(overrides = {}) {
  return assembleSnapshot({
    periodStart: '2026-09-24',
    periodEnd: '2026-09-30',
    dims,
    totals: { war_started: 8, war_resolved: 5, war_abandoned: 2, achievement_unlocked: 3, activeUsers: 4, sessions: 9 },
    ledger,
    reinforcements: [
      { challenger: 'player', outcome: 'success', escalated: '0', count: 5 },
      { challenger: 'player', outcome: 'failure', escalated: '0', count: 3 },
      { challenger: 'player', outcome: 'tie', escalated: '1', count: 1 },
      { challenger: 'player', outcome: 'tie', escalated: '0', count: 1 },
      { challenger: 'opponent', outcome: 'success', escalated: '0', count: 2 },
    ],
    surfaces: [{ surface: 'chronicle', eventCount: 6, sessions: 4, totalUsers: 3 }],
    achievements: [{ achievement: 'war.assassin', count: 2 }],
    abandonments: [{ commander: 'analyst', count: 2 }],
    notes: [],
    ...overrides,
  });
}

test('derives KPIs, commander splits and play stats from the War ledger', () => {
  const snapshot = build();
  assert.equal(snapshot.meta.snapshot_id, '2026-09-30');
  assert.equal(snapshot.meta.period_days, 7);
  assert.equal(snapshot.kpis.completed_wars, 5);
  assert.equal(snapshot.kpis.player_wins, 3);
  assert.equal(snapshot.kpis.ties, 1);
  assert.equal(snapshot.kpis.human_win_rate_pct, 60);
  assert.equal(snapshot.kpis.completion_rate_pct, 62.5);

  const analyst = snapshot.commanders.find((c) => c.id === 'analyst');
  assert.deepEqual([analyst.player_wins, analyst.opponent_wins, analyst.total_wars, analyst.abandoned], [2, 1, 3, 2]);
  assert.match(snapshot.meta.notes.join(' '), /1 completed Wars carried no recognised commander_id/);

  assert.equal(snapshot.play_stats.comeback_victories, 2);
  assert.equal(snapshot.play_stats.greatest_comeback, 4);
  assert.equal(snapshot.play_stats.longest_war, 44);
  assert.equal(snapshot.play_stats.battles_fought, 2 * 2 + 5 + 1 + 0);
  assert.equal(snapshot.play_stats.reinforcements_sent, 3 * 2 + 6 + 1);
  assert.equal(snapshot.play_stats.successful_reinforcements, 5);
});

test('buckets turns and separates Battle ties from attrition ties', () => {
  const snapshot = build();
  const counts = Object.fromEntries(snapshot.wars.buckets.map((b) => [b.min, b.count]));
  assert.deepEqual(counts, { 1: 1, 16: 3, 31: 0, 42: 1, 52: 0 });
  assert.deepEqual(
    [snapshot.battles.player.success, snapshot.battles.player.tie_battle, snapshot.battles.player.tie_attrition, snapshot.battles.player.total],
    [5, 1, 1, 10],
  );
});

test('leaves sections null instead of inventing data when GA4 cannot supply them', () => {
  const snapshot = build({ ledger: null, reinforcements: null, surfaces: null, dims: { ...dims, turns: null } });
  assert.equal(snapshot.commanders, null);
  assert.equal(snapshot.battles, null);
  assert.equal(snapshot.surfaces, null);
  assert.equal(snapshot.kpis.completed_wars, 5, 'falls back to the war_resolved event count');
  assert.equal(snapshot.meta.sources.commanders, undefined);
});
