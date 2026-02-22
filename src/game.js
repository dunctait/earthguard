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
    MISSILE_ENERGY_MAX: 100,
    MISSILE_ENERGY_REGEN_PER_TURN: 2,
    MISSILE_MIN_ENERGY_COST: 10,
    TRAJECTORY_FADE_STRENGTH: 2.4,

    // Power/Charging
    POWER_CHARGE_RATE: 4,           // Per update tick (was 2, now faster)
    POWER_UPDATE_INTERVAL: 30,      // ms between charge updates

    // Aliens
    BASE_ALIEN_SPEED: 6,
    ALIEN_SPEED_PER_LEVEL: 1.0,
    ALIEN_RADIUS: 3,
    ALIEN_DAMAGE: 10,
    MONEY_PER_KILL: 10,
    EXACT_HIT_MONEY_MULTIPLIER: 2,
    EXACT_HIT_RADIUS_FACTOR: 0.35,
    WAVE_CLEAR_BONUS_BASE: 40,
    WAVE_CLEAR_BONUS_DECAY_PER_CYCLE: 8,
    WAVE_CLEAR_BONUS_MIN: 5,

    // Player
    STARTING_HP: 100,

    // Animation
    ANIMATION_FRAMES: 24,
    ANIMATION_FRAME_MS: 10
};

class Game {
    constructor() {
        this.config = GameConfig;
        this.utils = window.EarthGuardUtils || {
            clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
            distance: (dx, dy) => Math.sqrt((dx * dx) + (dy * dy))
        };
        this.ui = window.EarthGuardUI ? new window.EarthGuardUI() : null;

        // Launcher state
        this.launcherAngle = this.config.START_ANGLE;

        // Missile charging
        this.power = 0;
        this.isCharging = false;
        this.missilesLockedThisTurn = 0;
        this.missileEnergy = this.config.MISSILE_ENERGY_MAX;

        // Game state
        this.level = 1;
        this.baseHP = this.config.STARTING_HP;
        this.isAnimating = false;
        this.money = 0;
        this.levelCycles = 0;
        this.lastWaveClearBonus = 0;
        this.isUpgradeMenuOpen = false;
        this.upgrades = {
            targetAreas: {
                key: 'targetAreas',
                name: 'Target Area Preview',
                level: 0,
                maxLevel: 1,
                moneyCost: 50,
                energyCost: 20
            }
        };

        // Entities
        this.aliens = [];
        this.missiles = [];      // Active missiles in flight
        this.pendingMissiles = []; // Missiles locked in but not yet launched
        this.explosions = [];
        this.blastResidue = [];
        this.enemyDeathFxEvents = [];
        this.nextFxEventId = 1;

        // Callbacks
        this.onStateChange = null;

        // Initialize
        this.spawnWave();
    }

    get WORLD_HEIGHT() { return this.config.WORLD_HEIGHT; }
    get WORLD_WIDTH() { return this.config.WORLD_WIDTH; }

    spawnWave() {
        this.levelCycles = 0;
        const alienCount = Math.min(2 + Math.floor((this.level - 1) / 2), 8);
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
        this.launcherAngle = this.utils.clamp(this.launcherAngle - degrees, this.config.MIN_ANGLE, this.config.MAX_ANGLE);
        this.notify();
    }

    rotateRight(degrees) {
        this.launcherAngle = this.utils.clamp(this.launcherAngle + degrees, this.config.MIN_ANGLE, this.config.MAX_ANGLE);
        this.notify();
    }

    canCharge() {
        return !this.isAnimating &&
               !this.isCharging &&
               this.missilesLockedThisTurn < this.config.MISSILES_PER_TURN &&
               this.missileEnergy >= this.config.MISSILE_MIN_ENERGY_COST;
    }

    getMissileEnergyCostForPower(power = this.power) {
        if (power <= 0) return 0;
        return this.config.MISSILE_MIN_ENERGY_COST;
    }

    getMaxChargePowerForEnergy(energy = this.missileEnergy) {
        if (energy < this.config.MISSILE_MIN_ENERGY_COST) return 0;
        return 100;
    }

