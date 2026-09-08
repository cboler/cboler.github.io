---
layout: post
title: 'We Thought We Were Making War With One Extra Decision'
date: 2026-09-08 14:00:00 -0500
categories: [games, technology]
tags: [attrition, game-development, ai, retrospective]
permalink: /attrition-one-extra-decision/
description: 'A development retrospective on the physical card game, the AI-assisted build, and the year in which one extra decision became an entire system.'
---

*Retrospective covering August 2025 through September 2026. This was written afterward from the repository, project documents, test reports, screenshots, and development conversations. Where later understanding differs from what I believed at the time, I have tried to say so.*

We thought we were making War with one extra decision.

That is still the shortest accurate explanation of **Attrition**. Each side has twenty-six cards. The higher card normally wins. Equal cards begin a Battle. A Two defeats an Ace. The loser of an ordinary clash may accept the loss or **Challenge** it by committing one reinforcement card.

One extra decision.

It turns out that one decision is enough to create strategy, terminology disputes, artificial personalities, accessibility problems, statistical edge cases, a twelve-War campaign about cheese, an achievement taxonomy, a telemetry schema, and a small combinatorial probability laboratory wearing a medieval costume.

This is the first attempt to chronicle how that happened.

## Before there was a repository

Attrition was a physical card game before it was software. Friends and I devised it years ago while working in a small retail shop, under the sort of conditions where a normal deck of cards and enough boredom can become a design department.

The enduring idea was that ordinary War becomes more interesting when defeat is not always automatic. If you lose a clash, you can risk another card to contest the result. Success rescues the original card. Failure loses both. A tie opens the trapdoor into Battle.

That mechanism creates a decision with no perfect answer. Saving a valuable card may be worth the risk. Spending another soldier may merely turn one casualty into two. A player who Challenges constantly can burn through an army; a player who never does gives up every chance at rescue.

The software project began much later, in August 2025, with another experiment layered on top: could I manage an AI coding agent while it developed the application?

The [first blog post]({{ '/2025/08/17/attrition.html' | relative_url }}) was barely more than an invitation to watch the repository. That brevity is revealing. At the time, the interesting story seemed to be that an agent could make an application from plans and milestone issues.

In a few hectic days, the repository moved through routing, responsive layouts, a game engine, real Challenge and Battle mechanics, animation, settings, analytics, tests, deployment repairs, and the first rounds of bug fixing. The commits record that those things happened. They do not capture how quickly “build the game” became “define exactly what the game means.”

## Code was not the only thing being written

The difficult parts were rarely isolated lines of TypeScript. They were contracts expressed in ordinary language:

- Does a reinforcement add its value to the defeated card, or replace it in a new comparison?
- If that comparison ties but neither side can fund a Battle, was the Challenge successful?
- When a Battle cannot continue, which cards count as remaining and which are already committed?
- Does a commander know hidden Battle selections, or only the public state a human opponent could know?
- Is a War complete when the animation ends, when the cards settle, or when the domain state resolves?
- Does an achievement recognize something the player accomplished, something the player witnessed, or merely something statistically unusual?

Software can be internally consistent and still answer one of those questions incorrectly.

That became the recurring workflow. A conversational model helped preserve design context and turn a discussion into a bounded implementation prompt. A coding agent inspected the repository, changed the application, and ran tests. I played what it produced. The resulting bug report or design objection went back through the loop.

The agents were not interchangeable, and neither were their jobs. Some were good at long-form synthesis. Some were better when given a repository and an exact behavioral contract. Some consumed an impressive amount of time contemplating work that should have been mechanical. A completion report could sound definitive while a five-minute play session exposed that two parts of the interface were teaching different rules.

The human part of the loop was not pressing “generate.” It was deciding what counted as correct.

## The year between prototypes

When development resumed in earnest in August 2026, the game changed much more dramatically than the short rules summary did.

The interface was rebuilt around a physical card-table experience. The Field Manual became part rules reference, part Chronicle, part Hall of Valor, and part dossier archive. Individual cards acquired persistent service histories. Five commanders received portraits, voices, different Challenge policies, and competing accounts of an escalating dispute at Mont-Rouge.

The campaign grew into four three-War chapters. The rules accumulate: Classic play gives way to Limited Reserves, Fog of War, and finally Total War, where cumulative card differential can make two narrow victories insufficient to overcome one catastrophe.

None of those additions changed a Seven into anything other than a Seven. That boundary became a design principle. The physical cards remain authoritative. The story, animation, reactions, records, achievements, and progression explain and commemorate what happened; they do not secretly turn the deck into a collection of stat-modified combat units.

The game also moved toward Android distribution and closed testing. That introduced a different kind of work: versioning, store assets, privacy and support pages, achievement mappings, responsive screenshots, physical-device checks, and an extended production-access process.

The romantic version of game development is invention. Much of the actual work was accounting.

That is particularly appropriate for a game whose entire premise is knowing what remains after a battle.

## Closed testing kept reopening “finished” work

The August 2026 announcement called the game something resembling finished. That was true from one distance and obviously false from another.

People actually played it.

They found clipped decks and information panels on phones. They found navigation paths that made it difficult to start again. They found casualty totals that could be correct in the engine and confusing in the presentation. They found unclear achievement names, awkward icon choices, misleading combat-math language, and moments where the interface had forgotten to provide a necessary action.

