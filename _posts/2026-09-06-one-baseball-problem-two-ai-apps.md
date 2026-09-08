---
layout: post
title: "One Baseball Problem, Two AI Apps"
date: 2026-09-06 23:55:00 -0500
categories: [technology, ai]
tags: [ai, software-development, antigravity, codex, angular, pwa, baseball]
description: "An old batting-practice specification, two modern coding agents, a quota marathon, an accidental localhost timeout, and a blind test."
image: /assets/images/ai-baseball/app-a-home.png
---

Years ago, a baseball coach named Hunter Mize described a very practical, very irritating problem.

During batting practice, a coach stands behind the cage or near the mound watching a steady stream of pitches and contacts. He wanted a fast, frictionless way to record where each hitter was placing the ball: glance at the phone, tap approximately where the ball landed on a field diagram, and immediately have his eyes back on the batter for the next pitch.

Later, away from the dust and chaos of the cage, he wanted to open that digital notebook, pull up an individual player's history, and see where that hitter tends to cluster the ball—line drives up the middle, weak grounders to the right side, or fly balls pulled toward the corner.

Around 2020, Corey Mize took that concept and drafted a concrete software specification for it: local-first persistence, rapid one-tap contact capture, roster queues, spray charts, and zero required server infrastructure.

Then it sat.

Like thousands of sensible, well-defined utility ideas, it lived in that familiar holding pattern where the problem is completely real, but the friction of scaffolding a custom mobile app, setting up local databases, wiring up deployment pipelines, and styling a bespoke UI isn't quite worth the weekend hours it would consume.

Nothing about the product concept came from artificial intelligence. The problem, the field-level workflow, and the design intent were entirely human.

This weekend, modern coding agents made it reasonable to dust off that six-year-old specification and run an experiment:

**Give essentially the identical human-originated product specification independently to two contemporary coding agents, step back, and see what each one builds.**

The two contestants were:

- **Gemini 3.8 Flash High**, using **Antigravity**
- **GPT-6 Astra Ultra**, using **Codex**

