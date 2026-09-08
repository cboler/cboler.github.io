---
layout: post
title: 'Rare Is Not the Same Word as Impossible'
date: 2026-09-08 14:30:00 -0500
categories: [games, science]
tags: [attrition, game-development, probability, monte-carlo, telemetry]
permalink: /attrition-monte-carlo/
description: 'How preliminary Monte Carlo simulations changed Attrition achievements, identified astronomical anomalies, and created questions for real-world telemetry.'
---

*Development period: September 7–8, 2026. These were preliminary design-calibration simulations, not a preregistered experiment or peer-reviewed result. The original simulation code and seeded run artifacts have not yet been preserved as a reproducible package, so the numerical results below should be read as estimates with explicitly stated limitations.*

After playing an unreasonable number of Wars, I began to suspect that two Attrition achievements might be impossible.

**Marathon** required a War lasting at least forty-two turns.

**Untouchable** required a victory with at least twenty of the player's original twenty-six cards remaining.

There are two questions hidden inside that suspicion:

1. Can the rules produce the event at all?
2. If they can, is the event reasonably calibrated for the way the game presents it?

The first can sometimes be answered mathematically. The second usually needs a distribution.

So we did the math, and then we made a million tiny armies fight.

## First, establish what is possible

Attrition begins with fifty-two cards, divided into two armies of twenty-six. Surviving cards return to their owner's deck. Defeated cards leave the War. The winner does not capture and reuse the loser's cards.

Every resolved turn must remove at least one card from one of the armies. For another turn to begin, both armies must still have a card.

After fifty single-card losses, the extreme surviving state is therefore:

```text
player:   1 card
opponent: 1 card
```

Those cards can begin one final clash. That makes **51 turns the mathematical ceiling** under the current conservation rules.

Marathon's forty-two turns are about 82% of the maximum conceivable length. The achievement is possible. That does not yet tell us whether anybody is likely to see it.

Untouchable is possible too, for a delightfully Attrition-specific reason.

Normally the ranks descend from Ace to Two. Attrition adds one exception: a Two defeats an Ace. The result is a cycle:

```text
2 defeats A
A defeats K
K defeats Q
...
3 defeats 2
```

Each color contains two cards of every rank. In principle, the two decks can be ordered so that every player card defeats its paired opponent card. A perfect twenty-six-card victory is therefore constructible.

Possible, however, is doing heroic work in that sentence.

## A deliberately simple first approximation

Untouchable at twenty cards means the player may lose no more than six cards while eliminating almost the entire opposing army.

If we temporarily pretend that every turn removes exactly one card and that either side is equally likely to lose it, the probability that the opponent reaches twenty-six losses before the player reaches seven is:

```text
sum from k = 0 to 6 of:
choose(25 + k, k) × (1/2)^(26 + k)
```

That is approximately:

```text
0.0002675 = 0.02675%
```

or about **1 in 3,738 Wars**.

This is not a model of Attrition. Battles can remove several cards at once. Challenge decisions introduce another card and another conditional comparison. The Two-over-Ace rule makes card strength cyclic. Deck order and recycling matter.

But the approximation is useful as a warning: a twenty-card victory is not merely “play well and eventually win by a lot.” It lives in a severe tail.

## The preliminary Monte Carlo model

The rules-based simulations used:

- separate shuffled twenty-six-card red and black armies;
- two cards of each rank per army;
- survivors returning to their own side and casualties leaving the War;
- the Two-over-Ace exception;
- equal ranks opening recursive Battles;
- three new cards per side for each Battle layer;
- random Challenge decisions at configurable per-opportunity rates.

That last item is the model's greatest practical limitation. Attrition's five commanders make selective decisions using public state. Human players are more complicated still. A fixed random Challenge rate is a sensitivity tool, not a psychological theory.

## Reinforcement is hostile to Marathon

With Challenges disabled, 200,000 simulated Wars produced an average length of about **36.1 turns**. Approximately **15.7%** lasted at least forty-two turns—roughly one in six.

