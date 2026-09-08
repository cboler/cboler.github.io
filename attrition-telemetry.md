---
layout: page
title: What Attrition Records—and Why
permalink: /attrition-telemetry/
description: 'A plain-language account of Attrition telemetry: the questions it can answer, the information the game excludes, and how players can participate.'
---

Attrition is a deterministic-rules card game with a large space of possible outcomes. A few simple ingredients—two decks, a Challenge decision, recursive Battles, and the rule that a Two defeats an Ace—can produce very long Wars, abrupt reversals, deep cascades of casualties, and events rare enough that ordinary play cannot tell me how rare they really are.

Computer simulations can estimate those probabilities. They cannot tell me how humans actually play.

That is why Attrition asks, after a completed War, whether you would like to share gameplay and app-usage statistics. The setting begins off. Nothing is collected through this system unless you explicitly choose **Share anonymous data**, and you can turn it off again in Settings.

## The questions behind the collection

The telemetry is intended to answer concrete questions:

- How often do players Challenge rather than concede?
- Does that decision change with the cards, score, commander, or campaign rules in view?
- Which commanders produce longer, closer, or more Battle-heavy Wars?
- How often do deep Battles and large comebacks really happen?
- Do the achievement thresholds match what players encounter?
- Where do players explicitly restart or abandon a War?
- Do people use the Chronicle, rules demonstrations, dossiers, and other supporting material?
- Where do simulated probabilities and human outcomes disagree?

That last question is especially interesting. A simulation may estimate that an event occurs once in 160 Wars. If human play produces it once in 80, the discrepancy could point toward strategy, selection effects, commander behavior, or a mistaken model. The disagreement is more informative than a number that matches perfectly.

## What a consented record can contain

Depending on the event, Attrition can send bounded facts such as:

- War start, completion, result, or explicit abandonment;
- turn number and remaining-card totals;
- Challenge offers, decisions, and results;
- Battle depth, public selections, and casualty totals;
- public card ranks, suits, and comparisons after those cards have been revealed;
- campaign mode, modifiers, and summary results;
- achievements unlocked and repeat observations of rare events;
- cosmetic unlocks;
- intentional visits to major areas such as the Chronicle, Field Manual, Rules, Profile, Achievements, and Settings;
- coarse visible-duration ranges such as under 10 seconds, 30–60 seconds, or 3 minutes and longer;
- app, ruleset, and telemetry-schema versions needed to keep unlike releases from being compared carelessly.

Random War, Campaign, and in-memory session identifiers allow related events to be studied together. Attrition does not add a persistent cross-session player identifier or fingerprint for this telemetry.

## What the game deliberately excludes

The gameplay and app-usage records do not include:

- your name or email address;
- your Google account or profile identifier;
- your avatar;
- a persistent Attrition user ID;
- anything you type as a profile name or other user-entered value;
- story, dossier, or commander-dialogue text;
- hidden card identities or unrevealed Battle information;
- a transcript, screen recording, or replay of your play session.

Google Analytics may process ordinary online identifiers and technical information under Google's own terms. Calling the gameplay statistics anonymous does not mean that the wider internet connection ceases to exist; it means Attrition does not attach its gameplay events to the personal and persistent identity fields listed above. The game's [full Privacy Policy](https://cboler.github.io/war-of-attrition-game/privacy) remains the authoritative account.

## What happens when you choose

If you decline, the analytics script is not loaded for Attrition's optional gameplay collection, and missed events are not queued for later.

If you grant permission after a War, gameplay collection begins at the next War boundary. That prevents the dataset from receiving the ending of a War without its beginning. Withdrawing permission stops future collection immediately. It cannot retract events that have already been transmitted to Google.

The records are sent to Google Analytics. Future event-level exports can then be analyzed in BigQuery without depending entirely on whichever summary dimensions were configured in advance. Results should be reported only in aggregate, and community percentages should wait for a defensible sample rather than turning a handful of games into false precision.

## What players receive in return

The first return is public reporting. Future Field Dispatches can compare preliminary simulation estimates with real play, explain balance changes, and report when the evidence contradicts an assumption.

The longer-term possibility is restrained, Dispatch-style context inside the game:

> **Challenge?**
>
> 68% of recorded decisions challenged here.

> **Battle 5 reached.**
>
> This has occurred in 11 of 8,420 recorded Wars.

Those examples are illustrations, not current findings. Attrition should display nothing until the denominator is large enough, and it should count the correct unit—recorded decisions or completed Wars—rather than casually calling every event a different player.

## Why I hope you will opt in

I am trying to understand what this small rules system does when it leaves the simulator and encounters human judgment. Sharing gives each completed War a chance to test the model, reveal a design mistake, calibrate something that only felt rare, or document an event nobody expected to see.

You do not owe the project your data. Declining does not diminish the game. But if this particular experiment interests you, opting in makes your Wars part of the evidence—and I intend to show what the evidence teaches us.

[**Play Attrition**](https://cboler.github.io/war-of-attrition-game/) · [**Read the development series**]({{ '/attrition-development/' | relative_url }})
