---
layout: post
title: 'Moss & Ember: an ARPG from a "single" small prompt'
date: 2026-09-05 00:00:00 -0500
categories: [games, technology]
tags: [moss-and-ember, ai, game-development]
description: 'A tiny request became a playable woodland adventure, with a usage-limit interruption and one very short follow-up.'
image: /docs/moss-and-ember/preview.png
---

I wanted to see how far I could get by asking Codex to make a game and otherwise getting out of its way.

The result is **Moss & Ember**, a small, playable action RPG with a forest to explore, a sword to swing, magic to unlock, and something unpleasant waiting in a temple. We just created it, and you can [**play it here in your browser**]({{ '/docs/moss-and-ember/' | relative_url }}).

![The wayfarer exploring the pixel-art woodland in Moss & Ember]({{ '/docs/moss-and-ember/preview.png' | relative_url }})

## The “single” prompt

Here is the entire original request, including my very carefully considered capitalization:

> Generate an ARPG like zelda: a link to the past or the adventures of elliot Use the folder that you're in, but otherwise, use whatever resources you have access to. game engines like unity, unreal engine 5, godot, whatever you feel is appropriate for the task

That was the brief. No design document, character sketches, map layouts, combat specifications, or asset pack. Just a couple of references and permission to choose the tools.

The quotation marks around “single” are doing some work, though.

**It blew through my entire five-hour usage allowance in under twenty minutes.** That was the allowance being exhausted, not five hours of development somehow fitting into twenty minutes. The run hit the limit and had to stop.

When I could continue, my second prompt was:

> Please pickup where you left off

So: one small creative prompt, one very small continuation prompt, and a usage meter that had apparently decided this was a sprint.

## What came out of it

Despite the invitation to use Unity, Unreal, or Godot, Codex chose a small JavaScript engine running directly in the browser. The art is drawn with Canvas, and the music and sound effects are synthesized with Web Audio. There is no engine installer or account required to play.

The adventure has:

- A woodland overworld with two shrines to awaken.
- Sword combat, a dash, and unlockable Ember magic.
- Treasure, extra hearts, healing tonics, and a keeper at camp.
- A temple with a key, two floor seals, and the Hollow Warden boss.
- A map, touch controls, automatic saves, and an ending.

Underneath that short conversation, there was considerably more work. Codex divided tasks among agents for the artwork, interface, and gameplay checks. It wrote the game, tested routes through the map, fixed an enemy that had spawned inside a lantern, and exercised the controls in a real browser. The finished run passed seven gameplay tests plus desktop and mobile browser checks.

The prompt was small. The amount of work it set in motion was not.

## A little perspective

This is a short adventure prototype. It has two areas and one final boss, and it is not about to replace a full Zelda game. There is plenty of room for more content, playtesting, and polish.

But it is a game you can actually play, from an instruction that took much less time to write than this post. I find that fascinating, even with the rather substantial asterisk attached to the word “single.”

[**Give Moss & Ember a try.**]({{ '/docs/moss-and-ember/' | relative_url }}) Use **WASD or the arrow keys** to move, **J** to swing your sword, **Space** to dash, **K** for magic once you unlock it, and **E** to talk or interact. **Q** drinks a healing tonic, and **M** opens the map. Touch controls are available too.

And if you find something broken, at least you know exactly how much design guidance I gave it.

— Chris (Sort of)