    getLauncherOrigin() {
        return {
            x: this.config.WORLD_WIDTH / 2,
            y: this.config.LAUNCHER_Y
        };
    }

    getTargetForPower(power = this.power) {
        if (power <= 0) return null;

        const mathAngle = (90 - this.launcherAngle) * Math.PI / 180;
        const distance = (power / 100) * (this.config.WORLD_HEIGHT * this.config.MAX_MISSILE_RANGE / 100);
        const launcher = this.getLauncherOrigin();

        return {
            x: launcher.x + Math.cos(mathAngle) * distance,
            y: launcher.y + Math.sin(mathAngle) * distance
        };
    }

    getExplosionRadiusForLevel(level = this.level) {
        const multiplier = level === 1 ? 2 : 1;
        return this.config.EXPLOSION_RADIUS * multiplier;
    }

    getCurrentExplosionRadius() {
        return this.getExplosionRadiusForLevel(this.level);
    }

    getWaveClearSpeedBonus(cycles = this.levelCycles, level = this.level) {
        const raw = this.config.WAVE_CLEAR_BONUS_BASE - ((Math.max(1, cycles) - 1) * this.config.WAVE_CLEAR_BONUS_DECAY_PER_CYCLE);
        const clamped = Math.max(this.config.WAVE_CLEAR_BONUS_MIN, raw);
        // Mild level scaling to keep bonuses meaningful without exploding economy.
        return Math.round(clamped * (1 + ((Math.max(1, level) - 1) * 0.1)));
    }

    startCharging() {
        if (!this.canCharge()) return false;
        this.isCharging = true;
        // Start at minimum lockable charge so energy budget is visible/predictable.
        this.power = Math.min(this.config.MISSILE_MIN_ENERGY_COST, this.getMaxChargePowerForEnergy());
        this.notify();
        return true;
    }

    updateCharge() {
        if (!this.isCharging) return;
        const maxPowerByEnergy = this.getMaxChargePowerForEnergy();
        this.power = this.utils.clamp(this.power + this.config.POWER_CHARGE_RATE, this.config.MISSILE_MIN_ENERGY_COST, maxPowerByEnergy);
        this.notify();
    }

    stopCharging() {
        if (!this.isCharging) return;
        this.isCharging = false;

        if (this.power > 5) {
            const energyCost = this.getMissileEnergyCostForPower(this.power);
            if (energyCost > this.missileEnergy) {
                this.power = 0;
                this.notify();
                return;
            }
            const launcher = this.getLauncherOrigin();
            const target = this.getTargetForPower(this.power);

            this.pendingMissiles.push({
                startX: launcher.x,
                startY: launcher.y,
                targetX: target.x,
                targetY: target.y,
                explosionRadius: this.getCurrentExplosionRadius(),
                progress: 0,
                exploded: false
            });

            this.missilesLockedThisTurn++;
            this.missileEnergy = this.utils.clamp(this.missileEnergy - energyCost, 0, this.config.MISSILE_ENERGY_MAX);
            this.power = 0;

            // Auto-advance when all missiles locked
            if (this.missilesLockedThisTurn >= this.config.MISSILES_PER_TURN) {
                this.notify();
                setTimeout(() => this.advance(), 100);
                return;
            }
        }

        this.notify();
    }

    getPrediction() {
        const target = this.getTargetForPower(this.power);
        if (!target) return null;

        return {
            x: target.x,
            y: target.y,
            radius: this.getCurrentExplosionRadius()
        };
    }

    getLockedMissilesPredictions() {
        return this.pendingMissiles.map(m => ({
            x: m.targetX,
            y: m.targetY,
            radius: m.explosionRadius || this.getCurrentExplosionRadius()
        }));
    }

    hasUpgrade(key) {
        return Boolean(this.upgrades[key] && this.upgrades[key].level > 0);
    }

    toggleUpgradeMenu() {
        this.isUpgradeMenuOpen = !this.isUpgradeMenuOpen;
        this.notify();
    }

