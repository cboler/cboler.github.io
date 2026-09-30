/*
 * Attrition Game Health dashboard.
 *
 * Renders from the persisted snapshot history in assets/data/game-health/.
 * Snapshots cover non-overlapping periods, so the "All periods" view sums
 * counts and recomputes every rate from those sums (never averages rates).
 */
(function () {
  'use strict';

  var root = document.getElementById('gameHealthDashboard');
  if (!root) return;

  var base = (root.getAttribute('data-base') || '').replace(/\/$/, '');
  var dataRoot = base + '/assets/data/game-health/';
  var state = { index: null, snapshots: [], view: 'all', tab: 'commanders', showNoise: false };

  var PLAY_STATS = [
    { key: 'wars_fought', agg: 'COUNT(war_resolved)', unit: 'Wars', desc: 'Total completed Wars (wins, losses, ties).', source: 'war_resolved', kind: 'sum' },
    { key: 'wars_won', agg: 'SUM(player_win)', unit: 'Wins', desc: 'Completed Wars ending in player victory.', source: "war_resolved.outcome == 'player_win'", kind: 'sum' },
    { key: 'comeback_victories', agg: 'COUNT(comeback)', unit: 'Wars', desc: 'Victories after trailing by 3+ cards.', source: 'war_resolved.comeback', kind: 'sum' },
    { key: 'greatest_comeback', agg: 'MAX(deficit)', unit: 'Cards', desc: 'Largest deficit overcome in a victory.', source: 'war_resolved.largest_deficit', kind: 'max' },
    { key: 'battles_fought', agg: 'SUM(battles)', unit: 'Battles', desc: 'Battles entered across completed Wars.', source: 'war_resolved.battles', kind: 'sum' },
    { key: 'deepest_battle', agg: 'MAX(deepest_battle)', unit: 'Layers', desc: 'Most 3-card sacrifice layers in one Battle.', source: 'battle_layer_added', kind: 'max' },
    { key: 'longest_war', agg: 'MAX(turns)', unit: 'Turns', desc: 'Most turns in one completed War.', source: 'war_resolved.turns', kind: 'max' },
    { key: 'reinforcements_sent', agg: 'SUM(reinforcements)', unit: 'Cards', desc: 'Player Challenge reinforcements committed.', source: 'war_resolved.player_reinforcements', kind: 'sum' },
    { key: 'successful_reinforcements', agg: 'SUM(rescues)', unit: 'Rescues', desc: 'Player reinforcements winning outright.', source: "reinforcement_resolved.outcome == 'success'", kind: 'sum' },
    { key: 'aces_felled_by_twos', agg: 'SUM(two_beats_ace)', unit: 'Aces', desc: 'Opponent Aces directly beaten by human Twos.', source: 'comparison_resolved (BigQuery)', kind: 'sum' },
    { key: 'astronomical_anomalies_observed', agg: 'SUM(anomalies)', unit: 'Anomalies', desc: 'Astronomically rare deck/battle events.', source: 'war_resolved.anomalies_observed', kind: 'sum' },
  ];

  var SURFACE_NOTES = {
    'Field Manual & Rules': 'Checking the 2-defeats-Ace exception and Battle escalation rules.',
    'The Chronicle': 'Inspecting campaign progress and historic War timelines.',
    'Hall of Valor & Profiles': 'Viewing veteran cards, service records, and citations.',
    'Settings & Telemetry Consent': 'Auditing privacy settings and sound/animation toggles.',
    'Card Table': 'Table visits; gameplay events remain authoritative for play.',
  };

  /* ------------------------------ helpers ------------------------------ */

  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(part, whole) {
    return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
  }
  function fmtPct(value) {
    return value === null || value === undefined ? '—' : value.toFixed(1) + '%';
  }
  function fmt(value) {
    return value === null || value === undefined ? '—' : Number(value).toLocaleString();
  }
  function isNum(value) {
    return typeof value === 'number' && isFinite(value);
  }
  function sumOf(list, pick) {
    var values = list.map(pick).filter(isNum);
    return values.length ? values.reduce(function (a, b) { return a + b; }, 0) : null;
  }
  function maxOf(list, pick) {
    var values = list.map(pick).filter(isNum);
    return values.length ? Math.max.apply(null, values) : null;
  }
  function dateLabel(iso, withYear) {
    var d = new Date(iso + 'T00:00:00Z');
    var opts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    if (withYear) opts.year = 'numeric';
    return d.toLocaleDateString('en-US', opts);
  }
  function periodLabel(meta) {
    return dateLabel(meta.period_start) + ' – ' + dateLabel(meta.period_end, true);
  }
  function commanderMeta(id) {
    var list = (state.index && state.index.commanders) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return { id: id, name: id, title: '', portrait: '', strategy: '' };
  }

  /* ------------------------------ combine ------------------------------ */

  function combine(snapshots) {
    if (snapshots.length === 1) return snapshots[0];
    var first = snapshots[0].meta;
    var last = snapshots[snapshots.length - 1].meta;
    var k = function (key) { return sumOf(snapshots, function (s) { return s.kpis && s.kpis[key]; }); };

    var kpis = {
      completed_wars: k('completed_wars'),
      player_wins: k('player_wins'),
      opponent_wins: k('opponent_wins'),
      ties: k('ties'),
      wars_started: k('wars_started'),
      wars_abandoned: k('wars_abandoned'),
      achievement_unlocks: k('achievement_unlocks'),
      achievement_observations: k('achievement_observations'),
      unfiltered_total_events: k('unfiltered_total_events'),
      unfiltered_noise_events: k('unfiltered_noise_events'),
    };
    kpis.human_win_rate_pct = pct(kpis.player_wins, kpis.completed_wars);
    kpis.ai_win_rate_pct = pct(kpis.opponent_wins, kpis.completed_wars);
    // Exploration noise is a property of one baseline query, not something that sums across periods.
    var allHaveNoise = snapshots.every(function (s) { return s.kpis && isNum(s.kpis.unfiltered_noise_events); });
    if (!allHaveNoise) { kpis.unfiltered_total_events = null; kpis.unfiltered_noise_events = null; }
    kpis.unfiltered_noise_pct = allHaveNoise ? pct(kpis.unfiltered_noise_events, kpis.unfiltered_total_events) : null;
    // Completion needs both counts from the same periods.
    var paired = snapshots.filter(function (s) { return s.kpis && isNum(s.kpis.wars_started); });
    kpis.completion_rate_pct = paired.length
      ? pct(sumOf(paired, function (s) { return s.kpis.completed_wars; }), sumOf(paired, function (s) { return s.kpis.wars_started; }))
      : null;

    var commanderIds = [];
    snapshots.forEach(function (s) {
      (s.commanders || []).forEach(function (c) { if (commanderIds.indexOf(c.id) < 0) commanderIds.push(c.id); });
    });
    var commanders = commanderIds.map(function (id) {
      var rows = snapshots.map(function (s) { return (s.commanders || []).filter(function (c) { return c.id === id; })[0]; }).filter(Boolean);
      var c = {
        id: id,
        player_wins: sumOf(rows, function (r) { return r.player_wins; }) || 0,
        opponent_wins: sumOf(rows, function (r) { return r.opponent_wins; }) || 0,
        ties: sumOf(rows, function (r) { return r.ties; }) || 0,
        abandoned: sumOf(rows, function (r) { return r.abandoned; }),
      };
      c.total_wars = c.player_wins + c.opponent_wins + c.ties;
      c.player_win_rate_pct = pct(c.player_wins, c.total_wars);
      c.opponent_win_rate_pct = pct(c.opponent_wins, c.total_wars);
      return c;
    });
    var analyst = commanders.filter(function (c) { return c.id === 'analyst'; })[0];
    kpis.analyst_vulnerability_pct = analyst ? analyst.player_win_rate_pct : null;

    var bucketMap = {};
    var bucketOrder = [];
    snapshots.forEach(function (s) {
      ((s.wars && s.wars.buckets) || []).forEach(function (b) {
        if (!bucketMap[b.min]) { bucketMap[b.min] = { label: b.label, min: b.min, max: b.max, count: 0 }; bucketOrder.push(b.min); }
        bucketMap[b.min].count += b.count || 0;
      });
    });
    var bucketTotal = bucketOrder.reduce(function (t, key) { return t + bucketMap[key].count; }, 0);
    var buckets = bucketOrder.sort(function (a, b) { return a - b; }).map(function (key) {
      var b = bucketMap[key];
      b.pct = pct(b.count, bucketTotal);
      return b;
    });

    function side(name) {
      var rows = snapshots.map(function (s) { return s.battles && s.battles[name]; }).filter(function (r) { return r && isNum(r.total); });
      if (!rows.length) return null;
      var out = {
        success: sumOf(rows, function (r) { return r.success; }),
        failure: sumOf(rows, function (r) { return r.failure; }),
        tie_battle: sumOf(rows, function (r) { return r.tie_battle; }),
        tie_attrition: sumOf(rows, function (r) { return r.tie_attrition; }),
        total: sumOf(rows, function (r) { return r.total; }),
        periods: rows.length,
      };
      out.success_pct = pct(out.success, out.total);
      out.failure_pct = pct(out.failure, out.total);
      out.tie_battle_pct = pct(out.tie_battle, out.total);
      return out;
    }

    var playStats = {};
    PLAY_STATS.forEach(function (stat) {
      var pick = function (s) { return s.play_stats && s.play_stats[stat.key]; };
      playStats[stat.key] = stat.kind === 'max' ? maxOf(snapshots, pick) : sumOf(snapshots, pick);
    });

    var surfaceMap = {};
    snapshots.forEach(function (s) {
      (s.surfaces || []).forEach(function (row) {
        var key = row.group || row.surface;
        surfaceMap[key] = surfaceMap[key] || { group: key, sessions: 0, opens: null };
        surfaceMap[key].sessions += row.sessions || 0;
        if (isNum(row.opens)) surfaceMap[key].opens = (surfaceMap[key].opens || 0) + row.opens;
      });
    });

    var achievementMap = {};
    snapshots.forEach(function (s) {
      (s.achievements || []).forEach(function (a) { achievementMap[a.id] = (achievementMap[a.id] || 0) + a.unlocks; });
    });

    return {
      meta: {
        snapshot_id: 'all',
        period_start: first.period_start,
        period_end: last.period_end,
        period_days: sumOf(snapshots, function (s) { return s.meta.period_days; }),
        source: 'combined',
        notes: ['Sum of ' + snapshots.length + ' non-overlapping periods. Rates are recomputed from summed counts.'],
      },
      kpis: kpis,
      commanders: commanders,
      wars: buckets.length ? { buckets: buckets } : null,
      battles: { player: side('player'), opponent: side('opponent') },
      play_stats: playStats,
      surfaces: Object.keys(surfaceMap).map(function (key) { return surfaceMap[key]; }).sort(function (a, b) { return b.sessions - a.sessions; }),
      achievements: Object.keys(achievementMap).map(function (id) { return { id: id, unlocks: achievementMap[id] }; }).sort(function (a, b) { return b.unlocks - a.unlocks; }),
    };
  }

  function currentData() {
    if (state.view === 'all') return combine(state.snapshots);
    return state.snapshots.filter(function (s) { return s.meta.snapshot_id === state.view; })[0] || state.snapshots[state.snapshots.length - 1];
  }

  /* ------------------------------ panels ------------------------------ */

  function unavailable(what) {
    return '<div class="gh-callout gh-empty">No ' + esc(what) + ' for this dataset. GA4 did not supply it, and older data is never back-filled.</div>';
  }

  function renderKpis(data) {
    var k = data.kpis || {};
    var cards = [
      { val: fmt(k.completed_wars), label: 'Completed Wars', sub: isNum(k.completion_rate_pct) ? fmtPct(k.completion_rate_pct) + ' of started Wars completed' : 'Across 5 Commanders' },
      { val: fmtPct(k.human_win_rate_pct), cls: 'green', label: 'Human Win Rate', sub: fmt(k.player_wins) + ' Player Victories' },
      { val: fmtPct(k.ai_win_rate_pct), cls: 'red', label: 'AI Win Rate', sub: fmt(k.opponent_wins) + ' Opponent Victories' },
      isNum(k.unfiltered_noise_pct)
        ? { val: fmtPct(k.unfiltered_noise_pct), cls: 'amber', label: 'Unfiltered Noise', sub: fmt(k.unfiltered_noise_events) + ' (not set) stream events' }
        : { val: fmt(k.wars_abandoned), cls: 'amber', label: 'Wars Abandoned', sub: 'Explicit restarts and exits' },
      { val: fmtPct(k.analyst_vulnerability_pct), cls: 'green', label: 'Analyst Vulnerability', sub: 'Player win rate vs Matthias' },
    ];
    return cards.map(function (c) {
      return '<div class="gh-kpi-card"><div class="gh-kpi-val ' + (c.cls || '') + '">' + esc(c.val) + '</div><div class="gh-kpi-label">' + esc(c.label) + '</div><div class="gh-kpi-sub">' + esc(c.sub) + '</div></div>';
    }).join('');
  }

  function renderCommanders(data) {
    if (!data.commanders) return unavailable('commander matchups');
    var cards = data.commanders.map(function (c) {
      var m = commanderMeta(c.id);
      var first = m.name.split(' ')[0] === 'Sir' ? 'Edmund' : m.name.split(' ')[0];
      return '<div class="gh-cmd-card"><div class="gh-cmd-top">' +
        (m.portrait ? '<img src="' + esc(base + m.portrait) + '" alt="' + esc(m.name) + '" class="gh-cmd-portrait" loading="lazy" />' : '') +
        '<div class="gh-cmd-identity"><h4>' + esc(m.name) + '</h4><div class="gh-cmd-title">' + esc(m.title) + '</div><div class="gh-cmd-id">ID: ' + esc(c.id) + '</div></div></div>' +
        '<div class="gh-cmd-body"><div class="gh-stat-bar-group"><div class="gh-stat-bar-labels"><span>Player: ' + fmt(c.player_wins) + ' (' + fmtPct(c.player_win_rate_pct) + ')</span><span>' + esc(first) + ': ' + fmt(c.opponent_wins) + ' (' + fmtPct(c.opponent_win_rate_pct) + ')</span></div>' +
        '<div class="gh-stat-bar-track"><div class="gh-stat-bar-fill" style="width:' + (c.player_win_rate_pct || 0) + '%"></div></div></div>' +
        '<div class="gh-cmd-details"><strong>Strategy:</strong> ' + esc(m.strategy) + (c.total_wars < 10 ? ' <em class="gh-small-n">Small sample (n = ' + c.total_wars + ').</em>' : '') + '</div></div></div>';
    }).join('');

    var k = data.kpis || {};
    var hasNoise = isNum(k.unfiltered_noise_events);
    var showNoise = hasNoise && state.showNoise;
    var rows = data.commanders.map(function (c) {
      var m = commanderMeta(c.id);
      var rateColor = c.player_win_rate_pct >= 50 ? '#2ecc71' : '#e74c3c';
      return '<tr><td><strong>' + esc(m.name) + '</strong> (' + esc(c.id) + ')</td>' + (showNoise ? '<td class="gh-num">0</td>' : '') +
        '<td class="gh-num">' + fmt(c.opponent_wins) + '</td><td class="gh-num">' + fmt(c.player_wins) + '</td><td class="gh-num">' + fmt(c.ties) + '</td><td class="gh-num">' + fmt(c.total_wars) + '</td>' +
        '<td class="gh-num"><span style="color:' + rateColor + '">' + fmtPct(c.player_win_rate_pct) + '</span></td>' +
        '<td class="gh-num">' + fmt(c.abandoned) + '</td></tr>';
    }).join('');
    var noiseRow = showNoise
      ? '<tr class="noise-row"><td>(not set) <span class="gh-noise-tag">[stream noise]</span></td><td class="gh-num">' + fmt(k.unfiltered_noise_events) + '</td><td class="gh-num">0</td><td class="gh-num">0</td><td class="gh-num">0</td><td class="gh-num">' + fmt(k.unfiltered_noise_events) + '</td><td class="gh-num">—</td><td class="gh-num">—</td></tr>'
      : '';
    var total = (k.completed_wars || 0) + (showNoise ? k.unfiltered_noise_events : 0);

    var toolbar = '<div class="gh-toolbar"><div class="gh-toggle-group">' +
      (hasNoise
        ? '<label class="gh-switch"><input type="checkbox" data-action="noise"' + (state.showNoise ? ' checked' : '') + '><span class="gh-slider"></span></label><span>' +
          (showNoise ? '<strong>Showing: Raw GA4 Exploration (Unfiltered)</strong>, including (not set)' : '<strong>Showing: Filtered View (<code>event_name = war_resolved</code>)</strong>') + '</span>'
        : '<span><strong>Filtered to <code>war_resolved</code></strong>. The Data API applies the event filter at query time, so there is no unfiltered noise to toggle.</span>') +
      '</div></div>';

    return toolbar + '<div class="gh-commander-grid">' + cards + '</div>' +
      '<div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>Commander</th>' + (showNoise ? '<th class="gh-num">(not set)</th>' : '') +
      '<th class="gh-num">Opponent Win</th><th class="gh-num">Player Win</th><th class="gh-num">Tie</th><th class="gh-num">Total</th><th class="gh-num">Player Win Rate</th><th class="gh-num">Abandoned</th></tr></thead><tbody>' +
      noiseRow + rows + '</tbody><tfoot><tr class="total-row"><td>' + (showNoise ? 'Unfiltered Exploration Total' : 'Filtered Clean Total') + '</td>' + (showNoise ? '<td class="gh-num">' + fmt(k.unfiltered_noise_events) + '</td>' : '') +
      '<td class="gh-num">' + fmt(k.opponent_wins) + ' (' + fmtPct(k.ai_win_rate_pct) + ')</td><td class="gh-num">' + fmt(k.player_wins) + ' (' + fmtPct(k.human_win_rate_pct) + ')</td><td class="gh-num">' + fmt(k.ties) + '</td><td class="gh-num">' + fmt(total) + '</td><td class="gh-num">' + fmtPct(k.human_win_rate_pct) + '</td><td class="gh-num">' + fmt(k.wars_abandoned) + '</td></tr></tfoot></table></div>';
  }

  function renderWars(data) {
    if (!data.wars || !data.wars.buckets) return unavailable('War-length distribution');
    var rows = data.wars.buckets.filter(function (b) { return b.min < 52 || b.count > 0; }).map(function (b) {
      var modal = b.min === 16 ? ' style="background: rgba(179, 146, 71, 0.08);"' : '';
      return '<tr' + modal + '><td><strong>' + esc(b.label) + '</strong></td><td class="gh-num">' + fmt(b.count) + '</td><td class="gh-num">' + fmtPct(b.pct) + '</td><td>' + esc(b.notes || '') + '</td></tr>';
    }).join('');
    var longest = data.play_stats && data.play_stats.longest_war;
    return '<div class="gh-callout gh-lede"><strong>War Dynamics:</strong> the distribution of completed War lengths against the 22.4-turn Monte Carlo median and the 51-turn theoretical ceiling.' +
      (isNum(longest) ? ' Longest War in this dataset: <strong>' + longest + ' turns</strong>.' : '') + '</div>' +
      '<div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>Turn Depth Bucket</th><th class="gh-num">Observed Wars</th><th class="gh-num">Pct of Wars</th><th>Notes</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderBattles(data) {
    var b = data.battles;
    if (!b || (!b.player && !b.opponent)) return unavailable('reinforcement outcomes');
    var p = b.player || {};
    var o = b.opponent || {};
    var cell = function (sideData, key) {
      var count = sideData[key.replace('_pct', '')];
      return '<td class="gh-num">' + fmtPct(sideData[key]) + (isNum(count) ? ' <span class="gh-muted">(' + fmt(count) + ')</span>' : '') + '</td>';
    };
    return '<div class="gh-callout gh-lede"><strong>Battles &amp; Challenges:</strong> <code>reinforcement_resolved</code> outcomes, separating outright comparison wins from ties that escalate to recursive Battle.</div>' +
      '<div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>Challenge Scenario</th><th class="gh-num">Human Challenger</th><th class="gh-num">AI Challenger</th><th>Resolution Pattern</th></tr></thead><tbody>' +
      '<tr><td><strong>Outright Rescue</strong></td>' + cell(p, 'success_pct') + cell(o, 'success_pct') + '<td>Reinforcement outranks the original winning card; the beaten card is saved.</td></tr>' +
      '<tr><td><strong>Failed Rescue</strong> (double loss)</td>' + cell(p, 'failure_pct') + cell(o, 'failure_pct') + '<td>Reinforcement fails; both cards go to the Boneyard.</td></tr>' +
      '<tr style="background: rgba(179, 146, 71, 0.08);"><td><strong>Tie Escalating to Battle</strong> (<code>escalated_to_battle = 1</code>)</td>' + cell(p, 'tie_battle_pct') + cell(o, 'tie_battle_pct') + '<td>Equal ranks trigger a recursive 3-card sacrifice Battle.</td></tr>' +
      '</tbody><tfoot><tr class="total-row"><td>Reinforcements observed</td><td class="gh-num">' + fmt(p.total) + '</td><td class="gh-num">' + fmt(o.total) + '</td><td></td></tr></tfoot></table></div>';
  }

  function renderPlayStats(data) {
    var stats = data.play_stats;
    if (!stats) return unavailable('Google Play stat derivations');
    var rows = PLAY_STATS.map(function (s) {
      var value = stats[s.key];
      return '<tr><td><span class="gh-tag pgs">' + s.key + '</span></td><td><code>' + esc(s.agg) + '</code></td><td class="gh-num"><strong>' + fmt(value) + '</strong> ' + (isNum(value) ? esc(s.unit) : '') + '</td><td>' + esc(s.desc) + '</td><td><code>' + esc(s.source) + '</code></td></tr>';
    }).join('');
    var k = data.kpis || {};
    var achievements = (data.achievements || []).slice(0, 12).map(function (a) {
      return '<tr><td><code>' + esc(a.id) + '</code></td><td class="gh-num">' + fmt(a.unlocks) + '</td></tr>';
    }).join('');
    return '<div class="gh-callout gh-lede"><strong>Google Play Game Stats v1 Derivation:</strong> the 11 career stats specified in <a href="https://github.com/cboler/war-of-attrition-game/blob/main/developer-docs/google-play-game-stats-v1.md"><code>google-play-game-stats-v1.md</code></a>, projected from consented GA4 telemetry. A dash means the metric is not derivable from registered GA4 dimensions for this dataset (BigQuery can supply it).</div>' +
      '<div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>Google Play Stat</th><th>Aggregation</th><th class="gh-num">Derived Value</th><th>Meaning</th><th>Telemetry Source</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<h4 class="gh-subhead">Rare Events &amp; Achievements</h4><div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>Tracking Scope</th><th>Telemetry Event</th><th class="gh-num">Observed</th></tr></thead><tbody>' +
      '<tr><td><strong>First-Time Unlocks</strong></td><td><code>achievement_unlocked</code></td><td class="gh-num">' + fmt(k.achievement_unlocks) + '</td></tr>' +
      '<tr><td><strong>Repeatable Rare Feats</strong></td><td><code>achievement_observed</code></td><td class="gh-num">' + fmt(k.achievement_observations) + '</td></tr>' +
      '<tr><td><strong>Astronomical Anomalies</strong></td><td><code>war_resolved.anomalies_observed</code></td><td class="gh-num">' + fmt(stats.astronomical_anomalies_observed) + '</td></tr>' +
      '</tbody></table></div>' +
      (achievements ? '<h4 class="gh-subhead">Most Unlocked Achievements</h4><div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>Achievement</th><th class="gh-num">Unlocks</th></tr></thead><tbody>' + achievements + '</tbody></table></div>' : '');
  }

  function renderSurfaces(data) {
    if (!data.surfaces || !data.surfaces.length) return unavailable('surface engagement');
    var rows = data.surfaces.map(function (s) {
      var label = s.group || s.surface;
      return '<tr><td><strong>' + esc(label) + '</strong></td><td class="gh-num">' + fmt(s.sessions) + '</td><td class="gh-num">' + fmt(s.opens) + '</td><td>' + esc(s.behavior || SURFACE_NOTES[label] || '') + '</td></tr>';
    }).join('');
    return '<div class="gh-callout gh-lede"><strong>Surface Engagement:</strong> how players explore the lore, rulebook, and archives via <code>surface_opened</code>. In the combined view, sessions are summed across periods.</div>' +
      '<div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>Surface Area</th><th class="gh-num">Sessions</th><th class="gh-num">Opens</th><th>Primary Player Behavior</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* ------------------------------ trends ------------------------------ */

  function renderTrends() {
    var list = state.snapshots.filter(function (s) { return s.kpis && isNum(s.kpis.completed_wars); });
    if (list.length < 2) {
      var next = state.index && state.index.next_sync_scheduled ? dateLabel(state.index.next_sync_scheduled.slice(0, 10), true) : 'the next sync';
      return '<div class="gh-callout gh-empty">Trends need at least two stored periods. The first automated period lands on <strong>' + esc(next) + '</strong>, and every sync after that adds a point.</div>' + renderTrendTable(list);
    }
    var winRate = list.map(function (s) { return { s: s, v: s.kpis.human_win_rate_pct }; });
    var pace = list.map(function (s) { return { s: s, v: s.meta.period_days ? Math.round((s.kpis.completed_wars / s.meta.period_days) * 70) / 10 : null }; });
    return '<div class="gh-trend-grid">' +
      trendChart('Human win rate by period', winRate, { unit: '%', domain: [0, 100], line: true }) +
      trendChart('Completed Wars per week', pace, { unit: ' / wk', line: false }) +
      '</div>' + renderTrendTable(list);
  }

  function renderTrendTable(list) {
    var rows = list.map(function (s) {
      return '<tr><td>' + esc(periodLabel(s.meta)) + '</td><td class="gh-num">' + fmt(s.meta.period_days) + '</td><td class="gh-num">' + fmt(s.kpis.completed_wars) + '</td><td class="gh-num">' + fmtPct(s.kpis.human_win_rate_pct) + '</td><td>' + esc(s.meta.source) + '</td></tr>';
    }).join('');
    return '<div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>Period</th><th class="gh-num">Days</th><th class="gh-num">Completed Wars</th><th class="gh-num">Human Win Rate</th><th>Source</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function trendChart(title, points, opts) {
    var W = 420, H = 210, L = 38, R = 10, T = 12, B = 30;
    var values = points.map(function (p) { return p.v; }).filter(isNum);
    var lo = opts.domain ? opts.domain[0] : 0;
    var hi = opts.domain ? opts.domain[1] : Math.max(1, Math.ceil(Math.max.apply(null, values) * 1.15));
    var n = points.length;
    var step = (W - L - R) / n;
    var x = function (i) { return L + step * (i + 0.5); };
    var y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var ticks = [lo, lo + (hi - lo) / 2, hi];
    var grid = ticks.map(function (t) {
      return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" class="gh-grid"/><text x="' + (L - 6) + '" y="' + (y(t) + 4) + '" class="gh-axis" text-anchor="end">' + Math.round(t) + '</text>';
    }).join('');
    var labels = points.map(function (p, i) {
      return '<text x="' + x(i) + '" y="' + (H - 10) + '" class="gh-axis" text-anchor="middle">' + esc(dateLabel(p.s.meta.period_end)) + '</text>';
    }).join('');
    var marks;
    if (opts.line) {
      var path = points.map(function (p, i) { return isNum(p.v) ? (i ? 'L' : 'M') + x(i) + ' ' + y(p.v) : ''; }).join(' ');
      marks = '<path d="' + path + '" class="gh-trend-line"/>' + points.map(function (p, i) {
        return isNum(p.v) ? '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="4.5" class="gh-trend-dot"/>' : '';
      }).join('');
    } else {
      var bw = Math.min(46, step * 0.6);
      marks = points.map(function (p, i) {
        if (!isNum(p.v)) return '';
        var top = y(p.v), bottom = y(lo), h = Math.max(0, bottom - top), r = Math.min(4, h);
        return '<path class="gh-trend-bar" d="M' + (x(i) - bw / 2) + ' ' + bottom + ' V' + (top + r) + ' Q' + (x(i) - bw / 2) + ' ' + top + ' ' + (x(i) - bw / 2 + r) + ' ' + top +
          ' H' + (x(i) + bw / 2 - r) + ' Q' + (x(i) + bw / 2) + ' ' + top + ' ' + (x(i) + bw / 2) + ' ' + (top + r) + ' V' + bottom + ' Z"/>';
      }).join('');
    }
    var hits = points.map(function (p, i) {
      var tip = periodLabel(p.s.meta) + ': ' + (isNum(p.v) ? p.v + opts.unit : 'n/a') + ' (' + p.s.kpis.completed_wars + ' Wars)';
      return '<rect x="' + (x(i) - step / 2) + '" y="' + T + '" width="' + step + '" height="' + (H - T - B) + '" class="gh-hit" data-tip="' + esc(tip) + '"/>';
    }).join('');
    return '<figure class="gh-trend"><figcaption>' + esc(title) + '</figcaption><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(title) + '">' + grid + marks + labels + hits + '</svg></figure>';
  }

  /* ------------------------------ provenance ------------------------------ */

  function renderData(data) {
    var files = state.snapshots.map(function (s) {
      return '<tr><td>' + esc(periodLabel(s.meta)) + '</td><td>' + esc(s.meta.source) + '</td><td class="gh-num">' + fmt(s.kpis && s.kpis.completed_wars) + '</td><td><a href="' + esc(dataRoot + 'snapshots/' + s.meta.snapshot_id + '.json') + '">' + esc(s.meta.snapshot_id) + '.json</a></td></tr>';
    }).join('');
    var notes = (data.meta.notes || []).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
    var sources = data.meta.sources ? Object.keys(data.meta.sources).map(function (key) { return '<span class="gh-tag ga4">' + esc(key) + ': ' + esc(data.meta.sources[key]) + '</span>'; }).join(' ') : '';
    return '<div class="gh-callout gh-lede"><strong>Open data for research:</strong> every sync persists an immutable, dated snapshot covering a <em>non-overlapping</em> period, so counts can be summed across periods without double counting. Rates must be recomputed from the summed counts. A missing section is never back-filled from older periods.</div>' +
      '<div class="gh-downloads"><a class="gh-download" href="' + esc(dataRoot + 'history.csv') + '" download>history.csv <small>one KPI row per period</small></a>' +
      '<a class="gh-download" href="' + esc(dataRoot + 'war-ledger.csv') + '" download>war-ledger.csv <small>aggregated completed-War rows</small></a>' +
      '<a class="gh-download" href="' + esc(dataRoot + 'index.json') + '">index.json <small>manifest &amp; commander catalog</small></a></div>' +
      (notes || sources ? '<h4 class="gh-subhead">Provenance for this view</h4>' + (sources ? '<p>' + sources + '</p>' : '') + (notes ? '<ul class="gh-notes">' + notes + '</ul>' : '') : '') +
      '<h4 class="gh-subhead">Stored snapshots</h4><div class="gh-table-wrap"><table class="gh-table"><thead><tr><th>Period</th><th>Source</th><th class="gh-num">Completed Wars</th><th>File</th></tr></thead><tbody>' + files + '</tbody></table></div>';
  }

  /* ------------------------------ shell ------------------------------ */

  var TABS = [
    { id: 'commanders', label: '⚔️ Commander Matchups', render: renderCommanders },
    { id: 'wars', label: '⏱️ War Dynamics', render: renderWars },
    { id: 'battles', label: '🛡️ Battles & Challenges', render: renderBattles },
    { id: 'playstats', label: '🏆 Google Play Stats & Feats', render: renderPlayStats },
    { id: 'surfaces', label: '📖 Surface Engagement', render: renderSurfaces },
    { id: 'trends', label: '📈 Trends', render: renderTrends },
    { id: 'data', label: '🗂️ Data & Provenance', render: renderData },
  ];

  function render() {
    var data = currentData();
    var options = '<option value="all"' + (state.view === 'all' ? ' selected' : '') + '>All periods combined (' + state.snapshots.length + ')</option>' +
      state.snapshots.slice().reverse().map(function (s) {
        return '<option value="' + esc(s.meta.snapshot_id) + '"' + (state.view === s.meta.snapshot_id ? ' selected' : '') + '>' + esc(periodLabel(s.meta)) + (s.meta.source === 'ga4-exploration-baseline' ? ' · baseline' : '') + '</option>';
      }).join('');
    var tab = TABS.filter(function (t) { return t.id === state.tab; })[0] || TABS[0];

    root.innerHTML =
      '<div class="gh-header"><div class="gh-title-group"><h3>Attrition — Game Health Exploration</h3>' +
      '<p class="gh-subtitle">Consented GA4 Gameplay Telemetry · ' + esc(periodLabel(data.meta)) + ' · ' + fmt(data.meta.period_days) + ' days</p></div>' +
      '<div class="gh-dataset"><label for="gh-dataset-select">Dataset</label><select id="gh-dataset-select" data-action="view">' + options + '</select></div></div>' +
      '<div class="gh-badge-group gh-badge-row"><span class="gh-badge green">Schema v3</span><span class="gh-badge">GA4 Property ' + esc((state.index && state.index.property_id) || '501489186') + '</span><span class="gh-badge">PGS v1 Aligned</span>' +
      '<span class="gh-badge gh-badge-live">Bi-Weekly Snapshots</span><span class="gh-badge">' + state.snapshots.length + ' stored period' + (state.snapshots.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="gh-kpis">' + renderKpis(data) + '</div>' +
      '<div class="gh-tabs" role="tablist">' + TABS.map(function (t) {
        return '<button type="button" role="tab" class="gh-tab-btn' + (t.id === tab.id ? ' active' : '') + '" aria-selected="' + (t.id === tab.id) + '" data-tab="' + t.id + '">' + esc(t.label) + '</button>';
      }).join('') + '</div>' +
      '<div class="gh-panel active" role="tabpanel">' + tab.render(data) + '</div>' +
      '<div class="gh-tooltip" hidden></div>';
  }

  root.addEventListener('change', function (event) {
    var action = event.target.getAttribute('data-action');
    if (action === 'view') state.view = event.target.value;
    if (action === 'noise') state.showNoise = event.target.checked;
    if (action) render();
  });
  root.addEventListener('click', function (event) {
    var tab = event.target.closest('[data-tab]');
    if (!tab) return;
    state.tab = tab.getAttribute('data-tab');
    render();
    var next = root.querySelector('[data-tab="' + state.tab + '"]');
    if (next) next.focus();
  });
  root.addEventListener('pointermove', function (event) {
    var tip = root.querySelector('.gh-tooltip');
    var hit = event.target.closest && event.target.closest('[data-tip]');
    if (!tip) return;
    if (!hit) { tip.hidden = true; return; }
    var box = root.getBoundingClientRect();
    tip.textContent = hit.getAttribute('data-tip');
    tip.hidden = false;
    tip.style.left = Math.min(event.clientX - box.left + 12, box.width - 220) + 'px';
    tip.style.top = event.clientY - box.top + 14 + 'px';
  });
  root.addEventListener('pointerleave', function () {
    var tip = root.querySelector('.gh-tooltip');
    if (tip) tip.hidden = true;
  });

  fetch(dataRoot + 'index.json')
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(function (index) {
      state.index = index;
      return Promise.all(index.snapshots.map(function (entry) {
        return fetch(dataRoot + entry.path).then(function (res) { return res.ok ? res.json() : null; });
      }));
    })
    .then(function (snapshots) {
      state.snapshots = snapshots.filter(Boolean).sort(function (a, b) { return a.meta.period_end < b.meta.period_end ? -1 : 1; });
      if (!state.snapshots.length) throw new Error('empty');
      render();
    })
    .catch(function () {
      root.innerHTML = '<div class="gh-callout gh-empty">The Game Health data could not be loaded. The raw files are in <a href="' + esc(dataRoot + 'index.json') + '">assets/data/game-health/</a>.</div>';
    });
})();