Then the random Challenge rate was increased:

| Challenge rate per eligible loss | Estimated chance of 42+ turns |
| ---: | ---: |
| 0% | 15.7% |
| 10% | 5.7% |
| 15% | 3.0% |
| 20% | 1.6% |
| 25% | 0.7% |
| 30% | 0.3% |

The direction makes sense. A failed Challenge can eliminate two friendly cards instead of one. A tied reinforcement comparison can begin a Battle, which may remove an entire stack. More Challenges mean more opportunities for a War to consume cards in chunks.

So Marathon was not impossible. Its rarity depended heavily on behavior.

That is a better design fact than a single estimated percentage. If real players Challenge more often than expected, Marathon becomes much rarer without the achievement definition changing at all.

## Untouchable was a lottery ticket wearing a medal

The fuller simulation made blowouts somewhat more common than the one-card coin-flip approximation because Battles and failed Challenges can produce catastrophic losses.

Even so, twenty survivors remained deep in the tail. Under a moderate random-Challenge model, the estimates were approximately:

| Player cards remaining after a victory | Estimated frequency |
| ---: | ---: |
| 16 or more | 1.4% |
| 17 or more | 0.9% |
| **18 or more** | **0.56%** |
| 19 or more | 0.32% |
| **20 or more** | **0.18%** |

At 0.18%, the original achievement was on the order of one in several hundred Wars. Even with a generously rounded 0.2% chance per War, a player who completed one hundred Wars would have only about an 18% chance of ever encountering it:

```text
1 - (0.998)^100 ≈ 18%
```

That means many players could earn a career achievement for one hundred Wars and still never see Untouchable.

If the achievement were openly presented as a legendary accident, that might be fine. It was not. It sat alongside visible accomplishments as if persistent play ought eventually to produce it.

We changed the requirement from twenty survivors to **eighteen**. The event remains rare—about 0.56%, or roughly one in 175, in this preliminary model—but it moves from lottery ticket toward something a dedicated player might reasonably witness.

The perfect victory was too interesting to discard. It became something else.

## Achievements and anomalies are different promises

Ordinary achievements suggest agency. Win a War. Survive a deep Battle. Complete a campaign. Do something difficult or memorable.

Some events in Attrition are not sensible goals. They are states the system may happen to produce while a player is present.

That led to four classifications:

- **Milestones** — expected first experiences and career landmarks.
- **Distinctions** — unusual, memorable events a regular player can reasonably encounter.
- **Prestige** — genuinely rare visible feats.
- **Anomalies** — astronomical events hidden until witnessed.

The first five Anomalies were chosen because each describes a qualitatively different extreme:

| Anomaly | Condition |
| --- | --- |
| **Not a Scratch** | Win with all 26 cards remaining. |
| **The Last Standard** | Fall to one card while the opponent has at least 15, then win. |
| **Against Arithmetic** | Win after trailing by at least 20 cards. |
| **The Abyss Answers** | Reach Battle 6. |
| **Fifty-One** | Resolve a War on the mathematical maximum turn. |

They do not appear as five locked silhouettes. They do not inflate the normal achievement denominator. Before one occurs, the player is not told there is an empty box to fill. Afterward, the local profile records an **Anomaly Observed**.

That wording is deliberate. The game is commemorating that the player was there.

The preliminary million-War runs put perfect victories, one-card reversals against large armies, twenty-card comebacks, and Battle 6 in the handful-per-million neighborhood under the modeled policies. A fifty-first turn appeared in no-Challenge runs but disappeared from the million-War moderate-Challenge run. These are order-of-magnitude observations, not stable probability estimates: when an event appears two or five times, the uncertainty is enormous.

The correct conclusion is not “The Last Standard has probability exactly five in a million.” It is “This event belongs to a different design category than an achievement expected during ordinary progression.”

## The casualty threshold hiding inside Battle depth

The same analysis found a duplication in **Massacre**, an achievement for defeating many opponent cards in one Battle.

