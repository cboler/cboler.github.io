---
layout: post
title: 'The Two-Week Pulse: Automating Attrition’s Game Health Telemetry'
date: 2026-09-24 01:15:00 -0500
categories: [games, technology]
tags: [attrition, game-development, telemetry, analytics, github-actions, automation, dashboard]
permalink: /attrition-telemetry-pulse/
description: 'How we turned a static GA4 exploration into an automated bi-weekly data pipeline using GitHub Actions, how fresh the data is, and what the latest numbers say.'
---

*Development period: September 24, 2026. This Field Dispatch documents the automated scheduled pipeline that updates Attrition’s Game Health Dashboard every two weeks, explains the data freshness contract, and connects consented GA4 metrics to a zero-infrastructure static frontend.*

> **Update, September 29, 2026:** The first version of this pipeline overwrote a single JSON file on every run, so each sync erased the one before it. That is fine for a scoreboard and useless for research. The pipeline now persists an immutable, dated snapshot per non-overlapping period, and the dashboard lets you switch between any stored period or all of them combined. The rewrite also fixed a dimension-name mismatch (`commander` vs the emitted `commander_id`) that would have broken the first live query. The sections below describe the current design.

When we published [From Simulated Armies to Real Players]({{ '/attrition-game-health/' | relative_url }}), we shared the first thirty-eight completed Wars recorded from real human players. It answered our first pressing design questions: Matthias von Greyerz was shockingly vulnerable to human deception (14.3% win rate), Marcel and Bastien were stubbornly resilient, and 43% of un-filtered exploration rows were harmless stream noise.

The immediate question that followed was: *Is this dashboard going to update as new games are played, or is it frozen in amber?*

Static reports are easy. Live, self-updating dashboards on a serverless GitHub Pages blog are significantly more challenging. 

This post documents how we solved that problem: **a scheduled GitHub Actions pipeline that pulls fresh metrics from the Google Analytics 4 Data API every two weeks**, writes an aggregated public contract, and automatically updates the blog dashboard without requiring any backend servers.

---

## Live Data Freshness Monitor

<style>
  .freshness-monitor {
    background: #08231d;
    border: 2px solid #d5b46b;
    border-radius: 10px;
    padding: 1.25rem 1.5rem;
    margin: 1.5rem 0 2rem;
    color: #e0ece7;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }

  .freshness-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    border-bottom: 1px solid rgba(213, 180, 107, 0.3);
    padding-bottom: 0.75rem;
    margin-bottom: 1rem;
  }

  .freshness-header h4 {
    margin: 0;
    color: #f3d999;
    font-size: 1.1rem;
    letter-spacing: 0.5px;
  }

  .freshness-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .freshness-stat {
    background: #061914;
    border: 1px solid rgba(213, 180, 107, 0.2);
    border-radius: 6px;
    padding: 0.75rem 1rem;
  }

  .freshness-stat-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    color: #9cb8ad;
    letter-spacing: 0.5px;
    margin-bottom: 0.25rem;
  }

  .freshness-stat-value {
    font-size: 1.05rem;
    font-weight: 700;
    color: #f3d999;
    font-variant-numeric: tabular-nums;
  }

  .freshness-stat-value.live {
    color: #2ecc71;
  }

  .freshness-meta-text {
    font-size: 0.78rem;
    color: #9cb8ad;
    margin-top: 1rem;
    line-height: 1.4;
    border-top: 1px dashed rgba(213, 180, 107, 0.2);
    padding-top: 0.75rem;
  }

  /* Live Pulse Indicator */
  .pulse-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: #2ecc71;
    border-radius: 50%;
    margin-right: 6px;
    box-shadow: 0 0 8px #2ecc71;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(46, 204, 113, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
  }
</style>

