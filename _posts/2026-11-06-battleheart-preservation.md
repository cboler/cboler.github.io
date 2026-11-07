---
layout: post
title: 'Recreating Battleheart for My Son (Without the Sketchy APKs)'
date: 2026-11-06 23:00:00 -0600
categories: [games, technology]
tags: [battleheart, game-preservation, angular, pwa, svg, game-development]
description: 'My son went looking through our Google Play library for the original 2011 Battleheart. Since it is no longer on the Play Store—and the only alternatives online are questionable APK downloads—we built a clean-room browser recreation.'
---

Tonight my son was scrolling through our family Google Play library looking for a game the two of us played a ton while he was growing up: the original **Battleheart** by **Mika Mobile** (Noah Bordner and Kelly Reagan).

Not *Battleheart Legacy*—which is a great 3D RPG in its own right and is [still available on Steam](https://store.steampowered.com/app/666640/Battleheart_Legacy/)—but the original 2011 2D party-based tactical game where you drag lines from your Knight, Cleric, Rogue, and Wizard to tell them who to heal, who to tank, and where to stand.

Unfortunately, as mobile operating systems moved on, the original *Battleheart* eventually aged out of maintenance and was removed from the Play Store. When you go looking for it today, pretty much the only way to get it on an Android device is to sideload an old binary from a sketchy, malware-ridden back-alley APK site. Neither of us wanted to touch those.

So instead, we built a clean-room browser recreation starting from my [Angular PWA starter]({% post_url 2026-09-06-angular-pwa-starter %}).

[**Play Battleheart (Tribute)**](https://cboler.github.io/battleheart/) · [Source](https://github.com/cboler/battleheart)

---

## What's in it

The original *Battleheart* was a deceptively simple game on paper, but the feel of juggling four cooldown bars and drawing targeting lines while a boss winds up a ground slam was magic. Our recreation keeps that loop intact:

- **Real-time line-drawing combat**: Drag from a hero to an enemy to focus attacks, drag from your Cleric to an ally to lock her healing beam onto them, or drag to open ground to kite out of danger.
- **Eight hero classes**: Knight, Cleric, Rogue, Wizard, Paladin, Bard, Ranger, and Monk, each with their own threat weight, signature active skill, and Tier 1 / 2 / 3 A/B skill tree choices as they level up.
- **Armory, trinkets, and progression**: Six tiers of weapons and armor per class, shared relic trinkets, a seven-stage campaign with three boss fights, and an Endless Arena that pays out gold and XP per kill.
- **Swappable SVG placeholder art**: Every hero, monster, and stage backdrop lives in `public/assets/svg/` as a standalone SVG file until I have time to sit down and draw my own custom replacements.
- **Local saves and controller support**: Three save slots in `localStorage` (with JSON export/import), synthesized Web Audio sound effects, and full gamepad support alongside mouse, touch, and keyboard hotkeys.

---

## Credits, game preservation, and a standing offer

All credit for the original *Battleheart* concept, class archetypes, and tactical line-drawing mechanics belongs to **Mika Mobile**. If you haven't played their games, go buy [**Battleheart Legacy on Steam**](https://store.steampowered.com/app/666640/Battleheart_Legacy/).

This project contains **zero original code, audio, or artwork** from Mika Mobile, and I am making **zero money** from it—no ads, no monetization, no analytics, and no accounts. It exists purely out of father-and-son nostalgia and the belief that great games shouldn't vanish into a swamp of untrustworthy APK mirrors when store requirements move on.

That said, if Noah, Kelly, or anyone at Mika Mobile ever wants this renamed, modified, or taken down, **I will gladly take it down immediately, no questions asked.** Until then, my son and I have our game back.

— Chris

