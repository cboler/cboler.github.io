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
      <div class="freshness-stat-label">Analysis Cohort Window</div>
      <div class="freshness-stat-value">28 Days Rolling</div>
      <div style="font-size: 0.68rem; color: #6d8e82; margin-top: 2px;">Smooths daily variance</div>
    </div>
    <div class="freshness-stat">
      <div class="freshness-stat-label">Last Successful Sync</div>
      <div class="freshness-stat-value live" id="liveSyncTimestamp">Sep 24, 2026</div>
      <div style="font-size: 0.68rem; color: #6d8e82; margin-top: 2px;">Validated 38 Wars</div>
    </div>
    <div class="freshness-stat">
      <div class="freshness-stat-label">Next Scheduled Sync</div>
      <div class="freshness-stat-value" id="nextSyncTimestamp">Oct 8, 2026</div>
      <div style="font-size: 0.68rem; color: #6d8e82; margin-top: 2px;">Midnight UTC runner</div>
    </div>
  </div>

  <div class="freshness-meta-text">
    <strong>Freshness Definition:</strong> Metrics reflect gameplay recorded within the active 28-day window up to 24–48 hours prior to the last automated sync. Data points are never more than 14 days old. No client-side tokens or player identifiers are exposed.
  </div>
</div>

---

## Why Every Two Weeks?

In web telemetry, the instinct is often to build real-time streaming dashboards: live tickers updating every five seconds, socket connections, and instant alerts. 

For a game like Attrition, real-time streaming is not only unnecessary—it is actively deceptive:

1. **Statistical Mass over Noise:** Attrition contains rare combinatorial events—a Two defeating an Ace in a crucial Battle, a 43-turn marathon war, or a 3-layer sacrifice cascade. Over an hour or a single day, the sample size is tiny. A single player trying a radical strategy can make a commander look invincible or broken. A 14-day cadence operating across a rolling 28-day cohort provides statistical mass and smooths out short-term fluctuations.
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
           │  (Authenticates via JWT, queries war_resolved & commander dimensions)
           ▼
[ assets/data/game-health.json ]
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
- It calls GA4's `properties/{propertyId}:runReport` REST endpoint, querying the 28-day rolling window with our canonical filter (`event_name = war_resolved`).
- It projects the exact 11 Google Play Game Stats (`wars_fought`, `wars_won`, `longest_war`, `deepest_battle`, `reinforcements_sent`, etc.).
- It writes the clean summary to `assets/data/game-health.json`.

### 2. The Bi-Weekly Cron (`.github/workflows/sync-game-health.yml`)

The workflow triggers on a standard cron schedule:

```yaml
on:
  schedule:
    # Runs at 00:00 UTC on the 1st and 15th of every month
    - cron: '0 0 1,15 * *'
  workflow_dispatch: # Allows manual on-demand triggers
```

If the newly fetched data contains changes from the previous run, the workflow commits `assets/data/game-health.json` under `github-actions[bot]` and pushes to `main`. That push immediately triggers the standard GitHub Pages deployment, making the new data live in under sixty seconds.

---

## The Public Telemetry Contract

The data feeding our dashboard is public, transparent, and version-controlled. Anyone can inspect the raw aggregate JSON at [`/assets/data/game-health.json`]({{ '/assets/data/game-health.json' | relative_url }}).

Here is a snippet of what the automated sync generates:

```json
{
  "meta": {
    "schema_version": "1.0.0",
    "telemetry_schema_version": "3",
    "ruleset_version": "2026.09.1",
    "sync_cadence": "bi-weekly",
    "generated_at": "2026-09-24T05:23:00Z",
    "window_start": "2026-08-27",
    "window_end": "2026-09-23",
    "next_sync_scheduled": "2026-10-08T00:00:00Z"
  },
  "kpis": {
    "completed_wars": 38,
    "player_wins": 17,
    "opponent_wins": 21,
    "human_win_rate_pct": 44.7,
    "ai_win_rate_pct": 55.3,
    "unfiltered_noise_pct": 43.3,
    "analyst_vulnerability_pct": 85.7
  }
}
```

---

## Dynamic Dashboard Hydration

Both this page and our previous entry ([From Simulated Armies to Real Players]({{ '/attrition-game-health/' | relative_url }})) are wired to fetch `game-health.json` upon rendering.

If a player visits the blog right after a bi-weekly sync, their browser quietly pulls the updated numbers and populates the cards, tables, and win-rate bars without requiring a manual redesign. If the network request fails or the user is offline, the dashboard falls back instantly to the committed baseline data.

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

Our next scheduled telemetry sync runs on **October 8, 2026**. 

As more closed testers join the Mont-Rouge campaign and opt in to anonymous sharing, the sample will grow from dozens of Wars to hundreds. We'll be watching to see whether human players continue to exploit Matthias's rigid calculation, whether Marcel's cheese cellar remains impenetrable, and whether anyone breaks the 43-turn marathon record on their way to the 51-turn ceiling.

---

[**View the Live Game Health Dashboard**]({{ '/attrition-game-health/' | relative_url }}) · [**Inspect the Raw JSON Contract**]({{ '/assets/data/game-health.json' | relative_url }}) · [**Read the Development Series**]({{ '/attrition-development/' | relative_url }})

<script>
  (function() {
    fetch('{{ "/assets/data/game-health.json" | relative_url }}')
      .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(data => {
        if (!data || !data.meta) return;
        const genDate = new Date(data.meta.generated_at);
        const nextDate = new Date(data.meta.next_sync_scheduled);
        const syncEl = document.getElementById('liveSyncTimestamp');
        const nextEl = document.getElementById('nextSyncTimestamp');
        if (syncEl && !isNaN(genDate)) {
          syncEl.innerText = genDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        if (nextEl && !isNaN(nextDate)) {
          nextEl.innerText = nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      })
      .catch(err => {
        console.info('Telemetry data loaded from static baseline:', err);
      });
  })();
</script>