<div class="freshness-monitor">
  <div class="freshness-header">
    <h4><span class="pulse-dot"></span> Telemetry Sync Pipeline: Active</h4>
    <span style="font-size: 0.75rem; background: rgba(46, 204, 113, 0.15); color: #2ecc71; border: 1px solid #2ecc71; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">CRON: BI-WEEKLY</span>
  </div>

  <div class="freshness-grid">
    <div class="freshness-stat">
      <div class="freshness-stat-label">Sync Frequency</div>
      <div class="freshness-stat-value">Every 14 Days</div>
      <div style="font-size: 0.68rem; color: #6d8e82; margin-top: 2px;">1st & 15th of each month</div>
    </div>
    <div class="freshness-stat">
      <div class="freshness-stat-label">Stored Periods</div>
      <div class="freshness-stat-value" id="storedPeriods">1 Snapshot</div>
      <div style="font-size: 0.68rem; color: #6d8e82; margin-top: 2px;">Non-overlapping, never overwritten</div>
    </div>
    <div class="freshness-stat">
      <div class="freshness-stat-label">Latest Period Ends</div>
      <div class="freshness-stat-value live" id="liveSyncTimestamp">Sep 23, 2026</div>
      <div style="font-size: 0.68rem; color: #6d8e82; margin-top: 2px;" id="liveSyncWars">38 Wars in period</div>
    </div>
    <div class="freshness-stat">
      <div class="freshness-stat-label">Next Scheduled Sync</div>
      <div class="freshness-stat-value" id="nextSyncTimestamp">Oct 1, 2026</div>
      <div style="font-size: 0.68rem; color: #6d8e82; margin-top: 2px;">Midnight UTC runner</div>
    </div>
  </div>

  <div class="freshness-meta-text">
    <strong>Freshness Definition:</strong> Each sync covers the period from the day after the previous snapshot through yesterday (UTC), so the newest data is at most about 14 days old and no War is counted twice. No client-side tokens or player identifiers are exposed.
  </div>
</div>

---

## Why Every Two Weeks?

In web telemetry, the instinct is often to build real-time streaming dashboards: live tickers updating every five seconds, socket connections, and instant alerts. 

For a game like Attrition, real-time streaming is not only unnecessary—it is actively deceptive:

