# EarthGuard Task List

## Delivery Loop
*Use with `docs/ITERATION_LOOP.md` and log outcomes in `docs/BALANCE_LOG.md`.*

### Current Iteration (Now)
- [x] **I1** - Build post-death meta loop v1 (run summary + persistent upgrade choices + replay flow)
- [x] **I2** - Add game over run summary modal content (level/cycles/kills/money/upgrades/death reason)
- [x] **I3** - Persist meta progression stub (`localStorage`) + schema version
- [x] **I4** - Highest-money-per-level tracking + persistence (`T59`)
- [x] **I5** - Level jump system core rules (`T60`)
- [x] **I6** - Level jump UI / preview modal (`T61`)
- [x] **I7** - Post-death persistent upgrade menu v1 (`T55`)
- [x] **I8** - Disabled upgrade cost shortfall highlighting (keep cost visible) (`T56`)
- [x] **I9** - HUD wave bonus feedback polish (`T57`)
- [x] **I10** - Enemy overlap/occlusion rendering (`T46`)
- [x] **I14** - Explicit `IDLE CYCLE` action (`T51`)
- [x] **I15** - Balance sim CI expansion (`T63`)
- [ ] **I16** - Jump-start preview details (selected level + start bonuses + rules copy)
- [ ] **I17** - Meta-upgrade shortfall highlighting / disabled affordance
- [ ] **I18** - Meta progression persistence smoke: reload + retained purchases
- [ ] **I19** - Balance sim CI: add `cheapestCombatUpgrade_2xBanked` persona (`T63`)
- [ ] **I20** - Meta flow polish: game-over sections ordering + labels (`T64` partial)

### Next Iterations (Queued)
- [ ] **I11** - Enemy health + damaged indicator + heart HUD pass (`T48`,`T49`,`T50`)
- [ ] **I12** - First alternate enemy type + boss prototype + boss health (`T52`,`T53`,`T54`)
- [ ] **I13** - Zoom-out after boss defeat (`T47`)

## Roadmap
*Prioritized sequence based on current goals (upgrade-game feel, meta loop, later bullet-hell escalation).*

### Now (Next 3-5 iterations)
- [ ] **R1** - Post-death meta loop foundation: run summary + persistent upgrade choices (`T38`,`T55`)
- [ ] **R2** - Meta progression persistence + schema (`T58`)
- [ ] **R3** - Highest money-per-level tracking + level jump system (`T59`,`T60`,`T61`)
- [ ] **R4** - QoL clarity pass: disabled-cost highlighting + wave bonus feedback (`T56`,`T57`)
- [ ] **R5** - Explicit `IDLE CYCLE` action to support AI-defense fantasy (`T51`)

### Next (Mid-term)
- [ ] **R6** - Enemy occlusion + richer enemy readability (`T46`,`T52`)
- [ ] **R7** - Enemy health system and damage indicators (`T48`,`T49`)
- [ ] **R8** - Heart-based HP presentation for player + boss health pips (`T50`,`T54`)
- [ ] **R9** - Boss encounter prototype + slow high-HP target pacing (`T53`)
- [ ] **R10** - Zoom-out / framing transition after boss defeat (`T47`)

### Later (Expansion)
- [ ] **R11** - Autonomous assistant cannons (small allied batteries)
- [ ] **R12** - Assistant cannon target-area preview (visible random target zones for player tactics)
- [ ] **R13** - Assistant cannon upgrade tree / deployment rules
- [ ] **R14** - Additional enemy types + swarm/bullet-hell progression (`T19`)
- [ ] **R15** - Advanced meta systems (prestige, achievements, daily challenge) (`T42`,`T43`,`T44`)

## Phase 1: Core Gameplay Loop
*Goal: Make the game fun and polished before adding meta features*

### Controls & Feel
- [ ] **T1** - Remove target indicator (prediction circle) - too easy
- [ ] **T2** - Add faint dashed aiming line from cannon (replaces target circle)
- [ ] **T7** - Fix play area aspect ratio (consistent regardless of screen resolution)
- [ ] **T15** - Screen shake on explosions and alien impacts
- [ ] **T16** - Longer fading missile trails that persist briefly

### Visual Polish
- [ ] **T5** - Reduce enemy size
- [ ] **T11** - Non-flat terrain: 2D hills/mountains silhouette for ground
- [ ] **T13** - Alien entry animation: FTL drop-in effect (zoom in, sudden deceleration)
- [ ] **T18** - Wave announcer: "WAVE 3" text fades in/out between waves
- [ ] **T21** - Debris particles when aliens explode
- [ ] **T22** - Proximity warning: screen edge flashes red when aliens near ground
- [ ] **T46** - Enemy overlap/occlusion rendering (front enemies visually block rear enemies)
- [ ] **T47** - Zoom-out event / camera framing shift after boss defeat

