/**
 * EarthGuard - Core Game Logic
 */

// Central game configuration - all tunable values in one place
const GameConfig = {
    // World
    WORLD_HEIGHT: 100,
    WORLD_WIDTH: 60,

    // Launcher
    LAUNCHER_Y: 5,
    MIN_ANGLE: -60,      // Max left
    MAX_ANGLE: 60,       // Max right
    START_ANGLE: 0,      // Straight up

    // Missiles
    MISSILES_PER_TURN: 2,
    MISSILE_TRAVEL_PER_TURN: 0.5,  // 50% of target distance per advance
    EXPLOSION_RADIUS: 6.4,          // 80% of original 8
    MAX_MISSILE_RANGE: 85,          // % of world height

    // Power/Charging
    POWER_CHARGE_RATE: 4,           // Per update tick (was 2, now faster)
    POWER_UPDATE_INTERVAL: 30,      // ms between charge updates

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
};

class Game {
    constructor() {
        this.config = GameConfig;

        // Launcher state
        this.launcherAngle = this.config.START_ANGLE;

        // Missile charging
        this.power = 0;
        this.isCharging = false;
        this.missilesLockedThisTurn = 0;

        // Game state
        this.level = 1;
        this.baseHP = this.config.STARTING_HP;
        this.isAnimating = false;

        // Entities
        this.aliens = [];
        this.missiles = [];      // Active missiles in flight
        this.pendingMissiles = []; // Missiles locked in but not yet launched
        this.explosions = [];

        // Callbacks
        this.onStateChange = null;

        // Initialize
        this.spawnWave();
    }

    get WORLD_HEIGHT() { return this.config.WORLD_HEIGHT; }
    get WORLD_WIDTH() { return this.config.WORLD_WIDTH; }

    spawnWave() {
        const alienCount = Math.min(1 + Math.floor((this.level - 1) / 2), 8);
        const speed = this.config.BASE_ALIEN_SPEED + (this.level * this.config.ALIEN_SPEED_PER_LEVEL);

        for (let i = 0; i < alienCount; i++) {
            this.aliens.push({
                x: 10 + Math.random() * (this.config.WORLD_WIDTH - 20),
                y: this.config.WORLD_HEIGHT - 5 - (i * 8),
                speed: speed,
                hp: 1,
                damage: this.config.ALIEN_DAMAGE,
                radius: this.config.ALIEN_RADIUS
            });
        }
    }

    // Angle: 0 = up, negative = left, positive = right
    rotateLeft(degrees) {
        this.launcherAngle = Math.max(this.config.MIN_ANGLE, this.launcherAngle - degrees);
        this.notify();
    }

    rotateRight(degrees) {
        this.launcherAngle = Math.min(this.config.MAX_ANGLE, this.launcherAngle + degrees);
        this.notify();
    }

    canCharge() {
        return !this.isAnimating &&
               !this.isCharging &&
               this.missilesLockedThisTurn < this.config.MISSILES_PER_TURN;
    }

    startCharging() {
        if (!this.canCharge()) return;
        this.isCharging = true;
        this.power = 0;
        this.notify();
    }

    updateCharge() {
        if (!this.isCharging) return;
        this.power = Math.min(100, this.power + this.config.POWER_CHARGE_RATE);
        this.notify();
    }

    stopCharging() {
        if (!this.isCharging) return;
        this.isCharging = false;

        if (this.power > 5) {
            // Lock in missile
            // Angle conversion: 0 = up (90° in math), positive = right
            const mathAngle = (90 - this.launcherAngle) * Math.PI / 180;
            const distance = (this.power / 100) * (this.config.WORLD_HEIGHT * this.config.MAX_MISSILE_RANGE / 100);

            const launcherX = this.config.WORLD_WIDTH / 2;
            const launcherY = this.config.LAUNCHER_Y;

            this.pendingMissiles.push({
                startX: launcherX,
                startY: launcherY,
                targetX: launcherX + Math.cos(mathAngle) * distance,
                targetY: launcherY + Math.sin(mathAngle) * distance,
                progress: 0,
                exploded: false
            });

            this.missilesLockedThisTurn++;
            this.power = 0;

            // Auto-advance when all missiles locked
            if (this.missilesLockedThisTurn >= this.config.MISSILES_PER_TURN) {
                this.notify();
                setTimeout(() => this.advance(), 300);
                return;
            }
        }

        this.notify();
    }

