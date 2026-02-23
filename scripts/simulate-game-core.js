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

function applyHumanAimVariance(game, persona, rng, idealAngle, idealPower) {
    const a = rng();
    const b = rng();
    const c = rng();
    const shouldMiss = a < persona.missChance;

    let angle = idealAngle + ((b * 2 - 1) * persona.angleJitterDeg);
    let power = idealPower + ((c * 2 - 1) * persona.powerJitterPct);

    if (shouldMiss) {
        angle += (b > 0.5 ? 1 : -1) * (persona.angleJitterDeg * (1.5 + c));
        power += (c > 0.5 ? 1 : -1) * (persona.powerJitterPct * (1.8 + b));
    } else if (a > persona.exactAimBias) {
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
        for (const key of persona.upgradePriority) {
            if (!game.upgrades[key]) continue;
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
    const actionMeta = { shotsAttempted: 0, shotsLocked: 0, autoCycleTriggered: false };
    const startCycleCount = game.levelCycles;

    let shotIndex = 0;
    while (!game.isGameOver && game.canCharge() && (game.getMissilesPerTurn() - game.missilesLockedThisTurn) > 0 && game.aliens.length > 0) {
        const targetIndex = Math.min(shotIndex, game.aliens.length - 1);
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

    return { logs, actionMeta };
}

function runSingleSimulation(persona, options) {
    return withSeededMathRandom(options.seed, (rng) => {
        const game = new Game({ root: {}, ui: null, instantAutoCycle: true });
        game.config.ANIMATION_FRAMES = 2;
        game.config.ANIMATION_FRAME_MS = 1;

        const purchases = [];
        const turnLogs = [];
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
            const post = game.getState();
            turnCount += 1;

            const logRow = {
                turn: turnCount,
                before: { level: pre.level, cycle: pre.levelCycles + 1, hp: pre.hp, energy: +Number(pre.missileEnergy).toFixed(1), money: +Number(pre.money).toFixed(1), aliens: pre.aliens.length },
                after: { level: post.level, cycle: post.levelCycles + 1, hp: post.hp, energy: +Number(post.missileEnergy).toFixed(1), money: +Number(post.money).toFixed(1), aliens: post.aliens.length, gameOver: !!post.isGameOver, reason: post.gameOverReason || '' },
                actions,
                purchases: purchasedThisTurn
            };
            turnLogs.push(logRow);

            if (options.verbose) {
                const a = actions.actionMeta;
                console.log(
                    `[turn ${turnCount}] L${logRow.before.level}C${logRow.before.cycle} HP ${logRow.before.hp} EN ${logRow.before.energy} $${logRow.before.money} ` +
                    `aliens=${logRow.before.aliens} | shots ${a.shotsLocked}/${a.shotsAttempted}${a.autoCycleTriggered ? ' [AUTO-CYCLE]' : ''}`
                );
                for (const s of actions.logs) {
                    console.log(`  - shot t${s.targetIndex} angle=${s.variedAngle} power=${s.variedPower}${s.shouldMiss ? ' [MISS BIAS]' : ''}${s.locked ? '' : ' [LOCK FAILED]'}`);
                }
                if (purchasedThisTurn.length) {
                    console.log(`  - purchases: ${purchasedThisTurn.map((p) => `${p.key}@L${p.level}`).join(', ')}`);
                }
                console.log(`  -> after: L${logRow.after.level}C${logRow.after.cycle} HP ${logRow.after.hp} EN ${logRow.after.energy} $${logRow.after.money} aliens=${logRow.after.aliens}${logRow.after.gameOver ? ` [GAME OVER: ${logRow.after.reason}]` : ''}`);
            }
        }

        return {
            persona: persona.name,
            seed: options.seed,
            turnsPlayed: turnCount,
            finalState: game.getState(),
            upgrades: snapshotUpgrades(game),
            purchases,
            turnLogs
        };
    });
}

function printRunSummary(run, i, total) {
    console.log(`\n[summary run ${i + 1}/${total}] turns=${run.turnsPlayed} level=${run.finalState.level} hp=${run.finalState.hp} EN=${run.finalState.missileEnergy} $=${run.finalState.money} gameOver=${run.finalState.isGameOver} reason="${run.finalState.gameOverReason || ''}"`);
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
            avgFinalLevel: +avg(runs.map((r) => r.finalState.level)).toFixed(2),
            avgFinalMoney: +avg(runs.map((r) => Number(r.finalState.money) || 0)).toFixed(2),
            avgFinalEnergy: +avg(runs.map((r) => Number(r.finalState.missileEnergy) || 0)).toFixed(2),
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
                hp: r.finalState.hp,
                missileEnergy: r.finalState.missileEnergy,
                money: r.finalState.money,
                isGameOver: r.finalState.isGameOver,
                gameOverReason: r.finalState.gameOverReason
            },
            upgrades: r.upgrades,
            purchases: r.purchases
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
