const { runSingleSimulation, getPersona } = require('./simulate-game-core.js');

function parseArgs(argv) {
    const args = {
        personas: ['good', 'perfect', '90acc_cheapestCombatUpgrade_1xBanked', '90acc_noUpgrades_1xBanked'],
        costs: [10, 9, 8],
        runs: 100,
        seed: 1337,
        maxTurns: 160
    };
    for (const arg of argv) {
        if (arg.startsWith('--personas=')) args.personas = arg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean);
        else if (arg.startsWith('--costs=')) args.costs = arg.split('=')[1].split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
        else if (arg.startsWith('--runs=')) args.runs = Number(arg.split('=')[1]);
        else if (arg.startsWith('--seed=')) args.seed = Number(arg.split('=')[1]);
        else if (arg.startsWith('--max-turns=')) args.maxTurns = Number(arg.split('=')[1]);
    }
    return args;
}

function avg(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function summarize(runs) {
    return {
        avgFinalLevel: +avg(runs.map((r) => r.finalState.level)).toFixed(2),
        avgFinalCycles: +avg(runs.map((r) => r.finalState.totalCycles || 0)).toFixed(2),
        avgFinalEnergy: +avg(runs.map((r) => Number(r.finalState.missileEnergy) || 0)).toFixed(2),
        avgFinalMoney: +avg(runs.map((r) => Number(r.finalState.money) || 0)).toFixed(2),
        avgEnergyBlockedTurns: +avg(runs.map((r) => Number(r.simMetrics?.energyBlockedTurns) || 0)).toFixed(2),
        avgKills: +avg(runs.map((r) => Number(r.finalState.stats?.kills) || 0)).toFixed(2),
        avgShots: +avg(runs.map((r) => Number(r.finalState.stats?.missilesLaunched) || 0)).toFixed(2)
    };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const rows = [];

    for (const cost of args.costs) {
        console.log(`\n=== MISSILE COST ${cost} ===`);
        for (const personaName of args.personas) {
            const persona = getPersona(personaName);
            if (!persona) {
                console.log(`[skip] unknown persona ${personaName}`);
                continue;
            }
            const runs = [];
            for (let i = 0; i < args.runs; i++) {
                runs.push(runSingleSimulation(persona, {
                    persona: personaName,
                    seed: args.seed + i,
                    maxTurns: args.maxTurns,
                    verbose: false,
                    configOverrides: { MISSILE_MIN_ENERGY_COST: cost }
                }));
            }
            const s = summarize(runs);
            rows.push({ cost, persona: personaName, ...s });
            console.log(`${personaName.padEnd(34)} L=${s.avgFinalLevel} C=${s.avgFinalCycles} ENblk=${s.avgEnergyBlockedTurns} EN=${s.avgFinalEnergy} $=${s.avgFinalMoney}`);
        }
    }

    console.log('\n[json]');
    console.log(JSON.stringify(rows, null, 2));
}

main();