A Battle begins with the ordinary losing card already at stake. Each layer adds three more cards per side. Ignoring a possible extra Challenge reinforcement, the losing-side casualty totals progress as:

| Battle depth | Casualties |
| ---: | ---: |
| 1 | 4 |
| 2 | 7 |
| 3 | 10 |
| 4 | 13 |
| 5 | 16 |

Massacre originally required ten casualties. Attrition already had an achievement for reaching Battle 3, so the two conditions were effectively recognizing the same event.

Thirteen would merely duplicate Battle 4. Fourteen is the first threshold that requires something beyond the ordinary depth progression—typically the extra card placed at risk through a Challenge.

Massacre therefore moved to **fourteen casualties**. This was a small change produced by understanding the structure rather than merely estimating frequency.

## Two physical Twos are not one rank counted twice

The simulations also helped calibrate **Twin Assassins**:

> In one War, have each of your two physical Twos defeat a different enemy Ace.

A loose implementation could count two Ace defeats by the same Two, or two defeats of the same Ace, and produce the right totals for the wrong event. The achievement tracks physical card identities because the story is about both assassins finding separate targets.

In one million simulated Wars, that strict condition appeared 6,139 times—about **one in 163** under the modeled policy. By contrast, one Two defeating both enemy Aces appeared about one in 54.

Neither result is astronomical. The stricter event belongs among visible Prestige achievements, not hidden Anomalies. The simulation prevented an evocative description from being mistaken for a once-in-a-lifetime probability.

## A simulation is a design instrument, not a player population

These estimates were useful enough to change shipped definitions. They remain limited in ways that matter:

- Challenge choices were randomized rather than produced by actual people.
- Commander policies were simplified rather than modeled as the current implementations.
- The runs were not preregistered.
- The exploratory script, seeds, environment, and raw output were not preserved as a reproducible research package.
- Rare-event estimates based on only a handful of occurrences have very wide uncertainty.
- The game and telemetry continued changing while the questions were being refined.

For product calibration, that is acceptable. We needed to know whether an event was ordinary, rare, or several orders of magnitude farther into the tail.

For an academic claim, it is a beginning—not an endpoint.

The next rigorous step would be to preserve a versioned simulator beside the exact ruleset, use deterministic seeds, define eligibility denominators in advance, run enough trials for target confidence intervals, and validate the simulator against known invariants such as card conservation and the fifty-one-turn ceiling.

The more interesting next step is already beginning: compare simulations with real play.

## This is why Attrition asks about telemetry

The game can record a repeatable `achievement_observed` event whenever a Prestige or Anomaly condition occurs, rather than recording only the first time a local profile unlocks it. Completed Wars also carry their ruleset, schema version, Challenge decisions, Battle depth, result, and other bounded public facts.

With enough consented play, we can ask:

- Does Marathon's frequency follow the simulated Challenge-rate curve?
- Do humans produce more comebacks than random decision policies?
- Does one commander disproportionately create deep Battles?
- How often do both physical Twos actually find different Aces?
- Are events that feel extraordinary genuinely rare across completed Wars?

And eventually, after a defensible denominator exists, the game can return some of that context:

> **The Abyss Answers**
>
> Observed in 4 of 18,721 completed Wars.

That is an illustration, not a current statistic. The distinction is important enough to repeat.

If you play Attrition and choose to share gameplay statistics, you are helping test the simplified model against human decisions. The game does not need your name, email, Google identity, hidden card order, story text, or a persistent Attrition user identifier to do that work.

You can read the exact collection boundaries here: [**What Attrition Records—and Why**]({{ '/attrition-telemetry/' | relative_url }}).

Rare is not the same word as impossible. Simulation helped us learn the difference. Players may help us learn where the simulation was wrong.

[**Read the Developing Attrition series**]({{ '/attrition-development/' | relative_url }}) · [**Play Attrition**](https://cboler.github.io/war-of-attrition-game/)

— Chris
