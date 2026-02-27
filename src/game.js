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
    ANIMATION_FRAME_MS: 10,

    // View / presentation
    DEFAULT_VIEW_ZOOM: 1,
    POST_BOSS_ZOOM_OUT: 0.88,
    POST_BOSS_ZOOM_STEP: 0.08,
    POST_BOSS_ZOOM_MIN: 0.72,

    // Autonomous assistant cannons
    ASSISTANT_CANNON_UNLOCK_LEVEL: 6,
    ASSISTANT_CANNON_MAX: 2,
    ASSISTANT_CANNON_FIRE_CHANCE: 0.8,
    ASSISTANT_CANNON_COOLDOWN_MIN: 1,
    ASSISTANT_CANNON_COOLDOWN_MAX: 2,
    ASSISTANT_CANNON_EXPLOSION_RADIUS_SCALE: 0.8
};

function buildProgressionTiers(levels, factory) {
    return Array.from({ length: levels }, (_, i) => factory(i));
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

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
        tiers: buildProgressionTiers(10, (i) => {
            const radiusMultiplier = round2(1.25 + ((i + 1) * 0.14));
            return {
                moneyCost: Math.floor(14 * Math.pow(1.48, i)),
                energyCost: Math.max(1, Math.floor(2 + (i * 0.9))),
                radiusMultiplier,
                label: `+${Math.round((radiusMultiplier - 1) * 100)}%`
            };
        }),
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
        tiers: buildProgressionTiers(10, (i) => {
            const missilesPerTurnBonus = Math.min(8, Math.max(1, Math.round(1 + (i * 0.7))));
            return {
                moneyCost: Math.floor(22 * Math.pow(1.52, i)),
                energyCost: Math.max(2, Math.floor(4 + (i * 0.9))),
                missilesPerTurnBonus,
                label: `+${missilesPerTurnBonus} missile/cycle`
            };
        }),
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
        tiers: buildProgressionTiers(10, (i) => {
            const moneyPerKillMultiplier = round2(1 + ((i + 1) * 0.1));
            return {
                moneyCost: Math.floor(20 * Math.pow(1.42, i)),
                energyCost: Math.max(1, Math.floor(2 + (i * 0.6))),
                moneyPerKillMultiplier,
                label: `${moneyPerKillMultiplier.toFixed(2)}x $ / kill`
            };
        }),
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
        tiers: buildProgressionTiers(10, (i) => {
            const energyPerKillMultiplier = round2(1 + ((i + 1) * 0.1));
            return {
                moneyCost: Math.floor(24 * Math.pow(1.42, i)),
                energyCost: Math.max(1, Math.floor(2 + (i * 0.6))),
                energyPerKillMultiplier,
                label: `${energyPerKillMultiplier.toFixed(2)}x EN / kill`
            };
        }),
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
        tiers: buildProgressionTiers(10, (i) => {
            const costReductionPct = Math.min(70, (i + 1) * 7);
            return {
                moneyCost: Math.floor(24 * Math.pow(1.44, i)),
                energyCost: Math.max(2, Math.floor(3 + (i * 0.7))),
                costReductionPct,
                label: `-${costReductionPct}% cost`
            };
        }),
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
        tiers: buildProgressionTiers(10, (i) => {
            const regenBonus = (i + 1) * 2;
            return {
                moneyCost: Math.floor(22 * Math.pow(1.43, i)),
                energyCost: Math.max(2, Math.floor(3 + (i * 0.7))),
                regenBonus,
                label: `+${regenBonus} EN / cycle`
            };
        }),
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
        tiers: buildProgressionTiers(10, (i) => {
            const fadeStrengthMultiplier = round2(Math.max(0.25, 0.95 - ((i + 1) * 0.06)));
            return {
                moneyCost: Math.floor(18 * Math.pow(1.4, i)),
                energyCost: Math.max(0, Math.floor(1 + (i * 0.6))),
                fadeStrengthMultiplier,
                label: `Longer guide ${i + 1}`
            };
        }),
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
    capacitorBank: {
        key: 'capacitorBank',
        name: 'Capacitor Bank',
        description: 'Increase maximum energy storage.',
        stackingMode: 'replace',
        tiers: buildProgressionTiers(10, (i) => {
            const maxEnergyBonus = (i + 1) * 10;
            return {
                moneyCost: Math.floor(16 * Math.pow(1.42, i)),
                energyCost: Math.max(1, Math.floor(2 + (i * 0.7))),
                maxEnergyBonus,
                label: `+EN CAP ${maxEnergyBonus}`
            };
        }),
        uiLabelForTier: (tier) => tier.label || `+EN CAP ${tier.maxEnergyBonus || 0}`,
        apply: ({ effects, tier }) => {
            effects.maxEnergyBonus = tier.maxEnergyBonus || 0;
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
        canPurchase: ({ game }) => game.missileEnergy < game.getMaxEnergy(),
        onPurchase: ({ game, tier }) => {
            game.missileEnergy = game.utils.clamp(
                game.missileEnergy + (tier.energyGain || 0),
                0,
                game.getMaxEnergy()
            );
        }
    }
};

const WaveFactory = (() => {
    if (typeof window !== 'undefined' && window.EarthGuardWaveFactory) {
        return window.EarthGuardWaveFactory;
    }
    if (typeof module !== 'undefined' && module.exports) {
        try {
            return require('./wave-factory.js');
        } catch {}
    }
    return {
        LevelDefinitions: {},
        getLevelDefinition: () => null,
        getWaveEnemyTemplates: () => [],
        getAlienSpeedForLevel: () => 0,
        getWaveSpec: ({ level, config }) => ({
            level,
            levelDef: null,
            enemies: [],
            alienCount: 0,
            speed: 0,
            activeTopY: config.ALIEN_ACTIVE_SPAWN_TOP_Y || (config.WORLD_HEIGHT - 5),
            maxSizeMultiplier: 1
        })
    };
})();
const EnemyFactory = (() => {
    if (typeof window !== 'undefined' && window.EarthGuardEnemyFactory) {
        return window.EarthGuardEnemyFactory;
    }
    if (typeof module !== 'undefined' && module.exports) {
        try {
            return require('./enemy-factory.js');
        } catch {}
    }
    return {
        createAliensFromWaveSpec: () => []
    };
})();
const MetaProgression = (() => {
    if (typeof window !== 'undefined' && window.EarthGuardMetaProgression) {
        return window.EarthGuardMetaProgression;
    }
    if (typeof module !== 'undefined' && module.exports) {
        try {
            return require('./meta-progression.js');
        } catch {}
    }
    return {
        getStorageKey: () => 'earthguard.meta.v1',
        getDefaultMetaProgress: () => ({
            schemaVersion: 1,
            totalRuns: 0,
            bestLevelReached: 0,
            metaCurrency: 0,
            metaUpgrades: {},
            bestMoneyByLevel: {},
            preferredJumpStartLevel: null,
            lastRun: null,
            runHistory: [],
            careerBest: { maxRunMoney: 0, maxKills: 0, maxCycles: 0, maxSalvageReward: 0 }
        }),
        loadMetaProgress: () => ({}),
        saveMetaProgress: () => false,
        shouldShowSplashOnBoot: () => false,
        applyRunResult: (_, runResult) => runResult,
        recordBestMoney: (metaProgress) => ({ changed: false, metaProgress }),
        getAvailableJumpStartLevels: () => [],
        getPreferredJumpStartLevel: () => null,
        setPreferredJumpStartLevel: (metaProgress) => metaProgress
    };
})();
const LevelDefinitions = WaveFactory.LevelDefinitions;

function buildMetaTiers(levels, factory) {
    return Array.from({ length: levels }, (_, i) => factory(i));
}

const MetaUpgradeDefinitions = {
    salvageYield: {
        key: 'salvageYield',
        name: 'Salvage Yield',
        description: 'Increase salvage earned at end of run.',
        tiers: buildMetaTiers(10, (i) => {
            const salvageMultiplier = round2(1 + ((i + 1) * 0.12));
            return {
                cost: Math.floor(8 * Math.pow(1.42, i)),
                salvageMultiplier,
                label: `+${Math.round((salvageMultiplier - 1) * 100)}% salvage`
            };
        })
    },
    startingReserve: {
        key: 'startingReserve',
        name: 'Starting Reserve',
        description: 'Begin new runs with extra cash and energy.',
        tiers: buildMetaTiers(10, (i) => {
            const startMoneyBonus = Math.floor(8 + ((i + 1) * 7));
            const startEnergyBonus = Math.floor(4 + ((i + 1) * 4));
            return {
                cost: Math.floor(10 * Math.pow(1.45, i)),
                startMoneyBonus,
                startEnergyBonus,
                label: `+$${startMoneyBonus} / +EN ${startEnergyBonus}`
            };
        })
    },
    salvageBank: {
        key: 'salvageBank',
        name: 'Salvage Bank',
        description: 'Gain flat salvage at end of every run.',
        tiers: buildMetaTiers(10, (i) => {
            const flatSalvageBonus = i + 1;
            return {
                cost: Math.floor(12 * Math.pow(1.48, i)),
                flatSalvageBonus,
                label: `+${flatSalvageBonus} salvage / run`
            };
        })
    },
    jumpBroker: {
        key: 'jumpBroker',
        name: 'Jump Broker',
        description: 'Increase cash retained when using jump start.',
        tiers: buildMetaTiers(10, (i) => {
            const jumpMoneyMultiplier = round2(1 + ((i + 1) * 0.08));
            return {
                cost: Math.floor(14 * Math.pow(1.5, i)),
                jumpMoneyMultiplier,
                label: `${jumpMoneyMultiplier.toFixed(2)}x jump $`
            };
        })
    },
    reactorBootstrap: {
        key: 'reactorBootstrap',
        name: 'Reactor Bootstrap',
        description: 'Start runs with additional energy reserve.',
        tiers: buildMetaTiers(10, (i) => {
            const startEnergyBonus = (i + 1) * 5;
            return {
                cost: Math.floor(9 * Math.pow(1.4, i)),
                startEnergyBonus,
                label: `+EN ${startEnergyBonus} start`
            };
        })
    },
    commandCredit: {
        key: 'commandCredit',
        name: 'Command Credit',
        description: 'Start runs with additional cash reserve.',
        tiers: buildMetaTiers(10, (i) => {
            const startMoneyBonus = (i + 1) * 10;
            return {
                cost: Math.floor(9 * Math.pow(1.42, i)),
                startMoneyBonus,
                label: `+$${startMoneyBonus} start`
            };
        })
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
        this.missileEnergy = this.getMaxEnergy();
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
        this.viewZoomTarget = this.config.DEFAULT_VIEW_ZOOM || 1;
        this.viewZoomStage = 0;
        this.bossesDefeatedThisRun = 0;
        this.stats = {
            missilesTargeted: 0,
            missilesLaunched: 0,
            kills: 0,
            exactHitKills: 0
        };
        this.isUpgradeMenuOpen = false;
        this.isMetaUpgradeModalOpen = false;
        this.isSplashOpen = true;
        this.isGameOver = false;
        this.isGameOverSummaryOpen = false;
        this.gameOverReason = '';
        this.gameOverAtMs = 0;
        this.gameOverContinueUnlockAtMs = 0;
        this.gameOverBreachAliens = [];
        this.metaProgress = this.loadMetaProgress();
        this.isSplashOpen = this.shouldShowSplashOnBoot();
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
        this.assistantCannons = [];
        this.assistantPendingMissiles = [];
        this.nextFxEventId = 1;

        // Callbacks
        this.onStateChange = null;

        // Initialize
        this.spawnWave();
        this.queueIncomingWavePreview(this.level + 1);
        this.refreshAssistantCannons();
        this.planAssistantTargetsForNextCycle();
        this.applyMetaStartBonuses();
        this.notify();
    }

    get WORLD_HEIGHT() { return this.config.WORLD_HEIGHT; }
    get WORLD_WIDTH() { return this.config.WORLD_WIDTH; }

    getMetaStorageKey() {
        return MetaProgression.getStorageKey();
    }

    getDefaultMetaProgress() {
        return MetaProgression.getDefaultMetaProgress();
    }

    loadMetaProgress() {
        return MetaProgression.loadMetaProgress(this.root);
    }

    shouldShowSplashOnBoot() {
        return MetaProgression.shouldShowSplashOnBoot(this.metaProgress);
    }

    saveMetaProgress() {
        return MetaProgression.saveMetaProgress(this.root, this.metaProgress);
    }

    updateMetaProgressFromRun() {
        const runMetaReward = this.getRunMetaCurrencyReward();
        this.metaProgress = MetaProgression.applyRunResult(this.metaProgress, {
            level: this.level || 0,
            totalCycles: this.totalCycles || 0,
            money: this.money || 0,
            kills: this.stats?.kills || 0,
            reason: this.gameOverReason || '',
            metaReward: runMetaReward
        });
        this.saveMetaProgress();
    }

    recordBestMoneyForLevel(level = this.level, money = this.money) {
        const result = MetaProgression.recordBestMoney(this.metaProgress, level, money);
        this.metaProgress = result.metaProgress;
        if (!result.changed) return false;
        this.saveMetaProgress();
        return true;
    }

    getAvailableJumpStartLevels() {
        return MetaProgression.getAvailableJumpStartLevels(this.metaProgress);
    }

    getHighestJumpStartLevel() {
        const options = this.getAvailableJumpStartLevels();
        return options.length ? options[options.length - 1] : null;
    }

    openSplash() {
        this.isSplashOpen = true;
        this.notify();
        return true;
    }

    closeSplash() {
        this.isSplashOpen = false;
        this.notify();
        return true;
    }

    openMetaUpgradeModal() {
        this.isMetaUpgradeModalOpen = true;
        this.notify();
        return true;
    }

    closeMetaUpgradeModal() {
        this.isMetaUpgradeModalOpen = false;
        this.notify();
        return true;
    }

    clearAllLocalData() {
        try {
            const storage = this.root?.localStorage;
            storage?.removeItem(this.getMetaStorageKey());
        } catch {}
        this.metaProgress = this.getDefaultMetaProgress();
        this.saveMetaProgress();
        this.reset();
        this.isSplashOpen = true;
        this.isMetaUpgradeModalOpen = false;
        this.notify();
        return true;
    }

    getPreferredJumpStartLevel() {
        return MetaProgression.getPreferredJumpStartLevel(this.metaProgress);
    }

    setPreferredJumpStartLevel(level) {
        this.metaProgress = MetaProgression.setPreferredJumpStartLevel(this.metaProgress, level);
        this.saveMetaProgress();
        return MetaProgression.getPreferredJumpStartLevel(this.metaProgress);
    }

    getJumpStartPreview(level) {
        const numericLevel = Math.floor(Number(level) || 0);
        const jump = this.getAvailableJumpStartLevels().find((entry) => entry.level === numericLevel);
        if (!jump) return null;
        const waveSpec = this.getWaveSpec(numericLevel);
        const startBonuses = this.getMetaStartBonuses();
        return {
            level: numericLevel,
            money: Math.floor(this.getJumpStartMoney(numericLevel, jump.money || 0)),
            energy: this.getMaxEnergy(),
            enemyCount: Math.floor(waveSpec.alienCount || 0),
            enemySpeed: +(waveSpec.speed || 0).toFixed(1),
            startBonusMoney: Math.floor(startBonuses.money || 0),
            startBonusEnergy: Math.floor(startBonuses.energy || 0)
        };
    }

    getJumpStartMoney(level, recordedMoney) {
        const baseMoney = Math.max(0, Math.floor(recordedMoney || 0));
        const jumpBrokerTierLevel = this.getMetaUpgradeLevel('jumpBroker');
        const jumpBrokerTier = MetaUpgradeDefinitions.jumpBroker.tiers[Math.max(0, jumpBrokerTierLevel - 1)];
        const jumpMoneyMultiplier = jumpBrokerTier?.jumpMoneyMultiplier || 1;
        return Math.floor(baseMoney * jumpMoneyMultiplier);
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

    getOrderedMetaUpgradeState() {
        return this.getMetaUpgradeState().slice().sort((a, b) => {
            const aMaxed = a.level >= a.maxLevel;
            const bMaxed = b.level >= b.maxLevel;
            if (aMaxed !== bMaxed) return aMaxed ? 1 : -1;

            const aCanBuy = !aMaxed && this.canPurchaseMetaUpgrade(a.key);
            const bCanBuy = !bMaxed && this.canPurchaseMetaUpgrade(b.key);
            if (aCanBuy !== bCanBuy) return aCanBuy ? -1 : 1;

            const aCost = Math.floor(a.nextTier?.cost || Number.MAX_SAFE_INTEGER);
            const bCost = Math.floor(b.nextTier?.cost || Number.MAX_SAFE_INTEGER);
            if (aCost !== bCost) return aCost - bCost;
            return (a.name || '').localeCompare(b.name || '');
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
        const flatSalvageTier = this.getMetaUpgradeLevel('salvageBank');
        const flatSalvageBonus = Math.floor(MetaUpgradeDefinitions.salvageBank.tiers[Math.max(0, flatSalvageTier - 1)]?.flatSalvageBonus || 0);
        return Math.max(1, Math.floor(base * salvageMultiplier) + flatSalvageBonus);
    }

    getMetaStartBonuses() {
        const reserveTierLevel = this.getMetaUpgradeLevel('startingReserve');
        const reserveTier = MetaUpgradeDefinitions.startingReserve.tiers[Math.max(0, reserveTierLevel - 1)];
        const reactorBootstrapTierLevel = this.getMetaUpgradeLevel('reactorBootstrap');
        const reactorBootstrapTier = MetaUpgradeDefinitions.reactorBootstrap.tiers[Math.max(0, reactorBootstrapTierLevel - 1)];
        const commandCreditTierLevel = this.getMetaUpgradeLevel('commandCredit');
        const commandCreditTier = MetaUpgradeDefinitions.commandCredit.tiers[Math.max(0, commandCreditTierLevel - 1)];
        return {
            money: Math.floor(reserveTier?.startMoneyBonus || 0) + Math.floor(commandCreditTier?.startMoneyBonus || 0),
            energy: Math.floor(reserveTier?.startEnergyBonus || 0) + Math.floor(reactorBootstrapTier?.startEnergyBonus || 0)
        };
    }

    applyMetaStartBonuses() {
        const bonuses = this.getMetaStartBonuses();
        if (bonuses.money > 0) {
            this.money += bonuses.money;
            this.recordBestMoneyForLevel(this.level, this.money);
        }
        if (bonuses.energy > 0) {
            this.missileEnergy = this.utils.clamp(this.missileEnergy + bonuses.energy, 0, this.getMaxEnergy());
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
            maxEnergyBonus: 0,
            trajectoryFadeStrengthMultiplier: 1,
            powerMemoryEnabled: false
        };
    }

    getMaxEnergy() {
        return Math.max(1, Math.floor((this.config.MISSILE_ENERGY_MAX || 0) + (this.upgradeEffects?.maxEnergyBonus || 0)));
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
        return WaveFactory.getWaveSpec({
            level,
            config: this.config,
            viewZoomStage: this.viewZoomStage || 0
        });
    }

    getLevelDefinition(level) {
        return WaveFactory.getLevelDefinition(level);
    }

    getWaveEnemyTemplates(level) {
        return WaveFactory.getWaveEnemyTemplates({
            level,
            viewZoomStage: this.viewZoomStage || 0
        });
    }

    getAlienSpeedForLevel(level) {
        return WaveFactory.getAlienSpeedForLevel(this.config, level, this.viewZoomStage || 0);
    }

    createAliensFromWaveSpec(spec, incoming = false) {
        return EnemyFactory.createAliensFromWaveSpec(spec, incoming, {
            config: this.config,
            utils: this.utils
        });
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

    getAssistantCannonCountForLevel(level = this.level) {
        const unlockLevel = this.config.ASSISTANT_CANNON_UNLOCK_LEVEL || 6;
        if (level < unlockLevel) return 0;
        if (level >= unlockLevel + 6) return Math.min(this.config.ASSISTANT_CANNON_MAX || 2, 2);
        return 1;
    }

    refreshAssistantCannons() {
        const count = this.getAssistantCannonCountForLevel(this.level);
        const existingById = new Map((this.assistantCannons || []).map((c) => [c.id, c]));
        const next = [];
        for (let i = 0; i < count; i++) {
            const id = `ac-${i}`;
            const lane = count === 1 ? 0.5 : ((i + 1) / (count + 1));
            const x = this.utils.clamp(this.config.WORLD_WIDTH * lane, 7, this.config.WORLD_WIDTH - 7);
            const existing = existingById.get(id);
            next.push({
                id,
                x,
                y: this.config.LAUNCHER_Y + 0.8,
                cooldownRemaining: existing ? Math.max(0, Math.floor(existing.cooldownRemaining || 0)) : 0
            });
        }
        this.assistantCannons = next;
        this.assistantPendingMissiles = [];
    }

    selectAssistantTarget() {
        if (!this.aliens.length) return null;
        const damageable = this.aliens.filter((a) => this.isAlienDamageable(a));
        if (!damageable.length) return null;
        const threatPool = damageable
            .slice()
            .sort((a, b) => a.y - b.y)
            .slice(0, Math.min(4, damageable.length));
        return threatPool[Math.floor(Math.random() * threatPool.length)] || threatPool[0];
    }

    planAssistantTargetsForNextCycle() {
        this.refreshAssistantCannons();
        if (!this.assistantCannons.length || this.isGameOver || this.isSplashOpen) return;
        const fireChance = this.config.ASSISTANT_CANNON_FIRE_CHANCE || 0.8;
        const cooldownMin = this.config.ASSISTANT_CANNON_COOLDOWN_MIN || 1;
        const cooldownMax = this.config.ASSISTANT_CANNON_COOLDOWN_MAX || cooldownMin;
        const radiusScale = this.config.ASSISTANT_CANNON_EXPLOSION_RADIUS_SCALE || 0.8;
        const planned = [];

        for (const cannon of this.assistantCannons) {
            cannon.cooldownRemaining = Math.max(0, Math.floor(cannon.cooldownRemaining || 0));
            if (cannon.cooldownRemaining > 0) {
                cannon.cooldownRemaining -= 1;
                continue;
            }
            if (Math.random() > fireChance) continue;
            const targetAlien = this.selectAssistantTarget();
            if (!targetAlien) continue;
            const spread = targetAlien.radius * 0.6;
            planned.push({
                startX: cannon.x,
                startY: cannon.y,
                targetX: this.utils.clamp(targetAlien.x + ((Math.random() - 0.5) * spread), 2, this.config.WORLD_WIDTH - 2),
                targetY: this.utils.clamp(targetAlien.y + ((Math.random() - 0.5) * spread), this.config.LAUNCHER_Y + 8, this.config.WORLD_HEIGHT - 2),
                lockedAtMs: Date.now(),
                explosionRadius: this.getCurrentExplosionRadius() * radiusScale,
                progress: 0,
                exploded: false,
                assistant: true
            });
            cannon.cooldownRemaining = cooldownMin + Math.floor(Math.random() * ((cooldownMax - cooldownMin) + 1));
        }
        this.assistantPendingMissiles = planned;
    }

    getAssistantPlannedTargets() {
        return (this.assistantPendingMissiles || []).map((m) => ({
            startX: m.startX,
            startY: m.startY,
            targetX: m.targetX,
            targetY: m.targetY,
            radius: m.explosionRadius
        }));
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
        this.pushFxEvent('waveClearFxEvents', {
            id: this.nextFxEventId++,
            title,
            subtitle,
            maxAge
        }, 20);
    }

    pushFxEvent(queueName, event, maxSize = 100) {
        const queue = this[queueName];
        if (!Array.isArray(queue)) return;
        queue.push(event);
        while (queue.length > maxSize) {
            queue.shift();
        }
    }

    // Angle: 0 = up, negative = left, positive = right
    rotateLeft(degrees) {
        if (this.isGameOver || this.isSplashOpen) return;
        this.launcherAngle = this.utils.clamp(this.launcherAngle - degrees, this.config.MIN_ANGLE, this.config.MAX_ANGLE);
        this.notify();
    }

    rotateRight(degrees) {
        if (this.isGameOver || this.isSplashOpen) return;
        this.launcherAngle = this.utils.clamp(this.launcherAngle + degrees, this.config.MIN_ANGLE, this.config.MAX_ANGLE);
        this.notify();
    }

    canCharge() {
        return !this.isAnimating &&
               !this.isSplashOpen &&
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
            this.missileEnergy = this.utils.clamp(this.missileEnergy - energyCost, 0, this.getMaxEnergy());
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
        if (this.isSplashOpen) return false;
        if (!this.canPurchaseUpgrade(key)) return false;
        const upgrade = this.upgrades[key];
        const nextTier = this.getNextUpgradeTier(key);
        this.money -= nextTier.moneyCost;
        this.missileEnergy = this.utils.clamp(
            this.missileEnergy - nextTier.energyCost,
            0,
            this.getMaxEnergy()
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
        if (this.isAnimating || this.isGameOver || this.isSplashOpen) return;
        this.beginAdvanceCycle();

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
            this.advanceAlien(alien, totalFrames, 1);
        }
        for (const alien of this.incomingAliens) {
            this.advanceAlien(alien, totalFrames, 0.55);
        }

        for (const explosion of this.explosions) {
            explosion.age++;
        }
    }

    advanceScoutZigZag(alien, totalFrames, speedScale = 1) {
        const step = (((alien.zigzagDir || 1) * (alien.zigzagSpeedX || 4.4)) * speedScale) / totalFrames;
        alien.x += step;
        alien.zigzagRunRemaining = (alien.zigzagRunRemaining ?? (3 + Math.random() * 3.5)) - Math.abs(step);
        if (alien.zigzagRunRemaining <= 0) {
            alien.zigzagDir = (alien.zigzagDir || 1) * -1;
            alien.zigzagRunRemaining = 2.6 + (Math.random() * 4.4);
        }

        const edgePad = 4 + (alien.radius || 0);
        if (alien.x <= edgePad) {
            alien.x = edgePad;
            alien.zigzagDir = 1;
            alien.zigzagRunRemaining = 2 + (Math.random() * 3);
        } else if (alien.x >= (this.config.WORLD_WIDTH - edgePad)) {
            alien.x = this.config.WORLD_WIDTH - edgePad;
            alien.zigzagDir = -1;
            alien.zigzagRunRemaining = 2 + (Math.random() * 3);
        }
    }

    advanceBossDrift(alien, speedScale = 1) {
        alien.bossPhase = (alien.bossPhase || 0) + ((alien.bossDriftSpeed || 0.05) * speedScale);
        const centerX = this.config.WORLD_WIDTH / 2;
        alien.x = this.utils.clamp(
            centerX + Math.sin(alien.bossPhase) * (alien.bossDriftAmplitude || 6),
            8 + (alien.radius || 0),
            this.config.WORLD_WIDTH - 8 - (alien.radius || 0)
        );
    }

    advanceAlien(alien, totalFrames, movementScale = 1) {
        alien.y -= (alien.speed * movementScale) / totalFrames;
        const handlers = {
            scout: () => this.advanceScoutZigZag(alien, totalFrames, movementScale >= 1 ? 1 : 0.65),
            boss: () => this.advanceBossDrift(alien, movementScale)
        };
        const handler = handlers[alien.type];
        if (handler) handler();
    }

    advanceImmediate() {
        if (this.isAnimating || this.isGameOver) return false;
        this.beginAdvanceCycle();

        this.isAnimating = true;
        const totalFrames = Math.max(1, this.config.ANIMATION_FRAMES || 1);
        for (let frame = 0; frame < totalFrames; frame++) {
            this.runAdvanceAnimationFrame(totalFrames);
        }
        this.finishTurn();
        return true;
    }

    beginAdvanceCycle() {
        // Move pending missiles to active at the configured visible launch progress.
        const launchStartProgress = this.config.MISSILE_LAUNCH_START_PROGRESS || 0;
        const pendingCount = this.pendingMissiles.length;
        this.missilesLaunchedThisCycle = pendingCount;
        this.stats.missilesLaunched += pendingCount;
        this.missiles.push(...this.pendingMissiles.map((missile) => ({
            ...missile,
            progress: Math.max(missile.progress || 0, launchStartProgress)
        })));
        this.missiles.push(...(this.assistantPendingMissiles || []).map((missile) => ({
            ...missile,
            progress: Math.max(missile.progress || 0, launchStartProgress)
        })));
        this.pendingMissiles = [];
        this.assistantPendingMissiles = [];
        this.missilesLockedThisTurn = 0;
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
        this.pushFxEvent('enemyDeathFxEvents', {
            id: this.nextFxEventId++,
            x: alien.x,
            y: alien.y,
            radius: alien.radius * (exactHit ? 1.6 : 1.2),
            exactHit
        }, 100);
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
        const nowMs = Date.now();
        const breachAliens = (this.aliens || [])
            .filter((a) => this.alienTouchesEarthLine(a))
            .map((a) => ({ x: a.x, y: a.y, radius: a.radius, type: a.type || 'saucer' }));
        this.isAnimating = false;
        this.isCharging = false;
        this.power = 0;
        this.isUpgradeMenuOpen = false;
        this.isGameOver = true;
        this.isGameOverSummaryOpen = false;
        this.gameOverReason = reason;
        this.gameOverAtMs = nowMs;
        this.gameOverContinueUnlockAtMs = nowMs + 700;
        this.gameOverBreachAliens = breachAliens;
        this.updateMetaProgressFromRun();
        this.notify();
    }

    openGameOverSummary() {
        if (!this.isGameOver) return false;
        if (Date.now() < (this.gameOverContinueUnlockAtMs || 0)) return false;
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
                this.getMaxEnergy()
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

        // End of cycle state updates
        this.isAnimating = false;
        const regenMultiplier = this.missilesLaunchedThisCycle === 0 ? 2 : 1;
        this.missileEnergy = this.utils.clamp(
            this.missileEnergy + (this.getEnergyRegenPerTurn() * regenMultiplier),
            0,
            this.getMaxEnergy()
        );
        this.missilesLaunchedThisCycle = 0;
        this.planAssistantTargetsForNextCycle();

        if (!this.isGameOver && this.hasInevitableEarthBreach()) {
            this.emitStatusFx('AUTO-CYCLED', 'BREACH INEVITABLE', 60);
            if (this.instantAutoCycle) {
                this.advanceImmediate();
                return;
            }
            setTimeout(() => this.advance(), 80);
            this.notify();
            return;
        }

        this.notify();
    }

    idleCycle() {
        if (this.isAnimating || this.isGameOver || this.isSplashOpen) return false;
        if (this.pendingMissiles.length > 0) return false;
        this.advance();
        return true;
    }

    startJumpRun(level) {
        const jump = this.getAvailableJumpStartLevels().find((entry) => entry.level === Math.floor(Number(level)));
        if (!jump) return false;
        this.reset();
        this.isSplashOpen = false;
        this.level = Math.max(1, jump.level);
        this.money = this.getJumpStartMoney(this.level, jump.money || 0);
        this.missileEnergy = this.getMaxEnergy();
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
        this.refreshAssistantCannons();
        this.planAssistantTargetsForNextCycle();
        this.notify();
        return true;
    }

    startHighestJumpRun() {
        const highest = this.getHighestJumpStartLevel();
        if (!highest) return false;
        return this.startJumpRun(highest.level);
    }

    reset() {
        this.level = 1;
        this.baseHP = this.config.STARTING_HP;
        this.launcherAngle = this.config.START_ANGLE;
        this.power = 0;
        this.missilesLockedThisTurn = 0;
        this.missileEnergy = this.getMaxEnergy();
        this.missilesLaunchedThisCycle = 0;
        this.lastLockedPower = 0;
        this.money = 0;
        this.levelCycles = 0;
        this.totalCycles = 0;
        this.lastWaveClearBonus = 0;
        this.lastWaveClearEnergyBonus = 0;
        this.viewZoomTarget = this.config.DEFAULT_VIEW_ZOOM || 1;
        this.viewZoomStage = 0;
        this.bossesDefeatedThisRun = 0;
        this.stats = {
            missilesTargeted: 0,
            missilesLaunched: 0,
            kills: 0,
            exactHitKills: 0
        };
        this.isUpgradeMenuOpen = false;
        this.isMetaUpgradeModalOpen = false;
        this.isSplashOpen = false;
        this.isGameOver = false;
        this.isGameOverSummaryOpen = false;
        this.gameOverReason = '';
        this.gameOverAtMs = 0;
        this.gameOverContinueUnlockAtMs = 0;
        this.gameOverBreachAliens = [];
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
        this.assistantCannons = [];
        this.assistantPendingMissiles = [];
        this.spawnWave();
        this.queueIncomingWavePreview(this.level + 1);
        this.refreshAssistantCannons();
        this.planAssistantTargetsForNextCycle();
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
                        this.getMaxEnergy()
                    );
                    if (alien.type === 'boss') {
                        this.handleBossDefeat(alien, exactHit);
                    }
                    this.queueEnemyDeathFx(alien, exactHit);
                }
            }
        }
        this.aliens = this.aliens.filter(a => a.hp > 0);
    }

    notify() {
        if (this.onStateChange) this.onStateChange();
    }

    handleBossDefeat(alien, exactHit = false) {
        this.bossesDefeatedThisRun = (this.bossesDefeatedThisRun || 0) + 1;
        this.viewZoomStage = (this.viewZoomStage || 0) + 1;
        const stageBaseTarget = this.config.POST_BOSS_ZOOM_OUT || 0.88;
        const stageStep = this.config.POST_BOSS_ZOOM_STEP || 0.08;
        const stageMin = this.config.POST_BOSS_ZOOM_MIN || 0.72;
        const zoomOutTarget = Math.max(stageMin, stageBaseTarget - ((this.viewZoomStage - 1) * stageStep));
        this.viewZoomTarget = Math.min(this.viewZoomTarget || 1, zoomOutTarget);
        this.emitStatusFx(
            'BOSS DESTROYED',
            exactHit ? 'EXACT HIT | SECTOR EXPANDING' : 'SECTOR EXPANDING',
            165
        );
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
            isSplashOpen: this.isSplashOpen,
            isMetaUpgradeModalOpen: this.isMetaUpgradeModalOpen,
            isGameOver: this.isGameOver,
            isGameOverSummaryOpen: this.isGameOverSummaryOpen,
            gameOverReason: this.gameOverReason,
            gameOverAtMs: this.gameOverAtMs || 0,
            gameOverContinueUnlockAtMs: this.gameOverContinueUnlockAtMs || 0,
            gameOverBreachAliens: (this.gameOverBreachAliens || []).map((a) => ({ ...a })),
            levelCycles: this.levelCycles,
            totalCycles: this.totalCycles,
            lastWaveClearBonus: this.lastWaveClearBonus,
            lastWaveClearEnergyBonus: this.lastWaveClearEnergyBonus,
            stats: { ...this.stats },
            missilesLocked: this.missilesLockedThisTurn,
            missilesPerTurn: this.getMissilesPerTurn(),
            missilesInFlight: this.missiles.length,
            assistantCannonCount: (this.assistantCannons || []).length,
            assistantPlannedShots: (this.assistantPendingMissiles || []).length,
            viewZoomTarget: this.viewZoomTarget,
            viewZoomStage: this.viewZoomStage || 0,
            bossesDefeatedThisRun: this.bossesDefeatedThisRun || 0,
            blastResidue: this.blastResidue.length,
            isAnimating: this.isAnimating,
            aliens: this.aliens.map(a => ({ x: +a.x.toFixed(1), y: +a.y.toFixed(1) })),
            incomingAliens: this.incomingAliens.map(a => ({ x: +a.x.toFixed(1), y: +a.y.toFixed(1) })),
            assistantCannons: (this.assistantCannons || []).map((c) => ({ id: c.id, x: +c.x.toFixed(1), y: +c.y.toFixed(1), cooldown: c.cooldownRemaining || 0 })),
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
