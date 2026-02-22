# EarthGuard Project Instructions

## Project Overview

EarthGuard is a five minute, portrait mode, continuous space, turn-based missile defence game with bounded uncertainty and exponential scaling.

## Documentation

- **[GAME_DESIGN.md](GAME_DESIGN.md)** - Current game design decisions and mechanics
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Build, deploy, and development workflow
- **[docs/DESIGN.md](docs/DESIGN.md)** - Original full design document (reference)

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no build step)
- GitHub Pages for hosting
- Mobile-first, portrait orientation
- Touch controls primary, mouse secondary

## Key Constraints

- **No build tools** - must work directly from GitHub Pages
- **Portrait mode only** - design for phone screens first
- **Touch-first** - all interactions must work with touch
- **Turn-based** - player aims, charges, then advances to animate

## File Structure

```
earthguard/
├── index.html          # Entry point (GitHub Pages)
├── CLAUDE.md           # This file
├── DEVELOPMENT.md      # Dev workflow
├── GAME_DESIGN.md      # Current design
├── docs/
│   └── DESIGN.md       # Original design document
└── src/
    ├── game.js         # Core game logic
    ├── render.js       # Canvas rendering
    └── style.css       # Styles
```

## Current State

MVP prototype with:
- Rotatable launcher (1° and 10° increments)
- Hold-to-charge power mechanic
- Predicted explosion area preview
- Turn-based advance button
- Basic alien waves with scaling difficulty

## Git Workflow

- After a git push, wait for GitHub Pages build to complete
- Check build status: `gh api repos/dunctait/earthguard/pages/builds --jq '.[0].status'`
- Wait for "built" before testing
- Live URL: https://dunctait.github.io/earthguard/
