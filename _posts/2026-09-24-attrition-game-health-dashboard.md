---
layout: post
title: 'From Simulated Armies to Real Players: The Attrition Game Health Dashboard'
date: 2026-09-24 00:01:00 -0500
categories: [games, technology]
tags: [attrition, game-development, telemetry, analytics, dashboard, google-analytics, google-play-games]
permalink: /attrition-game-health/
description: 'How we bypassed platform roadblocks to inspect real consented GA4 gameplay metrics, what 38 human-vs-AI wars tell us about our commanders, and how telemetry derives our Google Play Game Stats.'
---

*Development period: September 9–24, 2026. This entry examines our first 28 days of consented production gameplay telemetry (August 27 – September 23, 2026) collected via Google Analytics 4, contrasts it with our earlier Monte Carlo simulations, and documents the live Game Health Exploration and Google Play Game Stats derivation.*

For weeks, our analytics conversation was trapped behind a native platform handshake.

We had built an integration for Google Play Game Stats v1 to record completed Wars on Android devices. But in a Trusted Web Activity (TWA), native communication requires a verified message channel between the web application and the Android wrapper. Until that channel handshakes cleanly across release builds, Game Stats v1 safely and silently acts as a no-op.

If we had waited for platform plumbing before looking at our game, we would still be flying blind.

We didn't wait. 

Beside the Play Games bridge sat our existing, consent-gated **Google Analytics 4** gameplay pipeline. While native game stats waited for transport verification, real players on web, PWA, and Android were already opting in, drawing cards, and contesting Wars.

This post is the interactive dashboard built from that data. Below is the exact report from our Google Analytics exploration—complete with five AI commanders, thirty-eight completed wars, forty-three percent `(not set)`, and a direct derivation of our Google Play Game Stats.

---

## The Live Game Health Dashboard

> **Update, September 29, 2026:** This dashboard now renders from a persisted history of non-overlapping snapshots instead of numbers written into the page. Use the **Dataset** switcher to view any stored period or all of them combined. The **Trends** and **Data & Provenance** tabs are new. The analysis below still describes the original 38-War baseline, which is preserved as the first stored period. See [Keeping the Ledger]({{ '/attrition-telemetry-ledger/' | relative_url }}).