Both agents were instructed to build installable, offline-capable Progressive Web Apps using our [standard Angular PWA baseline](https://github.com/cboler/angular-pwa-starter), complete with automated tests, local-first storage, and zero server dependencies.

Both finished. Both applications are live on GitHub Pages right now.

Before we get into the behind-the-scenes engineering, the usage-quota drama, the localhost outage, or the final human verdict, we are going to do something that standard AI benchmark charts never let you do:

**We are going to let you judge the software blind.**

---

## Part One: The Blind Test

Below are the two finished applications, presented simply as **App A** and **App B**. 

Neither model's name appears anywhere in this section. We have preserved the exact visual styling, layouts, and copy produced by each agent. Both applications are fully functional, interactive, and live. 

<div class="app-trial-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
  <div class="app-card" style="border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 1.5rem; background: rgba(255,255,255,0.03);">
    <h3 style="margin-top: 0; color: #2aa198;">App A: Baseball Practice Helper</h3>
    <p>A mobile-first batting practice notebook featuring rapid tap-to-record contact capture, roster management, pitch tracking, and spray-chart analytics.</p>
    <div style="margin-top: 1.25rem;">
      <a href="https://cboler.github.io/baseball-practice-helper/" target="_blank" rel="noopener noreferrer" class="trial-link" style="display: inline-block; background: #2aa198; color: #fff; padding: 0.6rem 1.2rem; border-radius: 6px; text-decoration: none; font-weight: 600;">Open Live App A &rarr;</a>
    </div>
  </div>
  <div class="app-card" style="border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 1.5rem; background: rgba(255,255,255,0.03);">
    <h3 style="margin-top: 0; color: #859900;">App B: Baseball Coach Helper</h3>
    <p>A digital baseball notebook and spray-chart companion designed for coaches to track contacts, manage rosters, and explore visual hit trends.</p>
    <div style="margin-top: 1.25rem;">
      <a href="https://cboler.github.io/baseball-coach-helper/" target="_blank" rel="noopener noreferrer" class="trial-link" style="display: inline-block; background: #859900; color: #fff; padding: 0.6rem 1.2rem; border-radius: 6px; text-decoration: none; font-weight: 600;">Open Live App B &rarr;</a>
    </div>
  </div>
</div>

We strongly encourage you to open both links in separate tabs, create a team, add a couple of players, tap out a quick round of batting practice on the field diagram, and look at the reports and settings.

If you are on a phone or just want to see how they look side by side, here is the visual evidence.

### 1. Home & Team Setup

The first striking result of this experiment is how immediately and thoroughly both agents converged on the exact same product aesthetic and layout structure. Neither model saw the other's work, yet both independently arrived at a rich ballpark-green and warm-cream palette, a split setup card, and almost identical introductory copy:

<div class="screenshot-comparison" style="margin: 2rem 0;">
  <div style="margin-bottom: 2rem;">
    <img src="{{ '/assets/images/ai-baseball/app-a-home.png' | relative_url }}" alt="App A Home Screen - Baseball Practice Helper" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
    <p style="text-align: center; font-size: 0.9em; opacity: 0.8; margin-top: 0.5rem;"><strong>App A Home:</strong> "Make every round count." Step 1 of 2 team creation flow, deep forest green card, and clean form fields.</p>
  </div>
  <div style="margin-bottom: 2rem;">
    <img src="{{ '/assets/images/ai-baseball/app-b-home.png' | relative_url }}" alt="App B Home Screen - Baseball Coach Helper" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
    <p style="text-align: center; font-size: 0.9em; opacity: 0.8; margin-top: 0.5rem;"><strong>App B Home:</strong> "MAKE EVERY ROUND COUNT. A little less screen time. A little more field time." Notice the custom diamond mark in the browser tab.</p>
  </div>
</div>

Notice that both agents independently chose the four-tab bottom navigation pattern: **Practice**, **Roster**, **Reports**, and **Settings**.

### 2. Roster Management

Both applications enforce a sensible domain boundary: before you can record batting practice, you need a team and an active roster:

<div class="screenshot-comparison" style="margin: 2rem 0;">
  <div style="margin-bottom: 2rem;">
    <img src="{{ '/assets/images/ai-baseball/app-a-roster.png' | relative_url }}" alt="App A Roster Screen" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
    <p style="text-align: center; font-size: 0.9em; opacity: 0.8; margin-top: 0.5rem;"><strong>App A Roster:</strong> "Team Roster: Manage your players and set your everyday batting-practice lineup order."</p>
  </div>
  <div style="margin-bottom: 2rem;">
    <img src="{{ '/assets/images/ai-baseball/app-b-roster.png' | relative_url }}" alt="App B Roster Screen" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
    <p style="text-align: center; font-size: 0.9em; opacity: 0.8; margin-top: 0.5rem;"><strong>App B Roster:</strong> "The roster. Your players. Your everyday batting order. First, give your team a name."</p>
  </div>
</div>

### 3. Reports & Analytics

The reporting screen is where the coaching value lives. A coach wants to look at a spray chart and understand tendencies across different situations:

<div class="screenshot-comparison" style="margin: 2rem 0;">
  <div style="margin-bottom: 2rem;">
    <img src="{{ '/assets/images/ai-baseball/app-a-reports.png' | relative_url }}" alt="App A Reports and Analytics" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
    <p style="text-align: center; font-size: 0.9em; opacity: 0.8; margin-top: 0.5rem;"><strong>App A Reports:</strong> Multi-dimensional filtering by Player, Session, Date Range, Pitcher Handedness, and Contact Type, with tabs for Spray Chart, Heatmap / Density, and History List, plus a full Pull/Center/Oppo spray tendency bar.</p>
  </div>
  <div style="margin-bottom: 2rem;">
    <img src="{{ '/assets/images/ai-baseball/app-b-reports.png' | relative_url }}" alt="App B Reports Screen" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
    <p style="text-align: center; font-size: 0.9em; opacity: 0.8; margin-top: 0.5rem;"><strong>App B Reports:</strong> "See the whole field. Every contact tells part of the story." Prominent export actions: Download CSV, Share, and Print / PDF.</p>
  </div>
</div>

### 4. Settings & Data Ownership

Both agents recognized that a local-first application requires explicit data ownership—giving coaches the ability to export full JSON backups, generate CSV files for spreadsheet analysis, and restore their database without losing records:

<div class="screenshot-comparison" style="margin: 2rem 0;">
  <div style="margin-bottom: 2rem;">
    <img src="{{ '/assets/images/ai-baseball/app-a-settings.png' | relative_url }}" alt="App A Settings Screen" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
    <p style="text-align: center; font-size: 0.9em; opacity: 0.8; margin-top: 0.5rem;"><strong>App A Settings:</strong> Four-quadrant dashboard covering Active Team, Practice Defaults (with haptic vibration toggle), Data Ownership (JSON &amp; CSV), and local storage metrics.</p>
  </div>
  <div style="margin-bottom: 2rem;">
    <img src="{{ '/assets/images/ai-baseball/app-b-settings.png' | relative_url }}" alt="App B Settings Screen" style="width: 100%; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);" />
    <p style="text-align: center; font-size: 0.9em; opacity: 0.8; margin-top: 0.5rem;"><strong>App B Settings:</strong> Four-quadrant dashboard organized into The Dugout (Team), Next Time at the Field (Practice defaults), Backup &amp; Export, and Import a Backup.</p>
  </div>
</div>

---

## Lock In Your Guess

Now it is your turn.

Forget marketing claims, benchmarks, and Twitter hype. Based on what you see above, and especially how the two live applications behave when you test them in your browser:

**Which agent built which application?**

<style>
.blind-reveal-card {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  background: rgba(0, 43, 54, 0.45);
  padding: 1.75rem;
  margin: 2.5rem 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
.guess-title {
  margin-top: 0;
  font-size: 1.25rem;
  color: #268bd2;
}
.guess-options {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin: 1.25rem 0;
}
.guess-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.1rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.guess-label:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #2aa198;
}
.guess-label input[type="radio"] {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: #2aa198;
  cursor: pointer;
}
.guess-button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.btn-lock {
  background: #2aa198;
  color: #fff;
  border: none;
  padding: 0.65rem 1.4rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.btn-lock:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-lock:not(:disabled):hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn-skip {
  background: transparent;
  color: #93a1a1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.65rem 1.2rem;
  font-size: 0.95rem;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.btn-skip:hover {
  color: #eee8d5;
  border-color: rgba(255, 255, 255, 0.4);
}
.guess-verdict {
  margin-top: 1.5rem;
  padding: 1.25rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-left: 4px solid #2aa198;
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
#reveal-gate.is-locked ~ * {
  display: none !important;
}
@keyframes storyReveal {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.story-revealed ~ * {
  animation: storyReveal 0.4s ease-out;
}
</style>

<div class="blind-reveal-card" id="blind-poll-container">
  <h3 class="guess-title">Make your call:</h3>
  <div class="guess-options" id="poll-form">
    <label class="guess-label">
      <input type="radio" name="model-mapping-guess" value="gemini-astra" id="choice-ga">
      <span><strong>Option 1:</strong> App A was built by Gemini 3.8 Flash High; App B was built by GPT-6 Astra Ultra.</span>
    </label>
    <label class="guess-label">
      <input type="radio" name="model-mapping-guess" value="astra-gemini" id="choice-ag">
      <span><strong>Option 2:</strong> App A was built by GPT-6 Astra Ultra; App B was built by Gemini 3.8 Flash High.</span>
    </label>
  </div>
  <div class="guess-button-group">
    <button type="button" class="btn-lock" id="btn-lock-guess" disabled>Lock in your guess</button>
    <button type="button" class="btn-skip" id="btn-skip-guess">Reveal without guessing</button>
  </div>
  <div id="guess-verdict" class="guess-verdict" style="display: none;"></div>
  <noscript>
    <style>
      #reveal-gate.is-locked ~ * {
        display: block !important;
      }
    </style>
    <div style="margin-top: 1.25rem; padding: 1rem; background: rgba(255,255,255,0.05); border-left: 4px solid #b58900;">
      <p style="margin: 0;"><strong>JavaScript is disabled.</strong> The reveal: <strong>App A is Gemini 3.8 Flash High</strong> (Baseball Practice Helper) and <strong>App B is GPT-6 Astra Ultra</strong> (Baseball Coach Helper). Read on below for the complete story!</p>
    </div>
  </noscript>
</div>

<script>
(function() {
  const container = document.getElementById('blind-poll-container');
  const btnLock = document.getElementById('btn-lock-guess');
  const btnSkip = document.getElementById('btn-skip-guess');
  const radios = document.getElementsByName('model-mapping-guess');
  const verdict = document.getElementById('guess-verdict');
  const pollForm = document.getElementById('poll-form');
  const revealGate = document.getElementById('reveal-gate');

  if (!btnLock || !verdict) return;

  function unlockStory() {
    if (revealGate) {
      revealGate.classList.remove('is-locked');
      revealGate.classList.add('story-revealed');
    }
    try {
      sessionStorage.setItem('baseball_blind_revealed', 'true');
    } catch (e) {}
  }

  try {
    if (sessionStorage.getItem('baseball_blind_revealed') === 'true') {
      unlockStory();
      btnLock.style.display = 'none';
      btnSkip.style.display = 'none';
      radios.forEach(function(r) { r.disabled = true; });
      verdict.innerHTML = '<strong>The Curtain is Lifted:</strong> <strong>App A is Gemini 3.8 Flash High</strong> (<a href="https://github.com/cboler/baseball-practice-helper" target="_blank" rel="noopener noreferrer">Baseball Practice Helper</a>), and <strong>App B is GPT-6 Astra Ultra</strong> (<a href="https://github.com/cboler/baseball-coach-helper" target="_blank" rel="noopener noreferrer">Baseball Coach Helper</a>).<div style="margin-top: 1rem;"><a href="#the-rest-of-the-story" style="color: #2aa198; font-weight: bold; text-decoration: underline;">Jump to The Rest of the Story &darr;</a></div>';
      verdict.style.display = 'block';
    }
  } catch (e) {}

  radios.forEach(function(r) {
    r.addEventListener('change', function() {
      btnLock.removeAttribute('disabled');
    });
  });

  function revealMapping(isSkip) {
    let selected = null;
    radios.forEach(function(r) {
      if (r.checked) selected = r.value;
    });

    let message = '';
    if (isSkip) {
      message = '<strong>The Answer:</strong> <strong>App A is Gemini 3.8 Flash High</strong> (<a href="https://github.com/cboler/baseball-practice-helper" target="_blank" rel="noopener noreferrer">Baseball Practice Helper</a>), and <strong>App B is GPT-6 Astra Ultra</strong> (<a href="https://github.com/cboler/baseball-coach-helper" target="_blank" rel="noopener noreferrer">Baseball Coach Helper</a>).';
    } else if (selected === 'gemini-astra') {
      message = '🎯 <strong>Spot on!</strong> You correctly guessed that <strong>App A is Gemini 3.8 Flash High</strong> and <strong>App B is GPT-6 Astra Ultra</strong>.<br><br>What tipped you off? Was it the density heatmaps and voice-player selection in App A, or the custom browser icon and concurrency handling in App B?';
    } else {
      message = '⚾ <strong>A very reasonable guess!</strong> You picked Option 2, but <strong>App A was actually built by Gemini 3.8 Flash High</strong>, and <strong>App B was built by GPT-6 Astra Ultra</strong>.<br><br>The fact that so many people guess this backwards is the most interesting part of the experiment: both systems converged on nearly identical product architecture.';
    }

    verdict.innerHTML = message + '<div style="margin-top: 1rem;"><a href="#the-rest-of-the-story" style="color: #2aa198; font-weight: bold; text-decoration: underline;">Continue to The Rest of the Story &darr;</a></div>';
    verdict.style.display = 'block';

    btnLock.style.display = 'none';
    btnSkip.style.display = 'none';
    radios.forEach(function(r) { r.disabled = true; });

    unlockStory();

    const storySection = document.getElementById('the-rest-of-the-story');
    if (storySection) {
      storySection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  btnLock.addEventListener('click', function() { revealMapping(false); });
  btnSkip.addEventListener('click', function() { revealMapping(true); });
})();
</script>

---

<div id="reveal-gate" class="is-locked"></div>
<div id="the-rest-of-the-story"></div>

## The Rest of the Story

Now that the curtain is lifted, here are the official identities and their repositories:

- **App A is [Baseball Practice Helper](https://cboler.github.io/baseball-practice-helper/)**, created by **Gemini 3.8 Flash High** using Google’s **Antigravity** environment.  
  Repository: [`https://github.com/cboler/baseball-practice-helper`](https://github.com/cboler/baseball-practice-helper)
- **App B is [Baseball Coach Helper](https://cboler.github.io/baseball-coach-helper/)**, created by **GPT-6 Astra Ultra** using OpenAI’s **Codex** environment.  
  Repository: [`https://github.com/cboler/baseball-coach-helper`](https://github.com/cboler/baseball-coach-helper)

If you spent time clicking through both applications, you probably noticed that this was not a contest between a functioning product and a broken prototype. Both models delivered authentic, deployable, local-first software.

What happened behind the scenes to get those two applications to the finish line, however, could hardly have been more different.

---

## Gemini's Run: The Fast Lane

Gemini 3.8 Flash High tackled the task on Sunday morning, September 6.

It opened the project specification, conducted a structured planning pass, and went to work on `baseball-practice-helper`. It generated an Angular 22 mobile PWA with native IndexedDB storage, atomic multi-store transactions, interactive field SVG tap handling, roster queues, and comprehensive reporting.

It even added a hands-free feature not explicitly mandated in the brief: **voice-assisted player selection** using the browser's native `SpeechRecognition` API. If a coach is holding a bat or standing on the field, speaking a player's jersey number or name automatically switches the active batter in the queue without touching the screen.

When its implementation pass completed, Gemini ran local validations:
- Zero lint errors.
- Prettier style conformance.
- 37 unit tests passing across domain math, coordinate translation, transfer parsing, and repository transactions.
- All 4 Playwright viewports (`phone-portrait`, `phone-landscape`, `tablet-portrait`, `desktop`) passing cleanly in 29.5 seconds.
- GitHub Actions workflow run 34041085290 succeeded on the first attempt with an HTTP 200 response on GitHub Pages.

Shortly after finishing, a snapshot of the Antigravity IDE revealed this:

![Antigravity Models and Usage showing roughly 79% of Gemini 5-hour limit remaining]({{ '/assets/images/ai-baseball/gemini-finished.png' | relative_url }})
*Gemini's completion snapshot: the full application was built, verified across four viewports, and deployed to GitHub Pages with roughly 79% of its 5-hour model quota still intact.*

A quick word of caution about that screenshot: **do not read a 79% remaining quota meter as proof that one model is universally four times faster than another.** 

Quota meters reflect tokens, tool calls, and API credits measured against a specific tier's rolling window on a specific run. They are not stopwatch benchmarks. 

What it *does* illustrate, however, is that for this specific task, Gemini took a very direct, economical path from specification to working production code without spinning its wheels.

There was one small experimental asymmetry worth noting in the interest of full disclosure: during Gemini's initial planning pass, it flagged a slight naming ambiguity between "Coach" and "Practice" in the starter notes. The human responded with a quick one-sentence clarification before Gemini proceeded. Astra did not receive that exact prompt exchange. While unlikely to explain the divergence in workflow, it is part of the honest experimental record.

---

## Astra's Run: The Quota Odyssey

Where Gemini's run was a tidy morning sprint, GPT-6 Astra Ultra's run in Codex was an all-day endurance marathon.

Astra began building `baseball-coach-helper` with immense ambition. It wrote extensive domain models, interactive SVG field layouts, and rich settings dashboards. But it also dove deeply into edge cases: building custom concurrency protections so that multiple browser tabs editing the same practice wouldn't clobber each other's queue state, writing robust backup merge algorithms, and constructing multi-viewport end-to-end tests.

That thoroughness had a steep cost. At 2:22 PM, right in the middle of implementation, Astra hit the wall:

![Codex showing usage limit hit at 2:22 PM with 0% 5-hour quota remaining]({{ '/assets/images/ai-baseball/astra-quota-hit.png' | relative_url }})
*Astra's first quota wall: 0% of its 5-hour allowance remaining at 2:22 PM while implementation was still actively underway.*

Like the [Moss & Ember run yesterday]({{ '/games/technology/2026/09/05/moss-and-ember.html' | relative_url }}), the quota meter had treated the job like an all-out sprint and exhausted its entire 5-hour allowance.

*(An important caveat here: as detailed in the update at the bottom of this article, official best practices and community guidelines for prompting Astra were not yet published or discovered when this run took place—see the [r/codex discussion](https://www.reddit.com/r/codex/comments/1w7x57n/before_blaming_gpt6_astra_read_its_prompting_guide/) for context on its operational and steering requirements.)*

Hours later, the window refreshed and Astra resumed:

![Codex resuming work on Baseball Coach Helper with 3% remaining]({{ '/assets/images/ai-baseball/astra-resumed.png' | relative_url }})
*Astra resuming later in the evening, working on browser tests, concurrent-tab writes, and backup merges, burning its allowance down to 3% at 10:40 PM.*

As Astra noted in its progress log:
> *"The unit suite is passing, and lint is clean. Browser testing is now covering the full coach workflow and file restore. I also strengthened concurrent-tab writes and backup merges so an older queue state cannot silently overwrite a newer practice."*

At 10:41 PM, a fresh 5-hour allocation kicked in:

![Codex showing a fresh 100% 5-hour quota allocation at 10:41 PM]({{ '/assets/images/ai-baseball/long-awaited.png' | relative_url }})
*10:41 PM: A fresh continuation opens with 100% of the 5-hour allocation available.*

Astra immediately sprinted into final test execution. In less than an hour, it burned through almost that entire fresh allowance—dropping from 100% down to 6%:

![Astra reporting clean release checks and 6% quota remaining before pushing]({{ '/assets/images/ai-baseball/quick.png' | relative_url }})
*In under an hour, Astra completed its test passes, dropping its quota meter down to 6%, and pushed commit 94a367c to GitHub.*

By the time it pushed commit `94a367c5b11ebf3121005490ab0509ea47c013c9` (*"Build Baseball Coach Helper local-first coaching app"*), Astra's local verification was formidable:
- 54 unit tests passing.
- 49 Playwright browser checks passing across five viewports.
- 1 production offline/PWA test passing.
- Clean formatting, linting, and production builds.

Locally, Astra had built a rock-solid piece of software. 

Then it met GitHub Actions.

---

## The Pipeline Failure

What happened next is one of the most delightfully relatable moments in software engineering.

Astra pushed its code to GitHub, expecting the CI pipeline and GitHub Pages workflow to build, verify, and publish the app automatically.

Instead, red crosses lit up across the repository:

![GitHub repository page showing failed status checks on baseball-coach-helper]({{ '/assets/images/ai-baseball/astra-ci-failing.png' | relative_url }})
*Commit 94a367c pushed to GitHub: 2 failing checks, 1 successful, and 1 skipped.*

Both the **Deploy to GitHub Pages** workflow and the **CI / Lint, Test & Smoke Validation** workflow failed.

Looking at the Actions log revealed that this was not a syntax error, a broken TypeScript type, or a failed unit test:

![GitHub Actions log showing Playwright timeout waiting 120000ms from config.webServer]({{ '/assets/images/ai-baseball/astra-pages-timeout.png' | relative_url }})
*The Pages workflow failure: Playwright timed out waiting 120,000ms for config.webServer.*

![CI workflow log showing the identical Playwright timeout across five viewports]({{ '/assets/images/ai-baseball/astra-ci-timeout.png' | relative_url }})
*The CI validation workflow failed at the exact same step: config.webServer timeout after two minutes.*

Every earlier step in the pipeline had flown through:
- Node.js setup: 0s
- Install dependencies: 11s
- Check code formatting: 2s
- Run linter: 3s
- Run unit tests: 5s
- Configure Pages base path: 1s
- Build production application: 6s
- Generate SPA 404 fallback: 0s
- Install Playwright browsers: 20s

Then the pipeline reached `Run coach workflows across five viewports`. Playwright started the local Angular development server to run headless browser checks, waited two full minutes for it to respond, received nothing, and threw:

```text
Error: Timed out waiting 120000ms from config.webServer.
```

Because the test step failed, the workflow exited, the deployment artifact was never uploaded, and GitHub Pages never published.

And Astra had just spent 94% of its remaining quota allowance pushing that commit. It had no meaningful runway left to troubleshoot the failure.

It would be tempting to frame this as "Astra failed to build the app." But that would be inaccurate. Astra *had* built the app. The code was completely functional. It had simply tripped over the final, invisible wire of remote CI networking.

---

## Gemini's One-Line Rescue

At this juncture, we made a deliberate human decision: **be sportsmanlike.**

Declaring Astra's application non-existent because an Ubuntu GitHub runner had a networking hiccup with a local dev server would ruin an otherwise fascinating comparison. Astra had done the hard work of implementing the entire coaching notebook.

So we invited Gemini 3.8 Flash back into the ring for a strictly bounded rescue mission:

> *Do not touch Astra's application code. Do not redesign the UI or refactor its logic. Inspect the CI failure, find the smallest possible correction to get Astra's existing application through GitHub Actions and onto GitHub Pages, and preserve clean attribution.*

Gemini opened `baseball-coach-helper`, inspected the GitHub Actions logs, and looked at `playwright.config.ts` and `package.json`.

The diagnosis took less than two minutes:

1. Playwright was configured to poll `http://127.0.0.1:4200` to verify that the dev server was ready before launching browser tests.
2. Astra’s `package.json` started the dev server using the default Angular command: `"start": "ng serve"`.
3. On modern Linux GitHub Actions runners, `ng serve` binds to `localhost`, which frequently resolves to IPv6 `::1` rather than IPv4 `127.0.0.1`.
4. While the server was happily listening on IPv6, Playwright’s polling against `127.0.0.1` received continuous `ECONNREFUSED` errors until the 120-second timeout expired.

Gemini changed exactly **one line** in Astra's `package.json`:

```diff
   "scripts": {
     "ng": "ng",
-    "start": "ng serve",
+    "start": "ng serve --host 127.0.0.1",
     "build": "ng build",
```

That was it. No component changes, no CSS tweaks, no domain modifications.

Gemini committed the fix under commit [`7fe64a62d8aa52fdc42307ec6df927c2ee0cc13b`](https://github.com/cboler/baseball-coach-helper/commit/7fe64a62d8aa52fdc42307ec6df927c2ee0cc13b) with explicit attribution:

```text
commit 7fe64a62d8aa52fdc42307ec6df927c2ee0cc13b
Author: Chris <christopher.boler@gmail.com>
Date:   Sun Sep 6 23:31:24 2026 -0500

    fix: repair CI and Pages deployment for Astra implementation
```

The result?
- CI passed completely.
- 54 unit tests passed.
- 49 cross-viewport browser checks passed.
- The production PWA offline check passed.
- GitHub Pages deployed immediately.

Gemini then verified the live deployed Astra application in a real browser—confirming team creation, field taps, roster editing, reload persistence, and console health.

The clean attribution of this experiment is: **Astra built Baseball Coach Helper. Gemini fixed one line of its deployment harness so the world could actually use it.**

---

## Head-to-Head: What the Agents Actually Built

When you set aside the quotas and the pipeline rescue, what did these two independent agents actually produce from the same product idea?

The most remarkable finding is how much the two implementations resemble each other. Without any shared communication, both models independently converged on:
- A local-first client architecture using native browser `IndexedDB`.
- An installable, offline-first Progressive Web App.
- A dark green and warm cream ballpark color scheme.
- A four-tab bottom navigation bar (`Practice`, `Roster`, `Reports`, `Settings`).
- Rapid coordinate capture by tapping an SVG baseball field.
- Roster management requiring team initialization before batting practice.
- Multi-team support and customizable practice defaults (pitcher handedness, rotation modes).
- Full JSON backup and CSV export capabilities.

Yet each model demonstrated genuine, distinct strengths that reflect different engineering personalities.

### Where Astra Won Points

1. **Favicon and PWA Icon Polish:**  
   If you looked closely at the browser tabs in the earlier screenshots, you might have noticed something interesting: **Astra’s app had a custom baseball-diamond icon in the tab, while Gemini’s app was still displaying the default Angular red shield.**  
   How did Astra pull that off? In `scripts/generate-icons.mjs`, Astra wrote a standalone Node script that booted headless Playwright, rendered its custom `mark.svg` across eight standard PWA dimensions (from 72x72 to 512x512), and programmatically assembled a genuine binary `public/favicon.ico` complete with icon directory headers. Gemini drew a nice SVG mark, but left the starter template’s default `favicon.ico` untouched. Astra took the extra step to make the browser tab look like a finished brand.
2. **Multi-Tab Concurrency Hardening:**  
   In `src/app/data/repository.ts`, Astra added a `metadata` store with revision UUIDs. Before applying any atomic transaction, it compares revisions to ensure that if a coach has two tabs open on a phone or laptop, a stale tab cannot silently overwrite newer batting practice data.
3. **Exhaustive Automated Testing:**  
   Astra produced 54 unit tests and 49 Playwright end-to-end assertions spanning five separate viewports, plus a dedicated offline PWA test (`e2e-pwa/offline.spec.ts`) that verifies the production bundle functions with the network disabled.

### Where Gemini Won Points

1. **The Reports Experience:**  
   Gemini's reports suite feels like software built for a baseball coach. In addition to a clean spray chart, it provides a togglable **Density Heatmap** showing where balls are concentrating, an automated **Spray Tendency** calculation (Pull %, Center %, Oppo %), pitcher handedness breakdowns (vs RHP / vs LHP), and contact quality distributions (Dribbler, Ground Ball, Line Drive, Pop Up). Astra gave coaches a solid spray chart and CSV export, but Gemini gave them analytical insight directly inside the app.
2. **Voice-Assisted Player Selection:**  
   Gemini anticipated the physical reality of batting practice: a coach often has one hand on a fungo bat or a bucket of balls. By integrating the Web Speech API directly into the field header, a coach can speak a player's name or number to immediately change the batter without tapping the roster list.
3. **Onboarding and Product Narrative:**  
   Gemini’s copy and UI state management feel slightly more cohesive. The transition from naming a team to setting up a lineup and stepping onto the field has an intuitive, guided flow that explains the value of the notebook at every step.

---

## The Human Verdict

After spending the evening testing both applications on desktop and mobile, entering practice rounds, and reviewing the codebases, the verdict is:

**Gemini 3.8 Flash won this experiment.**

It is not a blowout. Astra built a completely legitimate, contender-grade application with superior icon generation, great concurrency guards, and an enormous test suite.

But Gemini built the better baseball app.

Gemini's implementation feels richer, more polished, and more closely attuned to how a coach actually thinks at the field. The heatmap analytics, the situational splits, the voice input, and the clean execution give it that extra layer of product maturity that turns a functional prototype into something you would happily hand to a high school or travel-ball coach tomorrow.

A fair summary of the contest is:

> **Astra built a formidable contender. Gemini built the app you’d actually keep on your home screen.**

Now it’s your turn to make the call. Which implementation do you prefer? **Vote by leaving a ⭐ star on the repository of your choice:**
- ⭐ **[Baseball Practice Helper](https://github.com/cboler/baseball-practice-helper)** (Gemini 3.8 Flash High)
- ⭐ **[Baseball Coach Helper](https://github.com/cboler/baseball-coach-helper)** (GPT-6 Astra Ultra)

---

## What This Really Means

It is easy to turn an experiment like this into a trivial contest of model superiority. That misses the real story.

Consider the history of this project:

1. A youth baseball coach identified a real-world workflow problem during batting practice.
2. A software developer cared enough to turn it into a clear, detailed specification in 2020.
3. That specification sat completely dormant in a drawer for six years because building bespoke mobile utilities is tedious, time-consuming, and expensive.
4. On a single Sunday in September 2026, the cost and friction of building software dropped so dramatically that a single person could feed that same old specification to two different AI coding agents and receive **two fully functional, tested, installable, production-ready applications before the weekend ended.**

Both applications exist. Both are hosted for free on GitHub Pages. Both store data privately on your device. You can open either one right now, add your kid's team, and track their batting practice tomorrow afternoon.

That is the true shift. It isn't that one model scored a few percentage points higher on a synthetic benchmark. It is that the distance between a good human idea and functioning, deployable software has collapsed to near zero.

---

## Article Provenance

In the spirit of honest technical documentation, here is how this article was produced:

- **Human (Chris Boler):** Provided the original baseball specification, designed the experiment, conducted the runs, performed the one-line deployment intervention, tested both live applications, and rendered the final product judgment.
- **GPT-5.6 Sol:** Analyzed the raw session evidence, reconstructed the timeline from timestamps and commit logs, evaluated the experimental methodology, and synthesized the editorial brief.
- **Gemini 3.8 Flash (High):** Authored the final Jekyll article, implemented the interactive blind reveal component, organized the screenshot evidence, and verified the site build.

If you have an old product specification sitting in a text file somewhere, maybe it's time to dust it off.

---

## Update (September 7, 2026): Community Star Vote & Astra's Prompting Playbook

Since publishing this article yesterday, two notable things have developed:

### 1. Vote for Your Favorite App
Coaches and developers have been putting both applications through their paces. Now that you've seen what both agents built, **cast your vote for your favorite version by leaving a ⭐ star on the repository of your choice:**
- ⭐ **[Baseball Practice Helper](https://github.com/cboler/baseball-practice-helper)** (Gemini 3.8 Flash High)
- ⭐ **[Baseball Coach Helper](https://github.com/cboler/baseball-coach-helper)** (GPT-6 Astra Ultra)

### 2. Context on Astra's Prompting Guidelines
Shortly after publishing, a helpful discussion surfaced on r/codex: [**Before blaming GPT-6 Astra, read its prompting guide**](https://www.reddit.com/r/codex/comments/1w7x57n/before_blaming_gpt6_astra_read_its_prompting_guide/).

In fairness to the model and Codex: during the experiment, these guidelines weren't quite out yet—or at least, I hadn't found them. Astra is a specialized computer-operator model designed for autonomous execution and tool loops, and its steering conventions are quite different from traditional conversational or code-completion models. Operating it without those guidelines likely contributed to its heavy quota consumption and deep rabbit holes during the run.

Knowing those patterns now might have changed how Astra was steered through its quota budget. In the spirit of sportsmanlike evaluation and honest engineering records, it is an important nuance to keep in mind.
