# EarthGuard - Game Design

## Concept

A five minute, portrait mode, continuous space, turn-based missile defence game with bounded uncertainty and exponential scaling.

## Core Loop

1. **Aim** - Rotate launcher left/right (0° = up, negative = left, positive = right)
2. **Charge** - Hold fire button to charge power (determines missile range)
3. **Lock** - Release to lock in missile (2 missiles per turn)
4. **Auto-Advance** - After locking all missiles, turn auto-advances
5. **Travel** - Missiles travel 50% of their distance per turn
6. **Explode** - Missiles detonate on their 2nd turn (when reaching target)
7. **Repeat** - Aliens descend, damage applied, next turn begins

## Turn Resolution (on Advance)

1. Pending missiles become active (in-flight)
2. All missiles travel 50% toward their targets
3. Missiles reaching 100% explode
4. Aliens descend
5. Explosion damage applied to aliens in radius
6. Aliens reaching Earth deal damage to base HP
7. Dead aliens removed
8. If wave cleared, next wave spawns

## Controls

| Control | Action |
|---------|--------|
| `<<` | Rotate left 10° (hold to repeat) |
| `<` | Rotate left 1° (hold to repeat) |
| `>` | Rotate right 1° (hold to repeat) |
| `>>` | Rotate right 10° (hold to repeat) |
| **HOLD FIRE** | Charge power (faster fill = harder control) |
| **ADVANCE** | Manual advance (or auto after 2 missiles locked) |

## GameConfig (Central Configuration)

All tunable values in one place:

```javascript
GameConfig = {
    // World
    WORLD_HEIGHT: 100,
    WORLD_WIDTH: 60,

    // Launcher
    LAUNCHER_Y: 5,
    MIN_ANGLE: -60,
    MAX_ANGLE: 60,
    START_ANGLE: 0,

    // Missiles
    MISSILES_PER_TURN: 2,
    MISSILE_TRAVEL_PER_TURN: 0.5,  // 50% per advance
    EXPLOSION_RADIUS: 6.4,          // 80% of original
    MAX_MISSILE_RANGE: 85,          // % of world height

    // Power/Charging
    POWER_CHARGE_RATE: 4,           // Fast = harder
    POWER_UPDATE_INTERVAL: 30,

    // Aliens
    BASE_ALIEN_SPEED: 3,
    ALIEN_SPEED_PER_LEVEL: 0.5,
    ALIEN_RADIUS: 3,
    ALIEN_DAMAGE: 10,

    // Player
    STARTING_HP: 100,

    // Animation
    ANIMATION_FRAMES: 60,
    ANIMATION_FRAME_MS: 16
}
```

## Missile Mechanics

- Player locks in 2 missiles per turn
- Each missile travels 50% of total distance per advance
- Missiles explode when reaching target (2nd advance after firing)
- Prediction circles: orange while charging, green when locked
- In-flight missiles show faint target zone

## Angle Convention

- 0° = straight up
- Negative = left (e.g., -30° aims left)
- Positive = right (e.g., +30° aims right)
- Range: -60° to +60°

## Visual Feedback

- Launcher barrel rotates with angle
- Dashed aiming guide when not charging
- Orange prediction circle while charging
- Green circles for locked missiles
- Missiles show trail while flying
- Target zones shown for in-flight missiles
- Explosion gradient effect

## Test Helpers

```javascript
game.getState()           // Current state summary
game.aimAtAlien(0)        // Aim at first alien
game.chargeTo(100)        // Lock missile at power level
game.autoTurn()           // Full automated turn
game.autoPlay(10)         // Play N turns automatically
```

## Future Considerations

From original design doc (`docs/DESIGN.md`):

- AI towers with auto-fire conditions
- Energy system limiting shots
- Zoom thresholds at level 10, 25, 50, 100
- Prestige/meta-progression
- Aim deviation (bounded uncertainty)
- Multiple alien types
