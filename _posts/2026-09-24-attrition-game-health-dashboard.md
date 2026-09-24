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
</style>

<div class="gh-dashboard" id="gameHealthDashboard">
  <!-- Dashboard Header -->
  <div class="gh-header">
    <div class="gh-title-group">
      <h3>Attrition — Game Health Exploration</h3>
      <p class="gh-subtitle" id="gh-subtitle">Consented GA4 Gameplay Telemetry · 28-Day Active Cohort (Aug 27 – Sep 23, 2026)</p>
    </div>
    <div class="gh-badge-group">
      <span class="gh-badge green">Schema v3</span>
      <span class="gh-badge">GA4 Property 501489186</span>
      <span class="gh-badge">PGS v1 Aligned</span>
      <span class="gh-badge" style="border-color: #2ecc71; color: #2ecc71;">Bi-Weekly Sync</span>
    </div>
  </div>

  <!-- Key Metrics Row -->
  <div class="gh-kpis">
    <div class="gh-kpi-card">
      <div class="gh-kpi-val" id="kpi-completed-wars">38</div>
      <div class="gh-kpi-label">Completed Wars</div>
      <div class="gh-kpi-sub">Across 5 Commanders</div>
    </div>
    <div class="gh-kpi-card">
      <div class="gh-kpi-val green" id="kpi-human-win-rate">44.7%</div>
      <div class="gh-kpi-label">Human Win Rate</div>
      <div class="gh-kpi-sub"><span id="kpi-player-wins">17</span> Player Victories</div>
    </div>
    <div class="gh-kpi-card">
      <div class="gh-kpi-val red" id="kpi-ai-win-rate">55.3%</div>
      <div class="gh-kpi-label">AI Win Rate</div>
      <div class="gh-kpi-sub"><span id="kpi-opponent-wins">21</span> Opponent Victories</div>
    </div>
    <div class="gh-kpi-card">
      <div class="gh-kpi-val amber" id="kpi-unfiltered-noise">43.3%</div>
      <div class="gh-kpi-label">Unfiltered Noise</div>
      <div class="gh-kpi-sub">29 (not set) Stream Events</div>
    </div>
    <div class="gh-kpi-card">
      <div class="gh-kpi-val green" id="kpi-analyst-vulnerability">85.7%</div>
      <div class="gh-kpi-label">Analyst Vulnerability</div>
      <div class="gh-kpi-sub">6 Wins in 7 Matches</div>
    </div>
  </div>

  <!-- Tab Bar -->
  <div class="gh-tabs" role="tablist">
    <button class="gh-tab-btn active" onclick="switchDashboardTab('commanders')" role="tab" id="tab-cmd">⚔️ Commander Matchups</button>
    <button class="gh-tab-btn" onclick="switchDashboardTab('wars')" role="tab" id="tab-wars">⏱️ War Dynamics (W...)</button>
    <button class="gh-tab-btn" onclick="switchDashboardTab('battles')" role="tab" id="tab-bat">🛡️ Battles & Challenges (B...)</button>
    <button class="gh-tab-btn" onclick="switchDashboardTab('playstats')" role="tab" id="tab-pgs">🏆 Google Play Stats & Feats</button>
    <button class="gh-tab-btn" onclick="switchDashboardTab('surfaces')" role="tab" id="tab-sur">📖 Surface Engagement (V...)</button>
  </div>

  <!-- PANEL 1: COMMANDERS -->
  <div class="gh-panel active" id="panel-commanders">
    <div class="gh-toolbar">
      <div class="gh-toggle-group">
        <label class="gh-switch">
          <input type="checkbox" id="rawFilterToggle" onchange="toggleRawFilter()">
          <span class="gh-slider"></span>
        </label>
        <span id="filterLabel"><strong>Showing: Filtered View (`event_name = war_resolved`)</strong> — 38 clean Wars</span>
      </div>
      <div>
        <span style="color: #9cb8ad;">Tableau: <strong>Free form</strong></span>
      </div>
    </div>

    <!-- Filtered Commander Cards Grid -->
    <div class="gh-commander-grid" id="commanderCards">
      <!-- Marcel de Brie -->
      <div class="gh-cmd-card">
        <div class="gh-cmd-top">
          <img src="{{ '/assets/images/attrition/commanders/quartermaster.jpg' | relative_url }}" alt="Marcel de Brie" class="gh-cmd-portrait" />
          <div class="gh-cmd-identity">
            <h4>Marcel de Brie</h4>
            <div class="gh-cmd-title">The Quartermaster</div>
            <div class="gh-cmd-id">ID: quartermaster</div>
          </div>
        </div>
        <div class="gh-cmd-body">
          <div class="gh-stat-bar-group">
            <div class="gh-stat-bar-labels">
              <span>Player: 4 (36.4%)</span>
              <span>Marcel: 7 (63.6%)</span>
            </div>
            <div class="gh-stat-bar-track">
              <div class="gh-stat-bar-fill" style="width: 36.4%;"></div>
            </div>
          </div>
          <div class="gh-cmd-details">
            <strong>Strategy:</strong> High card value weight (0.84), narrow gamble band (0.85). Marcel treats his reserve like aged cheese—rarely risking soldiers without strong mathematical odds.
          </div>
        </div>
      </div>

      <!-- Bastien de Herve -->
      <div class="gh-cmd-card">
        <div class="gh-cmd-top">
          <img src="{{ '/assets/images/attrition/commanders/attritionist.jpg' | relative_url }}" alt="Bastien de Herve" class="gh-cmd-portrait" />
          <div class="gh-cmd-identity">
            <h4>Bastien de Herve</h4>
            <div class="gh-cmd-title">The Attritionist</div>
            <div class="gh-cmd-id">ID: attritionist</div>
          </div>
        </div>
        <div class="gh-cmd-body">
          <div class="gh-stat-bar-group">
            <div class="gh-stat-bar-labels">
              <span>Player: 3 (33.3%)</span>
              <span>Bastien: 6 (66.7%)</span>
            </div>
            <div class="gh-stat-bar-track">
              <div class="gh-stat-bar-fill" style="width: 33.3%;"></div>
            </div>
          </div>
          <div class="gh-cmd-details">
            <strong>Strategy:</strong> Heavy deck sustainability penalty (-36 unsupported tie). The Tyromancer grinds human players into late-game exhaustion, winning two-thirds of all encounters.
          </div>
        </div>
      </div>

      <!-- Matthias von Greyerz -->
      <div class="gh-cmd-card" style="border-color: #2ecc71;">
        <div class="gh-cmd-top">
          <img src="{{ '/assets/images/attrition/commanders/analyst.jpg' | relative_url }}" alt="Matthias von Greyerz" class="gh-cmd-portrait" />
          <div class="gh-cmd-identity">
            <h4>Matthias von Greyerz</h4>
            <div class="gh-cmd-title">The Analyst</div>
            <div class="gh-cmd-id">ID: analyst</div>
          </div>
        </div>
        <div class="gh-cmd-body">
          <div class="gh-stat-bar-group">
            <div class="gh-stat-bar-labels">
              <span style="color: #2ecc71; font-weight: bold;">Player: 6 (85.7%)</span>
              <span>Matthias: 1 (14.3%)</span>
            </div>
            <div class="gh-stat-bar-track">
              <div class="gh-stat-bar-fill" style="width: 85.7%;"></div>
            </div>
          </div>
          <div class="gh-cmd-details">
            <strong>Vulnerability:</strong> Highest win-rate weight (56) and pool strength (0.16). Matthias calculates purely on legal public odds. Human players exploit his predictability, handing him a brutal 14% win rate.
          </div>
        </div>
      </div>

      <!-- Sir Edmund Gloucester -->
      <div class="gh-cmd-card">
        <div class="gh-cmd-top">
          <img src="{{ '/assets/images/attrition/commanders/gambler.jpg' | relative_url }}" alt="Sir Edmund Gloucester" class="gh-cmd-portrait" />
          <div class="gh-cmd-identity">
            <h4>Sir Edmund Gloucester</h4>
            <div class="gh-cmd-title">The Gambler</div>
            <div class="gh-cmd-id">ID: gambler</div>
          </div>
        </div>
        <div class="gh-cmd-body">
          <div class="gh-stat-bar-group">
            <div class="gh-stat-bar-labels">
              <span>Player: 3 (42.9%)</span>
              <span>Edmund: 4 (57.1%)</span>
            </div>
            <div class="gh-stat-bar-track">
              <div class="gh-stat-bar-fill" style="width: 42.9%;"></div>
            </div>
          </div>
          <div class="gh-cmd-details">
            <strong>Strategy:</strong> Broadest gamble band (1.35) and zero reserve depletion penalty. Sir Edmund embraces chaos and challenges impulsively, producing near-even coin-flip outcomes.
          </div>
        </div>
      </div>

      <!-- Lorenzo di Taleggio -->
      <div class="gh-cmd-card">
        <div class="gh-cmd-top">
          <img src="{{ '/assets/images/attrition/commanders/cornered-general.jpg' | relative_url }}" alt="Lorenzo di Taleggio" class="gh-cmd-portrait" />
          <div class="gh-cmd-identity">
            <h4>Lorenzo di Taleggio</h4>
            <div class="gh-cmd-title">The Cornered General</div>
            <div class="gh-cmd-id">ID: cornered-general</div>
          </div>
        </div>
        <div class="gh-cmd-body">
          <div class="gh-stat-bar-group">
            <div class="gh-stat-bar-labels">
              <span>Player: 1 (25.0%)</span>
              <span>Lorenzo: 3 (75.0%)</span>
            </div>
            <div class="gh-stat-bar-track">
              <div class="gh-stat-bar-fill" style="width: 25.0%;"></div>
            </div>
          </div>
          <div class="gh-cmd-details">
            <strong>Strategy:</strong> Severe desperation bonus (58 at <= 3 cards). When pushed into a corner, Lorenzo attacks relentlessly, winning 3 of 4 recorded trials.
          </div>
        </div>
      </div>
    </div>

    <!-- Data Table View -->
    <div class="gh-table-wrap">
      <table class="gh-table" id="matchupTable">
        <thead>
          <tr>
            <th>Commander</th>
            <th class="gh-num raw-col" style="display: none;">(not set)</th>
            <th class="gh-num">Opponent Win</th>
            <th class="gh-num">Player Win</th>
            <th class="gh-num">Total Events</th>
            <th class="gh-num clean-col">Player Win Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr class="noise-row raw-col" style="display: none;">
            <td>(not set) <span style="font-size: 0.7rem; color: #e74c3c;">[stream noise]</span></td>
            <td class="gh-num">29</td>
            <td class="gh-num">0</td>
            <td class="gh-num">0</td>
            <td class="gh-num">29</td>
            <td class="gh-num clean-col">—</td>
          </tr>
          <tr>
            <td><strong>Marcel de Brie</strong> (quartermaster)</td>
            <td class="gh-num raw-col" style="display: none;">0</td>
            <td class="gh-num">7</td>
            <td class="gh-num">4</td>
            <td class="gh-num">11</td>
            <td class="gh-num clean-col"><span style="color: #e74c3c;">36.4%</span></td>
          </tr>
          <tr>
            <td><strong>Bastien de Herve</strong> (attritionist)</td>
            <td class="gh-num raw-col" style="display: none;">0</td>
            <td class="gh-num">6</td>
            <td class="gh-num">3</td>
            <td class="gh-num">9</td>
            <td class="gh-num clean-col"><span style="color: #e74c3c;">33.3%</span></td>
          </tr>
          <tr style="background: rgba(46, 204, 113, 0.08);">
            <td><strong>Matthias von Greyerz</strong> (analyst) ⭐</td>
            <td class="gh-num raw-col" style="display: none;">0</td>
            <td class="gh-num">1</td>
            <td class="gh-num">6</td>
            <td class="gh-num">7</td>
            <td class="gh-num clean-col"><strong style="color: #2ecc71;">85.7%</strong></td>
          </tr>
          <tr>
            <td><strong>Sir Edmund Gloucester</strong> (gambler)</td>
            <td class="gh-num raw-col" style="display: none;">0</td>
            <td class="gh-num">4</td>
            <td class="gh-num">3</td>
            <td class="gh-num">7</td>
            <td class="gh-num clean-col">42.9%</td>
          </tr>
          <tr>
            <td><strong>Lorenzo di Taleggio</strong> (cornered-general)</td>
            <td class="gh-num raw-col" style="display: none;">0</td>
            <td class="gh-num">3</td>
            <td class="gh-num">1</td>
            <td class="gh-num">4</td>
            <td class="gh-num clean-col"><span style="color: #e74c3c;">25.0%</span></td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row" id="tableTotals">
            <td>Filtered Clean Total</td>
            <td class="gh-num raw-col" style="display: none;">29</td>
            <td class="gh-num">21 (55.3%)</td>
            <td class="gh-num">17 (44.7%)</td>
            <td class="gh-num" id="totalEventCount">38</td>
            <td class="gh-num clean-col">44.7%</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="gh-callout">
      <strong>Tab Filter Insight:</strong> When the tab-level filter <code>Event name exactly matches war_resolved</code> is applied, all 29 un-scoped intermediate events disappear, revealing the authentic 38-game dataset: 21 AI victories and 17 human victories across all five commanders.
    </div>
  </div>

  <!-- PANEL 2: WARS (W...) -->
  <div class="gh-panel" id="panel-wars">
    <div class="gh-callout" style="margin-top: 0; margin-bottom: 1rem;">
      <strong>Tab W... (War Dynamics & Length):</strong> Analyzes turn distributions, completion rates, and astronomical anomalies (0..5 observed per match).
    </div>

    <div class="gh-table-wrap">
      <table class="gh-table">
        <thead>
          <tr>
            <th>Turn Depth Bucket</th>
            <th class="gh-num">Observed Wars</th>
            <th class="gh-num">Pct of Matches</th>
            <th>Observed Dynamics & Calibrations</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1 – 15 Turns</strong> (Abrupt Collapse)</td>
            <td class="gh-num">5</td>
            <td class="gh-num">13.2%</td>
            <td>Early recursive Battles or severe challenge failures wiping reserves quickly.</td>
          </tr>
          <tr style="background: rgba(179, 146, 71, 0.08);">
            <td><strong>16 – 30 Turns</strong> (Modal Pacing)</td>
            <td class="gh-num">22</td>
            <td class="gh-num">57.9%</td>
            <td>Standard war progression matching our 22.4 median turn Monte Carlo model.</td>
          </tr>
          <tr>
            <td><strong>31 – 41 Turns</strong> (Extended Sieges)</td>
            <td class="gh-num">10</td>
            <td class="gh-num">26.3%</td>
            <td>Stubborn attrition defense, especially against Bastien and Marcel.</td>
          </tr>
          <tr>
            <td><strong>42 – 51 Turns</strong> (The Marathon Zone)</td>
            <td class="gh-num">1</td>
            <td class="gh-num">2.6%</td>
            <td>Single 43-turn marathon observed! Validates the <em>Marathon</em> achievement.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PANEL 3: BATTLES (B...) -->
  <div class="gh-panel" id="panel-battles">
    <div class="gh-callout" style="margin-top: 0; margin-bottom: 1rem;">
      <strong>Tab B... (Battles & Reinforcements):</strong> Evaluates decisions on the <code>reinforcement_resolved</code> event, distinguishing outright comparison wins from ties that escalate to recursive Battle.
    </div>

    <div class="gh-table-wrap">
      <table class="gh-table">
        <thead>
          <tr>
            <th>Challenge Scenario</th>
            <th class="gh-num">Human Decision</th>
            <th class="gh-num">AI Decision</th>
            <th>Resolution & Escalation Pattern</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Outright Rescue (Success)</strong></td>
            <td class="gh-num">52.8%</td>
            <td class="gh-num">48.1%</td>
            <td>Reinforcement rank exceeds original opponent card; card saved.</td>
          </tr>
          <tr>
            <td><strong>Failed Rescue (Double Loss)</strong></td>
            <td class="gh-num">36.1%</td>
            <td class="gh-num">41.4%</td>
            <td>Reinforcement fails; both cards sent to casualty boneyard.</td>
          </tr>
          <tr style="background: rgba(179, 146, 71, 0.08);">
            <td><strong>Tie Escalating to Battle</strong> (<code>escalated_to_battle = 1</code>)</td>
            <td class="gh-num">11.1%</td>
            <td class="gh-num">10.5%</td>
            <td>Equal ranks trigger recursive 3-card sacrifice Battle.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- PANEL 4: GOOGLE PLAY STATS & FEATS -->
  <div class="gh-panel" id="panel-playstats">
    <div class="gh-callout" style="margin-top: 0; margin-bottom: 1rem;">
      <strong>Google Play Game Stats v1 Derivation:</strong> In <a href="https://github.com/cboler/war-of-attrition-game/blob/main/developer-docs/google-play-game-stats-v1.md"><code>google-play-game-stats-v1.md</code></a>, we specified 11 permanent player-career stats based on a single <code>war_completed</code> event. Below, we project and derive those exact 11 values from our consented GA4 telemetry stream for the 38-War baseline cohort.
    </div>

    <div class="gh-table-wrap">
      <table class="gh-table">
        <thead>
          <tr>
            <th>Google Play Stat</th>
            <th>Aggregation</th>
            <th class="gh-num">Derived Value</th>
            <th>Description & Human Meaning</th>
            <th>Underlying Telemetry Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="gh-tag pgs">wars_fought</span></td>
            <td><code>COUNT(turns)</code></td>
            <td class="gh-num"><strong>38</strong> Wars</td>
            <td>Total completed Wars (wins, losses, ties).</td>
            <td><code>war_resolved.turn_number</code></td>
          </tr>
          <tr>
            <td><span class="gh-tag pgs">wars_won</span></td>
            <td><code>SUM(player_win)</code></td>
            <td class="gh-num"><strong style="color: #2ecc71;">17</strong> Wins</td>
            <td>Completed Wars ending in player victory (44.7%).</td>
            <td><code>war_resolved.outcome == 'player_win'</code></td>
          </tr>
          <tr>
            <td><span class="gh-tag pgs">comeback_victories</span></td>
            <td><code>COUNT(deficit &ge; 3)</code></td>
            <td class="gh-num"><strong>4</strong> Wars</td>
            <td>Victories after trailing by 3+ cards at turn start.</td>
            <td><code>war_resolved.comeback_deficit &ge; 3</code></td>
          </tr>
          <tr>
            <td><span class="gh-tag pgs">greatest_comeback</span></td>
            <td><code>MAX(deficit)</code></td>
            <td class="gh-num"><strong>6</strong> Cards</td>
            <td>Largest deficit overcome in victory (Competitive).</td>
            <td><code>MAX(war_resolved.comeback_deficit)</code></td>
          </tr>
          <tr>
            <td><span class="gh-tag pgs">battles_fought</span></td>
            <td><code>SUM(battles)</code></td>
            <td class="gh-num"><strong>54</strong> Battles</td>
            <td>Distinct Battles entered across completed Wars (1.42/war).</td>
            <td><code>COUNT(battle_started)</code></td>
          </tr>
          <tr>
            <td><span class="gh-tag pgs">deepest_battle</span></td>
            <td><code>MAX(deepest_battle)</code></td>
            <td class="gh-num"><strong>3</strong> Layers</td>
            <td>Most 3-card sacrifice layers dealt in one Battle (Competitive).</td>
            <td><code>MAX(battle_layer_added.layerRound)</code></td>
          </tr>
          <tr>
            <td><span class="gh-tag pgs">longest_war</span></td>
            <td><code>MAX(turns)</code></td>
            <td class="gh-num"><strong>43</strong> Turns</td>
            <td>Most turns in one completed War (The Marathon!).</td>
            <td><code>MAX(war_resolved.turn_number)</code></td>
          </tr>
          <tr>
            <td><span class="gh-tag pgs">reinforcements_sent</span></td>
            <td><code>SUM(reinforcements)</code></td>
            <td class="gh-num"><strong>72</strong> Cards</td>
            <td>Player Challenge reinforcement cards committed.</td>
            <td><code>COUNT(reinforcement_resolved)</code></td>
          </tr>
          <tr>
            <td><span class="gh-tag pgs">successful_reinforcements</span></td>
            <td><code>SUM(rescues)</code></td>
            <td class="gh-num"><strong>38</strong> Rescues</td>
            <td>Reinforcements winning outright (52.8% rescue rate).</td>
            <td><code>reinforcement_resolved.outcome == 'success'</code></td>
          </tr>
          <tr style="background: rgba(179, 146, 71, 0.08);">
            <td><span class="gh-tag pgs">aces_felled_by_twos</span></td>
            <td><code>SUM(two_beats_ace)</code></td>
            <td class="gh-num"><strong>11</strong> Aces</td>
            <td>Opponent Aces directly beaten by human Twos.</td>
            <td><code>comparison_resolved.two_beats_ace_applied</code></td>
          </tr>
          <tr style="background: rgba(179, 146, 71, 0.08);">
            <td><span class="gh-tag pgs">astronomical_anomalies_observed</span></td>
            <td><code>SUM(anomalies)</code></td>
            <td class="gh-num"><strong>2</strong> Anomalies</td>
            <td>Astronomically rare deck/battle events confirmed.</td>
            <td><code>war_resolved.anomalies_observed</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Telemetry Rare Events & Achievements -->
    <div style="margin-top: 1.5rem;">
      <h4 style="color: #f3d999; margin: 0 0 0.5rem; font-size: 0.95rem;">Rare Events & Achievement Tracking in Telemetry</h4>
      <div class="gh-table-wrap">
        <table class="gh-table">
          <thead>
            <tr>
              <th>Tracking Scope</th>
              <th>Telemetry Event</th>
              <th>Classification</th>
              <th class="gh-num">Observed in Cohort</th>
              <th>What It Verifies</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>First-Time Unlocks</strong></td>
              <td><code>achievement_unlocked</code></td>
              <td>Milestone / Distinction / Prestige</td>
              <td class="gh-num"><strong>68</strong> Unlocks</td>
              <td>Career progression milestones (e.g. <em>First Blood</em>, <em>Bloodless Clashes</em>).</td>
            </tr>
            <tr>
              <td><strong>Repeatable Rare Feats</strong></td>
              <td><code>achievement_observed</code></td>
              <td>Prestige / Anomaly Feats</td>
              <td class="gh-num"><strong>19</strong> Observations</td>
              <td>Repeat occurrences of high-difficulty feats (including <code>war.wrong_tool_for_job</code>).</td>
            </tr>
            <tr>
              <td><strong>Astronomical Anomalies</strong></td>
              <td><code>war_resolved.anomalies_observed</code></td>
              <td>Astronomical Anomaly (0..5)</td>
              <td class="gh-num"><strong>2</strong> Wars</td>
              <td>Astronomical card collisions calibrated during Monte Carlo analysis.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="gh-callout">
      <strong>The Telemetry & Google Play Overlap:</strong> Google Play Game Stats v1 is a single-event career accumulator, while GA4 telemetry is a multi-event stream. Because both are generated from the game's typed event bus, GA4 telemetry can project every Play Game Stat with complete mathematical precision—even while native Android channel hooks are quiescent.
    </div>
  </div>

  <!-- PANEL 5: SURFACES (V...) -->
  <div class="gh-panel" id="panel-surfaces">
    <div class="gh-callout" style="margin-top: 0; margin-bottom: 1rem;">
      <strong>Tab V... (Surface Views & Intentional Navigation):</strong> Tracks how players explore supporting lore, rulebooks, and archives via <code>surface_transition</code> events.
    </div>

    <div class="gh-table-wrap">
      <table class="gh-table">
        <thead>
          <tr>
            <th>Surface Area</th>
            <th class="gh-num">Unique Sessions</th>
            <th>Primary Player Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Field Manual & Rules</strong></td>
            <td class="gh-num">64</td>
            <td>Checking the 2-defeats-Ace exception and Battle escalation rules.</td>
          </tr>
          <tr>
            <td><strong>The Chronicle</strong></td>
            <td class="gh-num">48</td>
            <td>Inspecting past campaign progress and historic war timelines.</td>
          </tr>
          <tr>
            <td><strong>Hall of Valor & Profiles</strong></td>
            <td class="gh-num">39</td>
            <td>Viewing veteran cards, service records, and medal citations.</td>
          </tr>
          <tr>
            <td><strong>Settings & Telemetry Consent</strong></td>
            <td class="gh-num">55</td>
            <td>Auditing privacy settings and managing sound/animation toggles.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<script>
  function switchDashboardTab(tabName) {
    const panels = document.querySelectorAll('.gh-panel');
    panels.forEach(p => p.classList.remove('active'));

    const tabBtns = document.querySelectorAll('.gh-tab-btn');
    tabBtns.forEach(b => b.classList.remove('active'));

    const targetPanel = document.getElementById('panel-' + tabName);
    if (targetPanel) targetPanel.classList.add('active');

    // Highlight button
    const btnMap = {
      'commanders': 'tab-cmd',
      'wars': 'tab-wars',
      'battles': 'tab-bat',
      'playstats': 'tab-pgs',
      'surfaces': 'tab-sur'
    };
    const activeBtn = document.getElementById(btnMap[tabName]);
    if (activeBtn) activeBtn.classList.add('active');
  }

  function toggleRawFilter() {
    const isRaw = document.getElementById('rawFilterToggle').checked;
    const rawCols = document.querySelectorAll('.raw-col');
    const cleanCols = document.querySelectorAll('.clean-col');
    const filterLabel = document.getElementById('filterLabel');
    const totalCount = document.getElementById('totalEventCount');
    const totalRow = document.getElementById('tableTotals');

    if (isRaw) {
      rawCols.forEach(el => el.style.display = 'table-cell');
      cleanCols.forEach(el => el.style.display = 'none');
      filterLabel.innerHTML = '<strong>Showing: Raw GA4 Exploration (Unfiltered)</strong> — 67 total events including (not set)';
      totalCount.innerText = '67';
      totalRow.cells[0].innerText = 'Unfiltered Exploration Total';
    } else {
      rawCols.forEach(el => el.style.display = 'none');
      cleanCols.forEach(el => el.style.display = 'table-cell');
      filterLabel.innerHTML = '<strong>Showing: Filtered View (`event_name = war_resolved`)</strong> — 38 clean Wars';
      totalCount.innerText = '38';
      totalRow.cells[0].innerText = 'Filtered Clean Total';
    }
  }

  // Dynamic Telemetry Hydration from assets/data/game-health.json
  (function() {
    fetch('{{ "/assets/data/game-health.json" | relative_url }}')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data || !data.kpis) return;
        const k = data.kpis;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        if (k.completed_wars) setVal('kpi-completed-wars', k.completed_wars);
        if (k.human_win_rate_pct) setVal('kpi-human-win-rate', k.human_win_rate_pct + '%');
        if (k.player_wins) setVal('kpi-player-wins', k.player_wins);
        if (k.ai_win_rate_pct) setVal('kpi-ai-win-rate', k.ai_win_rate_pct + '%');
        if (k.opponent_wins) setVal('kpi-opponent-wins', k.opponent_wins);
        if (k.unfiltered_noise_pct) setVal('kpi-unfiltered-noise', k.unfiltered_noise_pct + '%');
        if (k.analyst_vulnerability_pct) setVal('kpi-analyst-vulnerability', k.analyst_vulnerability_pct + '%');
        if (data.meta && data.meta.window_start && data.meta.window_end) {
          const sub = document.getElementById('gh-subtitle');
          if (sub) {
            sub.innerText = `Consented GA4 Gameplay Telemetry · 28-Day Active Cohort (${data.meta.window_start} – ${data.meta.window_end}) · Synced Bi-Weekly`;
          }
        }
      })
      .catch(() => {});
  })();
</script>

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
