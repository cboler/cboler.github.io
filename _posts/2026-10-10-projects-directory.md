---
layout: post
title: 'The Directory: Games and Apps I''m Building'
date: 2026-10-10 12:00:00 -0500
categories: [games, technology]
tags: [directory, projects, pwa, game-development, angular]
permalink: /projects/
description: 'A living index of the games and apps I make, with a short blurb, a status, and a link to play or try each one.'
---

I keep starting things. Some of them get a blog post, and some of them just quietly turn up on GitHub Pages. This post is the one place that lists all of them.

It's a **directory**, and I'll keep it current. When I ship something new, or something changes status, this page gets edited instead of a new post being written. The entries are short on purpose, and the **Status** line on each one is meant to be honest about how finished it is.

*Last updated: October 10, 2026.*

Everything here runs in the browser. Most are installable PWAs that keep working offline, and none of them need an account.

---

## Games

### Crystal Wardens (tower defense)

[**Play it**](https://cboler.github.io/tower-defense/) · [Source](https://github.com/cboler/tower-defense)

A fantasy tactical tower defense game inspired by *Final Fantasy: Crystal Defenders*. You protect the Sacred Crystal Sanctuary from waves of monsters by placing job-class champions on vantage ridges. Eight classes are on offer, including a Ranger who is especially good against flyers, a Chronomancer who slows whole groups, and an Oracle whose aura boosts the towers around her. You also place **Aether Barricades** to bend the enemy path into longer, deadlier routes without blocking it.

- **Three maps**, from a winding valley to a molten caldera where flyers take a different route than ground units.
- **Full controller support**, so it plays well on a couch, along with keyboard and touch.
- **All audio is synthesized** with the Web Audio API, so there are no sound files.

**Status:** playable, with three stages and a full roster.

### Critterstead

[**Play it**](https://cboler.github.io/critterstead/) · [Source](https://github.com/cboler/critterstead)

*A little care. A little adventure.* Critterstead is an original creature-raising game about looking after a companion, learning together, doing useful work, and making a home. You choose a first critter, tend a garden, forage in the glade, chop timber, train at the boulder lift and balance beam, and eventually enter exhibitions at the Colosseum. Grandpa has his own day going on in the background. The world is a small orthographic 3D scene built from procedural geometry.

**Status:** an early playable vertical slice. There are five areas and a lot of systems already, but breeding, deeper Colosseum combat, and more of the story are still planned. Saves live in your browser, so they're per-device.

### Lanes

[**Try it**](https://cboler.github.io/Lanes/) · [Source](https://github.com/cboler/Lanes)

A lane-based tactical RPG inspired by *Grand Kingdom*. Units fight across three lanes, spend separate **Move** and **Action** gauges, and follow a rock-paper-scissors triangle of melee, ranged, and magic. There are six classes, and some abilities reach across lanes or hit a whole lane (friendly fire included, so be careful with Meteor). You can build a squad, give your defenders written orders for their first four turns, and practice against them. Battles play out on a Three.js stage with rigged 3D characters, and there is controller support.

**Status:** a local prototype. There are no accounts, no online battles, and no hiring or progression yet. Combat, squad building, defense orders, and the mercenary roster are what's there now.

### Attrition

[**Play it**](https://cboler.github.io/war-of-attrition-game/) · [The full story]({{ '/attrition-development/' | relative_url }})

A card game that started as a variation on War, played with friends and an ordinary deck. It has its own series of posts covering the rules, the development history, the Monte Carlo analysis, and the telemetry, so it doesn't need much of a blurb here. Start at [**Developing Attrition**]({{ '/attrition-development/' | relative_url }}).

**Status:** playable in your browser and still being tuned.

### Moss & Ember

[**Play it**]({{ '/docs/moss-and-ember/' | relative_url }}) · [The post]({% post_url 2026-09-05-moss-and-ember %})

A small Zelda-style action RPG that came out of one short prompt and one even shorter follow-up. It has two areas, a sword, some magic, and a temple boss.

**Status:** a finished little prototype.

---

## Tools and learning

### Interactive Math & History

[**Open it**](https://cboler.github.io/interactive-math-history/) · [Source](https://github.com/cboler/interactive-math-history)

A math curriculum for kids that starts from the human story behind each idea. Addition begins with a notched bone from Central Africa, and fractions begin with an Egyptian papyrus. Every lesson has a photo of a real artifact and a "How do we know?" card that says plainly how sure historians are. Hands-on SVG labs (a number line, a balance scale, a bread slicer, compass and straightedge) let you try the idea yourself, and the Unit 1 and 2 arithmetic games hand out stars.

**Status:** very much a **work in progress**. Eight lessons exist so far, from addition through the first proof in Euclid's *Elements*. The content is still growing, and it will change a lot.

### Frame / Field (FMV visualizer)

[**Open it**](https://cboler.github.io/fmv-visualizer/) · [Source](https://github.com/cboler/fmv-visualizer)

A viewer for full-motion video with geospatial telemetry. Load a video and its flight log (CSV, JSON, or DJI-style SRT), and Frame / Field plays them in sync. You see a heads-up display of heading, pitch, roll, and altitude, plus a map with the vehicle's route and a camera field-of-view cone. A built-in 30-second synthetic coastal survey lets you try everything without your own files.

Your video and telemetry never leave your browser. Nothing is uploaded, and the map tiles are optional.

**Status:** working and published. The map's field-of-view cone is an illustrative sector, not a ground-coverage calculation, and it isn't meant for navigation. Some firmware-specific log formats aren't supported yet.

### Baseball Coach Helper and Baseball Practice Helper

[**Coach Helper**](https://cboler.github.io/baseball-coach-helper/) · [**Practice Helper**](https://cboler.github.io/baseball-practice-helper/)

Two takes on the same batting-practice spray-chart spec: tap where the ball landed, then review each hitter's tendencies later. Both were built from the same specification by different coding agents, and the post [**One Baseball Problem, Two AI Apps**]({% post_url 2026-09-06-one-baseball-problem-two-ai-apps %}) compares them.

### Angular PWA Starter

[**Live demo**](https://cboler.github.io/angular-pwa-starter/) · [Source](https://github.com/cboler/angular-pwa-starter) · [The post]({% post_url 2026-09-06-angular-pwa-starter %})

The GitHub template repository I use to start new Angular PWAs. It has the service worker, manifest, Pages deployment, and test plumbing already wired up. Frame / Field started from it.

---

## Keeping this current

New projects will be added here, and entries will be reworded when their status changes. If you notice something that's out of date, tell me.

— Chris
