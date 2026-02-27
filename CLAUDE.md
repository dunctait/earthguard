# EarthGuard Project Instructions

## Project Overview

EarthGuard is a turn-based missile defense game with a pause-and-decide cycle loop, scaling waves, and persistent meta progression.

## Documentation

- **[GAME_DESIGN.md](GAME_DESIGN.md)** - Current game design decisions and mechanics
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Build, deploy, and development workflow
- **[docs/DESIGN.md](docs/DESIGN.md)** - Original full design document (reference)

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no build step)
- GitHub Pages for hosting
- Mobile-first, portrait-priority layout (landscape supported)
- Touch controls primary, mouse secondary

## Agent Testing Notes

- Codex can test the UI/game programmatically using local Playwright scripts in this repo:
  - `npm run smoke`
  - `npm run smoke:headed`
  - `npm run smoke:layout`
  - `npm run smoke:gameover`
  - `npm run smoke:meta`
- This supports scripted clicks/holds, screenshots, and layout checks.
- Codex does **not** use Claude's native `/chrome` integration here.

## Key Constraints

- **No build tools** - must work directly from GitHub Pages
- **Portrait-first UX** - must remain playable in landscape
- **Touch-first** - all interactions must work with touch
- **Turn-based** - player targets, then cycles time to resolve actions

## Architecture Notes

- `src/game.js` is the orchestration layer:
  - turn/cycle state machine
  - upgrades/meta integration
  - event emission for renderer/UI
- `src/wave-factory.js` owns wave composition and level speed/size progression.
- `src/enemy-factory.js` owns enemy spawn/formation construction and anti-overlap relaxation.
- `src/meta-progression.js` owns persistent meta state defaults, load/save normalization, run-result application, and jump-level bookkeeping.
- `src/render.js` is visual-only (canvas draw + animation framing); gameplay rules stay out of renderer.
- `src/ui.js` is DOM-only (HUD/modals/buttons/summary formatting).

Boundary rules:
- no direct DOM updates from `game.js`
- no gameplay mutation from `render.js`
- factory modules should remain data-oriented and reusable

## File Structure

```text
earthguard/
├── index.html
├── CLAUDE.md
├── DEVELOPMENT.md
├── GAME_DESIGN.md
├── docs/
│   └── DESIGN.md
└── src/
    ├── game.js
    ├── wave-factory.js
    ├── enemy-factory.js
    ├── meta-progression.js
    ├── render.js
    ├── ui.js
    └── style.css
```

## Current State

Current playable state includes:
- Turn-based targeting/cycle loop with energy economy
- Multiple enemy types (including scout zig-zag and boss waves)
- In-run upgrades and persistent meta progression
- Splash/game-over/meta modal flows with jump-start support
- Playwright smoke coverage for main, game-over, and meta flows

## Git Workflow

- After a git push, wait for GitHub Pages build to complete
- Check build status: `gh api repos/dunctait/earthguard/pages/builds --jq '.[0].status'`
- Wait for "built" before testing
- Live URL: https://dunctait.github.io/earthguard/
