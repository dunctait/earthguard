const PERSONAS = {
    perfect: {
        name: 'perfect',
        description: 'High-accuracy player, upgrades efficiently, almost never misses.',
        missChance: 0.02,
        angleJitterDeg: 0.7,
        powerJitterPct: 2.5,
        exactAimBias: 0.98,
        jumpStrategy: 'highest',
        metaUpgradePriority: ['startingReserve', 'reactorBootstrap', 'jumpBroker', 'salvageYield', 'salvageBank', 'commandCredit'],
        upgradePriority: ['autoCycle', 'powerMemory', 'blastRadius', 'missileRacks', 'energyEfficiency', 'energyHarvest', 'reactorRegen', 'bountyLink', 'energyResupply', 'trajectoryProcessor', 'targetAreas'],
        criteria: {
            designIntent: 'Skilled players who engage with upgrades should survive meaningfully longer than average and usually reach mid-game.',
            aggregate: {
                avgFinalLevel: { min: 5, max: 8 },
                avgFinalCycles: { min: 10, max: 28 },
                gameOverRate: { min: 0.95, max: 1.0 }
            }
        },
        campaignCriteria: {
            designIntent: 'Perfect player should leverage jumps/meta to reach materially higher levels over multi-run campaigns.',
            aggregate: {
                avgBestLevel: { min: 6.5 },
                avgFinalRunLevel: { min: 6.2 },
                avgFinalMetaCurrency: { min: 10 }
            }
        }
    },
    good: {
        name: 'good',
        description: 'Competent but imperfect; misses sometimes and buys upgrades reasonably.',
        missChance: 0.22,
        angleJitterDeg: 3.5,
        powerJitterPct: 10,
        exactAimBias: 0.55,
        jumpStrategy: 'highest',
        metaUpgradePriority: ['startingReserve', 'reactorBootstrap', 'jumpBroker', 'salvageYield', 'salvageBank', 'commandCredit'],
        upgradePriority: ['autoCycle', 'powerMemory', 'energyResupply', 'blastRadius', 'reactorRegen', 'energyEfficiency', 'missileRacks', 'energyHarvest', 'bountyLink', 'trajectoryProcessor', 'targetAreas'],
        criteria: {
            designIntent: 'Typical engaged player should reach early-mid game, benefit from upgrades, but still lose consistently.',
            aggregate: {
                avgFinalLevel: { min: 5, max: 8.5 },
                avgFinalCycles: { min: 10, max: 32 },
                gameOverRate: { min: 0.95, max: 1.0 }
            }
        },
        campaignCriteria: {
            designIntent: 'Good player should show clear progression across runs via salvage/meta and jump starts.',
            aggregate: {
                avgBestLevel: { min: 7 },
                avgFinalRunLevel: { min: 6.5 },
                avgFinalMetaCurrency: { min: 8 }
            }
        }
    },
    noUpgrades: {
        name: 'noUpgrades',
        description: 'Never buys upgrades; useful as a baseline.',
        missChance: 0.20,
        angleJitterDeg: 4.0,
        powerJitterPct: 11,
        exactAimBias: 0.45,
        jumpStrategy: 'highest',
        metaUpgradePriority: ['startingReserve', 'jumpBroker', 'salvageYield', 'salvageBank'],
        upgradeStrategy: 'none',
        upgradePriority: [],
        criteria: {
            designIntent: 'Baseline: no-upgrade players should die early enough to motivate upgrades.',
            aggregate: {
                avgFinalLevel: { min: 3, max: 5.5 },
                avgFinalCycles: { min: 8, max: 18 },
                gameOverRate: { min: 0.95, max: 1.0 }
            },
            run: {
                maxFinalLevel: { max: 7 }
            }
        },
        campaignCriteria: {
            designIntent: 'No-upgrade campaign should still benefit from jump starts and meta economy, but trail good/perfect.',
            aggregate: {
                avgBestLevel: { min: 6, max: 10 },
                avgFinalRunLevel: { min: 4.5 }
            }
        }
    },
    perfectNoUpgrades: {
        name: 'perfectNoUpgrades',
        description: 'Perfect-ish aim but never upgrades; verifies skill alone does not break progression.',
        missChance: 0.01,
        angleJitterDeg: 0.4,
        powerJitterPct: 1.4,
        exactAimBias: 0.995,
        upgradeStrategy: 'none',
        upgradePriority: [],
        criteria: {
            designIntent: 'Even near-perfect aim without upgrades should still hit a fairly early game over.',
            aggregate: {
                avgFinalLevel: { min: 4, max: 6 },
                avgFinalCycles: { min: 8, max: 18 },
                gameOverRate: { min: 0.95, max: 1.0 }
            },
            run: {
                maxFinalLevel: { max: 7 }
            }
        }
    },
    bountyOnly: {
        name: 'bountyOnly',
        description: 'Focuses on cash multiplier and only buys utility when cheap.',
        missChance: 0.18,
        angleJitterDeg: 3.0,
        powerJitterPct: 8,
        exactAimBias: 0.6,
        upgradePriority: ['autoCycle', 'powerMemory', 'bountyLink', 'energyResupply'],
        criteria: {
            designIntent: 'Cash-focused path should improve money accumulation, but not necessarily survival.',
            aggregate: {
                avgFinalMoney: { min: 20 },
                gameOverRate: { min: 0.95, max: 1.0 }
            }
        }
    },
    energyOnly: {
        name: 'energyOnly',
        description: 'Prioritizes energy economy upgrades almost exclusively.',
        missChance: 0.20,
        angleJitterDeg: 3.2,
        powerJitterPct: 9,
        exactAimBias: 0.55,
        upgradePriority: ['autoCycle', 'powerMemory', 'energyResupply', 'energyHarvest', 'reactorRegen', 'energyEfficiency'],
        criteria: {
            designIntent: 'Energy-focused path should preserve higher ending energy than no-upgrade baseline.',
            aggregate: {
                avgFinalEnergy: { min: 20 },
                gameOverRate: { min: 0.95, max: 1.0 }
            }
        }
    },
    exactHit: {
        name: 'exactHit',
        description: 'Very accurate player used to stress-test reward scaling.',
        missChance: 0.01,
        angleJitterDeg: 0.4,
        powerJitterPct: 1.4,
        exactAimBias: 0.995,
        upgradePriority: ['autoCycle', 'powerMemory', 'bountyLink', 'energyHarvest', 'energyEfficiency', 'reactorRegen', 'missileRacks', 'blastRadius', 'trajectoryProcessor', 'targetAreas'],
        criteria: {
            designIntent: 'Exact-hit farming should increase money strongly but still not guarantee deep runs.',
            aggregate: {
                avgFinalMoney: { min: 30 },
                avgFinalLevel: { min: 4 }
            }
        }
    },
    missesTwoThirds: {
        name: 'missesTwoThirds',
        description: 'Low-skill persona that misses roughly two thirds of shots.',
        missChance: 0.66,
        angleJitterDeg: 7.5,
        powerJitterPct: 18,
        exactAimBias: 0.15,
        upgradePriority: ['autoCycle', 'powerMemory', 'energyResupply', 'reactorRegen', 'trajectoryProcessor', 'blastRadius'],
        criteria: {
            designIntent: 'Low-skill players should usually die very early, but still experience upgrade prompts.',
            aggregate: {
                avgFinalLevel: { max: 4 },
                avgFinalCycles: { max: 18 },
                gameOverRate: { min: 0.95, max: 1.0 }
            }
        }
    },
    cashFocus: {
        name: 'cashFocus',
        description: 'Explicit cash-upgrade persona for balancing reward scaling.',
        missChance: 0.17,
        angleJitterDeg: 2.8,
        powerJitterPct: 7.5,
        exactAimBias: 0.62,
        upgradePriority: ['autoCycle', 'powerMemory', 'bountyLink', 'targetAreas', 'trajectoryProcessor', 'energyResupply', 'blastRadius'],
        criteria: {
            designIntent: 'Cash-focused players should end with more money than generalist good players on average.',
            aggregate: {
                avgFinalMoney: { min: 20 }
            }
        }
    },
    '75_cheapestUpgrades': {
        name: '75_cheapestUpgrades',
        description: 'Average-ish player (~75% hit) who buys the cheapest available upgrade immediately.',
        missChance: 0.25,
        angleJitterDeg: 3.8,
        powerJitterPct: 10.5,
        exactAimBias: 0.5,
        upgradeStrategy: 'cheapest'
    },
    '90_noUpgrades': {
        name: '90_noUpgrades',
        description: 'High-accuracy player (~90% hit) who never upgrades.',
        missChance: 0.10,
        angleJitterDeg: 1.6,
        powerJitterPct: 4.8,
        exactAimBias: 0.82,
        upgradeStrategy: 'none'
    },
    '90_cheapestUpgrades': {
        name: '90_cheapestUpgrades',
        description: 'High-accuracy player (~90% hit) who buys cheapest upgrades first.',
        missChance: 0.10,
        angleJitterDeg: 1.8,
        powerJitterPct: 5.2,
        exactAimBias: 0.8,
        upgradeStrategy: 'cheapest'
    },
    '90_prioritiseMoney': {
        name: '90_prioritiseMoney',
        description: 'High-accuracy player who prioritises cash generation upgrades.',
        missChance: 0.10,
        angleJitterDeg: 1.8,
        powerJitterPct: 5.2,
        exactAimBias: 0.8,
        upgradeStrategy: 'priorityThenCheapest',
        upgradePriority: ['autoCycle', 'powerMemory', 'bountyLink', 'targetAreas', 'trajectoryProcessor', 'blastRadius', 'missileRacks', 'energyResupply']
    },
    '60_prioritiseEnergy': {
        name: '60_prioritiseEnergy',
        description: 'Lower-skill player (~60% hit) who prioritises energy economy upgrades.',
        missChance: 0.40,
        angleJitterDeg: 5.2,
        powerJitterPct: 13.5,
        exactAimBias: 0.35,
        upgradeStrategy: 'priorityThenCheapest',
        upgradePriority: ['autoCycle', 'powerMemory', 'energyResupply', 'energyHarvest', 'reactorRegen', 'energyEfficiency', 'trajectoryProcessor']
    },
    energyFocus: {
        name: 'energyFocus',
        description: 'Explicit energy-upgrade persona for balancing reactor/harvest/cost upgrades.',
        missChance: 0.19,
        angleJitterDeg: 3.0,
        powerJitterPct: 8.5,
        exactAimBias: 0.58,
        upgradePriority: ['autoCycle', 'powerMemory', 'energyResupply', 'energyHarvest', 'reactorRegen', 'energyEfficiency', 'trajectoryProcessor'],
        criteria: {
            designIntent: 'Energy-focused players should preserve substantial energy by game end.',
            aggregate: {
                avgFinalEnergy: { min: 25 }
            }
        }
    }
};

