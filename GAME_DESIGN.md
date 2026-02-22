# EarthGuard - Game Design

## Concept

A five minute, portrait mode, continuous space, turn-based missile defence game with bounded uncertainty and exponential scaling.

## Core Loop

1. **Aim** - Rotate launcher left/right using buttons (1° fine, 10° coarse)
2. **Charge** - Hold fire button to charge power (determines missile travel distance)
3. **Preview** - See predicted explosion area as dashed circle
4. **Advance** - Press advance to execute the turn (~1 second animation)
5. **Repeat** - Aliens descend, explosions resolve, next turn begins

## Turn Resolution (on Advance)

All of the following animate over ~1 second:

1. Missile travels toward target position
2. Aliens descend toward Earth
3. Missile explodes when it reaches target
4. Explosion damage applied to aliens in radius
5. Aliens reaching Earth deal damage to base HP
6. Dead aliens removed
7. If wave cleared, next wave spawns
8. If HP <= 0, game over

## Controls

| Control | Action |
|---------|--------|
| `<<` | Rotate left 10° |
| `<` | Rotate left 1° |
| `>` | Rotate right 1° |
| `>>` | Rotate right 10° |
| **HOLD FIRE** | Charge power (longer = farther shot) |
| **ADVANCE** | Execute the turn |

## Launcher

- Fixed position at bottom center
- Rotates between 30° and 150° (where 90° is straight up)
- Fires one missile per turn
- Power determines how far missile travels before exploding

## Missiles

- Travel in straight line from launcher
- Explode at distance determined by charge power
- Explosion has fixed radius
- Full damage at center, could add falloff later

## Aliens

- Spawn at top of screen
- Move downward each turn
- Single hit point (one explosion kills)
- Deal damage to base HP if they reach bottom
- Wave count increases with level

## Difficulty Scaling

- Level 1: 1 alien
- Each 2 levels: +1 alien (capped at 8)
- Alien speed increases with level
- Future: HP scaling, behavior modifiers

## World Space

- Continuous 2D space (not grid-based)
- World units: 60 wide × 100 tall
- Earth/launcher at y=5
- Aliens spawn near y=95

## Visual Feedback

- Launcher barrel shows current angle
- Power bar fills while charging
- Dashed circle shows predicted explosion area
- Trajectory line shows missile path
- Explosion animates with radial gradient

## Future Considerations (Not Yet Implemented)

From original design doc (`docs/DESIGN.md`):

- AI towers with auto-fire conditions
- Energy system limiting shots
- Zoom thresholds at level 10, 25, 50, 100
- Prestige/meta-progression
- Aim deviation (bounded uncertainty)
- Multiple alien types
- Fuse timing vs current distance-based system
