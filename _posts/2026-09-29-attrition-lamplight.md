---
layout: post
title: 'Lamplight: Giving the Attrition Table a Pulse'
date: 2026-09-29 18:00:00 -0500
categories: [games, technology]
tags: [attrition, game-development, three-js, webgl, animation, accessibility]
permalink: /attrition-lamplight/
description: 'Release 4.3.0 adds a lazy-loaded three.js layer to the Attrition card table: a lamp-lit felt, sparks that know who won, Battles that heat the room, and a finale that feels like one. None of it changes a rule.'
---

*Field Dispatch, September 29, 2026. Release 4.3.0. Implemented in a single session by Claude, Anthropic's coding agent, under my direction and review, and recorded here the way the development series records everything else: what was built, what constrained it, and what it found along the way.*

Attrition's rules have been stable for a while. The table they are played on was flat: CSS felt, CSS cards, and small SVG soldiers who charged across the middle when a comparison resolved. It worked. It did not feel like a war.

The brief for 4.3.0 was narrow on purpose: **do not redesign the game, make it look and feel extraordinary.**

[**Play Attrition**](https://cboler.github.io/war-of-attrition-game/)

---

## What changed

### A table under a lamp

The felt is now a WebGL shader rather than a gradient. Woven fibre grain sits over slow, cloudy dye mottling, beneath a single pool of warm oil-lamp light that flickers slightly. Dust motes drift up through the light.

When a Battle begins, the room changes. Each recursive layer raises the table's *tension*. The lamp warms toward ember orange, firelight licks in from the rails, and the dust becomes rising sparks. A depth-3 Battle looks and feels different from a routine clash before you read a single number.

### Sparks that know who won

When two cards meet, sparks burst from the point of contact and drive into the beaten card's half of the table, in the victor's army colours: crimson and gold for the red deck, steel blue for the black. Ties throw silver both ways. When a 2 fells an Ace, the override gets a violet starburst of its own.

### Casualties you can follow

Cards bound for the Boneyard trail embers along an arc into the pile. Cards returning to a winner's deck trail gilt. A fallen Ace or 2 flares red on reveal, and a fallen court card glows. The Boneyard was always a count; now you can watch it being fed.

### Endings that feel like endings

Victory launches volleys of paper confetti from both rails, fireworks, and a gilded grade over the whole table. Defeat drains the colour from the felt while ash and a few dying cinders fall. Achievements burst from the toast that announces them.

### Cards with weight

The cards themselves are CSS, not WebGL, and they got the most careful pass of all. They now have ivory stock with a faint linen tooth, a printer's frame tinted by suit, letterpress pips, and gilt medallions behind Aces and court cards. Every card back gets a lacquered finish and centre medallion, over whichever backing you have chosen, and each card casts a layered contact shadow onto the felt. A card turned face-up on the table lifts, flashes, and catches the lamp.

---

## The constraints that mattered

**Decoration only.** The effects layer never reads game state directly. It observes the same public presentation signals that already drive the CSS choreography, measures the DOM those signals produced, and paints. It cannot see hidden Battle cards, and nothing it does feeds back into play. Delete it and the game is identical.

**Never in the way.** The overlay is pointer-transparent and sits beneath dialogs, drawers, and the tutorial. Its timings are read from the table's own CSS animation variables, so they follow the *Animation Speed* setting automatically.

**Pay only for what you use.** three.js lives in its own lazily loaded chunk of about 116 kB compressed, fetched after the table appears. The initial bundle did not grow. The overlay's render loop runs only while something is actually animating, then stops. The backdrop pauses whenever the tab is hidden.

**Respect the player and the device.** With animations switched off, or with the system's *reduce motion* preference, the table renders one still, lamp-lit frame and no particles. Phones and low-memory devices get a lighter tier: fewer particles, a capped pixel ratio, and a 30 fps backdrop. Without WebGL, or if the graphics context is lost, the original CSS table remains underneath and simply shows through.

**Keep the tests honest.** The effects stay off under unit tests, under the Playwright store-screenshot pipeline, and for scripted screenshot scenes, so none of those became flaky. A new spec compiles every shader in headless Chrome and fails on any WebGL program error. That spec exists because the first ember shader silently failed to link on a precision mismatch, and nothing noticed until a human-eyed check found no embers.

---

## What the stress test found

To watch the effects under real play, the session drove the table with an automated player that drew, challenged, conceded, and chose Battle targets as fast as the controls allowed. That surfaced a bug that has nothing to do with visuals. A second tap on **Challenge** or **Concede** during the brief skirmish after the first tap can resolve the same decision twice, and the table resets with an invalid-state error.

It reproduces with the effects disabled entirely. It is now a tracked issue with a proposed guard and regression test, and this visuals-only release deliberately leaves it untouched.

---

## What did not change

The rules, the commanders, the AI, the telemetry schema, and the Google Play integration. Release 4.3.0 is a presentation release. If a War feels different to play, it should be because it finally looks like a war.

[**Play Attrition**](https://cboler.github.io/war-of-attrition-game/) · [**Read the development series**]({{ '/attrition-development/' | relative_url }}) · [**Technical notes: table effects**](https://github.com/cboler/war-of-attrition-game/blob/main/developer-docs/table-effects.md)