function lerp(a, b, t) {
    return a + ((b - a) * t);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function buildAccuracyProfile(accuracyPct) {
    const a = clamp(Number(accuracyPct) || 50, 1, 99);
    const t = (a - 50) / 40; // map 50..90 -> 0..1
    return {
        missChance: +(1 - (a / 100)).toFixed(3),
        angleJitterDeg: +lerp(6.0, 1.6, clamp(t, 0, 1)).toFixed(2),
        powerJitterPct: +lerp(15.0, 5.0, clamp(t, 0, 1)).toFixed(2),
        exactAimBias: +lerp(0.28, 0.82, clamp(t, 0, 1)).toFixed(3)
    };
}

const MATRIX_STRATEGIES = {
    noUpgrades: {
        upgradeStrategy: 'none',
        upgradePriority: []
    },
    cheapestUpgrade: {
        upgradeStrategy: 'cheapest',
        upgradePriority: []
    },
    cheapestCombatUpgrade: {
        upgradeStrategy: 'cheapestCombat',
        upgradePriority: []
    },
    prioritiseMoney: {
        upgradeStrategy: 'priorityThenCheapest',
        upgradePriority: ['autoCycle', 'powerMemory', 'bountyLink', 'targetAreas', 'trajectoryProcessor', 'blastRadius', 'missileRacks', 'energyResupply']
    },
    prioritiseEnergy: {
        upgradeStrategy: 'priorityThenCheapest',
        upgradePriority: ['autoCycle', 'powerMemory', 'energyResupply', 'energyHarvest', 'reactorRegen', 'energyEfficiency', 'trajectoryProcessor']
    }
};

const MATRIX_PERSONA_CRITERIA = {
    '90acc_cheapestCombatUpgrade_1xBanked': {
        designIntent: 'Simple combat-first upgrader at high accuracy should outperform no-upgrade baseline and usually reach mid-game.',
        aggregate: {
            avgFinalLevel: { min: 5.0, max: 8.5 },
            avgFinalCycles: { min: 10, max: 28 },
            gameOverRate: { min: 0.95, max: 1.0 }
        }
    },
    '75acc_cheapestCombatUpgrade_1xBanked': {
        designIntent: 'Average-accuracy combat-first upgrader should reach early-mid game while still dying consistently.',
        aggregate: {
            avgFinalLevel: { min: 5.0, max: 8.5 },
            avgFinalCycles: { min: 10, max: 32 },
            gameOverRate: { min: 0.95, max: 1.0 }
        }
    },
    '90acc_cheapestCombatUpgrade_2xBanked': {
        designIntent: 'Banked high-accuracy combat upgrader should remain viable and roughly track the 1x variant.',
        aggregate: {
            avgFinalLevel: { min: 4.8, max: 8.3 },
            avgFinalCycles: { min: 10, max: 28 },
            gameOverRate: { min: 0.95, max: 1.0 }
        }
    },
    '75acc_cheapestCombatUpgrade_2xBanked': {
        designIntent: 'Banked average-accuracy combat upgrader should still outperform low-skill baselines while dying consistently.',
        aggregate: {
            avgFinalLevel: { min: 4.5, max: 8.0 },
            avgFinalCycles: { min: 10, max: 30 },
            gameOverRate: { min: 0.95, max: 1.0 }
        }
    }
};

function addMatrixPersonas() {
    const accuracies = [50, 60, 75, 90];
    const bankMultipliers = [1, 2];
    for (const acc of accuracies) {
        const accuracyProfile = buildAccuracyProfile(acc);
        for (const [strategyName, strategy] of Object.entries(MATRIX_STRATEGIES)) {
            for (const bankMultiplier of bankMultipliers) {
                const name = `${acc}acc_${strategyName}_${bankMultiplier}xBanked`;
                if (PERSONAS[name]) continue;
                PERSONAS[name] = {
                    name,
                    description: `${acc}% hit-target persona using ${strategyName} strategy with ${bankMultiplier}x resource bank threshold before upgrades.`,
                    ...accuracyProfile,
                    ...strategy,
                    bankMultiplier,
                    ...(MATRIX_PERSONA_CRITERIA[name] ? { criteria: MATRIX_PERSONA_CRITERIA[name] } : {})
                };
            }
        }
    }
}

addMatrixPersonas();

function getPersona(name) {
    return PERSONAS[name] || null;
}

function listPersonaNames() {
    return Object.keys(PERSONAS);
}

module.exports = {
    PERSONAS,
    getPersona,
    listPersonaNames
};
