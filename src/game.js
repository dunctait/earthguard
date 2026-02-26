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
    MISSILE_MIN_ENERGY_COST: 8,
    TRAJECTORY_FADE_STRENGTH: 2.4,

    // Power/Charging
    POWER_CHARGE_RATE: 4,           // Per update tick (was 2, now faster)
    POWER_UPDATE_INTERVAL: 30,      // ms between charge updates
    POWER_TO_DISTANCE_EXPONENT: 1.5,

    // Aliens
    BASE_ALIEN_SPEED: 6.2,
    ALIEN_SPEED_PER_LEVEL: 0.9,
    ALIEN_SPEED_MIDGAME_BONUS_START_LEVEL: 5,
    ALIEN_SPEED_MIDGAME_BONUS_PER_LEVEL: 0.35,
    ALIEN_SPEED_LATEGAME_BONUS_START_LEVEL: 8,
    ALIEN_SPEED_LATEGAME_BONUS_PER_LEVEL: 0.4,
    ALIEN_RADIUS: 3,
    ALIEN_DAMAGE: 10,
    ALIEN_WAVE_VERTICAL_SPACING: 8,
    ALIEN_ACTIVE_SPAWN_TOP_Y: 95,
    ALIEN_INCOMING_WAVE_GAP: 4,
    ALIEN_SWARM_CLUSTER_SPREAD_X: 14,
    ALIEN_SWARM_MIN_SEPARATION_FACTOR: 1.9,
    WAVE_ENTRY_FAST_FORWARD_CYCLES: 2,
    WAVE_ENTRY_MIN_ACTIVE_Y: 88,
    MONEY_PER_KILL: 10,
    ENERGY_PER_KILL: 2,
    EXACT_HIT_MONEY_MULTIPLIER: 2,
    EXACT_HIT_MONEY_LEVEL_SCALE: 0.03,
    EXACT_HIT_RADIUS_FACTOR: 0.35,
    WAVE_CLEAR_BONUS_BASE: 12,
    WAVE_CLEAR_BONUS_DECAY_PER_CYCLE: 2,
    WAVE_CLEAR_BONUS_MIN: 0,
    WAVE_CLEAR_BONUS_LEVEL_SCALE: 0.04,
    WAVE_CLEAR_ENERGY_BONUS_BASE: 3,
    WAVE_CLEAR_ENERGY_BONUS_DECAY_PER_CYCLE: 1,
    WAVE_CLEAR_ENERGY_BONUS_MIN: 0,
    WAVE_CLEAR_ENERGY_BONUS_LEVEL_SCALE: 0.02,
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
            { moneyCost: 110, energyCost: 8, label: 'Unlock preview' }
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
            { moneyCost: 14, energyCost: 2, radiusMultiplier: 1.60, label: '+60%' },
            { moneyCost: 34, energyCost: 4, radiusMultiplier: 2.05, label: '+105%' },
            { moneyCost: 70, energyCost: 6, radiusMultiplier: 2.35, label: '+135%' }
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
            { moneyCost: 22, energyCost: 4, missilesPerTurnBonus: 1, label: '+1 missile/cycle' },
            { moneyCost: 48, energyCost: 6, missilesPerTurnBonus: 2, label: '+2 missiles/cycle' },
            { moneyCost: 95, energyCost: 6, missilesPerTurnBonus: 3, label: '+3 missiles/cycle' }
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
            { moneyCost: 24, energyCost: 3, costReductionPct: 20, label: '-20% cost' },
            { moneyCost: 48, energyCost: 5, costReductionPct: 40, label: '-40% cost' },
            { moneyCost: 85, energyCost: 6, costReductionPct: 60, label: '-60% cost' }
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
            { moneyCost: 22, energyCost: 3, regenBonus: 3, label: '+3 EN / cycle' },
            { moneyCost: 45, energyCost: 5, regenBonus: 6, label: '+6 EN / cycle' },
            { moneyCost: 80, energyCost: 6, regenBonus: 9, label: '+9 EN / cycle' }
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
            { moneyCost: 18, energyCost: 1, fadeStrengthMultiplier: 0.85, label: 'Longer guide I' },
            { moneyCost: 40, energyCost: 3, fadeStrengthMultiplier: 0.70, label: 'Longer guide II' },
            { moneyCost: 75, energyCost: 6, fadeStrengthMultiplier: 0.55, label: 'Longer guide III' }
        ],
        uiLabelForTier: (tier) => tier.label || 'Longer guide',
        apply: ({ effects, tier }) => {
            effects.trajectoryFadeStrengthMultiplier = tier.fadeStrengthMultiplier || 1;
        }
    },
    powerMemory: {
        key: 'powerMemory',
        name: 'Power Memory',
        description: 'Shows a marker for the previous target power on the charge bar.',
        stackingMode: 'unlock',
        tiers: [
            { moneyCost: 12, energyCost: 1, label: 'Unlock power marker' }
        ],
        uiLabelForTier: (tier) => tier.label || 'UNLOCK',
        apply: ({ effects }) => {
            effects.powerMemoryEnabled = true;
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
    },
    12: {
        enemies: [
            { type: 'boss', sizeMultiplier: 2.8, hp: 8, speedMultiplier: 0.45, yBand: 0 },
            { type: 'saucer', sizeMultiplier: 0.8, yBand: 1 },
            { type: 'scout', sizeMultiplier: 0.75, yBand: 2 },
            { type: 'scout', sizeMultiplier: 0.75, yBand: 1 }
        ]
    }
};

