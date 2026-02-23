# Balance Tuning Guide

This project uses a persona-driven simulation framework to tune progression, upgrade value, and difficulty.

## Core Principle

Balance is not a single number. It is a set of target outcomes for different player types.

We tune against personas (accuracy + upgrade strategy + banking behavior), then check whether their outcomes match design intent.

## What To Measure

The most useful metrics in this game are:

- `avgFinalLevel`: progression depth
- `avgFinalCycles`: how long the defense survives in actual processor cycles
- `avgFinalMoney`: whether cash economy is too tight / too generous
- `avgFinalEnergy`: whether energy is too punishing / too loose
- `gameOverRate`: whether the game is still ending consistently
- `maxLevel`: catches occasional runaway builds

Use `avgFinalCycles` in addition to `avgFinalLevel` because the wave system can auto-cycle and vary enemy counts.

## Persona Matrix (How To Think About It)

Personas are a combination of:

- `accuracy` (e.g. `50acc`, `75acc`, `90acc`)
- `upgrade strategy` (`noUpgrades`, `cheapestUpgrade`, `prioritiseMoney`, `prioritiseEnergy`)
- `banked threshold` (`1xBanked`, `2xBanked`)

Example:

- `90acc_noUpgrades_1xBanked`
- `75acc_cheapestUpgrade_1xBanked`
- `60acc_prioritiseEnergy_2xBanked`

This helps separate:

- player skill problems
- strategy traps
- economy tuning problems

## Why A Persona May Underperform

If a `cheapestUpgrade` persona underperforms `noUpgrades`, it usually means one or more of:

- cheapest upgrades are low-impact for survival
- upgrade energy costs reduce shot capacity too much
- upgrade money costs delay stronger upgrades
- the strategy buys utility/economy before combat power

That is a tuning signal, not necessarily a bug.

## Tuning Levers (Most Effective First)

### 1. Upgrade Energy Costs (early tiers)

Best lever when players feel energy-starved.

Use this when:

- personas end with high money but low progression
- upgrade strategies underperform no-upgrades
- players report energy frustration

Recommended approach:

- reduce energy cost on tier 1 utility/readability upgrades first
- keep later tiers expensive if needed

### 2. Early Combat Upgrade Impact

Best lever when upgrades feel weak.

Increase impact of:

- `Blast Radius`
- `Missile Racks`
- `Energy Efficiency`
- `Reactor Regen`

Tier 1 should be felt immediately.

### 3. Upgrade Money Costs / Ordering

Best lever when “cheap” strategies are traps.

If `cheapestUpgrade` buys weak upgrades first:

- raise money cost of low-impact upgrades
- lower money cost of survival upgrades
- or keep it as an intentionally weak strategy and document that in persona expectations

### 4. Human-Facing Upgrade Accuracy Benefits (sim only)

These upgrades improve real humans more than raw game state indicates, so the simulator models them:

- `Trajectory Processor` = small accuracy boost
- `Power Memory` = small power consistency boost
- `Target Area Preview` = meaningful accuracy boost

If sims still underperform real players:

- increase these simulated benefits slightly

### 5. Wave Difficulty (global)

Use carefully, because this affects every persona.

Levers:

- `BASE_ALIEN_SPEED`
- `ALIEN_SPEED_PER_LEVEL`
- wave enemy count scaling

Only use after upgrade/economy tuning if the whole game is too hard or too easy.

## Recommended Iteration Loop

1. Run a baseline batch.
2. Identify which personas fail and *why* (level, cycles, energy, money).
3. Change one category of levers (energy costs, combat upgrade impact, or difficulty).
4. Re-run the same batch.
5. Compare diffs.
6. Lock changes when criteria pass.

## Useful Commands

Core batch (fast):

```powershell
npm run sim:batch:ci
```

Matrix slice:

```powershell
node scripts/sim-batch.js --personas=90acc_noUpgrades_1xBanked,90acc_cheapestUpgrade_1xBanked,90acc_prioritiseMoney_1xBanked --runs=100 --max-turns=120
```

Outputs:

- `artifacts/sim/sim-batch-results.json`
- `artifacts/sim/sim-batch-results.csv`
- `artifacts/sim/sim-batch-aggregate.csv`
- `artifacts/sim/sim-batch-criteria-report.json`
- `artifacts/sim/sim-batch-criteria-report.csv`

## Practical Guidance For This Game

- If players feel “energy is the annoying part,” start by cutting early upgrade energy costs.
- If high-skill no-upgrade beats upgrade strategies, improve early upgrade impact before touching enemy speed.
- If a strategy is intentionally bad (e.g. `cheapestUpgrade`), keep it but measure it explicitly so it doesn’t get mistaken for “average player”.
