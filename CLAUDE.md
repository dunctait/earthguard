# EarthGuard Project Instructions

## Project Overview

EarthGuard is a five minute, portrait mode, continuous space, turn based missile defence game with bounded uncertainty and exponential scaling.

**Full design document:** [docs/DESIGN.md](docs/DESIGN.md)

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no build step)
- GitHub Pages for hosting
- Mobile-first, portrait orientation
- Touch controls primary, mouse secondary

## Development Workflow

1. All game code lives in `/src`
2. Entry point is `index.html` at root (for GitHub Pages)
3. Test on mobile via GitHub Pages URL after each push
4. Keep the feedback loop tight - small changes, deploy often

## Key Constraints

- **No build tools** - must work directly from GitHub Pages
- **Portrait mode only** - design for phone screens first
- **Touch-first** - all interactions must work with touch
- **Tick-based** - ~0.75s ticks, deterministic resolution order

## File Structure

```
earthguard/
├── index.html          # Entry point (GitHub Pages)
├── CLAUDE.md           # This file
├── docs/
│   └── DESIGN.md       # Full game design document
└── src/
    ├── game.js         # Core game logic
    ├── render.js       # Canvas rendering
    └── style.css       # Styles
```

## Git Workflow

- After a git push, wait for direction from the human
- Commit messages should be concise and descriptive
- Push to `main` branch deploys to GitHub Pages

## MVP Focus

Current phase: **MVP Prototype**

Implement only:
- Manual tower (tap to aim, slider for fuse)
- Basic energy system
- Constant velocity aliens
- One alien type
- Procedural difficulty (count + speed)
- Single zoom threshold at level 10

Do NOT implement yet:
- AI towers
- Prestige system
- Multiple alien types
- Complex upgrades
