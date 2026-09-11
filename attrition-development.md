---
layout: page
title: Developing Attrition
permalink: /attrition-development/
description: 'A documented history of turning a physical card game into Attrition—and of using play, simulation, telemetry, and AI-assisted development to understand it.'
---

Attrition began years ago as a variation on War played with an ordinary deck of cards. The digital version began as an experiment in directing an AI coding agent. It has since become a mobile-friendly game, a campaign story, a closed-testing project, a probability problem, and a surprisingly useful record of what happens when a person and several different AI systems keep revising the same idea.

This page collects that history.

## How to read the record

The early posts below were written while their events were happening. The newer posts are retrospectives, published now and labeled with the period they reconstruct. I am not backdating them or pretending that later understanding existed at the time.

Where possible, the retrospectives are grounded in repository history, project documents, test reports, screenshots, implementation reports, and the conversations in which decisions were made. They distinguish among:

- what I believed at the time;
- what an implementation actually did;
- what playtesting revealed;
- what a simulation estimated;
- and what real-world telemetry may eventually establish.

That distinction matters. A clean story assembled afterward is not the same thing as a contemporaneous record, and a Monte Carlo estimate is not an observed fact about human players.

## The series

### Contemporary dispatches

1. [**War of Attrition Game**]({{ '/2025/08/17/attrition.html' | relative_url }}) — August 17, 2025. The original experiment: manage a coding agent while it builds a digital version of a card game invented with friends.

2. [**War of Attrition Game, on Android!**]({{ '/2026/08/17/attrition-android.html' | relative_url }}) — August 17, 2026. The return to the project and the point at which the game began to feel shareable.

3. [**Attrition: The Instruction Booklet**]({{ '/attrition-manual/' | relative_url }}) — September 5, 2026. A cartridge-era field manual for the campaign, commanders, rules, Chronicle, Hall of Valor, and card table.

### Retrospectives

1. [**We Thought We Were Making War With One Extra Decision**]({{ '/attrition-one-extra-decision/' | relative_url }}) — Development period: August 2025–September 2026. The broad arc from a small rules variation to a tested, instrumented game—and what the repository cannot explain without the conversations around it.

2. [**Rare Is Not the Same Word as Impossible**]({{ '/attrition-monte-carlo/' | relative_url }}) — Development period: September 7–8, 2026. The preliminary Monte Carlo work that changed achievement thresholds, separated visible feats from hidden anomalies, and gave the telemetry a scientific question to answer.

### Next in the record

- **Turning a Card Game Into a Place** — the physical-table redesign, commanders, Chronicle, Hall of Valor, and Mont-Rouge campaign.
- **Closed Testing Is Development** — tester discoveries, release candidates, physical-device checks, and the feedback-to-regression-test loop.
- **From Simulated Armies to Real Players** — GA4, BigQuery, schema corrections, and comparing modeled behavior with observed decisions.
- **Who Is Actually Building This?** — human judgment, conversational context, implementation agents, handoffs, failures, and the limits of anthropomorphic language.

Future development notes will join this page as **Field Dispatches** rather than being folded silently into the old posts.

## Telemetry and participation

The Monte Carlo work produced estimates under simplified decision policies. Real people will not necessarily Challenge like simulated players or behave like any of Attrition's commanders. With permission, de-identified gameplay events can help answer the difference.

[**What Attrition records, what it does not, and why sharing is useful**]({{ '/attrition-telemetry/' | relative_url }})

Participation is optional. The invitation is not an argument that privacy should be traded for vague promises to “improve the experience.” It is an invitation to help investigate specific questions, with the collection boundaries and eventual findings made public.

[**Play Attrition**](https://cboler.github.io/war-of-attrition-game/) · [**View the repository**](https://github.com/cboler/war-of-attrition-game)
