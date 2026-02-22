/**
 * EarthGuard - Core Game Logic
 *
 * Turn-based missile defense with manual aiming.
 */

class Game {
    constructor() {
        // World dimensions (in game units)
        this.WORLD_HEIGHT = 100;
        this.WORLD_WIDTH = 60;

        // Launcher config
        this.launcherAngle = 90; // degrees, 90 = straight up
        this.MIN_ANGLE = 30;
        this.MAX_ANGLE = 150;

        // Power config
        this.power = 0; // 0-100
        this.maxPower = 100;
        this.isCharging = false;
        this.hasCharged = false; // Has the player charged a shot this turn?

        // Missile config
        this.missileSpeed = 2; // units per animation frame
        this.explosionRadius = 8;

        // Game state
        this.level = 1;
        this.baseHP = 100;
        this.isAnimating = false;

        // Entities
        this.aliens = [];
        this.missiles = [];
        this.explosions = [];

        // Callbacks
        this.onStateChange = null;

        // Initialize first wave
        this.spawnWave();
    }

    spawnWave() {
        const alienCount = Math.min(1 + Math.floor((this.level - 1) / 2), 8);
        const baseSpeed = 3 + (this.level * 0.5);

        for (let i = 0; i < alienCount; i++) {
            this.aliens.push({
                x: 10 + Math.random() * (this.WORLD_WIDTH - 20),
                y: this.WORLD_HEIGHT - 5 - (i * 8),
                speed: baseSpeed,
                hp: 1,
                damage: 10,
                radius: 3
            });
        }
    }

    rotateLeft(degrees) {
        this.launcherAngle = Math.min(this.MAX_ANGLE, this.launcherAngle + degrees);
        this.notify();
    }

    rotateRight(degrees) {
        this.launcherAngle = Math.max(this.MIN_ANGLE, this.launcherAngle - degrees);
        this.notify();
    }

    startCharging() {
        if (this.isAnimating || this.hasCharged) return;
        this.isCharging = true;
        this.power = 0;
        this.notify();
    }

    updateCharge() {
        if (!this.isCharging) return;
        this.power = Math.min(this.maxPower, this.power + 2);
        this.notify();
    }

    stopCharging() {
        if (!this.isCharging) return;
        this.isCharging = false;

        if (this.power > 5) {
            this.hasCharged = true;
            // Create missile with current angle and power
            const angleRad = this.launcherAngle * Math.PI / 180;
            const distance = (this.power / 100) * (this.WORLD_HEIGHT * 0.85);

            this.missiles.push({
                x: this.WORLD_WIDTH / 2,
                y: 5, // Launcher position
                targetX: this.WORLD_WIDTH / 2 + Math.cos(angleRad) * distance,
                targetY: 5 + Math.sin(angleRad) * distance,
                progress: 0, // 0 to 1
                exploded: false
            });
        }
        this.notify();
    }

    // Get predicted explosion position based on current angle and power
    getPrediction() {
        if (this.power === 0 && !this.hasCharged) return null;

        const angleRad = this.launcherAngle * Math.PI / 180;
        const currentPower = this.hasCharged ? this.missiles[this.missiles.length - 1] : null;

        if (currentPower) {
            return {
                x: currentPower.targetX,
                y: currentPower.targetY,
                radius: this.explosionRadius
            };
        }

        const distance = (this.power / 100) * (this.WORLD_HEIGHT * 0.85);
        return {
            x: this.WORLD_WIDTH / 2 + Math.cos(angleRad) * distance,
            y: 5 + Math.sin(angleRad) * distance,
            radius: this.explosionRadius
        };
    }

    advance() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.notify();

        // Animation runs for ~1 second (60 frames at 16ms each)
        const totalFrames = 60;
        let frame = 0;

