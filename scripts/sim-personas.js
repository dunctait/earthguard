const PERSONAS = {
    perfect: {
        name: 'perfect',
        description: 'High-accuracy player, upgrades efficiently, almost never misses.',
        missChance: 0.02,
        angleJitterDeg: 0.7,
        powerJitterPct: 2.5,
        exactAimBias: 0.98,
        upgradePriority: ['autoCycle', 'blastRadius', 'missileRacks', 'energyEfficiency', 'energyHarvest', 'reactorRegen', 'bountyLink', 'energyResupply', 'trajectoryProcessor', 'targetAreas'],
        criteria: {
            designIntent: 'Skilled players who engage with upgrades should survive meaningfully longer than average and usually reach mid-game.',
            aggregate: {
                avgFinalLevel: { min: 5, max: 8 },
                avgFinalCycles: { min: 10, max: 28 },
                gameOverRate: { min: 0.95, max: 1.0 }
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
        upgradePriority: ['autoCycle', 'energyResupply', 'blastRadius', 'reactorRegen', 'energyEfficiency', 'missileRacks', 'energyHarvest', 'bountyLink', 'trajectoryProcessor', 'targetAreas'],
        criteria: {
            designIntent: 'Typical engaged player should reach early-mid game, benefit from upgrades, but still lose consistently.',
            aggregate: {
                avgFinalLevel: { min: 4, max: 7 },
                avgFinalCycles: { min: 8, max: 24 },
                gameOverRate: { min: 0.95, max: 1.0 }
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
        upgradePriority: [],
        criteria: {
            designIntent: 'Baseline: no-upgrade players should die early enough to motivate upgrades.',
            aggregate: {
                avgFinalLevel: { min: 3, max: 5 },
                avgFinalCycles: { min: 8, max: 18 },
                gameOverRate: { min: 0.95, max: 1.0 }
            },
            run: {
                maxFinalLevel: { max: 6 }
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
        upgradePriority: ['autoCycle', 'bountyLink', 'energyResupply'],
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
        upgradePriority: ['autoCycle', 'energyResupply', 'energyHarvest', 'reactorRegen', 'energyEfficiency'],
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
        upgradePriority: ['autoCycle', 'bountyLink', 'energyHarvest', 'energyEfficiency', 'reactorRegen', 'missileRacks', 'blastRadius', 'trajectoryProcessor', 'targetAreas'],
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
        upgradePriority: ['autoCycle', 'energyResupply', 'reactorRegen', 'trajectoryProcessor', 'blastRadius'],
        criteria: {
            designIntent: 'Low-skill players should usually die very early, but still experience upgrade prompts.',
            aggregate: {
                avgFinalLevel: { max: 4 },
                avgFinalCycles: { max: 14 },
                gameOverRate: { min: 0.95, max: 1.0 }
            }
        }
    }
};

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
