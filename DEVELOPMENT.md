# Development Workflow

## Overview

EarthGuard uses GitHub Pages for hosting. There is no build step - vanilla HTML/CSS/JS is served directly.

## Deploy Process

1. **Make changes** to files in the repo
2. **Commit** with a descriptive message
3. **Push** to the `main` branch
4. **Wait for GitHub Pages build** (~20-30 seconds)
5. **Refresh** https://dunctait.github.io/earthguard/ to see changes

## Commands

```bash
# Pre-deploy validation (recommended)
powershell -ExecutionPolicy Bypass -File scripts/predeploy-check.ps1

# Stage and commit
git add -A
git commit -m "Description of changes"

# Push to remote
git push

# Check build status (wait for "built")
gh api repos/dunctait/earthguard/pages/builds --jq '.[0].status'
```

## Build Status Values

- `queued` - Build is waiting to start
- `building` - Build in progress
- `built` - Deploy complete, site is live
- `errored` - Build failed, check GitHub for details

## Testing

- **Desktop**: Open https://dunctait.github.io/earthguard/ in browser
- **Mobile**: Open same URL on phone (primary target)
- **Local**: Open `index.html` directly in browser (no server needed)

## File Structure

```
earthguard/
├── index.html          # Entry point (GitHub Pages serves this)
├── src/
│   ├── game.js         # Core game logic and state
│   ├── render.js       # Canvas rendering and input handling
│   └── style.css       # All styles
├── docs/
│   └── DESIGN.md       # Original design document
├── CLAUDE.md           # AI assistant instructions
├── DEVELOPMENT.md      # This file
└── GAME_DESIGN.md      # Current game design decisions
```

## Notes

- No build tools, bundlers, or transpilers
- No dependencies - everything is vanilla
- Portrait mode only - landscape shows rotation prompt
- Touch-first design, mouse works too
- `.nojekyll` is present so GitHub Pages serves raw files (important when symlinks like `AGENTS.md` exist)