    canPurchaseUpgrade(key) {
        const upgrade = this.upgrades[key];
        if (!upgrade) return false;
        if (upgrade.level >= upgrade.maxLevel) return false;
        return this.money >= upgrade.moneyCost &&
               this.missileEnergy >= upgrade.energyCost;
    }

    purchaseUpgrade(key) {
        if (!this.canPurchaseUpgrade(key)) return false;
        const upgrade = this.upgrades[key];
        this.money -= upgrade.moneyCost;
        this.missileEnergy = this.utils.clamp(
            this.missileEnergy - upgrade.energyCost,
            0,
            this.config.MISSILE_ENERGY_MAX
        );
        upgrade.level += 1;
        this.isUpgradeMenuOpen = false;
        this.notify();
        return true;
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
                        this.createExplosion(
                            missile.targetX,
                            missile.targetY,
                            missile.explosionRadius || this.getCurrentExplosionRadius()
                        );
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

    createExplosion(x, y, radius = this.getCurrentExplosionRadius()) {
        this.explosions.push({
            id: this.nextFxEventId++,
            x: x,
            y: y,
            radius: radius,
            age: 0,
            maxAge: 30,
            damageApplied: false
        });
    }

    queueEnemyDeathFx(alien, exactHit = false) {
        this.enemyDeathFxEvents.push({
            id: this.nextFxEventId++,
            x: alien.x,
            y: alien.y,
            radius: alien.radius * (exactHit ? 1.6 : 1.2),
            exactHit
        });
        this.createBlastResidue(
            { x: alien.x, y: alien.y, radius: alien.radius * (exactHit ? 1.5 : 1.2) },
            {
                color: 'red',
                spreadMin: 0.1,
                spreadMax: 0.42,
                sizeMin: 0.4,
                sizeRange: 1.0,
                alphaMin: exactHit ? 0.22 : 0.18,
                alphaRange: exactHit ? 0.28 : 0.2
            }
        );
        if (this.enemyDeathFxEvents.length > 100) {
            this.enemyDeathFxEvents.shift();
        }
    }

    createBlastResidue(explosion, options = {}) {
        const particleCount = 10;
        const particles = [];
        const spreadMin = options.spreadMin ?? 0.16;
        const spreadMax = options.spreadMax ?? 0.48;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.35);
            const r = explosion.radius * (spreadMin + Math.random() * (spreadMax - spreadMin));
            particles.push({
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r,
                size: (options.sizeMin ?? 0.5) + Math.random() * (options.sizeRange ?? 1.3),
                alpha: (options.alphaMin ?? 0.15) + Math.random() * (options.alphaRange ?? 0.2)
            });
        }
        this.blastResidue.push({
            x: explosion.x,
            y: explosion.y,
            radius: explosion.radius,
            turnsRemaining: 1,
            particles,
            color: options.color || 'green'
        });
    }

    alienTouchesEarthLine(alien) {
        return (alien.y - alien.radius) <= this.config.LAUNCHER_Y;
    }

    finishTurn() {
        this.levelCycles += 1;

        // Age and remove prior-turn residue markers.
        for (const residue of this.blastResidue) {
            residue.turnsRemaining -= 1;
        }
        this.blastResidue = this.blastResidue.filter(r => r.turnsRemaining > 0);

        // Apply explosion damage
        for (const explosion of this.explosions) {
            if (!explosion.damageApplied) {
                this.applyExplosionDamage(explosion);
                explosion.damageApplied = true;
            }
            this.createBlastResidue(explosion, { color: 'green', spreadMin: 0.16, spreadMax: 0.48 });
        }

        // Check aliens reaching Earth
        const reachedEarth = this.aliens.filter(a => this.alienTouchesEarthLine(a));
        for (const alien of reachedEarth) {
            this.baseHP -= alien.damage;
        }
        this.aliens = this.aliens.filter(a => !this.alienTouchesEarthLine(a));

        // Remove exploded missiles and old explosions
        this.missiles = this.missiles.filter(m => !m.exploded);
        this.explosions = [];

        // Check wave complete
        if (this.aliens.length === 0) {
            this.lastWaveClearBonus = this.getWaveClearSpeedBonus(this.levelCycles, this.level);
            this.money += this.lastWaveClearBonus;
            this.level++;
            this.spawnWave();
        } else {
            this.lastWaveClearBonus = 0;
        }

        // Check game over
        if (this.baseHP <= 0) {
            this.baseHP = 0;
            alert('Game Over! Reached level ' + this.level);
            this.reset();
        }

        this.isAnimating = false;
        this.missileEnergy = this.utils.clamp(
            this.missileEnergy + this.config.MISSILE_ENERGY_REGEN_PER_TURN,
            0,
            this.config.MISSILE_ENERGY_MAX
        );
        this.notify();
    }

    reset() {
        this.level = 1;
        this.baseHP = this.config.STARTING_HP;
        this.launcherAngle = this.config.START_ANGLE;
        this.power = 0;
        this.missilesLockedThisTurn = 0;
        this.missileEnergy = this.config.MISSILE_ENERGY_MAX;
        this.money = 0;
        this.levelCycles = 0;
        this.lastWaveClearBonus = 0;
        this.isUpgradeMenuOpen = false;
        for (const upgrade of Object.values(this.upgrades)) {
            upgrade.level = 0;
        }
        this.aliens = [];
        this.missiles = [];
        this.pendingMissiles = [];
        this.explosions = [];
        this.blastResidue = [];
        this.enemyDeathFxEvents = [];
        this.spawnWave();
    }

    applyExplosionDamage(explosion) {
        for (const alien of this.aliens) {
            const dx = alien.x - explosion.x;
            const dy = alien.y - explosion.y;
            const dist = this.utils.distance(dx, dy);

            if (dist < explosion.radius + alien.radius) {
                alien.hp -= 1;
                if (alien.hp <= 0) {
                    const exactHit = dist <= (alien.radius * this.config.EXACT_HIT_RADIUS_FACTOR);
                    const reward = exactHit
                        ? this.config.MONEY_PER_KILL * this.config.EXACT_HIT_MONEY_MULTIPLIER
                        : this.config.MONEY_PER_KILL;
                    this.money += reward;
                    this.queueEnemyDeathFx(alien, exactHit);
                }
            }
        }
        this.aliens = this.aliens.filter(a => a.hp > 0);
    }

    notify() {
        if (this.onStateChange) this.onStateChange();
    }

    updateUI() {
        if (this.ui) {
            this.ui.update(this);
        }
    }

    // ==================== TEST HELPERS ====================

    getState() {
        return {
            level: this.level,
            hp: this.baseHP,
            angle: this.launcherAngle,
            power: this.power,
            missileEnergy: this.missileEnergy,
            money: this.money,
            levelCycles: this.levelCycles,
            lastWaveClearBonus: this.lastWaveClearBonus,
            missilesLocked: this.missilesLockedThisTurn,
            missilesInFlight: this.missiles.length,
            blastResidue: this.blastResidue.length,
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
        this.launcherAngle = this.utils.clamp(gameAngle, this.config.MIN_ANGLE, this.config.MAX_ANGLE);
        this.notify();
        this.updateUI();
        return { angle: this.launcherAngle, alien: { x: alien.x, y: alien.y } };
    }

    chargeTo(powerPercent) {
        if (!this.canCharge()) return false;
        const maxPowerByEnergy = this.getMaxChargePowerForEnergy();
        if (maxPowerByEnergy < this.config.MISSILE_MIN_ENERGY_COST) return false;
        this.power = this.utils.clamp(powerPercent, this.config.MISSILE_MIN_ENERGY_COST, maxPowerByEnergy);
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
            while (this.canCharge() && this.missilesLockedThisTurn < this.config.MISSILES_PER_TURN && this.aliens.length > 0) {
                this.aimAtAlien(0);
                if (!this.chargeTo(100)) break;
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
