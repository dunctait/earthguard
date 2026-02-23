const PERSONAS = {
    perfect: {
        name: 'perfect',
        description: 'High-accuracy player, upgrades efficiently, almost never misses.',
        missChance: 0.02,
        angleJitterDeg: 0.7,
        powerJitterPct: 2.5,
        exactAimBias: 0.98,
        upgradePriority: ['autoCycle', 'energyHarvest', 'energyEfficiency', 'reactorRegen', 'missileRacks', 'bountyLink', 'blastRadius', 'trajectoryProcessor', 'targetAreas', 'energyResupply']
    },
    good: {
        name: 'good',
        description: 'Competent but imperfect; misses sometimes and buys upgrades reasonably.',
        missChance: 0.22,
        angleJitterDeg: 3.5,
        powerJitterPct: 10,
        exactAimBias: 0.55,
        upgradePriority: ['autoCycle', 'energyResupply', 'reactorRegen', 'energyEfficiency', 'energyHarvest', 'missileRacks', 'bountyLink', 'blastRadius', 'trajectoryProcessor', 'targetAreas']
    },
    noUpgrades: {
        name: 'noUpgrades',
        description: 'Never buys upgrades; useful as a baseline.',
        missChance: 0.20,
        angleJitterDeg: 4.0,
        powerJitterPct: 11,
        exactAimBias: 0.45,
        upgradePriority: []
    },
    bountyOnly: {
        name: 'bountyOnly',
        description: 'Focuses on cash multiplier and only buys utility when cheap.',
        missChance: 0.18,
        angleJitterDeg: 3.0,
        powerJitterPct: 8,
        exactAimBias: 0.6,
        upgradePriority: ['autoCycle', 'bountyLink', 'energyResupply']
    },
    energyOnly: {
        name: 'energyOnly',
        description: 'Prioritizes energy economy upgrades almost exclusively.',
        missChance: 0.20,
        angleJitterDeg: 3.2,
        powerJitterPct: 9,
        exactAimBias: 0.55,
        upgradePriority: ['autoCycle', 'energyResupply', 'energyHarvest', 'reactorRegen', 'energyEfficiency']
    },
    exactHit: {
        name: 'exactHit',
        description: 'Very accurate player used to stress-test reward scaling.',
        missChance: 0.01,
        angleJitterDeg: 0.4,
        powerJitterPct: 1.4,
        exactAimBias: 0.995,
        upgradePriority: ['autoCycle', 'bountyLink', 'energyHarvest', 'energyEfficiency', 'reactorRegen', 'missileRacks', 'blastRadius', 'trajectoryProcessor', 'targetAreas']
    },
    missesTwoThirds: {
        name: 'missesTwoThirds',
        description: 'Low-skill persona that misses roughly two thirds of shots.',
        missChance: 0.66,
        angleJitterDeg: 7.5,
        powerJitterPct: 18,
        exactAimBias: 0.15,
        upgradePriority: ['autoCycle', 'energyResupply', 'reactorRegen', 'trajectoryProcessor', 'blastRadius']
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
