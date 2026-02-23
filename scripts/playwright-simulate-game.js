const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
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
    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

async function createPage(browser, seed) {
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

    // Seed Math.random before the game initializes, so wave spawns are reproducible.
    await page.addInitScript(({ seedValue }) => {
        let t = seedValue >>> 0;
        Math.random = function seededRandom() {
            t += 0x6D2B79F5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }, { seedValue: seed >>> 0 });

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            console.error('[page error]', msg.text());
        }
    });

    const indexUrl = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
    await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.game && window.renderer);

    // Speed up simulation while preserving game semantics.
    await page.evaluate(() => {
        window.game.config.ANIMATION_FRAMES = 2;
        window.game.config.ANIMATION_FRAME_MS = 1;
    });

    return page;
}

async function runSingleSimulation(page, personaConfig, options) {
    const rng = makeMulberry32(options.seed);
    const purchases = [];
    const turnLogs = [];
    let turnCount = 0;
    let gameOver = false;

    const initial = await page.evaluate(() => window.game.getState());
    if (options.verbose) {
        console.log(`\n[sim] persona=${personaConfig.name} seed=${options.seed}`);
        console.log(`[sim] start level=${initial.level} hp=${initial.hp} en=${initial.missileEnergy} $=${initial.money}`);
    }

    while (turnCount < options.maxTurns) {
        const pre = await page.evaluate(() => ({
            state: window.game.getState(),
            upgrades: Object.fromEntries(Object.entries(window.game.upgrades).map(([k, v]) => [k, { level: v.level }]))
        }));

        if (pre.state.isGameOver) {
            gameOver = true;
            break;
        }

        // Purchase upgrades greedily by persona priority.
        let purchasedThisTurn = [];
        let purchaseLoopGuard = 0;
        while (purchaseLoopGuard++ < 20) {
            let didPurchase = false;
            for (const key of personaConfig.upgradePriority) {
                const bought = await page.evaluate((upgradeKey) => {
                    const g = window.game;
                    if (!g.upgrades[upgradeKey]) return { ok: false };
                    const before = { money: g.money, energy: g.missileEnergy, level: g.upgrades[upgradeKey].level };
                    const ok = g.purchaseUpgrade(upgradeKey);
                    const after = { money: g.money, energy: g.missileEnergy, level: g.upgrades[upgradeKey]?.level ?? 0 };
                    return { ok, before, after, key: upgradeKey };
                }, key);
                if (bought.ok) {
                    didPurchase = true;
                    purchasedThisTurn.push({
                        key: bought.key,
                        level: bought.after.level,
                        moneySpent: +(bought.before.money - bought.after.money).toFixed(2),
                        energySpent: +(bought.before.energy - bought.after.energy).toFixed(2)
                    });
                    purchases.push({ turn: turnCount + 1, ...purchasedThisTurn[purchasedThisTurn.length - 1] });
                    if (options.verbose) {
                        const p = purchasedThisTurn[purchasedThisTurn.length - 1];
                        console.log(`[turn ${turnCount + 1}] upgrade ${p.key} -> L${p.level} (spent $${p.moneySpent}, EN ${p.energySpent})`);
                    }
                    break;
                }
            }
            if (!didPurchase) break;
        }

        // Lock targets up to missile capacity.
        const actions = await page.evaluate(({ persona, randoms }) => {
            const g = window.game;
            const logs = [];
            const actionMeta = {
                missilesLockedBefore: g.missilesLockedThisTurn,
                autoCycleTriggered: false,
                shotsAttempted: 0,
                shotsLocked: 0
            };

            function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

            function computeIdealPowerForAlien(alien) {
                const launcher = g.getLauncherOrigin();
                const dx = alien.x - launcher.x;
                const dy = alien.y - launcher.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = g.config.WORLD_HEIGHT * g.config.MAX_MISSILE_RANGE / 100;
                const norm = clamp(dist / Math.max(1e-6, maxDist), 0, 1);
                const exp = g.config.POWER_TO_DISTANCE_EXPONENT || 1;
                const power = 100 * Math.pow(norm, 1 / exp);
                return clamp(power, g.config.MISSILE_MIN_ENERGY_COST, 100);
            }

            function applyHumanAimVariance(idealAngle, idealPower, shotIndex) {
                const r = randoms[shotIndex] || { a: 0.5, b: 0.5, c: 0.5 };
                const missRoll = r.a;
                const shouldMiss = missRoll < persona.missChance;

                const angleJitter = (r.b * 2 - 1) * persona.angleJitterDeg;
                const powerJitter = (r.c * 2 - 1) * persona.powerJitterPct;

                let angle = idealAngle + angleJitter;
                let power = idealPower + powerJitter;

                if (shouldMiss) {
                    // Intentional human miss: push error farther, sometimes under/overshoot.
                    angle += (r.b > 0.5 ? 1 : -1) * (persona.angleJitterDeg * (1.5 + r.c));
                    power += (r.c > 0.5 ? 1 : -1) * (persona.powerJitterPct * (1.8 + r.b));
                } else if (r.a > persona.exactAimBias) {
                    // Small "good but not perfect" variance even on hits.
                    power += (r.b - 0.5) * 3;
                }

                return {
                    shouldMiss,
                    angle: clamp(Math.round(angle), g.config.MIN_ANGLE, g.config.MAX_ANGLE),
                    power: clamp(power, g.config.MISSILE_MIN_ENERGY_COST, 100)
                };
            }

            let shotIndex = 0;
            const missilesLeftToLock = () => g.getMissilesPerTurn() - g.missilesLockedThisTurn;

            while (!g.isGameOver && g.canCharge() && missilesLeftToLock() > 0 && g.aliens.length > 0) {
                const targetIndex = Math.min(shotIndex, g.aliens.length - 1);
                const alien = g.aliens[targetIndex];
                if (!alien) break;
                actionMeta.shotsAttempted += 1;

                const aim = g.aimAtAlien(targetIndex);
                if (!aim) break;
                const idealPower = computeIdealPowerForAlien(alien);
                const varied = applyHumanAimVariance(g.launcherAngle, idealPower, shotIndex);
                g.launcherAngle = varied.angle;
                const locked = g.chargeTo(varied.power);
                logs.push({
                    targetIndex,
                    variedAngle: varied.angle,
                    variedPower: Math.round(varied.power * 10) / 10,
                    shouldMiss: varied.shouldMiss,
                    locked
                });
                if (!locked) break;
                actionMeta.shotsLocked += 1;
                shotIndex++;

                if (g.isAnimating) {
                    actionMeta.autoCycleTriggered = true;
                    break;
                }
            }

            const lockedBeforeCycle = g.missilesLockedThisTurn;
            if (!g.isAnimating) {
                g.advance();
            }

            return { logs, actionMeta: { ...actionMeta, lockedBeforeCycle } };
        }, {
            persona: personaConfig,
            randoms: Array.from({ length: 8 }, () => ({ a: rng(), b: rng(), c: rng() }))
        });

        await page.waitForFunction(() => window.game && !window.game.isAnimating, null, { timeout: 20000 });

        const post = await page.evaluate(() => ({
            state: window.game.getState(),
            upgrades: Object.fromEntries(Object.entries(window.game.upgrades).map(([k, v]) => [k, { level: v.level }]))
        }));

        turnCount += 1;
        const logRow = {
            turn: turnCount,
            before: {
                level: pre.state.level,
                cycle: pre.state.levelCycles + 1,
                hp: pre.state.hp,
                energy: +Number(pre.state.missileEnergy).toFixed(1),
                money: +Number(pre.state.money).toFixed(1),
                aliens: pre.state.aliens.length
            },
            actions,
            after: {
                level: post.state.level,
                cycle: post.state.levelCycles + 1,
                hp: post.state.hp,
                energy: +Number(post.state.missileEnergy).toFixed(1),
                money: +Number(post.state.money).toFixed(1),
                aliens: post.state.aliens.length,
                gameOver: !!post.state.isGameOver,
                reason: post.state.gameOverReason || ''
            },
            purchases: purchasedThisTurn
        };
        turnLogs.push(logRow);

        if (options.verbose) {
            const a = logRow.actions.actionMeta;
            console.log(
                `[turn ${turnCount}] L${logRow.before.level}C${logRow.before.cycle} ` +
                `HP ${logRow.before.hp} EN ${logRow.before.energy} $${logRow.before.money} ` +
                `aliens=${logRow.before.aliens} | shots ${a.shotsLocked}/${a.shotsAttempted} ` +
                `${a.autoCycleTriggered ? '[AUTO-CYCLE]' : ''}`
            );
            for (const s of logRow.actions.logs) {
                console.log(`  - shot t${s.targetIndex} angle=${s.variedAngle} power=${s.variedPower} ${s.shouldMiss ? '[MISS BIAS]' : ''} ${s.locked ? '' : '[LOCK FAILED]'}`);
            }
            if (purchasedThisTurn.length) {
                console.log(`  - purchases: ${purchasedThisTurn.map((p) => `${p.key}@L${p.level}`).join(', ')}`);
            }
            console.log(`  -> after: L${logRow.after.level}C${logRow.after.cycle} HP ${logRow.after.hp} EN ${logRow.after.energy} $${logRow.after.money} aliens=${logRow.after.aliens}${logRow.after.gameOver ? ` [GAME OVER: ${logRow.after.reason}]` : ''}`);
        }

        if (post.state.isGameOver) {
            gameOver = true;
            break;
        }
    }

    const final = await page.evaluate(() => ({
        state: window.game.getState(),
        upgrades: Object.fromEntries(Object.entries(window.game.upgrades).map(([k, v]) => [k, v.level]))
    }));

    return {
        persona: personaConfig.name,
        seed: options.seed,
        turnsPlayed: turnCount,
        reachedGameOver: gameOver || final.state.isGameOver,
        finalState: final.state,
        upgrades: final.upgrades,
        purchases,
        turnLogs
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const persona = getPersona(args.persona);
    if (!persona) {
        console.error(`Unknown persona '${args.persona}'. Available: ${listPersonaNames().join(', ')}`);
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    const runs = [];

    try {
        for (let i = 0; i < args.runs; i++) {
            const seed = args.seed + i;
            const page = await createPage(browser, seed);
            const result = await runSingleSimulation(page, persona, { ...args, seed });
            runs.push(result);
            await page.close();

            console.log(`\n[summary run ${i + 1}/${args.runs}] turns=${result.turnsPlayed} level=${result.finalState.level} hp=${result.finalState.hp} EN=${result.finalState.missileEnergy} $=${result.finalState.money} gameOver=${result.finalState.isGameOver} reason="${result.finalState.gameOverReason || ''}"`);
            console.log(`[summary upgrades] ${Object.entries(result.upgrades).filter(([, lvl]) => lvl > 0).map(([k, lvl]) => `${k}:L${lvl}`).join(', ') || '(none)'}`);
        }
    } finally {
        await browser.close();
    }

    if (runs.length > 1) {
        const aggregate = {
            runs: runs.length,
            persona: persona.name,
            avgTurns: +avg(runs.map((r) => r.turnsPlayed)).toFixed(2),
            avgFinalLevel: +avg(runs.map((r) => r.finalState.level)).toFixed(2),
            avgFinalMoney: +avg(runs.map((r) => Number(r.finalState.money) || 0)).toFixed(2),
            avgFinalEnergy: +avg(runs.map((r) => Number(r.finalState.missileEnergy) || 0)).toFixed(2),
            gameOverRate: +avg(runs.map((r) => r.finalState.isGameOver ? 1 : 0)).toFixed(2)
        };
        console.log('\n[aggregate]');
        console.log(JSON.stringify(aggregate, null, 2));
    }

    // Machine-readable final output for tooling.
    console.log('\n[final-json]');
    console.log(JSON.stringify({
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

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
