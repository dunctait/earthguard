# EarthGuard (Technical README)

EarthGuard is a small browser game built with plain `HTML`, `CSS`, and `JavaScript` (no framework, no build step).

This README explains how the codebase works technically, what tools are used, and how to work on it if you are new to web development.

## What This Project Is

- A turn-based missile defense game.
- Runs directly in the browser.
- Hosted on GitHub Pages.
- Mobile-first (portrait orientation).

## Tech Stack (Beginner-Friendly)

- `HTML`:
  Defines the page structure (canvas, buttons, status text).
- `CSS`:
  Controls styling (colors, layout, animations, button appearance).
- `JavaScript`:
  Runs the game logic, rendering, and input handling.
- `HTML5 Canvas`:
  A drawing surface (`<canvas>`) where the game visuals are rendered frame-by-frame.

## What “HTML5 Canvas” Means

The game is not made from lots of moving HTML elements.
Instead, the main game scene is drawn manually onto a canvas in JavaScript.

- The `<canvas>` is in `index.html`.
- `src/render.js` draws:
  - terrain
  - cannon
  - enemies
  - missiles
  - explosions
  - HUD framing effects

Think of canvas as a programmable 2D screen.

## No Build Step (Important)

This project intentionally avoids bundlers/frameworks.

- No `npm`
- No `webpack` / `vite`
- No transpilation
- No import/export modules

Scripts are loaded directly in `index.html` in order:

1. `src/theme.js`
2. `src/utils.js`
3. `src/ui.js`
4. `src/game.js`
5. `src/render.js`

Because of this, shared objects are attached to `window` (global browser scope), for example:

- `window.EarthGuardTheme`
- `window.EarthGuardUtils`
- `window.EarthGuardUI`

## Project Structure

- `index.html`
  Main page entry point. Wires together canvas, HUD, controls, and script load order.
- `src/style.css`
  All UI styling and visual CSS effects (buttons, HUD, layout).
- `src/theme.js`
  Central visual tokens (colors, glow, line weights, motion tuning). Also writes CSS variables.
- `src/utils.js`
  Shared helper functions (clamp, lerp, distance, input binding, DOM caching).
- `src/ui.js`
  UI controller for DOM updates (HUD labels, button states, upgrade UI).
- `src/game.js`
  Core game state and rules (waves, missiles, explosions, HP, upgrades).
- `src/render.js`
  Canvas renderer + input wiring. Draws the world and visual effects.
- `scripts/predeploy-check.ps1`
  PowerShell script to run local validation before deploy.
- `DEVELOPMENT.md`
  Deployment workflow notes (GitHub Pages / `gh` CLI).
- `GAME_DESIGN.md`
  Game design decisions and mechanics.

## Code Architecture (High-Level)

The codebase is split by responsibility:

- `Game` (`src/game.js`) = rules and state
  - Knows what happens in the game.
  - Does not draw visuals.
- `Renderer` (`src/render.js`) = drawing and control input bindings
  - Knows how things look on canvas.
  - Reads game state and draws it.
- `UI` (`src/ui.js`) = HTML control panel and HUD updates
  - Updates text/buttons in the DOM.
- `Theme` (`src/theme.js`) = visual configuration
  - Centralizes styling tokens for easier future changes.

This is a lightweight version of “separation of concerns”.

## Tooling Used (and What It Is)

### `git`
Version control. Tracks changes and pushes them to GitHub.

Common commands:

- `git status`
- `git add -A`
- `git commit -m "message"`
- `git push`

### `gh` (GitHub CLI)
Command-line tool for GitHub.

Used here to check GitHub Pages build status.

Example:

```powershell
gh api repos/dunctait/earthguard/pages/builds --jq '.[0].status'
```

### `node --check`
Uses Node.js to syntax-check JavaScript files (without running the game).

Example:

```powershell
node --check src\game.js
```

This catches syntax errors before deployment.

### PowerShell (`.ps1`)
Windows shell scripting language.

This repo uses a PowerShell script for pre-deploy checks:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\predeploy-check.ps1
```

It verifies:

- JS syntax
- required files exist
- script load order in `index.html`
- `.nojekyll` is present (important for GitHub Pages when symlinks exist)

## How Rendering Works (Simple Mental Model)

Every animation frame:

1. `Renderer.animate()` runs
2. `Renderer.render()` clears and redraws the canvas
3. It reads game state (`game.aliens`, `game.missiles`, `game.explosions`, etc.)
4. It draws visual layers in order (background -> terrain -> effects -> enemies -> HUD frame)

This is normal for canvas games.

## How Input Works

There are two input layers:

- HTML buttons in the control panel (rotate, fire, advance, upgrade)
- Touch and mouse events bound in `src/render.js`

Helpers in `src/utils.js` reduce duplication for:

- hold-to-repeat buttons
- press/release actions

## How the Game State Advances

- Player aims and charges missiles.
- Missiles are “locked” for the turn.
- `Advance` starts the turn animation.
- Missiles and aliens move over animation frames.
- Explosions apply damage.
- If wave is cleared:
  - level increases
  - a new wave spawns
  - upgrade points can be awarded

## Upgrade / Flag System (Current)

The code now includes a basic upgrade framework in `src/game.js`:

- `upgradePoints`
- `upgrades` object
- `purchaseUpgrade(key)`
- `hasUpgrade(key)`

Current upgrade:

- `targetFlags`:
  Unlocks target flag markers drawn on predicted/locked target areas.

This structure is meant to make future upgrades easier to add.

## Styling Strategy

Visual style is a retro CRT / radar terminal look.

Key idea: central theming + layered effects.

- Theme tokens live in `src/theme.js`
- CSS variables are set from the theme
- Canvas renderer also reads the same theme data

This avoids duplicating color/glow values in multiple places.

## Local Development (No Server Needed)

You can usually open `index.html` directly in a browser.

- Double-click `index.html`, or
- Open it via your browser’s “Open File”

Because there is no build step, changes are just file edits + refresh.

## Deploying (GitHub Pages)

This repo is hosted via GitHub Pages from the `main` branch.

Recommended flow:

1. Run pre-deploy checks
2. Commit changes
3. Push to `main`
4. Check GitHub Pages build status

Commands:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\predeploy-check.ps1
git add -A
git commit -m "Your change"
git push
gh api repos/dunctait/earthguard/pages/builds --jq '.[0].status'
```

## Common Beginner Questions

### Why no `package.json`?

Because the project does not use npm dependencies or a build tool.

### Why are there no `import` statements?

The project uses direct script tags in `index.html` and global `window.*` objects instead of ES modules.

### Why use Canvas instead of DOM elements?

Canvas is simpler for custom 2D game rendering (missiles, explosions, glow effects, motion).

## Good Next Steps (If You’re Learning)

1. Read `index.html` to see the page structure.
2. Read `src/game.js` to understand the rules/state.
3. Read `src/render.js` to see how state becomes visuals.
4. Change a color in `src/theme.js` and refresh.
5. Run `scripts/predeploy-check.ps1` before pushing changes.