const MetaUpgradeDefinitions = {
    salvageYield: {
        key: 'salvageYield',
        name: 'Salvage Yield',
        description: 'Increase salvage earned at end of run.',
        tiers: [
            { cost: 8, salvageMultiplier: 1.25, label: '+25% salvage' },
            { cost: 18, salvageMultiplier: 1.5, label: '+50% salvage' },
            { cost: 35, salvageMultiplier: 1.8, label: '+80% salvage' }
        ]
    },
    startingReserve: {
        key: 'startingReserve',
        name: 'Starting Reserve',
        description: 'Begin new runs with extra cash and energy.',
        tiers: [
            { cost: 10, startMoneyBonus: 10, startEnergyBonus: 6, label: '+$10 / +EN 6' },
            { cost: 20, startMoneyBonus: 20, startEnergyBonus: 12, label: '+$20 / +EN 12' },
            { cost: 38, startMoneyBonus: 35, startEnergyBonus: 18, label: '+$35 / +EN 18' }
        ]
    }
};

class Game {
    constructor(options = {}) {
        this.config = GameConfig;
        const root = options.root || (typeof window !== 'undefined' ? window : globalThis);
        this.root = root;
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
        this.lastWaveClearEnergyBonus = 0;
        this.stats = {
            missilesTargeted: 0,
            missilesLaunched: 0,
            kills: 0,
            exactHitKills: 0
        };
        this.isUpgradeMenuOpen = false;
        this.isGameOver = false;
        this.isGameOverSummaryOpen = false;
        this.gameOverReason = '';
        this.metaProgress = this.loadMetaProgress();
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
        this.applyMetaStartBonuses();
        this.notify();
    }

    get WORLD_HEIGHT() { return this.config.WORLD_HEIGHT; }
    get WORLD_WIDTH() { return this.config.WORLD_WIDTH; }

    getMetaStorageKey() {
        return 'earthguard.meta.v1';
    }

    getDefaultMetaProgress() {
        return {
            schemaVersion: 1,
            totalRuns: 0,
            bestLevelReached: 0,
            metaCurrency: 0,
            metaUpgrades: {},
            bestMoneyByLevel: {},
            lastRun: null
        };
    }

