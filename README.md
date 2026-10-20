# Bonsai Lab 🌱🖨️

A cozy isometric idle/management game about running a tiny 3D-printing shop (a pun on Bambu Lab).
Plain HTML5 Canvas + vanilla JS, classic `<script>` tags, no build step, no network, no image files:
every pixel is drawn in code and every sound is synthesized with WebAudio.

**Play:** double-click `index.html` (works from `file://`). Add `?speed=10` to the URL for a fast debug season.

## The loop
- A season is a 10-minute run against the clock: rent at 2:30 / 5:00 / 7:30, the maker expo at 10:00.
- Customer orders (26 templates, 21 in the Garage) need a material (PLA / PETG / TPU / ABS), 1-4 colours, a ★ quality bar, print time, deadline and payout.
- Tap an order card, then tap a glowing printer. Prints grow layer by layer; tap ✔ to deliver.
- Printers: 🌱 Sprout (open bed-slinger), 🦅 Kestrel (fast enclosed CoreXY, good for ABS), 🌈 Rainbow (4-spool colour changer). 3 slots in the Garage, 4 in the Workshop. No endless helpers.
- **"Hey, I have this issue!"** chat bubbles: clogged nozzle, X/Y belt snapped, bed adhesion spaghetti, stringing, warping (ABS), power drop/offline, filament runout. Each has distinct fixes that cost money, spare parts or downtime. Worn printers (maintenance meter) break more.
- Failed prints become scrap; the ♻️ recycler turns it into 🌈 mystery PLA that "any colour" orders use.
- Can't pay rent within 25 s = season over. End of season → ⭐ Reputation.

## Progression (no "buy more helpers" loop)
- 🛠️ **Upgrade map** (in-season, $): hotends, hardened nozzles, PEI plates, service kit, dry box, enclosures, calibration, flyers, order board.
- 🔬 **Research map** (persistent, ⭐): 12 nodes in Materials / Automation / Quality.
- 🗺️ **Labs map** (prestige): Garage → Workshop (4 slots, new orders, ×1.5 ⭐, resets research for 🏆 trophies + perks) → Factory (stub, "coming soon").

## Files
| | |
|---|---|
| `index.html`, `style.css` | shell + cozy UI |
| `js/data.js` | orders, printers, materials, problems, maps (all tuning lives here) |
| `js/core.js` | pure simulation on plain JSON (saves as-is; runs in Node) |
| `js/render.js` | isometric garage, printers, layers, cat: all Canvas 2D |
| `js/game.js` | loop, input, HUD, sheets, chat-bubble problems, maps, save |
| `js/maps.js` | node-map widget (upgrades / research / labs) |
| `js/audio.js` | WebAudio blips |
| `js/platform.js` | **SDK hook layer**: stubs for CrazyGames / YouTube Playables (nothing loaded) |
| `sim/sim.js` | balance sim: `node sim/sim.js 40 [lab]` |
| `test/e2e.js` | headless smoke/e2e test (Playwright + Chrome) |
| `test/soak.js` | whole season through the real rAF loop |
| `test/hero.js`, `test/shot.js`, `test/zoom.js` | screenshots |
| `tools/build-zip.sh` | zip the playable files to `/workspace/out/bonsai-lab.zip` |

## Tests
```
cd test && npm i            # playwright-core; uses /usr/bin/google-chrome
node e2e.js                 # screenshots in test/shots/
node soak.js
node ../sim/sim.js 40
```
Save key: `localStorage["bonsailab.save.v1"]` (meta + mid-season run).