### Core Mechanics
- [ ] **T3** - Change power display from % to meters/km
- [ ] **T8** - Add cycle counter (increments on every advance)
- [ ] **T9** - Energy system: recharges over time, depletes per missile (can't spam 2 every turn)
- [ ] **T10** - Reduce HP from 100 to 4, each alien does 2 damage
- [ ] **T12** - Improve alien-to-earth collision detection (account for hills)
- [ ] **T17** - Score system: points for kills, accuracy bonus, combo multiplier
- [ ] **T20** - Critical hits: direct center hits do bonus damage, different explosion color
- [ ] **T48** - Enemy health system: some enemies require 2+ hits
- [ ] **T49** - Damaged enemy indicator (show state after first hit)
- [ ] **T50** - Player HP indicator as hearts (replace/augment numeric HP)
- [ ] **T51** - Explicit `IDLE CYCLE` action (skip targeting, claim regen, supports AI fantasy)

### Upgrade System
- [ ] **T25** - In-game upgrade UI: button/panel to access upgrades during gameplay
- [ ] **T26** - Upgrade costs energy: spending energy on upgrades means fewer missiles that turn
- [ ] **T27** - Upgrade: Explosion radius increase
- [ ] **T28** - Upgrade: Missile speed/range increase
- [ ] **T29** - Upgrade: Energy regen rate increase
- [ ] **T30** - Upgrade: Max energy capacity increase
- [ ] **T31** - Upgrade: Extra missile per turn (3rd slot)
- [ ] **T32** - Upgrade tier system: each upgrade can be leveled multiple times with increasing cost

### Alien Variety
- [ ] **T19** - Different alien types: fast/weak scouts, slow/tanky cruisers, splitting swarmers
- [ ] **T52** - Introduce first alternate enemy type (distinct silhouette + behavior)
- [ ] **T53** - Boss enemy prototype (very slow, high HP e.g. 8 hearts)
- [ ] **T54** - Boss health indicator (heart pips / segments)
- [ ] **T65** - Autonomous assistant cannon prototype (small ally turret)
- [ ] **T66** - Assistant cannon target-area preview shown to player for tactical play
- [ ] **T67** - Assistant cannon behavior tuning (random targeting cadence / constraints)

---

## Phase 2: Meta & Polish
*Goal: Add persistence, menus, audio, and replayability*

### Audio
- [ ] **T33** - Sound effects: retro beeps for firing, explosions, alien death
- [ ] **T34** - Background ambient: low hum or subtle music
- [ ] **T35** - Audio toggle in settings

### Menus & UI
- [ ] **T36** - Start screen with title and "TAP TO START"
- [ ] **T37** - Pause functionality with pause menu
- [ ] **T38** - Game over screen with stats summary
- [ ] **T39** - Tutorial overlay for first-time players
- [ ] **T55** - Post-death persistent upgrade menu (meta progression)
- [ ] **T56** - Upgrade menu: show disabled-cost shortfall by highlighting missing resource (keep cost visible)
- [ ] **T57** - HUD feedback for wave clear bonuses (`+$`, `+EN`)

### Persistence
- [ ] **T24** - High score persistence: save best level to localStorage
- [ ] **T40** - Save/load game state between sessions
- [ ] **T41** - Statistics tracking: total aliens killed, missiles fired, accuracy %
- [ ] **T58** - Persist meta progression + post-death upgrades
- [ ] **T59** - Track highest money ever held per level
- [ ] **T60** - Level jump system using recorded best money per level (full EN, no bought in-run upgrades)
- [ ] **T61** - Level jump UI / rules preview screen

### Advanced Features
- [ ] **T42** - Prestige system: reset for permanent bonuses
- [ ] **T43** - Daily challenge: seeded random for leaderboard comparison
- [ ] **T44** - Achievements system
- [ ] **T62** - Level-scaled exact-hit rewards (late-game skill incentive)
- [ ] **T63** - Balance sim CI coverage: include `cheapestCombatUpgrade_2xBanked` matrix persona
- [ ] **T64** - Modal flow unification for game over, run summary, meta upgrades, level jump

---

## Completed

- [x] **T45** - Improve visuals: solid cannon shape on hill, flat UFO enemies, noisy terrain line
- [x] **T6** - Retro visual overhaul: black background, green LCD/vector style (Missile Command/Star Wars aesthetic)
- [x] **T8** - Add cycle counter (implemented in HUD as `CYCLE`)
- [x] **T9** - Energy system: recharges over time, depletes per missile
- [x] **T12** - Improve alien-to-earth collision detection
- [x] **T21** - Debris particles when aliens explode
- [x] **T25** - In-game upgrade UI
- [x] **T26** - Upgrade costs energy
- [x] **T27** - Upgrade: Explosion radius increase
- [x] **T29** - Upgrade: Energy regen rate increase
- [x] **T31** - Upgrade: Extra missile per turn
- [x] **T32** - Upgrade tier system (multi-level)