<style>
  /* Dashboard Container & Scoping */
  .gh-dashboard {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #061914;
    color: #e0ece7;
    border: 2px solid #b39247;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 2rem 0;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }

  .gh-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
    border-bottom: 1px solid rgba(179, 146, 71, 0.35);
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }

  .gh-title-group h3 {
    margin: 0 0 0.25rem;
    color: #f3d999;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .gh-subtitle {
    margin: 0;
    font-size: 0.85rem;
    color: #9cb8ad;
  }

  .gh-badge-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .gh-badge {
    background: rgba(179, 146, 71, 0.15);
    color: #f3d999;
    border: 1px solid #b39247;
    font-size: 0.72rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .gh-badge.green {
    background: rgba(46, 204, 113, 0.15);
    color: #2ecc71;
    border-color: #2ecc71;
  }

  /* Metric KPI Cards */
  .gh-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 0.85rem;
    margin-bottom: 1.5rem;
  }

  .gh-kpi-card {
    background: #09261f;
    border: 1px solid rgba(179, 146, 71, 0.25);
    border-radius: 8px;
    padding: 0.85rem;
    text-align: center;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .gh-kpi-card:hover {
    transform: translateY(-2px);
    border-color: #d5b46b;
  }

  .gh-kpi-val {
    font-size: 1.6rem;
    font-weight: 800;
    color: #f3d999;
    line-height: 1.1;
    margin-bottom: 0.25rem;
  }

  .gh-kpi-val.green { color: #2ecc71; }
  .gh-kpi-val.red { color: #e74c3c; }
  .gh-kpi-val.amber { color: #f39c12; }

  .gh-kpi-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #9cb8ad;
    line-height: 1.25;
  }

  .gh-kpi-sub {
    font-size: 0.68rem;
    color: #6d8e82;
    margin-top: 0.2rem;
  }

  /* Navigation Tabs */
  .gh-tabs {
    display: flex;
    gap: 0.4rem;
    border-bottom: 1px solid rgba(179, 146, 71, 0.25);
    margin-bottom: 1.25rem;
    overflow-x: auto;
    padding-bottom: 1px;
  }

  .gh-tab-btn {
    background: none;
    border: none;
    color: #9cb8ad;
    padding: 0.6rem 0.9rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
    border-radius: 4px 4px 0 0;
  }

  .gh-tab-btn:hover {
    color: #f3d999;
    background: rgba(179, 146, 71, 0.08);
  }

  .gh-tab-btn.active {
    color: #f3d999;
    border-bottom-color: #d5b46b;
    background: rgba(179, 146, 71, 0.12);
  }

  /* View Filter Controls */
  .gh-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    padding: 0.65rem 0.85rem;
    background: #09261f;
    border-radius: 6px;
    border: 1px solid rgba(179, 146, 71, 0.2);
    font-size: 0.82rem;
  }

  .gh-toggle-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .gh-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
  }

  .gh-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .gh-slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: #1f4035;
    transition: .3s;
    border-radius: 22px;
    border: 1px solid #b39247;
  }

  .gh-slider:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background-color: #f3d999;
    transition: .3s;
    border-radius: 50%;
  }

  input:checked + .gh-slider {
    background-color: #b39247;
  }

  input:checked + .gh-slider:before {
    transform: translateX(18px);
    background-color: #061914;
  }

  /* Tab Panels */
  .gh-panel {
    display: none;
  }

  .gh-panel.active {
    display: block;
    animation: fadeIn 0.25s ease-in-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Commander Cards Grid */
  .gh-commander-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .gh-cmd-card {
    background: #09261f;
    border: 1px solid rgba(179, 146, 71, 0.3);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .gh-cmd-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    border-color: #d5b46b;
  }

  .gh-cmd-top {
    display: flex;
    gap: 0.75rem;
    padding: 0.85rem;
    background: rgba(0, 0, 0, 0.2);
    align-items: center;
  }

  .gh-cmd-portrait {
    width: 52px;
    height: 52px;
    border-radius: 6px;
    object-fit: cover;
    border: 1px solid #b39247;
    background: #061914;
    flex-shrink: 0;
  }

  .gh-cmd-identity h4 {
    margin: 0;
    font-size: 0.95rem;
    color: #f3d999;
  }

  .gh-cmd-identity .gh-cmd-title {
    font-size: 0.75rem;
    color: #9cb8ad;
    margin-top: 0.15rem;
  }

  .gh-cmd-identity .gh-cmd-id {
    font-family: monospace;
    font-size: 0.68rem;
    color: #6d8e82;
  }

  .gh-cmd-body {
    padding: 0.85rem;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .gh-stat-bar-group {
    margin: 0.2rem 0;
  }

  .gh-stat-bar-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    margin-bottom: 0.25rem;
    color: #b8d0c6;
  }

  .gh-stat-bar-track {
    height: 8px;
    background: #e74c3c;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
  }

  .gh-stat-bar-fill {
    background: #2ecc71;
    height: 100%;
    transition: width 0.5s ease-out;
  }

  .gh-cmd-details {
    font-size: 0.75rem;
    color: #9cb8ad;
    line-height: 1.35;
    background: rgba(6, 25, 20, 0.4);
    padding: 0.5rem;
    border-radius: 4px;
    border-left: 2px solid #b39247;
  }

  /* Data Tables */
  .gh-table-wrap {
    overflow-x: auto;
    margin: 1rem 0;
    border-radius: 6px;
    border: 1px solid rgba(179, 146, 71, 0.3);
  }

  .gh-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    text-align: left;
    background: #09261f;
  }

  .gh-table th {
    background: #0d362c;
    color: #f3d999;
    padding: 0.65rem 0.85rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(179, 146, 71, 0.4);
    white-space: nowrap;
  }

  .gh-table td {
    padding: 0.6rem 0.85rem;
    border-bottom: 1px solid rgba(179, 146, 71, 0.12);
    color: #e0ece7;
  }

  .gh-table tr:hover td {
    background: rgba(179, 146, 71, 0.08);
  }

  .gh-table tr.total-row td {
    background: #0d362c;
    font-weight: 700;
    color: #f3d999;
    border-top: 2px solid #b39247;
  }

  .gh-table tr.noise-row td {
    color: #8fa39a;
    font-style: italic;
    background: rgba(231, 76, 60, 0.05);
  }

  .gh-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* Alert / Callout Inside Dashboard */
  .gh-callout {
    background: rgba(179, 146, 71, 0.08);
    border-left: 3px solid #d5b46b;
    padding: 0.75rem 1rem;
    border-radius: 0 6px 6px 0;
    font-size: 0.8rem;
    line-height: 1.4;
    color: #d8e5df;
    margin-top: 1rem;
  }

  .gh-callout strong {
    color: #f3d999;
  }

  .gh-tag {
    display: inline-block;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    font-family: monospace;
  }
  .gh-tag.pgs { background: rgba(52, 152, 219, 0.2); color: #3498db; border: 1px solid #3498db; }
  .gh-tag.ga4 { background: rgba(243, 156, 18, 0.2); color: #f39c12; border: 1px solid #f39c12; }

  /* Snapshot history controls (dataset switcher, trends, provenance) */
  .gh-dashboard { position: relative; }
  .gh-tabs { flex-wrap: wrap; overflow-x: visible; scrollbar-width: thin; scrollbar-color: #b39247 transparent; }
  .gh-dataset { display: flex; flex-direction: column; gap: 0.3rem; min-width: 240px; }
  .gh-dataset label { color: #9cb8ad; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .gh-dataset select {
    appearance: none; background: #0a2a22 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23f3d999' stroke-width='1.6'/%3E%3C/svg%3E") no-repeat right 0.75rem center;
    color: #f3d999; border: 1px solid #b39247; border-radius: 8px; padding: 0.55rem 2.2rem 0.55rem 0.75rem; font: inherit; font-size: 0.9rem; cursor: pointer;
  }
  .gh-dataset select:focus-visible, .gh-tab-btn:focus-visible { outline: 2px solid #f3d999; outline-offset: 2px; }
  .gh-badge-row { margin: -0.5rem 0 1.25rem; }
  .gh-badge-live { border-color: #2ecc71 !important; color: #2ecc71 !important; }
  .gh-lede { margin-top: 0 !important; margin-bottom: 1rem; }
  .gh-empty { margin-top: 0; }
  .gh-muted { color: #9cb8ad; font-size: 0.8em; }
  .gh-small-n { color: #e0b44a; }
  .gh-noise-tag { font-size: 0.7rem; color: #e74c3c; }
  .gh-subhead { color: #f3d999; margin: 1.5rem 0 0.5rem; font-size: 0.95rem; }
  .gh-trend-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
  .gh-trend { margin: 0; background: #0a2a22; border: 1px solid rgba(179, 146, 71, 0.3); border-radius: 10px; padding: 0.75rem; }
  .gh-trend figcaption { color: #f3d999; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; }
  .gh-trend svg { width: 100%; height: auto; display: block; }
  .gh-grid { stroke: rgba(224, 236, 231, 0.12); stroke-width: 1; }
  .gh-axis { fill: #9cb8ad; font-size: 13px; }
  .gh-trend-line { fill: none; stroke: #f3d999; stroke-width: 2; stroke-linejoin: round; }
  .gh-trend-dot { fill: #f3d999; stroke: #0a2a22; stroke-width: 2; }
  .gh-trend-bar { fill: #b39247; }
  .gh-hit { fill: transparent; cursor: crosshair; }
  .gh-hit:hover { fill: rgba(243, 217, 153, 0.07); }
  .gh-tooltip {
    position: absolute; z-index: 5; max-width: 220px; pointer-events: none; background: #04120e; color: #e0ece7;
    border: 1px solid #b39247; border-radius: 6px; padding: 0.4rem 0.55rem; font-size: 0.78rem; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
  }
  .gh-downloads { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
  .gh-download {
    display: flex; flex-direction: column; gap: 0.15rem; padding: 0.7rem 1rem; border: 1px solid #b39247; border-radius: 8px;
    background: #0a2a22; color: #f3d999 !important; font-weight: 700; text-decoration: none !important;
  }
  .gh-download small { color: #9cb8ad; font-weight: 400; }
  .gh-download:hover { background: #0f372d; }
  .gh-notes { margin: 0.25rem 0 0 1.1rem; color: #c7d8d1; font-size: 0.85rem; }
  @media (max-width: 640px) {
    .gh-dataset { width: 100%; min-width: 0; }
    .gh-tabs { overflow-x: auto; flex-wrap: nowrap; }
    .gh-tab-btn { white-space: nowrap; }
  }
</style>

<div class="gh-dashboard" id="gameHealthDashboard" data-base="{{ '/' | relative_url }}" aria-live="polite">
  <div class="gh-callout gh-empty">Loading the Game Health snapshot history…</div>
</div>
<noscript><p>The dashboard renders from <a href="{{ '/assets/data/game-health/index.json' | relative_url }}">the persisted snapshot history</a> and needs JavaScript. The <a href="{{ '/assets/data/game-health/history.csv' | relative_url }}">history.csv</a> export works without it.</p></noscript>
<script src="{{ '/assets/js/attrition-game-health.js' | relative_url }}" defer></script>

---

## Why We Didn't Wait on Google Play

In our Android preparation passes, we spent considerable effort designing our Google Play integration. We specified eleven permanent career statistics, created the projection models, and wired up Google Play Game Stats v1 ([`google-play-game-stats-v1.md`](https://github.com/cboler/war-of-attrition-game/blob/main/developer-docs/google-play-game-stats-v1.md)).

Game Stats v1 is a clean, aggregate contract: upon completing a War, a self-contained `war_completed` record is emitted to Google's play games servers. But inside Android's Trusted Web Activity (TWA) architecture, client web applications cannot simply call native Java or Kotlin APIs directly. They require a `postMessage` message channel handshake through the Android Custom Tabs client. If the native wrapper takes slightly too long to register its channel, or if the user is playing in desktop Chrome, the bridge remains quiescent.

Had we made Google Play our sole window into gameplay, we would currently possess zero data.

Instead, Attrition's architecture treats telemetry transport as a swappable interface (`TelemetryTransport`). Alongside the native channel sits our **Google Analytics 4** web transport. It is completely independent of Google Play services, requires no APK-level permissions, and is guarded by an explicit, first-launch consent prompt.

When a player clicks **Share anonymous data**, collection begins at the next War boundary. And that stream has been humming quietly for the past month.

---

## The Overlap: Deriving Play Stats from Telemetry

A natural question arises: *Are Google Play Game Stats and GA4 Telemetry completely separate, or do they overlap?*

They overlap substantially—and by design.

Both systems are consumers of the game's internal `GameEventBusService`:

1. **Google Play Game Stats v1** is a **single-event career projection**. It packages up everything that happened in a finished match into one compact `war_completed` event with 20 properties, specifically tailored for Google Play Console's repetitive-stat limits.
2. **GA4 Gameplay Telemetry** is a **fine-grained domain stream**. It emits specific records at specific moments: `war_started`, `turn_started`, `comparison_resolved`, `reinforcement_resolved`, `battle_started`, `achievement_observed`, and `war_resolved`.

Because the underlying domain truths are identical, **every single one of our 11 Google Play stats can be derived directly from our GA4 telemetry**:

- **Volume and Win Rates:** Google Play's `wars_fought` and `wars_won` map directly to GA4's `war_resolved` count (38) and `outcome == 'player_win'` filter (17).
- **Comebacks:** Google Play tracks `comeback_victories` (wins after a $\ge 3$ card deficit) and `greatest_comeback` (maximum deficit overcome). In GA4, `war_resolved` carries `comeback_deficit`, capturing our 4 comeback victories and our 6-card record.
- **Battles and Depth:** Google Play's `battles_fought` (54) and `deepest_battle` (Layer 3) correspond to GA4's `battle_started` events and `layerRound` parameters.
- **The Core Decision:** Google Play aggregates `reinforcements_sent` (72) and `successful_reinforcements` (38). GA4 records every individual `reinforcement_resolved` comparison, revealing the exact 52.8% human rescue rate.
- **Aces Felled by Twos:** Google Play accumulates every opponent Ace felled by a Two. In GA4, this is tracked both on `comparison_resolved.two_beats_ace_applied` (11 occurrences) and via the rare event achievement observer for `war.wrong_tool_for_job`.
- **Astronomical Anomalies:** Google Play sums `anomalies_observed`. In GA4, `war_resolved` transmits `anomalies_observed` (2 confirmed in our 38 matches), while `achievement_observed` logs each distinct astronomical phenomenon.

In short: we don't have to wait for Google Play Console to process native device uploads to understand our game's career metrics. The telemetry stream already gives us the full picture.

---

## The Mystery of the 43.3% `(not set)`

When you inspect the raw GA4 **Attrition - Game Health** exploration (toggleable via the switch in the Commander Matchups tab above), your eyes are immediately drawn to row 1:

| Commander | Outcome: (not set) | Outcome: opponent_win | Outcome: player_win | Totals |
| :--- | :---: | :---: | :---: | :---: |
| **(not set)** | **29** | 0 | 0 | **29** |

Out of 67 total rows captured, 29 events—43.3% of the entire table—have neither a commander nor an outcome. 

In commercial web analytics, seeing 43% `(not set)` usually triggers a minor panic: *Did the tracking tag break? Are parameters dropping off on iOS? Is there a race condition in the state machine?*

Here, the answer is far more interesting: **the telemetry schema is doing exactly what it was designed to do.**

### The 25-Parameter Budget

In Google Analytics 4, every custom event is subject to a strict limit: **no event may transmit more than 25 parameters**. If a client sends 26 parameters, GA4 does not trim the 26th field; its transport drops the entire event.

In Attrition, rich gameplay events like recursive Battle comparisons (`comparison_resolved`) or multi-card settlements (`settlement_resolved`) need to record:
- Common context: `schema_version`, `ruleset_version`, `app_version`, `war_id`, `campaign_id`, `campaign_war_index`, `campaign_mode`, `campaign_modifiers`, `event_seq`, and `turn_number` (10 parameters).
- Combat parameters: `comparison_stage`, `player_card_rank`, `player_card_suit`, `opponent_card_rank`, `opponent_card_suit`, `two_beats_ace_applied`, `winner`, `casualties_count`, `boneyard_count`, `depth` (14 parameters).

That brings the payload to **24 or 25 parameters**. Adding `commander_id` to every event would push critical combat records to 26 parameters, causing GA4 to discard them entirely.

To preserve the parameter budget, we made a deliberate architectural choice documented in our [telemetry schema](https://github.com/cboler/war-of-attrition-game/blob/main/developer-docs/telemetry-schema.md):

> `commander_id` is emitted only on explicit War boundary records: `war_started`, `war_resolved`, and `war_abandoned`. Intermediate clash, turn, and battle events carry `war_id`, allowing BigQuery joins to reconstruct context without bloating GA4 payloads.

### The Missing Tab Filter

When you build a Free-form exploration in GA4 with `Commander` as rows and `Outcome` as columns without a tab-level filter, GA4 evaluates **every single event** in the property's stream.

When a `turn_started` or UI event enters the pipeline, it has no `commander_id` and no `outcome`. GA4 groups it under `(not set)` × `(not set)`.

The fix is trivial, but essential: **add a tab-level filter restricting `Event name` to `war_resolved`**.

The moment you filter by `war_resolved`, the 29 intermediate events vanish from the table. What remains is the clean, uncorrupted reality of 38 completed human-vs-AI wars.

---

## What 38 Wars Tell Us About Five Commanders

Thirty-eight games is not a million-game Monte Carlo simulation. But thirty-eight games against real human beings tell us things that a million automated bot matches never could.

Across all 38 matches, **human players won 17 Wars (44.7%) and AI commanders won 21 Wars (55.3%)**. That is a remarkably healthy baseline for a deterministic card game where human players are still learning the nuances of the Mont-Rouge campaign.

The real story, however, emerges when you look at the individual commanders.

### 1. Matthias von Greyerz: The Overconfident Mathematician (14.3% Win Rate)

In our commander design specifications ([`opponent-commanders.md`](https://github.com/cboler/war-of-attrition-game/blob/main/developer-docs/opponent-commanders.md)), Matthias von Greyerz (`analyst`) is calibrated as an objective calculator. He weights visible candidate-pool strength higher than anyone else (0.16) and prioritizes clean win probability (56).

On paper, Matthias should be terrifying. In practice against humans, **he won 1 match and lost 6 (an 85.7% player win rate)**.

Why did our best analytical engine collapse so spectacularly?

Because human players do not play like random number generators. Human players understand leverage. When Matthias assesses a 60% probability of rescuing a card, he challenges predictably. Human players bait him into committing high-value reinforcement cards, only to crush him in recursive Battles or starve his remaining reserve. Matthias calculates odds on the current table, but human players calculate three turns ahead.

### 2. Marcel and Bastien: The Wall of Patience (63.6% & 66.7% Win Rate)

In stark contrast to the Analyst, Marcel de Brie (`quartermaster`) and Bastien de Herve (`attritionist`) have been devastating opponents:
- **Marcel de Brie:** 7 AI wins, 4 player wins (63.6% win rate).
- **Bastien de Herve:** 6 AI wins, 3 player wins (66.7% win rate).

Marcel values the card at risk above all else (0.84 card value weight) and maintains a tight gamble band. He refuses to commit reserves unless the odds overwhelmingly favor rescue.

Bastien, our itinerant tyromancer, incorporates a massive penalty (-36) for unsupported Battles when his deck is running low. He behaves as if the War is always going to turn 30, husbanding his low cards and forcing human challengers into exhaustion.

Against these two, human aggressiveness has consistently backfired.

### 3. Lorenzo and Sir Edmund: Chaos and Desperation

Sir Edmund Gloucester (`gambler`) has lived up to his name: 4 AI wins and 3 player wins (57.1% win rate). With the widest gamble band (1.35) and zero reserve depletion penalty, Edmund swings wildly between heroic rescues and catastrophic double-losses.

Lorenzo di Taleggio (`cornered-general`) has only faced 4 recorded wars, but took 3 of them (75% win rate). Lorenzo's strategy carries an extreme desperation modifier (+58) when his deck drops below 3 cards. Players expecting an easy mop-up find Lorenzo counter-attacking with ferocious intensity.

---

## From Exploration to Permanent Architecture

Building this dashboard directly from GA4 metrics teaches three enduring lessons for anyone instrumenting game telemetry:

1. **Don't wait for platform perfection:** If we had conditioned our visibility on native Google Play Game Stats, we would know nothing about Matthias's vulnerability today. Building layered, transport-agnostic telemetry pays immediate dividends.
2. **Respect GA4 parameter economics:** Truncating or dropping high-cardinality parameters at the client layer is not a bug; it is the prerequisite for keeping rich 25-parameter domain events alive.
3. **Explorations require domain filters:** Event-scoped parameters require event-scoped exploration filters. Without them, your reports will drown in `(not set)`.
4. **Platform projections can be verified in advance:** Even while Google Play Game Stats v1 waits for native channel verification, our telemetry pipeline allows us to audit every lifetime statistic and rare event frequency against real human play.

The 38 wars recorded here are just the opening skirmishes of the Mont-Rouge campaign. As closed testing expands and more players opt in, we'll continue piping these records into BigQuery, tracking the elusive 51-turn ceiling, and watching whether Matthias ever learns to stop trusting his math.

---

[**Play Attrition**](https://cboler.github.io/war-of-attrition-game/) · [**Read the development series**]({{ '/attrition-development/' | relative_url }}) · [**View the telemetry schema**](https://github.com/cboler/war-of-attrition-game/blob/main/developer-docs/telemetry-schema.md) · [**View Google Play Game Stats v1 Contract**](https://github.com/cboler/war-of-attrition-game/blob/main/developer-docs/google-play-game-stats-v1.md)