    loadMetaProgress() {
        const fallback = this.getDefaultMetaProgress();
        try {
            const storage = this.root?.localStorage;
            if (!storage) return fallback;
            const raw = storage.getItem(this.getMetaStorageKey());
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.schemaVersion !== 1) return fallback;
            return {
                ...fallback,
                ...parsed,
                metaUpgrades: (parsed.metaUpgrades && typeof parsed.metaUpgrades === 'object') ? parsed.metaUpgrades : {},
                bestMoneyByLevel: (parsed.bestMoneyByLevel && typeof parsed.bestMoneyByLevel === 'object') ? parsed.bestMoneyByLevel : {}
            };
        } catch {
            return fallback;
        }
    }

    saveMetaProgress() {
        try {
            const storage = this.root?.localStorage;
            if (!storage) return false;
            storage.setItem(this.getMetaStorageKey(), JSON.stringify(this.metaProgress));
            return true;
        } catch {
            return false;
        }
    }

    updateMetaProgressFromRun() {
        if (!this.metaProgress) this.metaProgress = this.getDefaultMetaProgress();
        const runMetaReward = this.getRunMetaCurrencyReward();
        this.metaProgress.totalRuns = (this.metaProgress.totalRuns || 0) + 1;
        this.metaProgress.bestLevelReached = Math.max(this.metaProgress.bestLevelReached || 0, this.level || 0);
        this.metaProgress.metaCurrency = Math.max(0, Math.floor(this.metaProgress.metaCurrency || 0)) + runMetaReward;
        this.metaProgress.lastRun = {
            level: Math.floor(this.level || 0),
            totalCycles: Math.floor(this.totalCycles || 0),
            money: Math.floor(this.money || 0),
            kills: Math.floor(this.stats?.kills || 0),
            reason: this.gameOverReason || '',
            metaReward: runMetaReward
        };
        this.saveMetaProgress();
    }

    recordBestMoneyForLevel(level = this.level, money = this.money) {
        if (!this.metaProgress) this.metaProgress = this.getDefaultMetaProgress();
        const numericLevel = Math.max(1, Math.floor(level || 0));
        const levelKey = String(numericLevel);
        const moneyValue = Math.max(0, Math.floor(money || 0));
        const previous = Math.floor(this.metaProgress.bestMoneyByLevel?.[levelKey] || 0);
        if (moneyValue <= previous) return false;
        this.metaProgress.bestMoneyByLevel[levelKey] = moneyValue;
        this.saveMetaProgress();
        return true;
    }

    getAvailableJumpStartLevels() {
        const entries = Object.entries(this.metaProgress?.bestMoneyByLevel || {})
            .map(([level, money]) => ({ level: Math.floor(Number(level)), money: Math.floor(Number(money) || 0) }))
            .filter((entry) => Number.isFinite(entry.level) && entry.level >= 2 && entry.money >= 0)
            .sort((a, b) => a.level - b.level);
        return entries;
    }

    getJumpStartPreview(level) {
        const numericLevel = Math.floor(Number(level) || 0);
        const jump = this.getAvailableJumpStartLevels().find((entry) => entry.level === numericLevel);
        if (!jump) return null;
        const waveSpec = this.getWaveSpec(numericLevel);
        const startBonuses = this.getMetaStartBonuses();
        return {
            level: numericLevel,
            money: Math.floor(jump.money || 0),
            energy: this.config.MISSILE_ENERGY_MAX,
            enemyCount: Math.floor(waveSpec.alienCount || 0),
            enemySpeed: +(waveSpec.speed || 0).toFixed(1),
            startBonusMoney: Math.floor(startBonuses.money || 0),
            startBonusEnergy: Math.floor(startBonuses.energy || 0)
        };
    }

    getMetaUpgradeLevel(key) {
        return Math.max(0, Math.floor(this.metaProgress?.metaUpgrades?.[key] || 0));
    }

    getMetaUpgradeState() {
        return Object.values(MetaUpgradeDefinitions).map((definition) => {
            const level = this.getMetaUpgradeLevel(definition.key);
            const maxLevel = definition.tiers.length;
            const nextTier = level < maxLevel ? definition.tiers[level] : null;
            return {
                ...definition,
                level,
                maxLevel,
                nextTier
            };
        });
    }

    canPurchaseMetaUpgrade(key) {
        const definition = MetaUpgradeDefinitions[key];
        if (!definition) return false;
        const level = this.getMetaUpgradeLevel(key);
        const tier = definition.tiers[level];
        if (!tier) return false;
        return Math.floor(this.metaProgress?.metaCurrency || 0) >= Math.floor(tier.cost || 0);
    }

    purchaseMetaUpgrade(key) {
        const definition = MetaUpgradeDefinitions[key];
        if (!definition) return false;
        const level = this.getMetaUpgradeLevel(key);
        const tier = definition.tiers[level];
        if (!tier) return false;
        const cost = Math.floor(tier.cost || 0);
        const current = Math.floor(this.metaProgress?.metaCurrency || 0);
        if (current < cost) return false;
        if (!this.metaProgress.metaUpgrades || typeof this.metaProgress.metaUpgrades !== 'object') {
            this.metaProgress.metaUpgrades = {};
        }
        this.metaProgress.metaCurrency = current - cost;
        this.metaProgress.metaUpgrades[key] = level + 1;
        this.saveMetaProgress();
        this.notify();
        return true;
    }

    getRunMetaCurrencyReward() {
        const levelPart = Math.max(0, Math.floor(this.level || 0) - 1);
        const killsPart = Math.floor((this.stats?.kills || 0) / 5);
        const base = Math.max(1, levelPart + killsPart);
        const salvageTier = this.getMetaUpgradeLevel('salvageYield');
        const salvageMultiplier = MetaUpgradeDefinitions.salvageYield.tiers[Math.max(0, salvageTier - 1)]?.salvageMultiplier || 1;
        return Math.max(1, Math.floor(base * salvageMultiplier));
    }

    getMetaStartBonuses() {
        const reserveTierLevel = this.getMetaUpgradeLevel('startingReserve');
        const reserveTier = MetaUpgradeDefinitions.startingReserve.tiers[Math.max(0, reserveTierLevel - 1)];
        return {
            money: Math.floor(reserveTier?.startMoneyBonus || 0),
            energy: Math.floor(reserveTier?.startEnergyBonus || 0)
        };
    }

    applyMetaStartBonuses() {
        const bonuses = this.getMetaStartBonuses();
        if (bonuses.money > 0) {
            this.money += bonuses.money;
            this.recordBestMoneyForLevel(this.level, this.money);
        }
        if (bonuses.energy > 0) {
            this.missileEnergy = this.utils.clamp(this.missileEnergy + bonuses.energy, 0, this.config.MISSILE_ENERGY_MAX);
        }
    }

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
            trajectoryFadeStrengthMultiplier: 1,
            powerMemoryEnabled: false
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
            speed: this.getAlienSpeedForLevel(level),
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
                sizeMultiplier: enemy.sizeMultiplier || 1,
                yBand: enemy.yBand || 0,
                hp: enemy.hp || undefined,
                speedMultiplier: enemy.speedMultiplier || 1
            }));
        }

        let alienCount = Math.min(Math.max(2, level), 10);
        if (level >= 5) {
            alienCount += Math.floor((level - 4) / 2);
        }
        if (level >= 6) {
            alienCount += 1;
        }
        if (level >= 9) {
            alienCount += 1;
        }
        alienCount = Math.min(alienCount, 14);
        let sizeMultiplier = level <= 4 ? 1 : Math.max(0.8, 1.1 - ((level - 4) * 0.03));
        if (level >= 8) {
            sizeMultiplier = Math.max(0.55, 0.9 - ((level - 8) * 0.05));
        }

        const useBandedRows = level >= 4;
        if (level >= 8) {
            // Flatter formations with small banded Y offsets make later waves feel more "swarm / bullet hell".
            const bandCount = Math.min(3, Math.max(2, Math.ceil(alienCount / 4)));
            return Array.from({ length: alienCount }, (_, i) => ({
                type: (level >= 9 && (i % 6) === 0) ? 'scout' : 'saucer',
                sizeMultiplier,
                yBand: i % bandCount
            }));
        }

        return Array.from({ length: alienCount }, () => ({
            type: 'saucer',
            sizeMultiplier,
            yBand: 0
        })).map((enemy, i) => ({
            ...enemy,
            yBand: useBandedRows ? (i % Math.min(3, Math.max(2, Math.ceil(alienCount / 4)))) : 0
        }));
    }

    getAlienSpeedForLevel(level) {
        const base = this.config.BASE_ALIEN_SPEED + (level * this.config.ALIEN_SPEED_PER_LEVEL);
        const midStart = this.config.ALIEN_SPEED_MIDGAME_BONUS_START_LEVEL || 5;
        const lateStart = this.config.ALIEN_SPEED_LATEGAME_BONUS_START_LEVEL || 8;
        const midBonus = Math.max(0, level - midStart + 1) * (this.config.ALIEN_SPEED_MIDGAME_BONUS_PER_LEVEL || 0);
        const lateBonus = Math.max(0, level - lateStart + 1) * (this.config.ALIEN_SPEED_LATEGAME_BONUS_PER_LEVEL || 0);
        return base + midBonus + lateBonus;
    }

    createAliensFromWaveSpec(spec, incoming = false) {
        const aliens = [];
        const minSpacing = this.config.ALIEN_WAVE_VERTICAL_SPACING || 8;
        const spacing = Math.max(minSpacing, (this.config.ALIEN_RADIUS * (spec.maxSizeMultiplier || 1) * 2.6));
        const activeTopY = spec.activeTopY ?? this.config.ALIEN_ACTIVE_SPAWN_TOP_Y ?? (this.config.WORLD_HEIGHT - 5);
        const isSwarm = spec.level >= 8;
        const bandStep = isSwarm ? Math.max(2.2, spacing * 0.38) : spacing;
        const bandJitter = isSwarm ? Math.max(0.4, bandStep * 0.18) : 0;

        const maxBandIndex = spec.enemies.reduce((max, e) => Math.max(max, e.yBand || 0), 0);
        const formationHeight = (maxBandIndex * bandStep) + (bandJitter * 2);

        // Ensure incoming wave never vertically overlaps the highest possible active-wave enemy:
        // incoming lowest enemy sits above activeTopY by a fixed gap.
        const incomingLowestY = activeTopY + (this.config.ALIEN_INCOMING_WAVE_GAP || 4);
        const incomingStartY = incomingLowestY + formationHeight;
        const startY = incoming ? incomingStartY : activeTopY;

        const clusterCount = isSwarm ? Math.min(4, Math.max(2, Math.round(spec.alienCount / 3.5))) : 0;
        const clusterCenters = isSwarm
            ? Array.from({ length: clusterCount }, (_, i) => {
                const lane = (i + 1) / (clusterCount + 1);
                const laneJitter = (Math.random() - 0.5) * 6;
                return this.utils.clamp((lane * this.config.WORLD_WIDTH) + laneJitter, 8, this.config.WORLD_WIDTH - 8);
            })
            : null;
        for (let i = 0; i < spec.alienCount; i++) {
            const enemyTemplate = spec.enemies[i] || { type: 'saucer', sizeMultiplier: 1 };
            const sizeMultiplier = enemyTemplate.sizeMultiplier || 1;
            const bandOffset = (enemyTemplate.yBand || 0) * bandStep;
            const enemyType = enemyTemplate.type || 'saucer';
            const isScout = enemyType === 'scout';
            const isBoss = enemyType === 'boss';
            const radius = this.config.ALIEN_RADIUS * sizeMultiplier * (isScout ? 0.62 : 1);
            let x = 10 + Math.random() * (this.config.WORLD_WIDTH - 20);
            let y = startY - bandOffset;
            if (isSwarm && clusterCenters) {
                const center = clusterCenters[i % clusterCenters.length];
                const spreadX = this.config.ALIEN_SWARM_CLUSTER_SPREAD_X || 14;
                const minSepFactor = this.config.ALIEN_SWARM_MIN_SEPARATION_FACTOR || 1.9;
                let placed = false;
                for (let attempt = 0; attempt < 16; attempt++) {
                    const candidateX = this.utils.clamp(center + ((Math.random() - 0.5) * spreadX * 2), 6, this.config.WORLD_WIDTH - 6);
                    const candidateY = (startY - bandOffset) - ((Math.random() - 0.5) * bandJitter * 2);
                    const overlaps = aliens.some((other) => {
                        const minDist = ((other.radius || this.config.ALIEN_RADIUS) + radius) * minSepFactor;
                        return this.utils.distance(candidateX - other.x, candidateY - other.y) < minDist;
                    });
                    if (!overlaps) {
                        x = candidateX;
                        y = candidateY;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    x = this.utils.clamp(center + ((Math.random() - 0.5) * (spreadX + 8) * 2), 6, this.config.WORLD_WIDTH - 6);
                    y = (startY - bandOffset) - ((Math.random() - 0.5) * bandJitter * 3);
                }
            } else {
                const jitterY = isSwarm ? ((Math.random() - 0.5) * bandJitter * 2) : 0;
                y = startY - bandOffset - jitterY;
            }
            aliens.push({
                x,
                y,
                speed: spec.speed * (enemyTemplate.speedMultiplier || 1),
                hp: enemyTemplate.hp ?? ((spec.level >= 8 && !isScout && !isBoss && (i % 5 === 1)) ? 2 : 1),
                maxHp: enemyTemplate.hp ?? ((spec.level >= 8 && !isScout && !isBoss && (i % 5 === 1)) ? 2 : 1),
                damage: this.config.ALIEN_DAMAGE,
                radius,
                type: enemyType,
                sizeMultiplier,
                waveLevel: spec.level,
                incoming,
                zigzagDir: isScout ? (Math.random() > 0.5 ? 1 : -1) : 0,
                zigzagSpeedX: isScout ? (1.4 + (Math.random() * 0.8)) : 0,
                bossPhase: isBoss ? (Math.random() * Math.PI * 2) : 0,
                bossDriftAmplitude: isBoss ? (6 + (Math.random() * 2)) : 0,
                bossDriftSpeed: isBoss ? (0.045 + (Math.random() * 0.02)) : 0
            });
        }
        if (aliens.length > 1) {
            this.relaxAlienFormation(aliens, {
                minSepFactor: isSwarm ? (this.config.ALIEN_SWARM_MIN_SEPARATION_FACTOR || 1.9) : 1.38,
                horizontalBias: isSwarm ? 0.42 : 0.32,
                verticalBias: isSwarm ? 0.10 : 0.14
            });
        }
        return aliens;
    }

    relaxAlienFormation(aliens, options = {}) {
        const minSepFactor = options.minSepFactor || 1.2;
        const horizontalBias = options.horizontalBias || 0.28;
        const verticalBias = options.verticalBias || 0.18;
        const worldMinX = 6;
        const worldMaxX = this.config.WORLD_WIDTH - 6;
        for (let iter = 0; iter < 28; iter++) {
            let moved = false;
            for (let i = 0; i < aliens.length; i++) {
                for (let j = i + 1; j < aliens.length; j++) {
                    const a = aliens[i];
                    const b = aliens[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.max(0.001, Math.hypot(dx, dy));
                    const minDist = ((a.radius || this.config.ALIEN_RADIUS) + (b.radius || this.config.ALIEN_RADIUS)) * minSepFactor;
                    if (dist >= minDist) continue;
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const pushX = (nx === 0 ? (Math.random() > 0.5 ? 1 : -1) : nx) * overlap * horizontalBias;
                    const pushY = (ny === 0 ? 0 : ny) * overlap * verticalBias;
                    a.x = this.utils.clamp(a.x - pushX, worldMinX, worldMaxX);
                    b.x = this.utils.clamp(b.x + pushX, worldMinX, worldMaxX);
                    a.y -= pushY;
                    b.y += pushY;
                    moved = true;
                }
            }
            if (!moved) break;
        }
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
        const lowestAlienY = Math.min(...aliens.map((alien) => alien.y - (alien.radius || 0)));
        const minBreachBuffer = (this.config.LAUNCHER_Y || 0) + 16;
        const maxSafeShift = Math.max(0, lowestAlienY - minBreachBuffer);
        const appliedShift = Math.min(neededShift, maxSafeShift);
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
        const energyBonus = this.lastWaveClearEnergyBonus || 0;
        const parts = [];
        if (bonus > 0) parts.push(`+$${bonus}`);
        if (energyBonus > 0) parts.push(`+EN ${energyBonus}`);
        const subtitle = parts.length ? `CYCLES BONUS ${parts.join(' | ')}` : '';
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

    getTargetRangeProgressForPower(power = this.power) {
        const normalizedPower = this.utils.clamp((power || 0) / 100, 0, 1);
        return Math.pow(normalizedPower, this.config.POWER_TO_DISTANCE_EXPONENT || 1);
    }

    getWaveClearSpeedBonus(cycles = this.levelCycles, level = this.level) {
        const raw = this.config.WAVE_CLEAR_BONUS_BASE - ((Math.max(1, cycles) - 1) * this.config.WAVE_CLEAR_BONUS_DECAY_PER_CYCLE);
        const clamped = Math.max(this.config.WAVE_CLEAR_BONUS_MIN, raw);
        // Mild level scaling to keep bonuses meaningful without exploding economy.
        return Math.round(clamped * (1 + ((Math.max(1, level) - 1) * (this.config.WAVE_CLEAR_BONUS_LEVEL_SCALE || 0))));
    }

    getWaveClearEnergyBonus(cycles = this.levelCycles, level = this.level) {
        const raw = this.config.WAVE_CLEAR_ENERGY_BONUS_BASE - ((Math.max(1, cycles) - 1) * this.config.WAVE_CLEAR_ENERGY_BONUS_DECAY_PER_CYCLE);
        const clamped = Math.max(this.config.WAVE_CLEAR_ENERGY_BONUS_MIN, raw);
        return Math.max(0, Math.round(clamped * (1 + ((Math.max(1, level) - 1) * (this.config.WAVE_CLEAR_ENERGY_BONUS_LEVEL_SCALE || 0)))));
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
            this.stats.missilesTargeted += 1;
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

    hasPowerMemory() {
        return !!this.upgradeEffects.powerMemoryEnabled;
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
        if (!exactHit) return baseReward;
        const exactLevelScale = 1 + ((Math.max(1, this.level) - 1) * (this.config.EXACT_HIT_MONEY_LEVEL_SCALE || 0));
        return baseReward * this.config.EXACT_HIT_MONEY_MULTIPLIER * exactLevelScale;
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

    getUpgradeAffordability(key) {
        const upgrade = this.upgrades[key];
        const nextTier = this.getNextUpgradeTier(key);
        if (!upgrade || !nextTier) {
            return {
                canBuy: false,
                hasEnoughMoney: false,
                hasEnoughEnergy: false,
                tier: nextTier || null
            };
        }
        return {
            canBuy: this.canPurchaseUpgrade(key),
            hasEnoughMoney: this.money >= nextTier.moneyCost,
            hasEnoughEnergy: this.missileEnergy >= nextTier.energyCost,
            tier: nextTier
        };
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
        this.stats.missilesLaunched += this.pendingMissiles.length;
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
            if (alien.type === 'scout') {
                alien.x += ((alien.zigzagDir || 1) * (alien.zigzagSpeedX || 2.6)) / totalFrames;
                const edgePad = 4 + (alien.radius || 0);
                if (alien.x <= edgePad) {
                    alien.x = edgePad;
                    alien.zigzagDir = 1;
                } else if (alien.x >= (this.config.WORLD_WIDTH - edgePad)) {
                    alien.x = this.config.WORLD_WIDTH - edgePad;
                    alien.zigzagDir = -1;
                }
            } else if (alien.type === 'boss') {
                alien.bossPhase = (alien.bossPhase || 0) + (alien.bossDriftSpeed || 0.05);
                const centerX = this.config.WORLD_WIDTH / 2;
                alien.x = this.utils.clamp(
                    centerX + Math.sin(alien.bossPhase) * (alien.bossDriftAmplitude || 6),
                    8 + (alien.radius || 0),
                    this.config.WORLD_WIDTH - 8 - (alien.radius || 0)
                );
            }
        }
        for (const alien of this.incomingAliens) {
            alien.y -= (alien.speed * 0.55) / totalFrames;
            if (alien.type === 'scout') {
                alien.x += ((alien.zigzagDir || 1) * (alien.zigzagSpeedX || 2.6) * 0.65) / totalFrames;
                const edgePad = 4 + (alien.radius || 0);
                if (alien.x <= edgePad) {
                    alien.x = edgePad;
                    alien.zigzagDir = 1;
                } else if (alien.x >= (this.config.WORLD_WIDTH - edgePad)) {
                    alien.x = this.config.WORLD_WIDTH - edgePad;
                    alien.zigzagDir = -1;
                }
            } else if (alien.type === 'boss') {
                alien.bossPhase = (alien.bossPhase || 0) + ((alien.bossDriftSpeed || 0.05) * 0.55);
                const centerX = this.config.WORLD_WIDTH / 2;
                alien.x = this.utils.clamp(
                    centerX + Math.sin(alien.bossPhase) * (alien.bossDriftAmplitude || 6),
                    8 + (alien.radius || 0),
                    this.config.WORLD_WIDTH - 8 - (alien.radius || 0)
                );
            }
        }

        for (const explosion of this.explosions) {
            explosion.age++;
        }
    }

    advanceImmediate() {
        if (this.isAnimating || this.isGameOver) return false;

        this.missilesLaunchedThisCycle = this.pendingMissiles.length;
        this.stats.missilesLaunched += this.pendingMissiles.length;
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
        this.isGameOverSummaryOpen = false;
        this.gameOverReason = reason;
        this.updateMetaProgressFromRun();
        this.notify();
    }

    openGameOverSummary() {
        if (!this.isGameOver) return false;
        this.isGameOverSummaryOpen = true;
        this.notify();
        return true;
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
            this.lastWaveClearEnergyBonus = this.getWaveClearEnergyBonus(this.levelCycles, this.level);
            this.money += this.lastWaveClearBonus;
            this.recordBestMoneyForLevel(this.level, this.money);
            this.missileEnergy = this.utils.clamp(
                this.missileEnergy + this.lastWaveClearEnergyBonus,
                0,
                this.config.MISSILE_ENERGY_MAX
            );
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
            this.lastWaveClearEnergyBonus = 0;
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

        this.notify();
    }

    idleCycle() {
        if (this.isAnimating || this.isGameOver) return false;
        if (this.pendingMissiles.length > 0) return false;
        this.advance();
        return true;
    }

    startJumpRun(level) {
        const jump = this.getAvailableJumpStartLevels().find((entry) => entry.level === Math.floor(Number(level)));
        if (!jump) return false;
        this.reset();
        this.level = Math.max(1, jump.level);
        this.money = Math.max(0, Math.floor(jump.money || 0));
        this.missileEnergy = this.config.MISSILE_ENERGY_MAX;
        this.isUpgradeMenuOpen = false;
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
        return true;
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
        this.lastWaveClearEnergyBonus = 0;
        this.stats = {
            missilesTargeted: 0,
            missilesLaunched: 0,
            kills: 0,
            exactHitKills: 0
        };
        this.isUpgradeMenuOpen = false;
        this.isGameOver = false;
        this.isGameOverSummaryOpen = false;
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
        this.applyMetaStartBonuses();
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
                    this.stats.kills += 1;
                    if (exactHit) this.stats.exactHitKills += 1;
                    const reward = this.getMoneyPerKillReward(exactHit);
                    this.money += reward;
                    this.recordBestMoneyForLevel(this.level, this.money);
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
            isGameOverSummaryOpen: this.isGameOverSummaryOpen,
            gameOverReason: this.gameOverReason,
            levelCycles: this.levelCycles,
            totalCycles: this.totalCycles,
            lastWaveClearBonus: this.lastWaveClearBonus,
            lastWaveClearEnergyBonus: this.lastWaveClearEnergyBonus,
            stats: { ...this.stats },
            missilesLocked: this.missilesLockedThisTurn,
            missilesPerTurn: this.getMissilesPerTurn(),
            missilesInFlight: this.missiles.length,
            blastResidue: this.blastResidue.length,
            isAnimating: this.isAnimating,
            aliens: this.aliens.map(a => ({ x: +a.x.toFixed(1), y: +a.y.toFixed(1) })),
            incomingAliens: this.incomingAliens.map(a => ({ x: +a.x.toFixed(1), y: +a.y.toFixed(1) })),
            config: this.config,
            metaProgress: this.metaProgress
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
