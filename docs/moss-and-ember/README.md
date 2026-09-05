# Moss & Ember

An original, playable top-down action RPG inspired by the exploration and responsive combat of classic adventure games. Explore a hand-built woodland, awaken two forgotten shrines, unlock Ember magic, and descend into the Hollow Temple to reclaim the forest’s heart.

Built for the browser with a small custom JavaScript engine, Canvas 2D artwork, and synthesized Web Audio. All game art, characters, music, maps, and code are original. No paid assets, account, engine download, or runtime dependencies are required.

## On the blog

The canonical game lives in `docs/moss-and-ember/` in the blog repository. GitHub Pages builds the existing Jekyll site from the repository root and copies this game as static files to `/docs/moss-and-ember/`. The game HTML deliberately has no Jekyll front matter; its relative CSS and module URLs keep it self-contained. No server, Node install, or bundling is needed on GitHub Pages. Development files are excluded by the site’s root `_config.yml`.

Once published: **https://cboler.github.io/docs/moss-and-ember/**

## Play

With Node.js 18 or newer installed, double-click **Launch Game.bat** on Windows. Keep the server window open while playing.

Or, from this folder:

```sh
npm start
```

Open **http://localhost:5173** in a modern browser. The game works offline after the local server is started. Use the local server rather than opening `index.html` directly, because the game uses JavaScript modules.

## Controls

| Action | Keyboard / mouse |
| --- | --- |
| Move | WASD or arrow keys |
| Sword | J or Z; left-click to aim and swing |
| Dash | Space or Shift |
| Ember bolt | K or X; right-click to aim and cast |
| Talk / use / open | E or Enter |
| Healing tonic | Q |
| Map | M |
| Pause / close | Escape |

Touch controls appear on touch devices. Sound starts after the first interaction; use the sound button to mute it. Leaving the browser tab pauses the adventure.

## Your adventure

- Talk to Rowan at camp for directions and tonic brewing. Springs refill health, magic, and one empty tonic flask.
- Follow the northern trail to the crossroads. The western shrine is left; the eastern shrine is across the river. Defeat the creatures around each shrine, then approach and press E.
- The first shrine grants Ember magic. The second opens the temple to the north.
- Explore the side trails for an extra heart vessel, acorns, and tonics.
- In the temple, find the western guardian chest, awaken both floor seals, and open the northern door.
- Watch the Hollow Warden’s attack warnings. Dash through danger, strike during recovery, and use magic from a distance. Take the Heart Ember from the altar after the battle.

Progress saves automatically to this browser at milestones and periodically during play. **Continue** restores your position, discoveries, upgrades, and defeated enemies, with full health. Falling returns you to the current area’s entrance and costs 20% of your carried acorns. Starting a new adventure replaces the save. Browser data clearing or private browsing may prevent persistence.

This is a complete small adventure prototype with two areas and a final boss, designed for roughly 10–20 minutes of play, rather than a full commercial RPG.

## Development

```sh
npm test
```

The simulation and map tests use Node’s built-in test runner. Optional browser verification uses Playwright as a development dependency. With the local server running in another terminal:

```sh
npm install
npm run test:browser
```

The browser check uses installed Google Chrome on Windows. Elsewhere, run `npx playwright install chromium` first, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to your browser’s executable. It checks keyboard controls, menus, saving, combat inputs, the ending, and mobile layout, and writes screenshots to `.test-artifacts/`.

| File | Purpose |
| --- | --- |
| `src/game.js` | Combat, enemy AI, progression, interactions, saves |
| `src/world.js` | Deterministic maps, props, collisions, movement |
| `src/renderer.js` | Original pixel art, lighting, particles, camera |
| `src/ui.js` | Menus, HUD, dialogue, map, touch controls |
| `src/audio.js` | Synthesized soundtrack and sound effects |
| `src/main.js` | Input and animation loop |
| `styles.css` | Responsive interface |
| `server.mjs` | Local static server, bound to loopback |

No build step is needed. Edit a file and refresh the browser. To use a different port, set the `PORT` environment variable before starting the server.
