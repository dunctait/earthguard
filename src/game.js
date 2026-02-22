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
    MISSILE_TRAVEL_PER_TURN: 0.4,  // 40% of target distance per advance (after visible launch offset)
    MISSILE_LAUNCH_START_PROGRESS: 0.20,
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
    WAVE_CLEAR_BONUS_BASE: 12,
    WAVE_CLEAR_BONUS_DECAY_PER_CYCLE: 2,
    WAVE_CLEAR_BONUS_MIN: 0,
    WAVE_CLEAR_BONUS_LEVEL_SCALE: 0.04,
    INCOMING_PREVIEW_REVEAL_CYCLE: 2,

    // Player
    STARTING_HP: 100,

    // Animation
    ANIMATION_FRAMES: 24,
    ANIMATION_FRAME_MS: 10
};

const UpgradeDefinitions = {
    targetAreas: {
        key: 'targetAreas',
        name: 'Target Area Preview',
        description: 'Shows predicted impact circles for locked missiles.',
        stackingMode: 'unlock',
        tiers: [
            { moneyCost: 50, energyCost: 20, label: 'Unlock preview' }
        ],
        uiLabelForTier: (tier) => tier.label || 'UNLOCK',
        apply: ({ effects }) => {
            effects.targetAreasEnabled = true;
        }
    },
    blastRadius: {
        key: 'blastRadius',
        name: 'Blast Radius',
        description: 'Increase explosion radius for all missiles.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 30, energyCost: 10, radiusMultiplier: 1.15, label: '+15%' },
            { moneyCost: 60, energyCost: 14, radiusMultiplier: 1.30, label: '+30%' },
            { moneyCost: 110, energyCost: 18, radiusMultiplier: 1.50, label: '+50%' }
        ],
        uiLabelForTier: (tier) => tier.label || `x${tier.radiusMultiplier ?? 1}`,
        apply: ({ effects, tier }) => {
            effects.blastRadiusMultiplier = tier.radiusMultiplier || 1;
        }
    },
    missileRacks: {
        key: 'missileRacks',
        name: 'Missile Racks',
        description: 'Adds one missile slot per cycle per level.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 40, energyCost: 14, missilesPerTurnBonus: 1, label: '+1 missile/cycle' },
            { moneyCost: 85, energyCost: 18, missilesPerTurnBonus: 2, label: '+2 missiles/cycle' },
            { moneyCost: 150, energyCost: 24, missilesPerTurnBonus: 3, label: '+3 missiles/cycle' }
        ],
        uiLabelForTier: (tier) => tier.label || `+${tier.missilesPerTurnBonus || 0} missile/cycle`,
        apply: ({ effects, tier }) => {
            effects.missilesPerTurnBonus = tier.missilesPerTurnBonus || 0;
        }
    },
    bountyLink: {
        key: 'bountyLink',
        name: 'Bounty Link',
        description: 'Increase cash paid per enemy kill.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 25, energyCost: 8, moneyPerKillBonus: 5, label: '+$5 / kill' },
            { moneyCost: 55, energyCost: 12, moneyPerKillBonus: 10, label: '+$10 / kill' },
            { moneyCost: 95, energyCost: 16, moneyPerKillBonus: 15, label: '+$15 / kill' }
        ],
        uiLabelForTier: (tier) => tier.label || `+$${tier.moneyPerKillBonus || 0} / kill`,
        apply: ({ effects, tier }) => {
            effects.moneyPerKillBonus = tier.moneyPerKillBonus || 0;
        }
    },
    energyEfficiency: {
        key: 'energyEfficiency',
        name: 'Energy Efficiency',
        description: 'Reduce missile energy cost by 10% per level.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 35, energyCost: 10, costReductionPct: 10, label: '-10% cost' },
            { moneyCost: 70, energyCost: 14, costReductionPct: 20, label: '-20% cost' },
            { moneyCost: 120, energyCost: 18, costReductionPct: 30, label: '-30% cost' }
        ],
        uiLabelForTier: (tier) => tier.label || `-${tier.costReductionPct || 0}% cost`,
        apply: ({ effects, tier }) => {
            effects.energyCostReductionPct = (tier.costReductionPct || 0) / 100;
        }
    },
    reactorRegen: {
        key: 'reactorRegen',
        name: 'Reactor Regen',
        description: 'Restore more energy after each cycle.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 30, energyCost: 10, regenBonus: 1, label: '+1 EN / cycle' },
            { moneyCost: 70, energyCost: 14, regenBonus: 2, label: '+2 EN / cycle' },
            { moneyCost: 120, energyCost: 18, regenBonus: 4, label: '+4 EN / cycle' }
        ],
        uiLabelForTier: (tier) => tier.label || `+${tier.regenBonus || 0} EN / cycle`,
        apply: ({ effects, tier }) => {
            effects.energyRegenBonus = tier.regenBonus || 0;
        }
    },
    trajectoryProcessor: {
        key: 'trajectoryProcessor',
        name: 'Trajectory Processor',
        description: 'Extends aiming guide visibility by reducing fade falloff.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 25, energyCost: 8, fadeStrengthMultiplier: 0.85, label: 'Longer guide I' },
            { moneyCost: 55, energyCost: 12, fadeStrengthMultiplier: 0.70, label: 'Longer guide II' },
            { moneyCost: 95, energyCost: 16, fadeStrengthMultiplier: 0.55, label: 'Longer guide III' }
        ],
        uiLabelForTier: (tier) => tier.label || 'Longer guide',
        apply: ({ effects, tier }) => {
            effects.trajectoryFadeStrengthMultiplier = tier.fadeStrengthMultiplier || 1;
        }
    },
    energyResupply: {
        key: 'energyResupply',
        name: 'Energy Resupply',
        description: 'Buy an emergency reactor charge. Price spikes each purchase.',
        stackingMode: 'repeat',
        repeatable: true,
        maxLevel: null,
        getTierForLevel: (level) => {
            const purchaseCount = Math.max(0, level);
            return {
                moneyCost: 8 * Math.pow(3, purchaseCount),
                energyCost: 0,
                energyGain: 30,
                label: '+30 EN'
            };
        },
        uiLabelForTier: (tier) => tier.label || `+${tier.energyGain || 0} EN`,
        canPurchase: ({ game }) => game.missileEnergy < game.config.MISSILE_ENERGY_MAX,
        onPurchase: ({ game, tier }) => {
            game.missileEnergy = game.utils.clamp(
                game.missileEnergy + (tier.energyGain || 0),
                0,
                game.config.MISSILE_ENERGY_MAX
            );
        }
    }
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
        this.missilesLaunchedThisCycle = 0;

        // Game state
        this.level = 1;
        this.baseHP = this.config.STARTING_HP;
        this.isAnimating = false;
        this.money = 0;
        this.levelCycles = 0;
        this.lastWaveClearBonus = 0;
        this.isUpgradeMenuOpen = false;
        this.upgrades = this.createUpgradeState();
        this.upgradeEffects = this.getDefaultUpgradeEffects();
        this.rebuildUpgradeEffects();

        // Entities
        this.aliens = [];
        this.incomingAliens = [];
        this.missiles = [];      // Active missiles in flight
        this.pendingMissiles = []; // Missiles locked in but not yet launched
        this.explosions = [];
        this.blastResidue = [];
        this.enemyDeathFxEvents = [];
        this.waveClearFxEvents = [];
        this.nextFxEventId = 1;

        // Callbacks
        this.onStateChange = null;

        // Initialize
        this.spawnWave();
        this.queueIncomingWavePreview(this.level + 1);
    }

    get WORLD_HEIGHT() { return this.config.WORLD_HEIGHT; }
    get WORLD_WIDTH() { return this.config.WORLD_WIDTH; }

    createUpgradeState() {
        const state = {};
        for (const [key, definition] of Object.entries(UpgradeDefinitions)) {
            const derivedMaxLevel = definition.repeatable
                ? (definition.maxLevel ?? null)
                : (definition.maxLevel ?? definition.tiers.length);
            state[key] = {
                ...definition,
                maxLevel: derivedMaxLevel,
                level: 0
            };
        }
        return state;
    }

    getDefaultUpgradeEffects() {
        return {
            targetAreasEnabled: false,
            blastRadiusMultiplier: 1,
            missilesPerTurnBonus: 0,
            moneyPerKillBonus: 0,
            energyCostReductionPct: 0,
            energyRegenBonus: 0,
            trajectoryFadeStrengthMultiplier: 1
        };
    }

    rebuildUpgradeEffects() {
        const effects = this.getDefaultUpgradeEffects();
        for (const upgrade of Object.values(this.upgrades)) {
            if (upgrade.level <= 0) continue;
            const tier = upgrade.tiers[upgrade.level - 1];
            if (!tier || typeof upgrade.apply !== 'function') continue;
            upgrade.apply({
                game: this,
                config: this.config,
                effects,
                upgrade,
                tier,
                level: upgrade.level
            });
        }
        this.upgradeEffects = effects;
        return effects;
    }

    getWaveSpec(level) {
        return {
            level,
            alienCount: Math.min(2 + Math.floor((level - 1) / 2), 8),
            speed: this.config.BASE_ALIEN_SPEED + (level * this.config.ALIEN_SPEED_PER_LEVEL)
        };
    }

    createAliensFromWaveSpec(spec, incoming = false) {
        const aliens = [];
        const startY = incoming ? (this.config.WORLD_HEIGHT + 3) : (this.config.WORLD_HEIGHT - 5);
        for (let i = 0; i < spec.alienCount; i++) {
            aliens.push({
                x: 10 + Math.random() * (this.config.WORLD_WIDTH - 20),
                y: startY - (i * 8),
                speed: spec.speed,
                hp: 1,
                damage: this.config.ALIEN_DAMAGE,
                radius: this.config.ALIEN_RADIUS,
                waveLevel: spec.level,
                incoming
            });
        }
        return aliens;
    }

    startWave(level = this.level) {
        this.levelCycles = 0;
        const waveSpec = this.getWaveSpec(level);
        this.aliens = this.createAliensFromWaveSpec(waveSpec, false);
    }

    primeIncomingWave(level) {
        const waveSpec = this.getWaveSpec(level);
        this.incomingAliens = this.createAliensFromWaveSpec(waveSpec, true);
    }

    promoteIncomingWaveToActive() {
        if (!this.incomingAliens.length) return false;
        this.aliens = this.incomingAliens.map((alien) => ({
            ...alien,
            incoming: false
        }));
        this.incomingAliens = [];
        this.levelCycles = 0;
        return true;
    }

    spawnWave() {
        this.startWave(this.level);
    }

    queueIncomingWavePreview(level) {
        this.primeIncomingWave(level);
    }

    emitWaveClearFx(waveLevel, bonus) {
        const subtitle = bonus > 0 ? `CYCLES BONUS +$${bonus}` : '';
        this.waveClearFxEvents.push({
            id: this.nextFxEventId++,
            title: `WAVE ${waveLevel} CLEARED!`,
            subtitle
        });
        if (this.waveClearFxEvents.length > 20) {
            this.waveClearFxEvents.shift();
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
               this.missilesLockedThisTurn < this.getMissilesPerTurn() &&
               this.missileEnergy >= this.config.MISSILE_MIN_ENERGY_COST;
    }

    getMissileEnergyCostForPower(power = this.power) {
        if (power <= 0) return 0;
        const reduction = this.upgradeEffects.energyCostReductionPct || 0;
        return Math.max(1, Math.ceil(this.config.MISSILE_MIN_ENERGY_COST * (1 - reduction)));
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
        const upgradeMultiplier = this.upgradeEffects.blastRadiusMultiplier || 1;
        return this.config.EXPLOSION_RADIUS * multiplier * upgradeMultiplier;
    }

    getCurrentExplosionRadius() {
        return this.getExplosionRadiusForLevel(this.level);
    }

    getWaveClearSpeedBonus(cycles = this.levelCycles, level = this.level) {
        const raw = this.config.WAVE_CLEAR_BONUS_BASE - ((Math.max(1, cycles) - 1) * this.config.WAVE_CLEAR_BONUS_DECAY_PER_CYCLE);
        const clamped = Math.max(this.config.WAVE_CLEAR_BONUS_MIN, raw);
        // Mild level scaling to keep bonuses meaningful without exploding economy.
        return Math.round(clamped * (1 + ((Math.max(1, level) - 1) * (this.config.WAVE_CLEAR_BONUS_LEVEL_SCALE || 0))));
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
            if (this.missilesLockedThisTurn >= this.getMissilesPerTurn()) {
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

    getCurrentUpgradeTier(key) {
        const upgrade = this.upgrades[key];
        if (!upgrade || upgrade.level <= 0) return null;
        if (typeof upgrade.getTierForLevel === 'function') {
            return upgrade.getTierForLevel(upgrade.level - 1, { game: this, upgrade }) || null;
        }
        return upgrade.tiers[upgrade.level - 1] || null;
    }

    getUpgradeDefinition(key) {
        return this.upgrades[key] || null;
    }

    getNextUpgradeTier(key) {
        const upgrade = this.upgrades[key];
        if (!upgrade) return null;
        if (typeof upgrade.getTierForLevel === 'function') {
            return upgrade.getTierForLevel(upgrade.level, { game: this, upgrade }) || null;
        }
        return upgrade.tiers[upgrade.level] || null;
    }

    getAvailableUpgradeCount() {
        let count = 0;
        for (const key of Object.keys(this.upgrades)) {
            if (this.canPurchaseUpgrade(key)) count++;
        }
        return count;
    }

    getUpgradeTierLabel(key, tier, fallback = 'NEXT') {
        const upgrade = this.getUpgradeDefinition(key);
        if (!upgrade || !tier) return fallback;
        if (typeof upgrade.uiLabelForTier === 'function') {
            return upgrade.uiLabelForTier(tier, { game: this, upgrade });
        }
        return tier.label || fallback;
    }

    getUpgradeNextTierText(key) {
        const upgrade = this.getUpgradeDefinition(key);
        if (!upgrade) return 'NEXT';
        if (upgrade.maxLevel !== null && upgrade.level >= upgrade.maxLevel) return 'MAXED';
        const tier = this.getNextUpgradeTier(key);
        return this.getUpgradeTierLabel(key, tier, 'NEXT');
    }

    getUpgradeStackingMode(key) {
        return this.getUpgradeDefinition(key)?.stackingMode || 'replace';
    }

    getMissilesPerTurn() {
        return this.config.MISSILES_PER_TURN + (this.upgradeEffects.missilesPerTurnBonus || 0);
    }

    getEnergyRegenPerTurn() {
        return this.config.MISSILE_ENERGY_REGEN_PER_TURN + (this.upgradeEffects.energyRegenBonus || 0);
    }

    getTrajectoryFadeStrength() {
        const multiplier = this.upgradeEffects.trajectoryFadeStrengthMultiplier || 1;
        return Math.max(0.3, this.config.TRAJECTORY_FADE_STRENGTH * multiplier);
    }

    getMoneyPerKillReward(exactHit = false) {
        const baseReward = this.config.MONEY_PER_KILL + (this.upgradeEffects.moneyPerKillBonus || 0);
        return exactHit ? baseReward * this.config.EXACT_HIT_MONEY_MULTIPLIER : baseReward;
    }

    toggleUpgradeMenu() {
        this.isUpgradeMenuOpen = !this.isUpgradeMenuOpen;
        this.notify();
    }

    closeUpgradeMenu() {
        if (!this.isUpgradeMenuOpen) return;
        this.isUpgradeMenuOpen = false;
        this.notify();
    }

    canPurchaseUpgrade(key) {
        const upgrade = this.upgrades[key];
        if (!upgrade) return false;
        if (upgrade.maxLevel !== null && upgrade.level >= upgrade.maxLevel) return false;
        const nextTier = this.getNextUpgradeTier(key);
        if (!nextTier) return false;
        const baseCanBuy = this.money >= nextTier.moneyCost &&
               this.missileEnergy >= nextTier.energyCost;
        if (!baseCanBuy) return false;
        if (typeof upgrade.canPurchase === 'function') {
            return Boolean(upgrade.canPurchase({ game: this, upgrade, tier: nextTier }));
        }
        return true;
    }

    purchaseUpgrade(key) {
        if (!this.canPurchaseUpgrade(key)) return false;
        const upgrade = this.upgrades[key];
        const nextTier = this.getNextUpgradeTier(key);
        this.money -= nextTier.moneyCost;
        this.missileEnergy = this.utils.clamp(
            this.missileEnergy - nextTier.energyCost,
            0,
            this.config.MISSILE_ENERGY_MAX
        );
        upgrade.level += 1;
        if (typeof upgrade.onPurchase === 'function') {
            upgrade.onPurchase({ game: this, upgrade, tier: nextTier, level: upgrade.level });
        }
        this.rebuildUpgradeEffects();
        this.isUpgradeMenuOpen = false;
        this.notify();
        return true;
    }

    advance() {
        if (this.isAnimating) return;

        // Move pending missiles to active
        this.missilesLaunchedThisCycle = this.pendingMissiles.length;
        const launchStartProgress = this.config.MISSILE_LAUNCH_START_PROGRESS || 0;
        this.missiles.push(...this.pendingMissiles.map((missile) => ({
            ...missile,
            progress: Math.max(missile.progress || 0, launchStartProgress)
        })));
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
            for (const alien of this.incomingAliens) {
                // Preview wave drifts in more slowly and never affects gameplay until promoted.
                alien.y -= (alien.speed * 0.55) / totalFrames;
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

    isAlienDamageable(alien) {
        if (!alien) return false;
        if (alien.incoming) return false;
        return alien.waveLevel === this.level;
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
            this.emitWaveClearFx(this.level, this.lastWaveClearBonus);
            this.level++;
            if (this.incomingAliens.length > 0) {
                this.aliens = this.incomingAliens.map((alien) => ({
                    ...alien,
                    incoming: false
                }));
                this.incomingAliens = [];
                this.levelCycles = 0;
            } else {
                this.spawnWave();
            }
            this.queueIncomingWavePreview(this.level + 1);
        } else {
            this.lastWaveClearBonus = 0;
            if (this.incomingAliens.length === 0) {
                this.queueIncomingWavePreview(this.level + 1);
            }
        }

        // Check game over
        if (this.baseHP <= 0) {
            this.baseHP = 0;
            alert('Game Over! Reached level ' + this.level);
            this.reset();
        }

        this.isAnimating = false;
        const regenMultiplier = this.missilesLaunchedThisCycle === 0 ? 2 : 1;
        this.missileEnergy = this.utils.clamp(
            this.missileEnergy + (this.getEnergyRegenPerTurn() * regenMultiplier),
            0,
            this.config.MISSILE_ENERGY_MAX
        );
        this.missilesLaunchedThisCycle = 0;
        this.notify();
    }

    reset() {
        this.level = 1;
        this.baseHP = this.config.STARTING_HP;
        this.launcherAngle = this.config.START_ANGLE;
        this.power = 0;
        this.missilesLockedThisTurn = 0;
        this.missileEnergy = this.config.MISSILE_ENERGY_MAX;
        this.missilesLaunchedThisCycle = 0;
        this.money = 0;
        this.levelCycles = 0;
        this.lastWaveClearBonus = 0;
        this.isUpgradeMenuOpen = false;
        for (const upgrade of Object.values(this.upgrades)) {
            upgrade.level = 0;
        }
        this.rebuildUpgradeEffects();
        this.aliens = [];
        this.missiles = [];
        this.pendingMissiles = [];
        this.explosions = [];
        this.blastResidue = [];
        this.enemyDeathFxEvents = [];
        this.waveClearFxEvents = [];
        this.incomingAliens = [];
        this.spawnWave();
        this.queueIncomingWavePreview(this.level + 1);
    }

    applyExplosionDamage(explosion) {
        for (const alien of this.aliens) {
            if (!this.isAlienDamageable(alien)) continue;
            const dx = alien.x - explosion.x;
            const dy = alien.y - explosion.y;
            const dist = this.utils.distance(dx, dy);

            if (dist < explosion.radius + alien.radius) {
                alien.hp -= 1;
                if (alien.hp <= 0) {
                    const exactHit = dist <= (alien.radius * this.config.EXACT_HIT_RADIUS_FACTOR);
                    const reward = this.getMoneyPerKillReward(exactHit);
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
            missilesPerTurn: this.getMissilesPerTurn(),
            missilesInFlight: this.missiles.length,
            blastResidue: this.blastResidue.length,
            isAnimating: this.isAnimating,
            aliens: this.aliens.map(a => ({ x: +a.x.toFixed(1), y: +a.y.toFixed(1) })),
            incomingAliens: this.incomingAliens.map(a => ({ x: +a.x.toFixed(1), y: +a.y.toFixed(1) })),
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
            for (let i = 0; i < this.getMissilesPerTurn() && i < this.aliens.length; i++) {
                this.aimAtAlien(i);
                this.chargeTo(100);
            }

            // If we still have missiles to fire, fire at first alien
            while (this.canCharge() && this.missilesLockedThisTurn < this.getMissilesPerTurn() && this.aliens.length > 0) {
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
            if (this.missilesLockedThisTurn > 0 && this.missilesLockedThisTurn < this.getMissilesPerTurn()) {
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
