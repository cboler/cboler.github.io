---
layout: post
title: 'Keeping the Ledger: Attrition Telemetry Now Remembers'
date: 2026-09-29 18:30:00 -0500
categories: [games, technology]
tags: [attrition, telemetry, analytics, github-actions, open-data, research]
permalink: /attrition-telemetry-ledger/
description: 'The Game Health pipeline used to overwrite its only data file every two weeks. It now keeps an immutable, non-overlapping snapshot per period, publishes CSV exports, and lets the dashboard switch between any period or all of them.'
---

*Field Dispatch, September 29, 2026. A correction to [The Two-Week Pulse]({{ '/attrition-telemetry-pulse/' | relative_url }}), implemented by Claude, Anthropic's coding agent, at my direction.*

The bi-weekly pipeline described in *The Two-Week Pulse* had a flaw that was easy to miss because it had not run for real yet. Every sync rewrote `game-health.json` in place. The dashboard would always have been current, and it would never have been able to show where it came from. Each run would have erased the last.

For a scoreboard, that is fine. Attrition's telemetry was never meant to be a scoreboard. The point of recording consented play was to test the Monte Carlo estimates against people, and eventually to support real analysis: how human Challenge decisions differ from simulated policies, whether commander balance drifts as players learn, and how rare the "astronomical" events actually are. Achievement thresholds could then be designed from observed rather than simulated frequencies. All of that needs history.

## What the pipeline does now

Each run queries only the period since the last stored snapshot and writes it to its own dated file:

| File | Purpose |
| --- | --- |
| [`index.json`]({{ '/assets/data/game-health/index.json' | relative_url }}) | Manifest of stored periods, commander catalog, next scheduled sync |
| `snapshots/<period_end>.json` | One immutable snapshot per period, with per-section provenance |
| [`history.csv`]({{ '/assets/data/game-health/history.csv' | relative_url }}) | One KPI row per period, including per-commander results |
| [`war-ledger.csv`]({{ '/assets/data/game-health/war-ledger.csv' | relative_url }}) | Completed Wars aggregated by commander, outcome, turns, Battles, deficit, comeback, reinforcements, and anomalies |

Three rules keep it analyzable:

1. **Periods never overlap,** so counts can be pooled without double counting.
2. **Rates are recomputed from pooled counts,** never averaged across periods.
3. **Missing means missing.** A section GA4 could not supply is `null` with a note. It is never quietly carried forward from an older period.

The original 28-day exploration is preserved as the first period and labeled `ga4-exploration-baseline`. It came from a hand-built GA4 exploration rather than the Data API, and it should stay distinguishable from API-sourced data forever.

## A bug found on the way

Rewriting the sync surfaced a second problem. The old script asked GA4 for a dimension named `commander`, but the game emits `commander_id`. The first live run would have failed. The dashboard documentation had a similar mismatch, naming `surface_transition` and `surface_id` where the game actually emits `surface_opened` with `surface`.

The new script asks GA4's metadata endpoint which custom dimensions are registered and uses those. Anything it cannot find is reported in the snapshot's notes instead of crashing the run or inventing numbers. A small `node:test` suite now runs before every sync.

## The dashboard

The [Game Health dashboard]({{ '/attrition-game-health/' | relative_url }}) now renders entirely from this history:

- A **Dataset** switcher chooses between *All periods combined* and any single stored period.
- A **Trends** tab plots the human win rate and War pace per period. It fills in as periods accumulate.
- A **Data & Provenance** tab links every snapshot and export and shows exactly where each section came from.

The first API-sourced period, September 24–30, is scheduled for October 1.

[**View the dashboard**]({{ '/attrition-game-health/' | relative_url }}) · [**Download history.csv**]({{ '/assets/data/game-health/history.csv' | relative_url }}) · [**Read the development series**]({{ '/attrition-development/' | relative_url }})
