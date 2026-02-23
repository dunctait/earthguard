const fs = require('fs');
const path = require('path');
const { runSingleSimulation, getPersona, PERSONA_NAMES } = require('./simulate-game-core.js');

function parseArgs(argv) {
    const args = {
        personas: ['good', 'perfect'],
        runs: 10,
        seed: 1337,
        maxTurns: 500,
        verbose: false,
        strict: false,
        outDir: path.resolve(__dirname, '..', 'artifacts', 'sim')
    };
    for (const arg of argv) {
        if (arg.startsWith('--personas=')) args.personas = arg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean);
        else if (arg.startsWith('--runs=')) args.runs = Number(arg.split('=')[1]);
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

function summarizeRuns(personaName, runs) {
    const totalKills = runs.reduce((sum, r) => sum + (Number(r.finalState.stats?.kills) || 0), 0);
    const totalShots = runs.reduce((sum, r) => sum + (Number(r.finalState.stats?.missilesLaunched) || 0), 0);
    const totalExactHitKills = runs.reduce((sum, r) => sum + (Number(r.finalState.stats?.exactHitKills) || 0), 0);
    return {
        persona: personaName,
        runs: runs.length,
        avgTurns: +avg(runs.map((r) => r.turnsPlayed)).toFixed(2),
        avgFinalCycles: +avg(runs.map((r) => Number(r.finalState.totalCycles) || 0)).toFixed(2),
        avgFinalLevel: +avg(runs.map((r) => r.finalState.level)).toFixed(2),
        avgFinalMoney: +avg(runs.map((r) => Number(r.finalState.money) || 0)).toFixed(2),
        avgFinalEnergy: +avg(runs.map((r) => Number(r.finalState.missileEnergy) || 0)).toFixed(2),
        avgKills: +avg(runs.map((r) => Number(r.finalState.stats?.kills) || 0)).toFixed(2),
        avgShotsLaunched: +avg(runs.map((r) => Number(r.finalState.stats?.missilesLaunched) || 0)).toFixed(2),
        avgExactHitKills: +avg(runs.map((r) => Number(r.finalState.stats?.exactHitKills) || 0)).toFixed(2),
        avgEnergyBlockedTurns: +avg(runs.map((r) => Number(r.simMetrics?.energyBlockedTurns) || 0)).toFixed(2),
        killPerShot: totalShots > 0 ? +(totalKills / totalShots).toFixed(3) : 0,
        exactHitKillRate: totalKills > 0 ? +(totalExactHitKills / totalKills).toFixed(3) : 0,
        avgHp: +avg(runs.map((r) => Number(r.finalState.hp) || 0)).toFixed(2),
        gameOverRate: +avg(runs.map((r) => r.finalState.isGameOver ? 1 : 0)).toFixed(2),
        maxLevel: Math.max(...runs.map((r) => r.finalState.level)),
        minLevel: Math.min(...runs.map((r) => r.finalState.level))
    };
}

function buildDeathLevelHistogram(runs) {
    const hist = {};
    for (const run of runs) {
        const level = run.finalState.level;
        hist[level] = (hist[level] || 0) + 1;
    }
    return hist;
}

function buildFirstPurchasesHistogram(runs, slots = 3) {
    const hist = Array.from({ length: slots }, () => ({}));
    for (const run of runs) {
        const purchases = run.purchases || [];
        for (let i = 0; i < slots; i++) {
            const key = purchases[i]?.key || '(none)';
            hist[i][key] = (hist[i][key] || 0) + 1;
        }
    }
    return hist;
}

function rangeCheck(label, value, range) {
    if (!range) return null;
    const minOk = (range.min === undefined) || value >= range.min;
    const maxOk = (range.max === undefined) || value <= range.max;
    return {
        label,
        value,
        min: range.min,
        max: range.max,
        pass: minOk && maxOk
    };
}

function evaluateCriteria(persona, runs, summary) {
    const criteria = persona.criteria;
    if (!criteria) {
        return { hasCriteria: false, pass: true, checks: [] };
    }

    const checks = [];
    const aggregateCriteria = criteria.aggregate || {};
    for (const [metric, range] of Object.entries(aggregateCriteria)) {
        if (summary[metric] === undefined) continue;
        const check = rangeCheck(`aggregate.${metric}`, summary[metric], range);
        if (check) checks.push(check);
    }

    const runCriteria = criteria.run || {};
    if (runCriteria.maxFinalLevel) {
        const maxLevel = Math.max(...runs.map((r) => r.finalState.level));
        checks.push(rangeCheck('run.maxFinalLevel', maxLevel, runCriteria.maxFinalLevel));
    }
    if (runCriteria.minFinalLevel) {
        const minLevel = Math.min(...runs.map((r) => r.finalState.level));
        checks.push(rangeCheck('run.minFinalLevel', minLevel, runCriteria.minFinalLevel));
    }

    return {
        hasCriteria: true,
        designIntent: criteria.designIntent || '',
        pass: checks.every((c) => c.pass),
        checks
    };
}

function toCsv(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers.join(','), ...rows.map((row) => headers.map((h) => esc(row[h])).join(','))].join('\n');
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

    const startedAt = new Date();
    const allResults = [];
    const aggregateRows = [];
    const criteriaRows = [];

    for (const personaName of args.personas) {
        const persona = getPersona(personaName);
        const runs = [];
        console.log(`\n[batch] persona=${personaName} runs=${args.runs} seed=${args.seed}`);

        for (let i = 0; i < args.runs; i++) {
            const seed = args.seed + i;
            const run = runSingleSimulation(persona, {
                persona: personaName,
                seed,
                maxTurns: args.maxTurns,
                verbose: args.verbose
            });
            runs.push(run);
            allResults.push({
                persona: personaName,
                seed,
                turnsPlayed: run.turnsPlayed,
                finalCycles: run.finalState.totalCycles || 0,
                finalLevel: run.finalState.level,
                finalHp: run.finalState.hp,
                finalMoney: +Number(run.finalState.money).toFixed(2),
                finalEnergy: +Number(run.finalState.missileEnergy).toFixed(2),
                kills: Number(run.finalState.stats?.kills) || 0,
                exactHitKills: Number(run.finalState.stats?.exactHitKills) || 0,
                shotsLaunched: Number(run.finalState.stats?.missilesLaunched) || 0,
                energyBlockedTurns: Number(run.simMetrics?.energyBlockedTurns) || 0,
                gameOver: !!run.finalState.isGameOver,
                gameOverReason: run.finalState.gameOverReason || '',
                upgrades: Object.entries(run.upgrades).filter(([, lvl]) => lvl > 0).map(([k, lvl]) => `${k}:L${lvl}`).join('|')
            });
        }

        const summary = summarizeRuns(personaName, runs);
        const criteriaEval = evaluateCriteria(persona, runs, summary);
        const deathLevels = buildDeathLevelHistogram(runs);
        const firstPurchases = buildFirstPurchasesHistogram(runs, 3);
        aggregateRows.push({
            ...summary,
            deathLevels: JSON.stringify(deathLevels),
            firstPurchaseSlot1: JSON.stringify(firstPurchases[0] || {}),
            firstPurchaseSlot2: JSON.stringify(firstPurchases[1] || {}),
            firstPurchaseSlot3: JSON.stringify(firstPurchases[2] || {})
        });
        console.log(`[batch summary] ${JSON.stringify(summary)}`);
        console.log(`[death levels] ${JSON.stringify(deathLevels)}`);
        console.log(`[first purchases] ${JSON.stringify(firstPurchases)}`);
        if (criteriaEval.hasCriteria) {
            console.log(`[criteria] ${criteriaEval.pass ? 'PASS' : 'FAIL'} - ${criteriaEval.designIntent || 'No design intent provided.'}`);
            for (const check of criteriaEval.checks) {
                const rangeText = `${check.min !== undefined ? check.min : '-inf'}..${check.max !== undefined ? check.max : '+inf'}`;
                console.log(`  - ${check.pass ? 'OK' : 'FAIL'} ${check.label}: ${check.value} in ${rangeText}`);
            }
            criteriaRows.push({
                persona: personaName,
                pass: criteriaEval.pass,
                designIntent: criteriaEval.designIntent || '',
                failedChecks: criteriaEval.checks.filter((c) => !c.pass).map((c) => c.label).join('|')
            });
        } else {
            criteriaRows.push({
                persona: personaName,
                pass: true,
                designIntent: '',
                failedChecks: ''
            });
        }
    }

    const manifest = {
        generatedAt: startedAt.toISOString(),
        mode: 'core-batch',
        config: {
            personas: args.personas,
            runs: args.runs,
            seed: args.seed,
            maxTurns: args.maxTurns
        },
        aggregate: aggregateRows,
        criteria: criteriaRows,
        runs: allResults
    };

    const jsonPath = path.join(args.outDir, 'sim-batch-results.json');
    const csvPath = path.join(args.outDir, 'sim-batch-results.csv');
    const aggregateCsvPath = path.join(args.outDir, 'sim-batch-aggregate.csv');
    const criteriaJsonPath = path.join(args.outDir, 'sim-batch-criteria-report.json');
    const criteriaCsvPath = path.join(args.outDir, 'sim-batch-criteria-report.csv');
    fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2));
    fs.writeFileSync(csvPath, toCsv(allResults));
    fs.writeFileSync(aggregateCsvPath, toCsv(aggregateRows));
    fs.writeFileSync(criteriaJsonPath, JSON.stringify({ generatedAt: startedAt.toISOString(), criteria: criteriaRows }, null, 2));
    fs.writeFileSync(criteriaCsvPath, toCsv(criteriaRows));

    console.log('\n[batch output]');
    console.log(`json: ${jsonPath}`);
    console.log(`csv:  ${csvPath}`);
    console.log(`agg:  ${aggregateCsvPath}`);
    console.log(`criteria json: ${criteriaJsonPath}`);
    console.log(`criteria csv:  ${criteriaCsvPath}`);

    const failing = criteriaRows.filter((r) => !r.pass);
    if (failing.length) {
        console.log(`\n[criteria summary] FAIL (${failing.length}/${criteriaRows.length} personas)`);
        if (args.strict) {
            process.exit(2);
        }
    } else {
        console.log('\n[criteria summary] PASS');
    }
}

main();
