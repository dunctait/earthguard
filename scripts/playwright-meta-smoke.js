const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

async function main() {
    const repoRoot = path.resolve(__dirname, '..');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

    await page.addInitScript(() => {
        localStorage.setItem('earthguard.meta.v1', JSON.stringify({
            schemaVersion: 1,
            totalRuns: 4,
            bestLevelReached: 6,
            metaCurrency: 24,
            metaUpgrades: {},
            bestMoneyByLevel: { '2': 18, '4': 77, '6': 132 },
            lastRun: null
        }));
    });

    await page.goto(pathToFileURL(path.join(repoRoot, 'index.html')).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.game && window.renderer);

    // Open game-over modal and interact with meta + jump controls.
    await page.evaluate(() => window.game.triggerGameOver('EARTH BREACHED'));
    await page.waitForFunction(() => window.game.isGameOver === true);

    const before = await page.evaluate(() => ({
        salvage: Math.floor(window.game.metaProgress?.metaCurrency || 0),
        jumpLevels: Array.from(document.querySelector('#jump-level-select')?.options || []).map((o) => Number(o.value)),
        metaRows: Array.from(document.querySelectorAll('[data-meta-upgrade-key]')).map((el) => ({
            key: el.dataset.metaUpgradeKey,
            disabled: el.disabled,
            text: (el.textContent || '').trim()
        }))
    }));

    await page.evaluate(() => {
        document.querySelector('[data-meta-upgrade-key="startingReserve"]')?.click();
    });

    const afterBuy = await page.evaluate(() => ({
        salvage: Math.floor(window.game.metaProgress?.metaCurrency || 0),
        reserveLevel: window.game.getMetaUpgradeLevel('startingReserve')
    }));

    await page.selectOption('#jump-level-select', '4');
    await page.evaluate(() => document.querySelector('#jump-start-btn')?.click());
    await page.waitForFunction(() => window.game.isGameOver === false);

    const afterJump = await page.evaluate(() => ({
        isGameOver: window.game.isGameOver,
        level: window.game.level,
        money: Math.floor(window.game.money),
        energy: Math.floor(window.game.missileEnergy),
        upgradesBought: Object.values(window.game.upgrades).filter((u) => u.level > 0).length
    }));

    if (before.jumpLevels.length === 0) {
        throw new Error('Expected jump-start options to be available');
    }
    if (afterBuy.reserveLevel < 1 || afterBuy.salvage >= before.salvage) {
        throw new Error(`Meta upgrade purchase failed: ${JSON.stringify({ before, afterBuy })}`);
    }
    if (afterJump.level !== 4 || afterJump.isGameOver || afterJump.upgradesBought !== 0) {
        throw new Error(`Jump start failed: ${JSON.stringify({ afterJump })}`);
    }

    await browser.close();
    console.log(JSON.stringify({ ok: true, before, afterBuy, afterJump }, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