        const interval = setInterval(() => {
            frame++;

            // Advance missiles
            for (const missile of this.missiles) {
                if (!missile.exploded) {
                    missile.progress += 1 / 30; // Missile takes 0.5s to reach target

                    if (missile.progress >= 1) {
                        missile.exploded = true;
                        this.createExplosion(missile.targetX, missile.targetY);
                    }
                }
            }

            // Advance aliens (they move down)
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
        }, 16);
    }

    createExplosion(x, y) {
        this.explosions.push({
            x: x,
            y: y,
            radius: this.explosionRadius,
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
        const reachedEarth = this.aliens.filter(a => a.y <= 5);
        for (const alien of reachedEarth) {
            this.baseHP -= alien.damage;
        }
        this.aliens = this.aliens.filter(a => a.y > 5);

        // Clean up
        this.missiles = [];
        this.explosions = [];
        this.hasCharged = false;
        this.power = 0;

        // Check wave complete
        if (this.aliens.length === 0) {
            this.level++;
            this.spawnWave();
        }

        // Check game over
        if (this.baseHP <= 0) {
            this.baseHP = 0;
            alert('Game Over! Reached level ' + this.level);
            this.level = 1;
            this.baseHP = 100;
            this.aliens = [];
            this.spawnWave();
        }

        this.isAnimating = false;
        this.notify();
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

        // Remove dead aliens
        this.aliens = this.aliens.filter(a => a.hp > 0);
    }

    notify() {
        if (this.onStateChange) this.onStateChange();
    }

    updateUI() {
        document.getElementById('level').textContent = `Level ${this.level}`;
        document.getElementById('hp').textContent = `HP: ${Math.max(0, this.baseHP)}`;
        const angleInput = document.getElementById('angle-input');
        if (document.activeElement !== angleInput) {
            angleInput.value = this.launcherAngle;
        }
        document.getElementById('power-bar').style.width = `${this.power}%`;

        const fireBtn = document.getElementById('fire-btn');
        fireBtn.classList.toggle('charging', this.isCharging);
        fireBtn.classList.toggle('charged', this.hasCharged);
        fireBtn.textContent = this.hasCharged ? 'LOCKED IN' : (this.isCharging ? 'CHARGING...' : 'HOLD TO CHARGE');

        document.getElementById('advance-btn').disabled = this.isAnimating;
    }

    // ==================== TEST HELPERS ====================

    // Get state summary for testing
    getState() {
        return {
            level: this.level,
            hp: this.baseHP,
            angle: this.launcherAngle,
            power: this.power,
            hasCharged: this.hasCharged,
            isAnimating: this.isAnimating,
            aliens: this.aliens.map(a => ({ x: a.x.toFixed(1), y: a.y.toFixed(1) })),
            missiles: this.missiles.length
        };
    }

    // Aim at first alien (or specific index)
    aimAtAlien(index = 0) {
        if (index >= this.aliens.length) return null;
        const alien = this.aliens[index];
        const dx = alien.x - this.WORLD_WIDTH / 2;
        const dy = alien.y - 5;
        const angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
        this.launcherAngle = Math.max(this.MIN_ANGLE, Math.min(this.MAX_ANGLE, angle));
        this.notify();
        this.updateUI();
        return { targetAngle: angle, setAngle: this.launcherAngle, alien: { x: alien.x, y: alien.y } };
    }

    // Charge to specific power (0-100) and lock in
    chargeTo(powerPercent) {
        if (this.hasCharged || this.isAnimating) return false;
        this.power = Math.max(0, Math.min(100, powerPercent));
        this.hasCharged = true;

        // Create missile
        const angleRad = this.launcherAngle * Math.PI / 180;
        const distance = (this.power / 100) * (this.WORLD_HEIGHT * 0.85);
        this.missiles.push({
            x: this.WORLD_WIDTH / 2,
            y: 5,
            targetX: this.WORLD_WIDTH / 2 + Math.cos(angleRad) * distance,
            targetY: 5 + Math.sin(angleRad) * distance,
            progress: 0,
            exploded: false
        });

        this.notify();
        this.updateUI();
        return true;
    }

    // Full auto-turn: aim at alien, charge full, advance, return promise
    autoTurn(alienIndex = 0) {
        return new Promise((resolve) => {
            const aimResult = this.aimAtAlien(alienIndex);
            if (!aimResult) {
                resolve({ success: false, reason: 'No alien at index' });
                return;
            }

            this.chargeTo(100);

            const originalFinish = this.finishTurn.bind(this);
            this.finishTurn = () => {
                originalFinish();
                this.finishTurn = originalFinish;
                resolve({
                    success: true,
                    aliensRemaining: this.aliens.length,
                    level: this.level,
                    hp: this.baseHP
                });
            };

            this.advance();
        });
    }

    // Play multiple auto-turns
    async autoPlay(turns = 5) {
        const results = [];
        for (let i = 0; i < turns; i++) {
            if (this.aliens.length === 0) {
                results.push({ turn: i, skipped: true, reason: 'No aliens' });
                continue;
            }
            const result = await this.autoTurn(0);
            results.push({ turn: i, ...result });
            if (this.baseHP <= 0) break;
        }
        return results;
    }
}
