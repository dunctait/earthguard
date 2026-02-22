/**
 * EarthGuard - Core Game Logic
 *
 * Tick-based missile defense game.
 * All game state and logic lives here.
 */

class Game {
    constructor() {
        // Game constants
        this.TICK_DURATION = 750; // ms
        this.SPAWN_HEIGHT = 10; // km
        this.EARTH_Y = 0;

        // Game state
        this.level = 1;
        this.baseHP = 100;
        this.energy = 100;
        this.maxEnergy = 100;
        this.energyRegen = 10;

        // Entities
        this.aliens = [];
        this.missiles = [];
        this.explosions = [];

        // Input state
        this.targetX = null;
        this.targetY = null;
        this.fuseTime = 1; // ticks

        // Tick management
        this.tickTimer = null;
        this.tickCount = 0;
        this.isPaused = false;

        // Callbacks for rendering
        this.onTick = null;
        this.onGameOver = null;
    }

    start() {
        this.spawnWave();
        this.tickTimer = setInterval(() => this.tick(), this.TICK_DURATION);
    }

    stop() {
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }
    }

    tick() {
        if (this.isPaused) return;

        this.tickCount++;

        // 1. Regenerate energy
        this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegen);

        // 2. Advance missiles
        for (const missile of this.missiles) {
            missile.ticksRemaining--;
            missile.y += missile.speed;
        }

        // 3. Process explosions (missiles that reached fuse time)
        const explodingMissiles = this.missiles.filter(m => m.ticksRemaining <= 0);
        for (const missile of explodingMissiles) {
            this.createExplosion(missile.x, missile.y, missile.radius);
        }
        this.missiles = this.missiles.filter(m => m.ticksRemaining > 0);

        // 4. Advance aliens
        for (const alien of this.aliens) {
            alien.y -= alien.speed;
        }

        // 5. Apply explosion damage
        for (const explosion of this.explosions) {
            if (explosion.isNew) {
                this.applyExplosionDamage(explosion);
                explosion.isNew = false;
            }
        }

        // 6. Check aliens reaching Earth
        const reachedEarth = this.aliens.filter(a => a.y <= this.EARTH_Y);
        for (const alien of reachedEarth) {
            this.baseHP -= alien.damage;
        }
        this.aliens = this.aliens.filter(a => a.y > this.EARTH_Y);

        // 7. Clean up old explosions
        this.explosions = this.explosions.filter(e => e.age < 3);
        for (const explosion of this.explosions) {
            explosion.age++;
        }

        // 8. Check wave complete
        if (this.aliens.length === 0 && this.missiles.length === 0) {
            this.level++;
            this.spawnWave();
        }

        // 9. Check game over
        if (this.baseHP <= 0) {
            this.stop();
            if (this.onGameOver) this.onGameOver();
        }

        // 10. Update UI
        this.updateUI();

        // Notify renderer
        if (this.onTick) this.onTick();
    }

    spawnWave() {
        // Procedural difficulty: count increases with level
        const alienCount = Math.min(1 + Math.floor(this.level / 2), 10);
        const baseSpeed = 1 + (this.level * 0.1); // km per tick

        for (let i = 0; i < alienCount; i++) {
            this.aliens.push({
                x: 0.2 + Math.random() * 0.6, // normalized 0-1
                y: this.SPAWN_HEIGHT + (i * 0.5), // stagger spawns
                speed: baseSpeed,
                hp: 1,
                damage: 10,
                radius: 0.3 // km
            });
        }
    }

    fireMissile(targetX, targetY, fuseTicks) {
        const energyCost = 20;
        if (this.energy < energyCost) return false;

        this.energy -= energyCost;

        // Calculate missile trajectory
        const startY = this.EARTH_Y;
        const distance = targetY - startY;
        const speed = distance / fuseTicks;

        // Add slight aim deviation (bounded uncertainty)
        const deviation = 0.02; // 2% of screen width
        const actualX = targetX + (Math.random() - 0.5) * deviation;

        this.missiles.push({
            x: actualX,
            y: startY,
            targetY: targetY,
            speed: speed,
            ticksRemaining: fuseTicks,
            radius: 1, // km explosion radius
            damage: 50
        });

        return true;
    }

    createExplosion(x, y, radius) {
        this.explosions.push({
            x: x,
            y: y,
            radius: radius,
            age: 0,
            isNew: true
        });
    }

    applyExplosionDamage(explosion) {
        for (const alien of this.aliens) {
            const dx = (alien.x - explosion.x) * this.SPAWN_HEIGHT; // scale to km
            const dy = alien.y - explosion.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < explosion.radius) {
                // Full damage in core, linear falloff
                const falloff = 1 - (dist / explosion.radius);
                alien.hp -= falloff;
            }
        }

        // Remove dead aliens
        this.aliens = this.aliens.filter(a => a.hp > 0);
    }

    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }

    setFuse(ticks) {
        this.fuseTime = ticks;
    }

    updateUI() {
        document.getElementById('level').textContent = `Level ${this.level}`;
        document.getElementById('hp').textContent = `HP: ${Math.max(0, this.baseHP)}`;
        document.getElementById('energy').textContent = `Energy: ${Math.floor(this.energy)}`;
    }
}
