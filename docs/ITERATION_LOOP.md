# Product Iteration Loop

This document defines a repeatable loop for autonomous feature/QoL iteration on EarthGuard.

## Purpose

Move the game forward continuously without destabilizing balance or UX.

Use this loop for:

- QoL improvements
- visual polish
- upgrade additions
- economy tuning
- difficulty tuning
- readability improvements

## Core Rules

1. Change one theme per iteration.
2. Keep changes small enough to evaluate (`1-3` related changes).
3. Always run validation before deciding to keep changes.
4. Prefer tuning values before adding complexity.
5. If criteria change, document why.

## Iteration Types

- `QoL`: controls, HUD clarity, readability, friction reduction
- `Balance`: economy, difficulty, upgrades, reward pacing
- `Visual`: polish, animation, feedback, compositional cleanup
- `Content`: new upgrade, enemy type, progression feature
- `Tech`: refactor, tests, simulation tools, docs

## Change Budget

Pick one:

- `Small`: 1 change, low risk, quick validation
- `Medium`: 2-3 related changes, one subsystem
- `Large`: cross-system changes (requires explicit rationale)

Default is `Medium`.

## Standard Loop

1. Pick an iteration goal
- Example: "Reduce energy frustration without flattening upgrade choices"

2. Define success signal
- Example: fewer energy-blocked turns, no-upgrade personas still weaker than upgrade personas

3. Implement changes
- Prefer data/config changes first
- Keep logic changes targeted

4. Validate locally
- `npm run smoke`
- `npm run sim:batch:ci`
- optional targeted sim command (matrix slice / sweep)

5. Analyze outcomes
- Read criteria pass/fail
- Compare aggregate metrics
- Check histograms (death levels, first purchases)

6. Decide
- `Keep`
- `Keep + criteria update` (intentional target shift)
- `Tweak and rerun`
- `Revert`

7. Record the iteration
- Add a short entry to `docs/BALANCE_LOG.md`

## Required Validation (Default)

Run these unless the iteration is docs-only:

```powershell
npm run smoke
npm run sim:batch:ci
```

## Useful Targeted Commands

Matrix slice:

```powershell
node scripts/sim-batch.js --personas=90acc_noUpgrades_1xBanked,90acc_cheapestCombatUpgrade_1xBanked,90acc_prioritiseMoney_1xBanked --runs=100 --max-turns=160
```

Missile cost sweep:

```powershell
npm run sim:sweep:missile-cost
```

## Guardrails For Autonomous Iteration

Autonomous changes should stop and request review if:

- `sim:batch:ci` fails badly (multiple personas far outside criteria)
- a change affects multiple major systems unexpectedly
- visual/layout regressions appear in smoke tests
- a change requires criteria redefinition and the design intent is unclear

## Criteria Changes Policy

Criteria updates are allowed when:

- the game direction changed intentionally (e.g. "more upgrade-game feel")
- metrics improved in intended ways but thresholds are stale

When changing criteria:

- update only the affected persona thresholds
- keep the rationale short and explicit in `docs/BALANCE_LOG.md`

## Suggested Iteration Template

Use this structure when reporting a cycle:

- Goal
- Changes made
- Validation run
- Results (metrics)
- Decision
- Next hypothesis

