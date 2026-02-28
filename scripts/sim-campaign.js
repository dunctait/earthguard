const path = require('path');
const fs = require('fs');
const { Game } = require('../src/game.js');
const { runGameToEnd, getPersona, PERSONA_NAMES } = require('./simulate-game-core.js');

function parseArgs(argv) {
    const args = {
        personas: ['good', 'perfect'],
        campaigns: 8,
        runsPerCampaign: 6,
        seed: 9001,
        maxTurns: 160,
        verbose: false,
        strict: false,
        outDir: path.resolve(__dirname, '..', 'artifacts', 'sim')
    };
    for (const arg of argv) {
        if (arg.startsWith('--personas=')) args.personas = arg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean);
        else if (arg.startsWith('--campaigns=')) args.campaigns = Number(arg.split('=')[1]);
        else if (arg.startsWith('--runs-per-campaign=')) args.runsPerCampaign = Number(arg.split('=')[1]);
        else if (arg.startsWith('--seed=')) args.seed = Number(arg.split('=')[1]);
        else if (arg.startsWith('--max-turns=')) args.maxTurns = Number(arg.split('=')[1]);
        else if (arg.startsWith('--out-dir=')) args.outDir = path.resolve(arg.split('=')[1]);
        else if (arg === '--verbose') args.verbose = true;
        else if (arg === '--strict') args.strict = true;
    }
    return args;
}

