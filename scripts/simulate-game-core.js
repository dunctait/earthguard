const { Game } = require('../src/game.js');
const { getPersona, listPersonaNames } = require('./sim-personas.js');

function parseArgs(argv) {
    const args = {
        persona: 'good',
        runs: 1,
        seed: 1337,
        maxTurns: 500,
        verbose: true
    };
    for (const arg of argv) {
        if (arg.startsWith('--persona=')) args.persona = arg.split('=')[1];
        else if (arg.startsWith('--runs=')) args.runs = Number(arg.split('=')[1]);
        else if (arg.startsWith('--seed=')) args.seed = Number(arg.split('=')[1]);
        else if (arg.startsWith('--max-turns=')) args.maxTurns = Number(arg.split('=')[1]);
        else if (arg === '--quiet') args.verbose = false;
    }
    return args;
}

function makeMulberry32(seed) {
    let t = seed >>> 0;
    return function rng() {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function avg(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function withSeededMathRandom(seed, fn) {
    const prev = Math.random;
    const rng = makeMulberry32(seed);
    Math.random = () => rng();
    try {
        return fn(rng);
    } finally {
        Math.random = prev;
    }
}

function snapshotUpgrades(game) {
    return Object.fromEntries(Object.entries(game.upgrades).map(([k, v]) => [k, v.level]));
}

function getUpgradePurchaseOrder(game, persona) {
    const strategy = persona.upgradeStrategy || 'priority';
    const combatFirstKeys = new Set(['autoCycle', 'powerMemory', 'blastRadius', 'missileRacks', 'energyEfficiency', 'reactorRegen', 'energyHarvest', 'targetAreas']);
    if (strategy === 'none') return [];
    if (strategy === 'cheapest') {
        return game.getOrderedUpgrades().map((u) => u.key);
    }
    if (strategy === 'cheapestCombat') {
        const ordered = game.getOrderedUpgrades().map((u) => u.key);
        const combat = ordered.filter((k) => combatFirstKeys.has(k));
        const rest = ordered.filter((k) => !combatFirstKeys.has(k));
        return [...combat, ...rest];
    }
    if (strategy === 'priority') {
        return Array.isArray(persona.upgradePriority) ? persona.upgradePriority : [];
    }
    if (strategy === 'priorityThenCheapest') {
        const priority = Array.isArray(persona.upgradePriority) ? persona.upgradePriority : [];
        const ordered = game.getOrderedUpgrades().map((u) => u.key);
        return [...new Set([...priority, ...ordered])];
    }
    return Array.isArray(persona.upgradePriority) ? persona.upgradePriority : [];
}

function getBankMultiplier(persona) {
    const value = Number(persona.bankMultiplier);
    return Number.isFinite(value) && value > 0 ? value : 1;
}

function meetsBankThreshold(game, key, persona) {
    const tier = game.getNextUpgradeTier(key);
    if (!tier) return false;
    const bankMultiplier = getBankMultiplier(persona);
    const moneyNeed = (tier.moneyCost || 0) * bankMultiplier;
    const energyNeed = (tier.energyCost || 0) * bankMultiplier;
    if (game.money < moneyNeed) return false;
    if (game.missileEnergy < energyNeed) return false;
    return true;
}

function computeIdealPowerForAlien(game, alien) {
    const launcher = game.getLauncherOrigin();
    const dx = alien.x - launcher.x;
    const dy = alien.y - launcher.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = game.config.WORLD_HEIGHT * game.config.MAX_MISSILE_RANGE / 100;
    const norm = Math.max(0, Math.min(1, dist / Math.max(1e-6, maxDist)));
    const exp = game.config.POWER_TO_DISTANCE_EXPONENT || 1;
    const power = 100 * Math.pow(norm, 1 / exp);
    return Math.max(game.config.MISSILE_MIN_ENERGY_COST, Math.min(100, power));
}

function chooseTargetIndex(game, persona, shotIndex) {
    const strategy = persona.targetingStrategy || 'threatCluster';
    if (!game.aliens.length) return -1;
    if (strategy === 'sequential') {
        return Math.min(shotIndex, game.aliens.length - 1);
    }

    const blastRadius = game.getCurrentExplosionRadius ? game.getCurrentExplosionRadius() : (game.config.EXPLOSION_RADIUS || 6);
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < game.aliens.length; i++) {
        const a = game.aliens[i];
        const threatScore = (game.config.WORLD_HEIGHT - a.y); // lower y => more threat
        let clusterScore = 0;
        for (let j = 0; j < game.aliens.length; j++) {
            if (i === j) continue;
            const b = game.aliens[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= (blastRadius * 2.2)) {
                clusterScore += 1;
            }
        }
        const centerBias = -Math.abs((game.config.WORLD_WIDTH / 2) - a.x) * 0.03;
        let score = (threatScore * 1.8) + (clusterScore * 2.5) + centerBias;
        if (strategy === 'threatOnly') {
            score = (threatScore * 2.2) + centerBias;
        }
        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    }
    return bestIndex;
}

function getEffectiveAimPersona(game, persona) {
    const effective = { ...persona };
    const trajectoryLevel = game.upgrades?.trajectoryProcessor?.level || 0;
    const hasTargetAreas = !!(game.upgrades?.targetAreas?.level > 0);
    const hasPowerMemory = !!(game.upgrades?.powerMemory?.level > 0);

    if (trajectoryLevel > 0) {
        const factor = Math.max(0.75, 1 - (trajectoryLevel * 0.06)); // small benefit
        effective.angleJitterDeg *= factor;
        effective.powerJitterPct *= factor;
        effective.missChance *= Math.max(0.8, 1 - (trajectoryLevel * 0.05));
    }
    if (hasPowerMemory) {
        effective.powerJitterPct *= 0.88;
        effective.missChance *= 0.95;
    }
    if (hasTargetAreas) {
        effective.powerJitterPct *= 0.65;
        effective.angleJitterDeg *= 0.9;
        effective.missChance *= 0.7; // meaningful benefit
        effective.exactAimBias = Math.min(0.999, (effective.exactAimBias || 0) + 0.12);
    }

    return effective;
}

function applyHumanAimVariance(game, persona, rng, idealAngle, idealPower) {
    const effectivePersona = getEffectiveAimPersona(game, persona);
    const a = rng();
    const b = rng();
    const c = rng();
    const d = rng();
    const shouldMiss = a < effectivePersona.missChance;

    let angle = idealAngle + ((b * 2 - 1) * effectivePersona.angleJitterDeg);
    let power = idealPower + ((c * 2 - 1) * effectivePersona.powerJitterPct);

    // Better players (and players with targeting aids) often "center" shots, not just reduce random miss rate.
    const hasTargetAreas = !!(game.upgrades?.targetAreas?.level > 0);
    const hasPowerMemory = !!(game.upgrades?.powerMemory?.level > 0);
    const trajectoryLevel = game.upgrades?.trajectoryProcessor?.level || 0;
    let exactCenterChance = Math.max(
        0,
        Math.min(
            0.95,
            ((effectivePersona.exactAimBias || 0) - 0.35) * 0.95 +
            (hasTargetAreas ? 0.18 : 0) +
            (hasPowerMemory ? 0.06 : 0) +
            (trajectoryLevel * 0.03)
        )
    );
    // High-skill players can intentionally center a shot when they have enough guidance.
    if ((effectivePersona.missChance || 1) <= 0.15) {
        exactCenterChance += 0.08;
    }
    if ((effectivePersona.missChance || 1) <= 0.08) {
        exactCenterChance += 0.08;
    }
    exactCenterChance = Math.min(0.98, exactCenterChance);

    if (shouldMiss) {
        angle += (b > 0.5 ? 1 : -1) * (effectivePersona.angleJitterDeg * (1.5 + c));
        power += (c > 0.5 ? 1 : -1) * (effectivePersona.powerJitterPct * (1.8 + b));
    } else if (d < exactCenterChance) {
        angle = idealAngle + ((b * 2 - 1) * effectivePersona.angleJitterDeg * 0.08);
        power = idealPower + ((c * 2 - 1) * effectivePersona.powerJitterPct * 0.05);
    } else if (a > effectivePersona.exactAimBias) {
        power += (b - 0.5) * 3;
    }

    return {
        shouldMiss,
        angle: game.utils.clamp(Math.round(angle), game.config.MIN_ANGLE, game.config.MAX_ANGLE),
        power: game.utils.clamp(power, game.config.MISSILE_MIN_ENERGY_COST, 100)
    };
}

function tryPurchasePriority(game, persona, turn, purchases, verbose) {
    const purchased = [];
    let guard = 0;
    while (guard++ < 20) {
        let didPurchase = false;
        for (const key of getUpgradePurchaseOrder(game, persona)) {
            if (!game.upgrades[key]) continue;
            if (!meetsBankThreshold(game, key, persona)) continue;
            const before = { money: game.money, energy: game.missileEnergy, level: game.upgrades[key].level };
            const ok = game.purchaseUpgrade(key);
            if (!ok) continue;
            didPurchase = true;
            const row = {
                turn,
                key,
                level: game.upgrades[key].level,
                moneySpent: +(before.money - game.money).toFixed(2),
                energySpent: +(before.energy - game.missileEnergy).toFixed(2)
            };
            purchases.push(row);
            purchased.push(row);
            if (verbose) {
                console.log(`[turn ${turn}] upgrade ${row.key} -> L${row.level} (spent $${row.moneySpent}, EN ${row.energySpent})`);
            }
            break;
        }
        if (!didPurchase) break;
    }
    return purchased;
}

function playTurn(game, persona, rng) {
    const logs = [];
    const actionMeta = { shotsAttempted: 0, shotsLocked: 0, autoCycleTriggered: false, energyBlocked: false };
    const startCycleCount = game.levelCycles;

    let shotIndex = 0;
    while (!game.isGameOver && game.canCharge() && (game.getMissilesPerTurn() - game.missilesLockedThisTurn) > 0 && game.aliens.length > 0) {
        const targetIndex = chooseTargetIndex(game, persona, shotIndex);
        const alien = game.aliens[targetIndex];
        if (!alien) break;
        actionMeta.shotsAttempted += 1;

        const aim = game.aimAtAlien(targetIndex);
        if (!aim) break;
        const idealPower = computeIdealPowerForAlien(game, alien);
        const varied = applyHumanAimVariance(game, persona, rng, game.launcherAngle, idealPower);
        game.launcherAngle = varied.angle;
        const locked = game.chargeTo(varied.power);
        logs.push({ targetIndex, variedAngle: varied.angle, variedPower: +varied.power.toFixed(1), shouldMiss: varied.shouldMiss, locked });
        if (!locked) break;
        actionMeta.shotsLocked += 1;
        shotIndex += 1;

        if (game.levelCycles !== startCycleCount) {
            actionMeta.autoCycleTriggered = true;
            break;
        }
        if (game.isAnimating) {
            actionMeta.autoCycleTriggered = true;
            break;
        }
    }

    if (!game.isAnimating) {
        game.advanceImmediate();
    }

    const missilesLeft = game.getMissilesPerTurn() - game.missilesLockedThisTurn;
    if (!game.isGameOver && !game.isAnimating && game.aliens.length > 0 && missilesLeft > 0 && !game.canCharge()) {
        actionMeta.energyBlocked = true;
    }

    return { logs, actionMeta };
}

function runSingleSimulation(persona, options) {
    return withSeededMathRandom(options.seed, (rng) => {
        const game = new Game({ root: {}, ui: null, instantAutoCycle: true });
        if (options.configOverrides && typeof options.configOverrides === 'object') {
            Object.assign(game.config, options.configOverrides);
        }
        game.config.ANIMATION_FRAMES = 2;
        game.config.ANIMATION_FRAME_MS = 1;

        const purchases = [];
        const turnLogs = [];
        const simMetrics = { energyBlockedTurns: 0 };
        let turnCount = 0;

        if (options.verbose) {
            const s = game.getState();
            console.log(`\n[sim-core] persona=${persona.name} seed=${options.seed}`);
            console.log(`[sim-core] start level=${s.level} hp=${s.hp} en=${s.missileEnergy} $=${s.money}`);
        }

        while (turnCount < options.maxTurns && !game.isGameOver) {
            const pre = game.getState();
            const purchasedThisTurn = tryPurchasePriority(game, persona, turnCount + 1, purchases, options.verbose);
            const actions = playTurn(game, persona, rng);
            if (actions.actionMeta.energyBlocked) simMetrics.energyBlockedTurns += 1;
            const post = game.getState();
            turnCount += 1;

            const logRow = {
                turn: turnCount,
                before: { level: pre.level, cycle: pre.levelCycles + 1, totalCycles: pre.totalCycles, hp: pre.hp, energy: +Number(pre.missileEnergy).toFixed(1), money: +Number(pre.money).toFixed(1), aliens: pre.aliens.length },
                after: { level: post.level, cycle: post.levelCycles + 1, totalCycles: post.totalCycles, hp: post.hp, energy: +Number(post.missileEnergy).toFixed(1), money: +Number(post.money).toFixed(1), aliens: post.aliens.length, gameOver: !!post.isGameOver, reason: post.gameOverReason || '' },
                actions,
                purchases: purchasedThisTurn
            };
            turnLogs.push(logRow);

            if (options.verbose) {
                const a = actions.actionMeta;
                console.log(
                    `[turn ${turnCount}] L${logRow.before.level}C${logRow.before.cycle} (T${logRow.before.totalCycles}) HP ${logRow.before.hp} EN ${logRow.before.energy} $${logRow.before.money} ` +
                    `aliens=${logRow.before.aliens} | shots ${a.shotsLocked}/${a.shotsAttempted}${a.autoCycleTriggered ? ' [AUTO-CYCLE]' : ''}`
                );
                for (const s of actions.logs) {
                    console.log(`  - shot t${s.targetIndex} angle=${s.variedAngle} power=${s.variedPower}${s.shouldMiss ? ' [MISS BIAS]' : ''}${s.locked ? '' : ' [LOCK FAILED]'}`);
                }
                if (purchasedThisTurn.length) {
                    console.log(`  - purchases: ${purchasedThisTurn.map((p) => `${p.key}@L${p.level}`).join(', ')}`);
                }
                console.log(`  -> after: L${logRow.after.level}C${logRow.after.cycle} (T${logRow.after.totalCycles}) HP ${logRow.after.hp} EN ${logRow.after.energy} $${logRow.after.money} aliens=${logRow.after.aliens}${logRow.after.gameOver ? ` [GAME OVER: ${logRow.after.reason}]` : ''}`);
            }
        }

        return {
            persona: persona.name,
            seed: options.seed,
            turnsPlayed: turnCount,
            finalState: game.getState(),
            upgrades: snapshotUpgrades(game),
            purchases,
            turnLogs,
            simMetrics
        };
    });
}

function printRunSummary(run, i, total) {
    console.log(`\n[summary run ${i + 1}/${total}] decisions=${run.turnsPlayed} cycles=${run.finalState.totalCycles} level=${run.finalState.level} hp=${run.finalState.hp} EN=${run.finalState.missileEnergy} $=${run.finalState.money} kills=${run.finalState.stats?.kills ?? 0} shots=${run.finalState.stats?.missilesLaunched ?? 0} blockedTurns=${run.simMetrics?.energyBlockedTurns ?? 0} gameOver=${run.finalState.isGameOver} reason="${run.finalState.gameOverReason || ''}"`);
    console.log(`[summary upgrades] ${Object.entries(run.upgrades).filter(([, lvl]) => lvl > 0).map(([k, lvl]) => `${k}:L${lvl}`).join(', ') || '(none)'}`);
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const persona = getPersona(args.persona);
    if (!persona) {
        console.error(`Unknown persona '${args.persona}'. Available: ${listPersonaNames().join(', ')}`);
        process.exit(1);
    }

    const runs = [];
    for (let i = 0; i < args.runs; i++) {
        const seed = args.seed + i;
        const run = runSingleSimulation(persona, { ...args, seed });
        runs.push(run);
        printRunSummary(run, i, args.runs);
    }

    if (runs.length > 1) {
        console.log('\n[aggregate]');
        console.log(JSON.stringify({
            runs: runs.length,
            persona: persona.name,
            avgTurns: +avg(runs.map((r) => r.turnsPlayed)).toFixed(2),
            avgFinalCycles: +avg(runs.map((r) => r.finalState.totalCycles || 0)).toFixed(2),
            avgFinalLevel: +avg(runs.map((r) => r.finalState.level)).toFixed(2),
            avgFinalMoney: +avg(runs.map((r) => Number(r.finalState.money) || 0)).toFixed(2),
            avgFinalEnergy: +avg(runs.map((r) => Number(r.finalState.missileEnergy) || 0)).toFixed(2),
            avgKills: +avg(runs.map((r) => Number(r.finalState.stats?.kills) || 0)).toFixed(2),
            avgShotsLaunched: +avg(runs.map((r) => Number(r.finalState.stats?.missilesLaunched) || 0)).toFixed(2),
            avgExactHitKills: +avg(runs.map((r) => Number(r.finalState.stats?.exactHitKills) || 0)).toFixed(2),
            avgEnergyBlockedTurns: +avg(runs.map((r) => Number(r.simMetrics?.energyBlockedTurns) || 0)).toFixed(2),
            gameOverRate: +avg(runs.map((r) => r.finalState.isGameOver ? 1 : 0)).toFixed(2)
        }, null, 2));
    }

    console.log('\n[final-json]');
    console.log(JSON.stringify({
        mode: 'core',
        persona: persona.name,
        runs: runs.length,
        results: runs.map((r) => ({
            seed: r.seed,
            turnsPlayed: r.turnsPlayed,
            finalState: {
                level: r.finalState.level,
                totalCycles: r.finalState.totalCycles,
                hp: r.finalState.hp,
                missileEnergy: r.finalState.missileEnergy,
                money: r.finalState.money,
                stats: r.finalState.stats,
                isGameOver: r.finalState.isGameOver,
                gameOverReason: r.finalState.gameOverReason
            },
            upgrades: r.upgrades,
            purchases: r.purchases,
            simMetrics: r.simMetrics
        }))
    }, null, 2));
}

if (require.main === module) {
    main();
}

module.exports = {
    parseArgs,
    makeMulberry32,
    avg,
    runSingleSimulation,
    PERSONA_NAMES: listPersonaNames,
    getPersona
};
