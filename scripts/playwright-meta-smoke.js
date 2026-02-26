const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

async function main() {
    const repoRoot = path.resolve(__dirname, '..');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

    await page.addInitScript(() => {
        if (!sessionStorage.getItem('earthguard.meta.seeded') && !localStorage.getItem('earthguard.meta.v1')) {
            localStorage.setItem('earthguard.meta.v1', JSON.stringify({
                schemaVersion: 1,
                totalRuns: 4,
                bestLevelReached: 6,
                metaCurrency: 24,
                metaUpgrades: {},
                bestMoneyByLevel: { '2': 18, '4': 77, '6': 132 },
                preferredJumpStartLevel: 2,
                lastRun: null,
                runHistory: [],
                careerBest: { maxRunMoney: 120, maxKills: 18, maxCycles: 22, maxSalvageReward: 4 }
            }));
        }
        sessionStorage.setItem('earthguard.meta.seeded', '1');
    });

    await page.goto(pathToFileURL(path.join(repoRoot, 'index.html')).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.game && window.renderer);
    await page.evaluate(() => window.game.closeSplash && window.game.closeSplash());

    // Re-open splash to test splash controls.
    await page.evaluate(() => window.game.openSplash && window.game.openSplash());
    const clearDataBefore = await page.evaluate(() => ({
        runs: Math.floor(window.game.metaProgress?.totalRuns || 0),
        label: (document.querySelector('#splash-clear-data-btn')?.textContent || '').trim()
    }));
    await page.evaluate(() => document.querySelector('#splash-clear-data-btn')?.click());
    const clearDataArmed = await page.evaluate(() => ({
        runs: Math.floor(window.game.metaProgress?.totalRuns || 0),
        label: (document.querySelector('#splash-clear-data-btn')?.textContent || '').trim()
    }));
    await page.evaluate(() => window.game.closeSplash && window.game.closeSplash());

    // Open game-over modal and interact with meta + jump controls.
    await page.evaluate(() => window.game.triggerGameOver('EARTH BREACHED'));
    await page.waitForFunction(() => window.game.isGameOver === true);
    await page.waitForFunction(() => {
        const btn = document.querySelector('#game-over-continue-btn');
        return btn && !btn.disabled;
    });
    await page.evaluate(() => document.querySelector('#game-over-continue-btn')?.click());
    await page.waitForFunction(() => window.game.isGameOverSummaryOpen === true);

    const before = await page.evaluate(() => ({
        salvage: Math.floor(window.game.metaProgress?.metaCurrency || 0),
        jumpLevels: Array.from(document.querySelector('#jump-level-select')?.options || []).map((o) => Number(o.value)),
        jumpSelected: Number(document.querySelector('#jump-level-select')?.value || 0),
        metaRows: Array.from(document.querySelectorAll('[data-meta-upgrade-key]')).map((el) => ({
            key: el.dataset.metaUpgradeKey,
            disabled: el.disabled,
            text: (el.textContent || '').trim()
        }))
    }));

    await page.evaluate(() => document.querySelector('#jump-highest-btn')?.click());
    const afterHighest = await page.evaluate(() => ({
        jumpSelected: Number(document.querySelector('#jump-level-select')?.value || 0),
        highestDisabled: !!document.querySelector('#jump-highest-btn')?.disabled,
        jumpText: (document.querySelector('#jump-start-btn')?.textContent || '').trim()
    }));

    await page.evaluate(() => {
        document.querySelector('[data-meta-upgrade-key="startingReserve"]')?.click();
    });

    const afterBuy = await page.evaluate(() => ({
        salvage: Math.floor(window.game.metaProgress?.metaCurrency || 0),
        reserveLevel: window.game.getMetaUpgradeLevel('startingReserve')
    }));

    await page.selectOption('#jump-level-select', '4');
    await page.evaluate(() => window.game.metaProgress && (window.game.metaProgress.totalRuns = 10));
    await page.evaluate(() => document.querySelector('#jump-start-btn')?.click());
    await page.waitForFunction(() => window.game.isGameOver === false);

    const afterJump = await page.evaluate(() => ({
        isGameOver: window.game.isGameOver,
        level: window.game.level,
        money: Math.floor(window.game.money),
        energy: Math.floor(window.game.missileEnergy),
        upgradesBought: Object.values(window.game.upgrades).filter((u) => u.level > 0).length
    }));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.game && window.renderer);
    const afterReload = await page.evaluate(() => ({
        salvage: Math.floor(window.game.metaProgress?.metaCurrency || 0),
        reserveLevel: window.game.getMetaUpgradeLevel('startingReserve'),
        startMoney: Math.floor(window.game.money || 0),
        jumpLevels: Array.from(window.game.getAvailableJumpStartLevels() || []).map((j) => j.level),
        preferredJumpStartLevel: Math.floor(window.game.metaProgress?.preferredJumpStartLevel || 0),
        careerBestKills: Math.floor(window.game.metaProgress?.careerBest?.maxKills || 0)
    }));

    if (before.jumpLevels.length === 0) {
        throw new Error('Expected jump-start options to be available');
    }
    if (clearDataBefore.runs !== clearDataArmed.runs || !/CONFIRM/i.test(clearDataArmed.label)) {
        throw new Error(`Clear data confirmation did not arm correctly: ${JSON.stringify({ clearDataBefore, clearDataArmed })}`);
    }
    if (afterHighest.jumpSelected !== 6) {
        throw new Error(`Highest jump helper failed: ${JSON.stringify({ before, afterHighest })}`);
    }
    if (!afterHighest.highestDisabled || afterHighest.jumpText !== 'JUMP L6') {
        throw new Error(`Jump control labels/state incorrect: ${JSON.stringify({ afterHighest })}`);
    }
    if (afterBuy.reserveLevel < 1 || afterBuy.salvage >= before.salvage) {
        throw new Error(`Meta upgrade purchase failed: ${JSON.stringify({ before, afterBuy })}`);
    }
    if (afterJump.level !== 4 || afterJump.isGameOver || afterJump.upgradesBought !== 0) {
        throw new Error(`Jump start failed: ${JSON.stringify({ afterJump })}`);
    }
    if (afterReload.reserveLevel < 1 || afterReload.salvage !== afterBuy.salvage) {
        throw new Error(`Meta persistence reload failed: ${JSON.stringify({ afterBuy, afterReload })}`);
    }
    if (afterReload.preferredJumpStartLevel !== 4) {
        throw new Error(`Preferred jump persistence failed: ${JSON.stringify({ afterReload })}`);
    }
    if (afterReload.careerBestKills !== 18) {
        throw new Error(`Career best persistence missing: ${JSON.stringify({ afterReload })}`);
    }

    // Clear local data flow should require confirmation and then wipe progress.
    await page.evaluate(() => window.game.openSplash && window.game.openSplash());
    await page.evaluate(() => document.querySelector('#splash-clear-data-btn')?.click());
    await page.evaluate(() => document.querySelector('#splash-clear-data-btn')?.click());
    const afterClear = await page.evaluate(() => ({
        splashOpen: !!window.game.isSplashOpen,
        totalRuns: Math.floor(window.game.metaProgress?.totalRuns || 0),
        salvage: Math.floor(window.game.metaProgress?.metaCurrency || 0),
        bestLevel: Math.floor(window.game.metaProgress?.bestLevelReached || 0),
        jumpCount: Array.from(window.game.getAvailableJumpStartLevels?.() || []).length
    }));
    if (!afterClear.splashOpen || afterClear.totalRuns !== 0 || afterClear.salvage !== 0 || afterClear.bestLevel !== 0 || afterClear.jumpCount !== 0) {
        throw new Error(`Clear local data did not reset progress: ${JSON.stringify({ afterClear })}`);
    }

    // Fresh boot after clear should skip splash.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.game && window.renderer);
    const freshBoot = await page.evaluate(() => ({
        splashOpen: !!window.game.isSplashOpen,
        totalRuns: Math.floor(window.game.metaProgress?.totalRuns || 0)
    }));
    if (freshBoot.splashOpen !== false || freshBoot.totalRuns !== 0) {
        throw new Error(`Fresh boot after clear should skip splash: ${JSON.stringify({ freshBoot })}`);
    }

    await browser.close();
    console.log(JSON.stringify({ ok: true, clearDataBefore, clearDataArmed, before, afterHighest, afterBuy, afterJump, afterReload, afterClear, freshBoot }, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