One of the most useful findings was almost embarrassingly small. The button said **Challenge**. Career statistics counted **Challenges Won**. The Rules of Engagement called the system **Tactical Reinforcements**. The prompt asked whether to **Send reinforcement**.

Those phrases had drifted because “reinforcement” helped explain that the second card was not added numerically to the first. But the explanation had gradually displaced the name of the mechanic.

The terminology is now clearer:

> **Challenge** is the decision and mechanic.
>
> **Reinforcement** is the new card committed during the Challenge.
>
> **Rescue** is a successful result.
>
> **Concede** means accepting the original loss.

No algorithm discovered that distinction for us. Confusion did.

## The game became a probability question

Achievements eventually forced a different kind of audit.

I had played many Wars without seeing **Marathon**, awarded for a very long game, or **Untouchable**, awarded for winning with at least twenty cards remaining. Were they difficult, extraordinarily unlikely, or impossible?

The first answer came from a hard bound: Attrition can last at most fifty-one turns. The second came from preliminary Monte Carlo simulations of the actual card rules under simplified Challenge policies. Marathon was possible, with frequency highly sensitive to how often players risked reinforcements. Untouchable was also possible, but its original threshold lived much farther into the tail than an ordinary visible achievement suggested.

That analysis changed the game. Untouchable moved to eighteen surviving cards. Massacre moved to fourteen Battle casualties so it would not merely duplicate an existing Battle-depth achievement. Visible achievements were divided into Milestones, Distinctions, and Prestige. Five events at the extreme tail became hidden **Anomalies**, revealed only if a player happened to witness one.

The full probability story belongs in [**Rare Is Not the Same Word as Impossible**]({{ '/attrition-monte-carlo/' | relative_url }}). What matters here is that the simulation did not merely describe the software. It caused us to revise the product.

## From estimates to observations

The simulation also exposed its own limit.

A simulated player can be assigned a 20% chance of Challenging each eligible loss. A human does not operate that way. People protect Aces, take absurd risks for Twos, become conservative after a disastrous Battle, learn a commander's tendencies, and occasionally press a button because they want to see what happens.

Attrition already had optional, consent-gated analytics. We expanded the telemetry so that completed Wars, Challenge decisions, Battle depth, public card interactions, campaign context, explicit abandonment, achievements, and rare-event observations could eventually be analyzed together. BigQuery gives those event-level records somewhere to remain queryable after Google Analytics has summarized them.

That creates an unusually satisfying loop:

> rules produce a question → simulation estimates an answer → design changes → consenting players produce observations → observations test the estimate

It may turn out that an event estimated at once in 160 Wars happens once in 147. More interestingly, humans may produce it once in 80. Then we get to ask why.

This is also why the telemetry invitation should be more than “help improve the game.” Players deserve to know what is being asked, what is excluded, and what will be returned to them. I have written that account separately: [**What Attrition Records—and Why**]({{ '/attrition-telemetry/' | relative_url }}).

## Who is “we”?

Writing this history creates a grammatical problem.

I naturally say “we decided,” “the agent misunderstood,” or “Astra spent five hours looking at analytics.” Those are useful descriptions of a process. They are not evidence that a persistent little person lives behind every model name, waiting between prompts and remembering our adventures.

The continuity comes from context: conversations, repository state, instructions, screenshots, summaries, and the next prompt. Another model invocation given enough of that material may continue coherently. It may also retrieve a different detail, weigh an instruction differently, or confidently misunderstand the distinction on which the whole task depends.

There is real computation and real consequence. Code gets written. Tests pass or fail. A confused sentence becomes a corrected rule. I have thoughts I would not otherwise have had. None of that requires me to pretend that the conversational fluency proves a private observer behind the output.

As I put it during one late-night version of this discussion:

> **There’s no spark—funny, because electrons.**

The machine is positively lousy with the more literal kind of sparks. It is the metaphorical one we cannot find.

That line belongs in this record because the AI-assisted nature of the project is important, but anthropomorphizing it carelessly would weaken the account. The academically interesting subject is not a story about an artificial person making a game. It is a longitudinal case of a human using changing AI systems for requirements, implementation, criticism, and context transfer—and repeatedly discovering that faster production makes precise judgment more important, not less.

## What this series is for

The repository is the source of truth for the software. It is a poor diary.

Commit messages show when a campaign service appeared. They rarely explain the play session that made us realize a campaign rule was confusing. A test records the final expected behavior. It does not preserve the three earlier interpretations we rejected. A current document can describe telemetry schema version 3 perfectly while hiding the fact that schema version 2 taught us why the correction mattered.

This series will fill in that layer without pretending memory is infallible. It will preserve what we thought, what we changed, which evidence changed it, and which claims remain provisional.

Attrition is still a small card game. It is also becoming a record of how simple systems surprise their designers—and of how software development changes when generating another implementation becomes easier than deciding what ought to be true.

All because we added one decision to War.

[**Read the complete Developing Attrition series**]({{ '/attrition-development/' | relative_url }}) · [**Play Attrition**](https://cboler.github.io/war-of-attrition-game/)

— Chris