    getPrediction() {
        if (this.power === 0) return null;

        const mathAngle = (90 - this.launcherAngle) * Math.PI / 180;
        const distance = (this.power / 100) * (this.config.WORLD_HEIGHT * this.config.MAX_MISSILE_RANGE / 100);

        const launcherX = this.config.WORLD_WIDTH / 2;
        const launcherY = this.config.LAUNCHER_Y;

        return {
            x: launcherX + Math.cos(mathAngle) * distance,
            y: launcherY + Math.sin(mathAngle) * distance,
            radius: this.config.EXPLOSION_RADIUS
        };
    }

    getLockedMissilesPredictions() {
        return this.pendingMissiles.map(m => ({
            x: m.targetX,
            y: m.targetY,
            radius: this.config.EXPLOSION_RADIUS
        }));
    }

    advance() {
        if (this.isAnimating) return;

        // Move pending missiles to active
        this.missiles.push(...this.pendingMissiles);
        this.pendingMissiles = [];
        this.missilesLockedThisTurn = 0;

        this.isAnimating = true;
        this.notify();

        const totalFrames = this.config.ANIMATION_FRAMES;
        let frame = 0;

        const interval = setInterval(() => {
            frame++;

            // Advance missiles by MISSILE_TRAVEL_PER_TURN of remaining distance
            for (const missile of this.missiles) {
                if (!missile.exploded) {
                    missile.progress += this.config.MISSILE_TRAVEL_PER_TURN / totalFrames;

                    if (missile.progress >= 0.99) {
                        missile.progress = 1;
                        missile.exploded = true;
                        this.createExplosion(missile.targetX, missile.targetY);
                    }
                }
            }

            // Advance aliens
            for (const alien of this.aliens) {
                alien.y -= alien.speed / totalFrames;
            }

            // Age explosions
            for (const explosion of this.explosions) {
                explosion.age++;
            }

            this.notify();

            if (frame >= totalFrames) {
                clearInterval(interval);
                this.finishTurn();
            }
        }, this.config.ANIMATION_FRAME_MS);
    }

    createExplosion(x, y) {
        this.explosions.push({
            x: x,
            y: y,
            radius: this.config.EXPLOSION_RADIUS,
            age: 0,
            maxAge: 30,
            damageApplied: false
        });
    }

    finishTurn() {
        // Apply explosion damage
        for (const explosion of this.explosions) {
            if (!explosion.damageApplied) {
                this.applyExplosionDamage(explosion);
                explosion.damageApplied = true;
            }
        }

        // Check aliens reaching Earth
        const reachedEarth = this.aliens.filter(a => a.y <= this.config.LAUNCHER_Y);
        for (const alien of reachedEarth) {
            this.baseHP -= alien.damage;
        }
        this.aliens = this.aliens.filter(a => a.y > this.config.LAUNCHER_Y);

        // Remove exploded missiles and old explosions
        this.missiles = this.missiles.filter(m => !m.exploded);
        this.explosions = [];

        // Check wave complete
        if (this.aliens.length === 0) {
            this.level++;
            this.spawnWave();
        }

        // Check game over
        if (this.baseHP <= 0) {
            this.baseHP = 0;
            alert('Game Over! Reached level ' + this.level);
            this.reset();
        }

        this.isAnimating = false;
        this.notify();
    }

    reset() {
        this.level = 1;
        this.baseHP = this.config.STARTING_HP;
        this.launcherAngle = this.config.START_ANGLE;
        this.power = 0;
        this.missilesLockedThisTurn = 0;
        this.aliens = [];
        this.missiles = [];
        this.pendingMissiles = [];
        this.explosions = [];
        this.spawnWave();
    }

