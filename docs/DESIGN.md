# EarthGuard Game Design Document

A five minute, portrait mode, continuous space, turn based missile defence game with bounded uncertainty and exponential scaling.

---

## 1. Core Design Goals

- Five minute runs
- Manual skill always matters
- Planning + imperfect execution
- Continuous space, not grid
- Clean scaling via zoom thresholds
- Energy tension between manual and AI towers
- Deterministic systems with bounded variance
- Fully procedural wave scaling so levels can be skipped

---

## 2. Core Gameplay Loop

Each tick (≈ 0.75s):

1. Player may fire manual missile.
2. AI towers auto fire if:
   - Target condition satisfied
   - Energy available
3. All missiles advance.
4. Aliens advance.
5. Missiles whose fuse completes explode.
6. Damage is applied.
7. Aliens that reach Earth deal base damage.

**Tick resolution order must be deterministic.**

RNG should be rolled at commit time, not mid animation.

---

## 3. Continuous Battlefield Model

- 2D vertical space measured in km.
- Earth at y = 0.
- Aliens spawn at y = spawnHeight (e.g. 10 km early).
- Aliens move downward at constant velocity (early game).
- No tiles. Positions are floats.

### Manual Aim

- Player drags to point in space.
- A faint predicted intercept marker is shown.
- Marker length is short early game.
- Upgrade extends predictor.

---

## 4. Manual Missile Model

When firing:

1. Player selects target location.
2. Player sets fuse using power slider.
3. Missile launches immediately.
4. Missile visually travels toward target.
5. Explosion occurs when fuse expires.

**Important:** Fuse duration early game = 1–2 ticks max.

### Explosion

- Radius R.
- Full damage inner core.
- Linear falloff outer ring.
- Slight deviation from exact aim (bounded error).
- No percentages shown.

### Variance Source

Fuse imprecision and aim error.

### Upgrades Can

- Reduce deviation
- Increase radius
- Increase missile speed
- Increase fuse precision

---

## 5. Energy System

Global shared pool.

### Properties

- Max energy
- Regen per tick

### Manual Tower

- Always allowed to fire
- Consumes energy
- Can overdraw at penalty (optional early omission)

### AI Towers

- Auto evaluate each tick
- Fire only if sufficient energy
- If insufficient: They skip firing.

Poor builds fail organically due to energy starvation.

---

## 6. AI Tower Slots

Layout (portrait bottom strip):

```
[T1] [T2] [Manual] [T3] [T4]
```

Max 5 towers total initially. Manual always central.

### AI Tower Archetypes (Examples)

| Type | Description |
|------|-------------|
| **Sentinel** | Fires only within lower 20% altitude. High damage. |
| **Sniper** | Targets highest altitude alien. Long fuse. |
| **Scatter** | Random target each tick. Low energy cost. |
| **Mine Layer** | Places delayed detonation at fixed altitude band. |

### Each Tower Has

- Fire condition
- Energy cost
- Fuse length
- Damage
- Radius

---

## 7. Run Structure

- Five minute session.
- **Failure:** Base HP reaches 0.
- Base HP decreases when alien reaches y = 0.
- Aliens are not infinite. They spawn in waves.

---

## 8. Procedural Difficulty Scaling

Each level increases a difficulty budget.

```
difficultyBudget = level × scalingFactor
```

Budget allocated across:

- Alien count
- Alien speed
- Alien HP
- Behaviour modifiers
- Spawn simultaneity

This allows safe skipping of 30+ levels. No handcrafted per-level tuning required.

---

## 9. Threshold Zoom System

At defined level thresholds (e.g. 10, 25, 50, 100):

- Camera zooms out.
- Spawn height increases.
- Aliens appear smaller.
- Explosion radius becomes proportionally smaller.
- Distances increase.

This creates natural obsolescence of early scale.

**Zoom shift should be discrete and dramatic.**

---

## 10. Early 90 Second Experience

| Level | Description |
|-------|-------------|
| 1 | 1 alien. 10 km spawn. Speed 1 km/tick. Teaches fuse timing. |
| 2 | 2 aliens staggered. |
| 3 | 2 simultaneous. |
| 5 | 3 aliens. |
| 10 | First zoom out. Spawn height increases. Explosion feels smaller. |

By 60–90 seconds:
- 4–6 aliens per wave.
- Slight speed variation.
- Player should reach level ~15–20 within first minute.

---

## 11. Long Term Scaling Arc

| Phase | Description |
|-------|-------------|
| **Early** | Manual precision dominant. |
| **Mid** | Energy tension emerges. AI towers become necessary. |
| **Late** | Swarm management. Manual handles priority threats. AI handles background flow. |
| **Very Late** | Chain reaction builds. Large radii. High simultaneity. |

---

## 12. Prestige Model

After run ends:

```
prestigeCurrency = highestLevelReached
```

### Prestige Unlocks

- Start at higher level
- Higher base energy regen
- Additional AI slot
- Reduced aim deviation
- Longer predictor path

Skipping levels increases difficulty budget accordingly. No handcrafted content to break.

---

## 13. Key Balance Rules

- Explosion feedback within 2 ticks max early.
- Something meaningful must happen every tick.
- Manual tower must remain valuable forever.
- Variance must create drama, not invalidate planning.
- Never randomise all systems simultaneously.

---

## 14. Implementation MVP Scope

For first prototype, implement only:

- Manual tower
- No AI towers
- Energy system basic
- Constant alien velocity
- One alien type
- Single zoom threshold at level 10
- Simple procedural difficulty scaling via count + speed
- No prestige initially.

### Goal

Test pacing and feel of:

- Fuse timing
- Aim imprecision
- Tick speed

**If that loop feels good, layer complexity.**