1. **Statistical Mass over Noise:** Attrition contains rare combinatorial events—a Two defeating an Ace in a crucial Battle, a 43-turn marathon war, or a 3-layer sacrifice cascade. Over an hour or a single day, the sample size is tiny. A single player trying a radical strategy can make a commander look invincible or broken. A 14-day cadence gives each period statistical mass, and because periods never overlap they stack into a growing history that can be pooled whenever a question needs more Wars.
2. **Player Privacy & Aggregation Thresholds:** In our [telemetry design](https://github.com/cboler/war-of-attrition-game/blob/main/developer-docs/telemetry-schema.md), we committed to public reporting only in aggregate ($N \ge 30$). Real-time streaming risks letting an observer correlate a friend's play session with a public spike. A two-week aggregation protects player anonymity while answering balance questions.
3. **Security Without Servers:** Querying the Google Analytics 4 Data API requires a Google Cloud service account with private RSA keys. If you query GA4 from client-side JavaScript in a browser, you must expose that private key to the world. By running our queries inside a scheduled GitHub Actions workflow, our credentials remain securely encrypted in repository secrets.

---

## How the Pipeline Works

The entire pipeline runs without external hosting, databases, or paid serverless functions. It lives inside our repository:

```text
[ Google Analytics 4 API ]
           │
           │  (Runs every 14 days at 00:00 UTC via GitHub Actions)
           ▼
[ scripts/sync-game-health.mjs ]
           │
           │  (JWT auth, discovers registered dimensions, queries the new period)
           ▼
[ assets/data/game-health/snapshots/<period_end>.json ]  + index.json, history.csv, war-ledger.csv
           │
           │  (Git commit & push by github-actions[bot])
           ▼
[ GitHub Pages Build Pipeline ]
           │
           │  (Rebuilds and publishes static site)
           ▼
[ Client-Side Hydration on Blog Dashboard ]
```

### 1. The Zero-Dependency Sync Engine (`scripts/sync-game-health.mjs`)

Instead of dragging hundreds of megabytes of `node_modules` into GitHub Actions, we wrote `sync-game-health.mjs` using only Node.js native built-ins (`node:crypto`, `node:fs`, `node:url`):

- It signs an RSA-SHA256 JSON Web Token (JWT) directly using the service account's private key.
- It exchanges the assertion for a Google OAuth2 access token.
- It asks GA4's `metadata` endpoint which custom dimensions are actually registered (for example `commander_id`, `outcome`, `turns`, `challenger`) rather than guessing names.
- It calls `properties/{propertyId}:runReport` for the period since the last snapshot. A *War ledger* query (`event_name = war_resolved`) groups completed Wars by commander, outcome, turns, Battles, deficit, comeback, reinforcements, and anomalies. Separate queries cover reinforcement outcomes, surface engagement, achievements, and abandonment.
- It derives the Google Play Game Stats it can (`wars_fought`, `wars_won`, `longest_war`, `battles_fought`, `reinforcements_sent`, etc.). Anything GA4 cannot supply is written as `null` with a provenance note, never copied from an older period.
- It writes an immutable snapshot, then regenerates the manifest, the CSV exports, and the legacy `game-health.json` (now a copy of the latest snapshot).

### 2. The Bi-Weekly Cron (`.github/workflows/sync-game-health.yml`)

The workflow triggers on a standard cron schedule:

```yaml
on:
  schedule:
    # Runs at 00:00 UTC on the 1st and 15th of every month
    - cron: '0 0 1,15 * *'
  workflow_dispatch: # Allows manual on-demand triggers
```

Before querying, the workflow runs the assembler's `node:test` suite. If a new snapshot was produced, it commits the whole `assets/data/game-health/` history under `github-actions[bot]` and pushes to `main`. That push immediately triggers the standard GitHub Pages deployment, making the new data live in under sixty seconds. A manual dispatch can also backfill an explicit `period_start`/`period_end`.

---

## The Public Telemetry Contract

The data feeding our dashboard is public, transparent, and version-controlled under [`/assets/data/game-health/`]({{ '/assets/data/game-health/index.json' | relative_url }}):

| File | Contents |
| --- | --- |
| `index.json` | Manifest of every stored period, the commander catalog, and the next scheduled sync |
| `snapshots/<period_end>.json` | One immutable snapshot per non-overlapping period, with per-section provenance |
| `history.csv` | One row of KPIs and per-commander results per period, ready for R, pandas, or a spreadsheet |
| `war-ledger.csv` | Completed Wars aggregated by commander, outcome, turns, Battles, deficit, comeback, reinforcements, and anomalies |

Three rules make the history safe to analyze:

1. **Periods never overlap.** Counts can be summed across snapshots without double counting.
2. **Rates are recomputed, never averaged.** A pooled win rate is pooled wins over pooled Wars.
3. **Missing means missing.** If GA4 cannot supply a section for a period, it is `null` with a note explaining why. It is not carried forward from an older snapshot.

The first stored period is the original 28-day exploration baseline (August 27 – September 23), marked `ga4-exploration-baseline` so it is never confused with API-sourced periods.

---

## Dynamic Dashboard Hydration

The [Game Health dashboard]({{ '/attrition-game-health/' | relative_url }}) now renders entirely from this history. A **Dataset** switcher chooses between *All periods combined* and any single stored period. The **Trends** tab plots the human win rate and War pace per period. The **Data & Provenance** tab links every snapshot and CSV export. Each bi-weekly sync adds a period without anyone editing the post.

### Current Baseline Standing (As of September 24, 2026)

- **Total Completed Wars:** 38
- **Human Player Victories:** 17 (44.7%)
- **AI Commander Victories:** 21 (55.3%)
- **The Deadliest Opponent:** Lorenzo di Taleggio (75.0% win rate) & Bastien de Herve (66.7% win rate)
- **The Most Exploited AI:** Matthias von Greyerz (14.3% win rate / 85.7% player victory rate)
- **The Marathon Record:** 43 turns in a single completed War
- **The Rare Rule in Action:** 11 opponent Aces felled directly by human Twos

---

## What Happens Next

Our next scheduled telemetry sync runs on **October 1, 2026**. That run covers September 24–30 and becomes the first period queried directly from the GA4 Data API. From then on, a new period lands on the 1st and 15th of every month.

As more closed testers join the Mont-Rouge campaign and opt in to anonymous sharing, the sample will grow from dozens of Wars to hundreds. We'll be watching to see whether human players continue to exploit Matthias's rigid calculation, whether Marcel's cheese cellar remains impenetrable, and whether anyone breaks the 43-turn marathon record on their way to the 51-turn ceiling.

---

[**View the Live Game Health Dashboard**]({{ '/attrition-game-health/' | relative_url }}) · [**Inspect the Snapshot History**]({{ '/assets/data/game-health/index.json' | relative_url }}) · [**Read the Development Series**]({{ '/attrition-development/' | relative_url }})

<script>
  (function() {
    var fmt = function (iso) {
      var d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
      return isNaN(d) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    };
    var set = function (id, text) { var el = document.getElementById(id); if (el && text) el.innerText = text; };
    fetch('{{ "/assets/data/game-health/index.json" | relative_url }}')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (index) {
        var latest = index.snapshots[index.snapshots.length - 1];
        if (!latest) return;
        set('liveSyncTimestamp', fmt(latest.period_end));
        set('liveSyncWars', latest.completed_wars + ' Wars in period');
        set('storedPeriods', index.snapshots.length + (index.snapshots.length === 1 ? ' Snapshot' : ' Snapshots'));
        if (index.next_sync_scheduled) set('nextSyncTimestamp', fmt(index.next_sync_scheduled));
      })
      .catch(function (err) {
        console.info('Telemetry monitor showing committed defaults:', err);
      });
  })();
</script>
