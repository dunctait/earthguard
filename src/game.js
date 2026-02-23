/**
 * EarthGuard - Core Game Logic
 */

// Central game configuration - all tunable values in one place
const GameConfig = {
    // World
    WORLD_HEIGHT: 100,
    WORLD_WIDTH: 60,

    // Launcher
    LAUNCHER_Y: 6.5,
    MISSILE_LAUNCH_TIP_OFFSET: 4.8, // World units from launcher pivot to barrel tip
    MIN_ANGLE: -80,      // Max left
    MAX_ANGLE: 80,       // Max right
    START_ANGLE: 0,      // Straight up

    // Missiles
    MISSILES_PER_TURN: 2,
    MISSILE_TRAVEL_PER_TURN: 0.75,  // 75% of target distance per advance (after visible launch offset)
    MISSILE_LAUNCH_START_PROGRESS: 0.25,
    EXPLOSION_RADIUS: 6.4,          // 80% of original 8
    MAX_MISSILE_RANGE: 85,          // % of world height
    MISSILE_ENERGY_MAX: 100,
    MISSILE_ENERGY_REGEN_PER_TURN: 5,
    MISSILE_MIN_ENERGY_COST: 10,
    TRAJECTORY_FADE_STRENGTH: 2.4,

    // Power/Charging
    POWER_CHARGE_RATE: 4,           // Per update tick (was 2, now faster)
    POWER_UPDATE_INTERVAL: 30,      // ms between charge updates
    POWER_TO_DISTANCE_EXPONENT: 1.5,

    // Aliens
    BASE_ALIEN_SPEED: 6,
    ALIEN_SPEED_PER_LEVEL: 1.0,
    ALIEN_RADIUS: 3,
    ALIEN_DAMAGE: 10,
    ALIEN_WAVE_VERTICAL_SPACING: 8,
    ALIEN_ACTIVE_SPAWN_TOP_Y: 95,
    ALIEN_INCOMING_WAVE_GAP: 4,
    WAVE_ENTRY_FAST_FORWARD_CYCLES: 2,
    WAVE_ENTRY_MIN_ACTIVE_Y: 88,
    MONEY_PER_KILL: 10,
    ENERGY_PER_KILL: 2,
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
            { moneyCost: 140, energyCost: 20, label: 'Unlock preview' }
        ],
        uiLabelForTier: (tier) => tier.label || 'UNLOCK',
        apply: ({ effects }) => {
            effects.targetAreasEnabled = true;
        }
    },
    autoCycle: {
        key: 'autoCycle',
        name: 'Auto Cycle',
        description: 'Automatically cycles when all targets are locked.',
        stackingMode: 'unlock',
        tiers: [
            { moneyCost: 10, energyCost: 1, label: 'Unlock auto-cycle' }
        ],
        uiLabelForTier: (tier) => tier.label || 'UNLOCK',
        apply: ({ effects }) => {
            effects.autoCycleEnabled = true;
        }
    },
    blastRadius: {
        key: 'blastRadius',
        name: 'Blast Radius',
        description: 'Increase explosion radius for all missiles.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 20, energyCost: 4, radiusMultiplier: 1.25, label: '+25%' },
            { moneyCost: 45, energyCost: 6, radiusMultiplier: 1.50, label: '+50%' },
            { moneyCost: 80, energyCost: 8, radiusMultiplier: 1.80, label: '+80%' }
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
            { moneyCost: 32, energyCost: 6, missilesPerTurnBonus: 1, label: '+1 missile/cycle' },
            { moneyCost: 70, energyCost: 8, missilesPerTurnBonus: 2, label: '+2 missiles/cycle' },
            { moneyCost: 120, energyCost: 10, missilesPerTurnBonus: 3, label: '+3 missiles/cycle' }
        ],
        uiLabelForTier: (tier) => tier.label || `+${tier.missilesPerTurnBonus || 0} missile/cycle`,
        apply: ({ effects, tier }) => {
            effects.missilesPerTurnBonus = tier.missilesPerTurnBonus || 0;
        }
    },
    bountyLink: {
        key: 'bountyLink',
        name: 'Bounty Link',
        description: 'Multiply cash paid per enemy kill.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 20, energyCost: 2, moneyPerKillMultiplier: 1.20, label: '1.20x $ / kill' },
            { moneyCost: 45, energyCost: 4, moneyPerKillMultiplier: 1.40, label: '1.40x $ / kill' },
            { moneyCost: 80, energyCost: 6, moneyPerKillMultiplier: 1.60, label: '1.60x $ / kill' }
        ],
        uiLabelForTier: (tier) => tier.label || `${tier.moneyPerKillMultiplier || 1}x $ / kill`,
        apply: ({ effects, tier }) => {
            effects.moneyPerKillMultiplier = tier.moneyPerKillMultiplier || 1;
        }
    },
    energyHarvest: {
        key: 'energyHarvest',
        name: 'Energy Harvest',
        description: 'Multiply energy restored per enemy kill.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 24, energyCost: 2, energyPerKillMultiplier: 1.20, label: '1.20x EN / kill' },
            { moneyCost: 50, energyCost: 4, energyPerKillMultiplier: 1.40, label: '1.40x EN / kill' },
            { moneyCost: 90, energyCost: 6, energyPerKillMultiplier: 1.60, label: '1.60x EN / kill' }
        ],
        uiLabelForTier: (tier) => tier.label || `${tier.energyPerKillMultiplier || 1}x EN / kill`,
        apply: ({ effects, tier }) => {
            effects.energyPerKillMultiplier = tier.energyPerKillMultiplier || 1;
        }
    },
    energyEfficiency: {
        key: 'energyEfficiency',
        name: 'Energy Efficiency',
        description: 'Reduce missile energy cost by 10% per level.',
        stackingMode: 'replace',
        tiers: [
            { moneyCost: 28, energyCost: 4, costReductionPct: 15, label: '-15% cost' },
            { moneyCost: 55, energyCost: 6, costReductionPct: 30, label: '-30% cost' },
            { moneyCost: 95, energyCost: 8, costReductionPct: 45, label: '-45% cost' }
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
            { moneyCost: 24, energyCost: 4, regenBonus: 2, label: '+2 EN / cycle' },
            { moneyCost: 50, energyCost: 6, regenBonus: 4, label: '+4 EN / cycle' },
            { moneyCost: 90, energyCost: 8, regenBonus: 6, label: '+6 EN / cycle' }
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
            { moneyCost: 18, energyCost: 2, fadeStrengthMultiplier: 0.85, label: 'Longer guide I' },
            { moneyCost: 40, energyCost: 4, fadeStrengthMultiplier: 0.70, label: 'Longer guide II' },
            { moneyCost: 75, energyCost: 6, fadeStrengthMultiplier: 0.55, label: 'Longer guide III' }
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

const LevelDefinitions = {
    1: {
        enemies: [
            { type: 'saucer', sizeMultiplier: 2.0 },
            { type: 'saucer', sizeMultiplier: 2.0 }
        ]
    },
    2: {
        enemies: [
            { type: 'saucer', sizeMultiplier: 1.5 },
            { type: 'saucer', sizeMultiplier: 1.5 }
        ]
    },
    3: {
        enemies: [
            { type: 'saucer', sizeMultiplier: 1.2 },
            { type: 'saucer', sizeMultiplier: 1.2 },
            { type: 'saucer', sizeMultiplier: 1.2 }
        ]
    }
};

class Game {
    constructor(options = {}) {
        this.config = GameConfig;
        const root = options.root || (typeof window !== 'undefined' ? window : globalThis);
        this.instantAutoCycle = !!options.instantAutoCycle;
        this.utils = options.utils || root.EarthGuardUtils || {
            clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
            distance: (dx, dy) => Math.sqrt((dx * dx) + (dy * dy))
        };
        this.ui = options.ui ?? (root.EarthGuardUI ? new root.EarthGuardUI() : null);

        // Launcher state
        this.launcherAngle = this.config.START_ANGLE;

        // Missile charging
        this.power = 0;
        this.isCharging = false;
        this.missilesLockedThisTurn = 0;
        this.missileEnergy = this.config.MISSILE_ENERGY_MAX;
        this.missilesLaunchedThisCycle = 0;
        this.lastLockedPower = 0;

        // Game state
        this.level = 1;
        this.baseHP = this.config.STARTING_HP;
        this.isAnimating = false;
        this.money = 0;
        this.levelCycles = 0;
        this.totalCycles = 0;
        this.lastWaveClearBonus = 0;
        this.isUpgradeMenuOpen = false;
        this.isGameOver = false;
        this.gameOverReason = '';
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
        this.notify();
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
            autoCycleEnabled: false,
            blastRadiusMultiplier: 1,
            missilesPerTurnBonus: 0,
            moneyPerKillMultiplier: 1,
            energyPerKillMultiplier: 1,
            energyCostReductionPct: 0,
            energyRegenBonus: 0,
            trajectoryFadeStrengthMultiplier: 1
        };
    }

    rebuildUpgradeEffects() {
        const effects = this.getDefaultUpgradeEffects();
        for (const upgrade of Object.values(this.upgrades)) {
            if (upgrade.level <= 0) continue;
            const tier = (typeof upgrade.getTierForLevel === 'function')
                ? (upgrade.getTierForLevel(upgrade.level - 1, { game: this, upgrade }) || null)
                : (upgrade.tiers?.[upgrade.level - 1] || null);
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
        const levelDef = this.getLevelDefinition(level);
        const enemyTemplates = this.getWaveEnemyTemplates(level);
        const maxSizeMultiplier = enemyTemplates.reduce((max, enemy) => Math.max(max, enemy.sizeMultiplier || 1), 1);
        return {
            level,
            levelDef,
            enemies: enemyTemplates,
            alienCount: enemyTemplates.length,
            speed: this.config.BASE_ALIEN_SPEED + (level * this.config.ALIEN_SPEED_PER_LEVEL),
            activeTopY: level === 1 ? 78 : (this.config.ALIEN_ACTIVE_SPAWN_TOP_Y || (this.config.WORLD_HEIGHT - 5)),
            maxSizeMultiplier
        };
    }

    getLevelDefinition(level) {
        return LevelDefinitions[level] || null;
    }

    getWaveEnemyTemplates(level) {
        const levelDef = this.getLevelDefinition(level);
        if (levelDef && Array.isArray(levelDef.enemies) && levelDef.enemies.length > 0) {
            return levelDef.enemies.map((enemy) => ({
                type: enemy.type || 'saucer',
                sizeMultiplier: enemy.sizeMultiplier || 1
            }));
        }

        const alienCount = Math.min(Math.max(2, level), 10);
        const sizeMultiplier = level <= 4 ? 1 : Math.max(0.8, 1.1 - ((level - 4) * 0.03));
        return Array.from({ length: alienCount }, () => ({
            type: 'saucer',
            sizeMultiplier
        }));
    }

    createAliensFromWaveSpec(spec, incoming = false) {
        const aliens = [];
        const minSpacing = this.config.ALIEN_WAVE_VERTICAL_SPACING || 8;
        const spacing = Math.max(minSpacing, (this.config.ALIEN_RADIUS * (spec.maxSizeMultiplier || 1) * 2.6));
        const activeTopY = spec.activeTopY ?? this.config.ALIEN_ACTIVE_SPAWN_TOP_Y ?? (this.config.WORLD_HEIGHT - 5);
        // Ensure incoming wave never vertically overlaps the highest possible active-wave enemy:
        // incoming lowest enemy sits above activeTopY by a fixed gap.
        const incomingLowestY = activeTopY + (this.config.ALIEN_INCOMING_WAVE_GAP || 4);
        const incomingStartY = incomingLowestY + ((spec.alienCount - 1) * spacing);
        const startY = incoming ? incomingStartY : activeTopY;
        for (let i = 0; i < spec.alienCount; i++) {
            const enemyTemplate = spec.enemies[i] || { type: 'saucer', sizeMultiplier: 1 };
            const sizeMultiplier = enemyTemplate.sizeMultiplier || 1;
            aliens.push({
                x: 10 + Math.random() * (this.config.WORLD_WIDTH - 20),
                y: startY - (i * spacing),
                speed: spec.speed,
                hp: 1,
                damage: this.config.ALIEN_DAMAGE,
                radius: this.config.ALIEN_RADIUS * sizeMultiplier,
                type: enemyTemplate.type || 'saucer',
                sizeMultiplier,
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
        this.fastForwardWaveEntry(this.aliens, waveSpec);
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
        this.fastForwardWaveEntry(this.aliens);
        return true;
    }

    fastForwardWaveEntry(aliens, waveSpec = null) {
        if (!Array.isArray(aliens) || aliens.length === 0) return;
        const cycles = this.config.WAVE_ENTRY_FAST_FORWARD_CYCLES || 0;
        if (cycles <= 0) return;
        const minActiveY = this.config.WAVE_ENTRY_MIN_ACTIVE_Y || 0;
        const highestAlienY = Math.max(...aliens.map((alien) => alien.y));
        if (highestAlienY <= minActiveY) return;

        // Pull the formation down just enough to bring its highest alien into the
        // visible battlefield band.
        const neededShift = Math.max(0, highestAlienY - minActiveY);
        const appliedShift = neededShift;
        if (appliedShift <= 0) return;

        for (const alien of aliens) {
            alien.y -= appliedShift;
            // Renderer animates this back to zero for a brief "fast-forward" slide-in.
            alien.entryVisualOffsetY = appliedShift;
        }
    }

    spawnWave() {
        this.startWave(this.level);
    }

    queueIncomingWavePreview(level) {
        this.primeIncomingWave(level);
    }

    emitWaveClearFx(waveLevel, bonus) {
        const subtitle = bonus > 0 ? `CYCLES BONUS +$${bonus}` : '';
        this.emitStatusFx(`WAVE ${waveLevel} CLEARED!`, subtitle, 125);
    }

    emitStatusFx(title, subtitle = '', maxAge = 85) {
        this.waveClearFxEvents.push({
            id: this.nextFxEventId++,
            title,
            subtitle,
            maxAge
        });
        if (this.waveClearFxEvents.length > 20) {
            this.waveClearFxEvents.shift();
        }
    }

    // Angle: 0 = up, negative = left, positive = right
    rotateLeft(degrees) {
        if (this.isGameOver) return;
        this.launcherAngle = this.utils.clamp(this.launcherAngle - degrees, this.config.MIN_ANGLE, this.config.MAX_ANGLE);
        this.notify();
    }

    rotateRight(degrees) {
        if (this.isGameOver) return;
        this.launcherAngle = this.utils.clamp(this.launcherAngle + degrees, this.config.MIN_ANGLE, this.config.MAX_ANGLE);
        this.notify();
    }

    canCharge() {
        return !this.isAnimating &&
               !this.isGameOver &&
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

    getMissileLaunchOrigin() {
        const launcher = this.getLauncherOrigin();
        const mathAngle = (90 - this.launcherAngle) * Math.PI / 180;
        const offset = this.config.MISSILE_LAUNCH_TIP_OFFSET || 0;
        return {
            x: launcher.x + Math.cos(mathAngle) * offset,
            y: launcher.y + Math.sin(mathAngle) * offset
        };
    }

    getTargetForPower(power = this.power) {
        if (power <= 0) return null;

        const mathAngle = (90 - this.launcherAngle) * Math.PI / 180;
        const normalizedPower = this.utils.clamp(power / 100, 0, 1);
        const curvedPower = Math.pow(normalizedPower, this.config.POWER_TO_DISTANCE_EXPONENT || 1);
        const distance = curvedPower * (this.config.WORLD_HEIGHT * this.config.MAX_MISSILE_RANGE / 100);
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
            const launcher = this.getMissileLaunchOrigin();
            const target = this.getTargetForPower(this.power);

            this.pendingMissiles.push({
                startX: launcher.x,
                startY: launcher.y,
                targetX: target.x,
                targetY: target.y,
                lockedAtMs: Date.now(),
                explosionRadius: this.getCurrentExplosionRadius(),
                progress: 0,
                exploded: false
            });

            this.missilesLockedThisTurn++;
            this.lastLockedPower = this.power;
            this.missileEnergy = this.utils.clamp(this.missileEnergy - energyCost, 0, this.config.MISSILE_ENERGY_MAX);
            this.power = 0;
            // Auto-cycle when all missiles are locked (upgrade-gated).
            if (this.hasAutoCycle() && this.missilesLockedThisTurn >= this.getMissilesPerTurn()) {
                this.emitStatusFx('MISSILE TARGETED', 'AUTO-CYCLED', 70);
                this.notify();
                if (this.instantAutoCycle) {
                    this.advanceImmediate();
                    return;
                }
                setTimeout(() => this.advance(), 100);
                return;
            }
            this.emitStatusFx('MISSILE TARGETED', '', 55);
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

    getUpgradeInitialCostScore(upgrade) {
        if (!upgrade) return Number.POSITIVE_INFINITY;
        const firstTier = (typeof upgrade.getTierForLevel === 'function')
            ? upgrade.getTierForLevel(0, { game: this, upgrade })
            : (upgrade.tiers?.[0] || null);
        if (!firstTier) return Number.POSITIVE_INFINITY;
        return (firstTier.moneyCost || 0) + (firstTier.energyCost || 0);
    }

    getOrderedUpgrades() {
        return Object.values(this.upgrades).sort((a, b) => {
            if (a.key === 'energyResupply' && b.key !== 'energyResupply') return -1;
            if (b.key === 'energyResupply' && a.key !== 'energyResupply') return 1;
            return this.getUpgradeInitialCostScore(a) - this.getUpgradeInitialCostScore(b);
        });
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

    hasAutoCycle() {
        return !!this.upgradeEffects.autoCycleEnabled;
    }

    getEnergyRegenPerTurn() {
        return this.config.MISSILE_ENERGY_REGEN_PER_TURN + (this.upgradeEffects.energyRegenBonus || 0);
    }

    getTrajectoryFadeStrength() {
        const multiplier = this.upgradeEffects.trajectoryFadeStrengthMultiplier || 1;
        return Math.max(0.3, this.config.TRAJECTORY_FADE_STRENGTH * multiplier);
    }

    getMoneyPerKillReward(exactHit = false) {
        const baseReward = this.config.MONEY_PER_KILL * (this.upgradeEffects.moneyPerKillMultiplier || 1);
        return exactHit ? baseReward * this.config.EXACT_HIT_MONEY_MULTIPLIER : baseReward;
    }

    getEnergyPerKillReward() {
        return this.config.ENERGY_PER_KILL * (this.upgradeEffects.energyPerKillMultiplier || 1);
    }

    toggleUpgradeMenu() {
        if (this.isGameOver) return;
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
        this.notify();
        return true;
    }

    advance() {
        if (this.isAnimating || this.isGameOver) return;

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
            this.runAdvanceAnimationFrame(totalFrames);

            this.notify();

            if (frame >= totalFrames) {
                clearInterval(interval);
                this.finishTurn();
            }
        }, this.config.ANIMATION_FRAME_MS);
    }

    runAdvanceAnimationFrame(totalFrames) {
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

        for (const alien of this.aliens) {
            alien.y -= alien.speed / totalFrames;
        }
        for (const alien of this.incomingAliens) {
            alien.y -= (alien.speed * 0.55) / totalFrames;
        }

        for (const explosion of this.explosions) {
            explosion.age++;
        }
    }

    advanceImmediate() {
        if (this.isAnimating || this.isGameOver) return false;

        this.missilesLaunchedThisCycle = this.pendingMissiles.length;
        const launchStartProgress = this.config.MISSILE_LAUNCH_START_PROGRESS || 0;
        this.missiles.push(...this.pendingMissiles.map((missile) => ({
            ...missile,
            progress: Math.max(missile.progress || 0, launchStartProgress)
        })));
        this.pendingMissiles = [];
        this.missilesLockedThisTurn = 0;

        this.isAnimating = true;
        const totalFrames = Math.max(1, this.config.ANIMATION_FRAMES || 1);
        for (let frame = 0; frame < totalFrames; frame++) {
            this.runAdvanceAnimationFrame(totalFrames);
        }
        this.finishTurn();
        return true;
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

    canAlienBeHitNextCycle(alien) {
        if (!this.isAlienDamageable(alien)) return false;
        const nextY = alien.y - alien.speed;
        const launcher = this.getLauncherOrigin();
        const dx = alien.x - launcher.x;
        const dy = nextY - launcher.y;
        const dist = this.utils.distance(dx, dy);
        const maxTargetDistance = this.config.WORLD_HEIGHT * this.config.MAX_MISSILE_RANGE / 100;
        const maxHitDistance = maxTargetDistance + this.getCurrentExplosionRadius() + alien.radius;
        if (dist > maxHitDistance) return false;
        const mathAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        const gameAngle = 90 - mathAngle;
        return gameAngle >= this.config.MIN_ANGLE && gameAngle <= this.config.MAX_ANGLE;
    }

    hasInevitableEarthBreach() {
        if (this.isAnimating || this.pendingMissiles.length > 0 || this.missiles.length > 0) return false;
        if (!this.aliens.length) return false;
        return this.aliens.some((alien) => {
            if (!this.isAlienDamageable(alien)) return false;
            const willTouchEarthNextCycle = (alien.y - alien.speed - alien.radius) <= this.config.LAUNCHER_Y;
            if (!willTouchEarthNextCycle) return false;
            return !this.canAlienBeHitNextCycle(alien);
        });
    }

    triggerGameOver(reason = 'EARTH BREACHED') {
        this.isAnimating = false;
        this.isCharging = false;
        this.power = 0;
        this.isUpgradeMenuOpen = false;
        this.isGameOver = true;
        this.gameOverReason = reason;
        this.notify();
    }

    finishTurn() {
        this.levelCycles += 1;
        this.totalCycles += 1;

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
        if (reachedEarth.length > 0) {
            this.baseHP = 0;
            this.triggerGameOver('EARTH BREACHED');
            return;
        }

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
                this.promoteIncomingWaveToActive();
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
        this.isAnimating = false;
        const regenMultiplier = this.missilesLaunchedThisCycle === 0 ? 2 : 1;
        this.missileEnergy = this.utils.clamp(
            this.missileEnergy + (this.getEnergyRegenPerTurn() * regenMultiplier),
            0,
            this.config.MISSILE_ENERGY_MAX
        );
        this.missilesLaunchedThisCycle = 0;

        if (this.hasInevitableEarthBreach()) {
            this.baseHP = 0;
            this.triggerGameOver('DEFENSE BREACHED!');
            return;
        }

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
        this.lastLockedPower = 0;
        this.money = 0;
        this.levelCycles = 0;
        this.totalCycles = 0;
        this.lastWaveClearBonus = 0;
        this.isUpgradeMenuOpen = false;
        this.isGameOver = false;
        this.gameOverReason = '';
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
        this.notify();
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
                    this.missileEnergy = this.utils.clamp(
                        this.missileEnergy + this.getEnergyPerKillReward(),
                        0,
                        this.config.MISSILE_ENERGY_MAX
                    );
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
            isGameOver: this.isGameOver,
            gameOverReason: this.gameOverReason,
            levelCycles: this.levelCycles,
            totalCycles: this.totalCycles,
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, GameConfig, UpgradeDefinitions, LevelDefinitions };
}