    applyExplosionDamage(explosion) {
        for (const alien of this.aliens) {
            const dx = alien.x - explosion.x;
            const dy = alien.y - explosion.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < explosion.radius + alien.radius) {
                alien.hp -= 1;
            }
        }
        this.aliens = this.aliens.filter(a => a.hp > 0);
    }

    notify() {
        if (this.onStateChange) this.onStateChange();
    }

    updateUI() {
        document.getElementById('level').textContent = `Level ${this.level}`;
        document.getElementById('hp').textContent = `HP: ${Math.max(0, this.baseHP)}`;
        document.getElementById('angle-display').textContent = `${this.launcherAngle}°`;
        document.getElementById('power-bar').style.width = `${this.power}%`;

        const fireBtn = document.getElementById('fire-btn');
        const missilesLeft = this.config.MISSILES_PER_TURN - this.missilesLockedThisTurn;

        if (this.isCharging) {
            fireBtn.textContent = 'CHARGING...';
            fireBtn.className = 'charging';
        } else if (missilesLeft === 0) {
            fireBtn.textContent = 'LAUNCHING...';
            fireBtn.className = 'charged';
        } else {
            fireBtn.textContent = `FIRE (${missilesLeft} left)`;
            fireBtn.className = '';
        }

        document.getElementById('advance-btn').disabled = this.isAnimating;
    }

    // ==================== TEST HELPERS ====================

    getState() {
        return {
            level: this.level,
            hp: this.baseHP,
            angle: this.launcherAngle,
            power: this.power,
            missilesLocked: this.missilesLockedThisTurn,
            missilesInFlight: this.missiles.length,
            isAnimating: this.isAnimating,
            aliens: this.aliens.map(a => ({ x: +a.x.toFixed(1), y: +a.y.toFixed(1) })),
            config: this.config
        };
    }

    aimAtAlien(index = 0) {
        if (index >= this.aliens.length) return null;
        const alien = this.aliens[index];
        const launcherX = this.config.WORLD_WIDTH / 2;
        const launcherY = this.config.LAUNCHER_Y;
        const dx = alien.x - launcherX;
        const dy = alien.y - launcherY;
        // Convert math angle to game angle (0 = up)
        const mathAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        const gameAngle = Math.round(90 - mathAngle);
        this.launcherAngle = Math.max(this.config.MIN_ANGLE, Math.min(this.config.MAX_ANGLE, gameAngle));
        this.notify();
        this.updateUI();
        return { angle: this.launcherAngle, alien: { x: alien.x, y: alien.y } };
    }

    chargeTo(powerPercent) {
        if (this.missilesLockedThisTurn >= this.config.MISSILES_PER_TURN || this.isAnimating) return false;
        this.power = Math.max(0, Math.min(100, powerPercent));
        this.isCharging = true;
        this.stopCharging();
        return true;
    }

    async autoTurn() {
        return new Promise((resolve) => {
            // Fire all missiles at different aliens
            for (let i = 0; i < this.config.MISSILES_PER_TURN && i < this.aliens.length; i++) {
                this.aimAtAlien(i);
                this.chargeTo(100);
            }

            // If we still have missiles to fire, fire at first alien
            while (this.missilesLockedThisTurn < this.config.MISSILES_PER_TURN && this.aliens.length > 0) {
                this.aimAtAlien(0);
                this.chargeTo(100);
            }

            // Wait for auto-advance or manually advance
            const checkDone = setInterval(() => {
                if (!this.isAnimating && this.missilesLockedThisTurn === 0) {
                    clearInterval(checkDone);
                    resolve({
                        level: this.level,
                        hp: this.baseHP,
                        aliensRemaining: this.aliens.length,
                        missilesInFlight: this.missiles.length
                    });
                }
            }, 100);

            // Manual advance if not auto-triggered
            if (this.missilesLockedThisTurn > 0 && this.missilesLockedThisTurn < this.config.MISSILES_PER_TURN) {
                this.advance();
            }
        });
    }

    async autoPlay(turns = 5) {
        const results = [];
        for (let i = 0; i < turns; i++) {
            if (this.aliens.length === 0 && this.missiles.length === 0) {
                results.push({ turn: i, skipped: true, reason: 'No targets' });
                continue;
            }
            const result = await this.autoTurn();
            results.push({ turn: i, ...result });
            if (this.baseHP <= 0) break;
        }
        return results;
    }
}