function avg(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function createMemoryRoot() {
    const store = new Map();
    return {
        localStorage: {
            getItem: (k) => store.has(k) ? store.get(k) : null,
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k)
        }
    };
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

function getMetaPurchaseOrder(persona) {
    return persona.metaUpgradePriority || [
        'startingReserve',
        'reactorBootstrap',
        'jumpBroker',
        'salvageYield',
        'salvageBank',
        'commandCredit'
    ];
}

function purchaseMetaUpgrades(game, persona) {
    if (persona.metaPurchaseStrategy === 'none') return [];
    const purchased = [];
    let guard = 0;
    while (guard++ < 100) {
        let didPurchase = false;
        for (const key of getMetaPurchaseOrder(persona)) {
            if (!game.canPurchaseMetaUpgrade(key)) continue;
            const levelBefore = game.getMetaUpgradeLevel(key);
            if (!game.purchaseMetaUpgrade(key)) continue;
            purchased.push({ key, level: levelBefore + 1 });
            didPurchase = true;
            break;
        }
        if (!didPurchase) break;
    }
    return purchased;
}

function chooseJumpLevel(game, persona) {
    const jumpStrategy = persona.jumpStrategy || 'highest';
    const jumps = game.getAvailableJumpStartLevels();
    if (!jumps.length) return null;
    if (jumpStrategy === 'none') return null;
    if (jumpStrategy === 'highest') return jumps[jumps.length - 1]?.level || null;
    if (jumpStrategy === 'middle') {
        const idx = Math.floor((jumps.length - 1) * 0.6);
        return jumps[Math.max(0, idx)]?.level || null;
    }
    return jumps[jumps.length - 1]?.level || null;
}

function evaluateCampaignCriteria(persona, summary) {
    const criteria = persona.campaignCriteria;
    if (!criteria) return { hasCriteria: false, pass: true, checks: [] };
    const checks = [];
    for (const [metric, range] of Object.entries(criteria.aggregate || {})) {
        if (summary[metric] === undefined) continue;
        const minOk = range.min === undefined || summary[metric] >= range.min;
        const maxOk = range.max === undefined || summary[metric] <= range.max;
        checks.push({ metric, value: summary[metric], min: range.min, max: range.max, pass: minOk && maxOk });
    }
    return {
        hasCriteria: true,
        pass: checks.every((c) => c.pass),
        designIntent: criteria.designIntent || '',
        checks
    };
}

function evaluateCrossPersonaChecks(summaryByPersona) {
    const checks = [];
    const addCheck = (label, pass, details) => checks.push({ label, pass, details });

    const goodNoJump = summaryByPersona['good_campaign_noJump'];
    const goodJump = summaryByPersona['good_campaign_jumpHighest'];
    if (goodNoJump && goodJump) {
        addCheck(
            'good.jump_not_stronger_than_full_run',
            goodJump.avgBestLevel <= (goodNoJump.avgBestLevel + 0.2),
            `jump=${goodJump.avgBestLevel} noJump=${goodNoJump.avgBestLevel}`
        );
    }

    const perfectNoJump = summaryByPersona['perfect_campaign_noJump'];
    const perfectJump = summaryByPersona['perfect_campaign_jumpHighest'];
    if (perfectNoJump && perfectJump) {
        addCheck(
            'perfect.jump_not_stronger_than_full_run',
            perfectJump.avgBestLevel <= (perfectNoJump.avgBestLevel + 0.2),
            `jump=${perfectJump.avgBestLevel} noJump=${perfectNoJump.avgBestLevel}`
        );
    }

    const perfect = summaryByPersona['perfect_campaign_noJump']
        || summaryByPersona['perfect_campaign_jumpHighest']
        || summaryByPersona['perfect'];
    const noUpgrades = summaryByPersona['noUpgrades_campaign_noJump']
        || summaryByPersona['noUpgrades_campaign_jumpHighest']
        || summaryByPersona['noUpgrades'];
    if (perfect && noUpgrades) {
        addCheck(
            'perfect_not_materially_worse_than_no_upgrades_campaign',
            perfect.avgBestLevel >= (noUpgrades.avgBestLevel - 0.5),
            `perfect=${perfect.avgBestLevel} noUpgrades=${noUpgrades.avgBestLevel}`
        );
    }
    return checks;
}

function runCampaign(persona, campaignSeed, args) {
    return withSeededMathRandom(campaignSeed, (rng) => {
        const root = createMemoryRoot();
        const runs = [];
        let metaPurchases = [];

        for (let i = 0; i < args.runsPerCampaign; i++) {
            const game = new Game({ root, ui: null, instantAutoCycle: true });
            game.config.ANIMATION_FRAMES = 2;
            game.config.ANIMATION_FRAME_MS = 1;
            game.closeSplash();

            metaPurchases = purchaseMetaUpgrades(game, persona);
            let jumpLevel = null;
            if (i > 0) {
                jumpLevel = chooseJumpLevel(game, persona);
                if (jumpLevel) game.startJumpRun(jumpLevel);
            }

            const run = runGameToEnd(game, persona, { maxTurns: args.maxTurns, verbose: false }, rng);
            runs.push({
                index: i + 1,
                jumpLevel,
                finalLevel: run.finalState.level,
                totalCycles: run.finalState.totalCycles || 0,
                finalMoney: Number(run.finalState.money) || 0,
                finalEnergy: Number(run.finalState.missileEnergy) || 0,
                gameOverReason: run.finalState.gameOverReason || '',
                metaCurrency: Number(run.finalState.metaProgress?.metaCurrency) || 0,
                bestMoneyByLevel: run.finalState.metaProgress?.bestMoneyByLevel || {},
                purchases: run.purchases.length,
                metaPurchases: metaPurchases.slice()
            });
        }

        return runs;
    });
}

function summarizeCampaigns(personaName, campaigns) {
    const bestLevels = campaigns.map((c) => Math.max(...c.runs.map((r) => r.finalLevel)));
    const finalMeta = campaigns.map((c) => c.runs[c.runs.length - 1]?.metaCurrency || 0);
    const jumpsUsed = campaigns.map((c) => c.runs.filter((r) => r.jumpLevel !== null).length);
    const finalRunLevels = campaigns.map((c) => c.runs[c.runs.length - 1]?.finalLevel || 1);
    return {
        persona: personaName,
        campaigns: campaigns.length,
        avgBestLevel: +avg(bestLevels).toFixed(2),
        avgFinalRunLevel: +avg(finalRunLevels).toFixed(2),
        avgFinalMetaCurrency: +avg(finalMeta).toFixed(2),
        avgJumpsUsed: +avg(jumpsUsed).toFixed(2),
        maxBestLevel: Math.max(...bestLevels),
        minBestLevel: Math.min(...bestLevels)
    };
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const invalid = args.personas.filter((name) => !getPersona(name));
    if (invalid.length) {
        console.error(`Unknown persona(s): ${invalid.join(', ')}`);
        console.error(`Available: ${PERSONA_NAMES().join(', ')}`);
        process.exit(1);
    }

    ensureDir(args.outDir);
    const aggregate = [];
    const summaryByPersona = {};
    const criteriaRows = [];
    const campaignRows = [];

    for (const personaName of args.personas) {
        const persona = getPersona(personaName);
        const campaigns = [];
        console.log(`\n[campaign] persona=${personaName} campaigns=${args.campaigns} runs=${args.runsPerCampaign}`);
        for (let i = 0; i < args.campaigns; i++) {
            const seed = args.seed + i;
            const runs = runCampaign(persona, seed, args);
            campaigns.push({ seed, runs });
            campaignRows.push(...runs.map((r) => ({
                persona: personaName,
                campaignSeed: seed,
                run: r.index,
                jumpLevel: r.jumpLevel ?? '',
                finalLevel: r.finalLevel,
                totalCycles: r.totalCycles,
                finalMoney: +r.finalMoney.toFixed(2),
                finalEnergy: +r.finalEnergy.toFixed(2),
                metaCurrency: +r.metaCurrency.toFixed(2),
                purchases: r.purchases,
                gameOverReason: r.gameOverReason
            })));
        }

        const summary = summarizeCampaigns(personaName, campaigns);
        summaryByPersona[personaName] = summary;
        const criteria = evaluateCampaignCriteria(persona, summary);
        aggregate.push(summary);
        criteriaRows.push({
            persona: personaName,
            pass: criteria.pass,
            designIntent: criteria.designIntent || '',
            failedChecks: criteria.checks.filter((c) => !c.pass).map((c) => c.metric).join('|')
        });
        console.log(`[campaign summary] ${JSON.stringify(summary)}`);
        if (criteria.hasCriteria) {
            console.log(`[campaign criteria] ${criteria.pass ? 'PASS' : 'FAIL'} - ${criteria.designIntent || ''}`);
        }
    }

    const crossChecks = evaluateCrossPersonaChecks(summaryByPersona);
    if (crossChecks.length) {
        console.log('\n[campaign cross-persona checks]');
        for (const check of crossChecks) {
            console.log(`- ${check.pass ? 'PASS' : 'FAIL'} ${check.label} (${check.details})`);
        }
        criteriaRows.push({
            persona: '__cross_persona__',
            pass: crossChecks.every((c) => c.pass),
            designIntent: 'Jump starts should fast-forward, not outperform full-run progression.',
            failedChecks: crossChecks.filter((c) => !c.pass).map((c) => c.label).join('|')
        });
    }

    const manifest = {
        generatedAt: new Date().toISOString(),
        mode: 'campaign-batch',
        config: args,
        aggregate,
        criteria: criteriaRows,
        crossChecks,
        campaigns: campaignRows
    };

    fs.writeFileSync(path.join(args.outDir, 'sim-campaign-results.json'), JSON.stringify(manifest, null, 2));
    const failing = criteriaRows.filter((r) => !r.pass);
    if (failing.length) {
        console.log(`\n[campaign criteria summary] FAIL (${failing.length}/${criteriaRows.length})`);
        if (args.strict) process.exit(2);
    } else {
        console.log('\n[campaign criteria summary] PASS');
    }
}

if (require.main === module) {
    main();
}
