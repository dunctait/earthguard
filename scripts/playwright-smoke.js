const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

async function holdMouse(page, selector, ms) {
    const el = page.locator(selector);
    await el.hover();
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
}

async function main() {
    const headed = process.argv.includes('--headed');
    const slowMoArg = process.argv.find((arg) => arg.startsWith('--slowmo='));
    const slowMo = slowMoArg ? Number(slowMoArg.split('=')[1]) : 0;
    const repoRoot = path.resolve(__dirname, '..');
    const indexPath = path.join(repoRoot, 'index.html');
    const outDir = path.join(repoRoot, 'artifacts');
    const outFile = path.join(outDir, 'playwright-smoke.png');

    fs.mkdirSync(outDir, { recursive: true });

    const browser = await chromium.launch({ headless: !headed, slowMo: Number.isFinite(slowMo) ? slowMo : 0 });
    const page = await browser.newPage({
        viewport: { width: 430, height: 932 } // portrait phone-ish
    });

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            console.error('[page error]', msg.text());
        }
    });

    await page.goto(pathToFileURL(indexPath).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.game && window.renderer);
    await page.waitForTimeout(250);

    const initialAngle = await page.locator('#angle-display').textContent();

    // Rotation controls
    await page.click('#rot-right-small');
    await page.waitForTimeout(50);
    await page.click('#rot-left-small');
    await page.waitForTimeout(50);
    await holdMouse(page, '#rot-right-big', 150);

    // Charging / firing (hold long enough to exceed min power threshold)
    await holdMouse(page, '#fire-btn', 240);
    await page.waitForTimeout(100);

    // Advance if a missile was locked
    const pendingBeforeAdvance = await page.evaluate(() => window.game.pendingMissiles.length);
    if (pendingBeforeAdvance > 0) {
        await page.click('#advance-btn');
        await page.waitForTimeout(500);
    }

    // Upgrade flow: open menu, grant resources in test context, buy upgrade, verify UI reacts
    await page.click('#upgrade-menu-btn');
    await page.waitForTimeout(50);
    await page.evaluate(() => {
        window.game.money = 999;
        window.game.missileEnergy = Math.max(window.game.missileEnergy, 100);
        window.game.notify();
    });
    await page.waitForTimeout(50);
    await page.click('#upgrade-target-flag-btn');
    await page.waitForTimeout(100);

    const results = await page.evaluate(() => ({
        angleText: document.querySelector('#angle-display')?.textContent,
        powerBarWidth: document.querySelector('#power-bar')?.style.width,
        fireText: document.querySelector('#fire-btn')?.textContent,
        upgradeText: document.querySelector('#upgrade-target-flag-btn')?.textContent,
        targetAreaUnlocked: Boolean(window.game?.upgrades?.targetAreas?.level > 0),
        pendingMissiles: window.game?.pendingMissiles?.length ?? null,
        isAnimating: Boolean(window.game?.isAnimating),
        initialAngleText: null
    }));
    results.initialAngleText = initialAngle;

    await page.screenshot({ path: outFile, fullPage: true });
    await browser.close();

    console.log(JSON.stringify({
        ok: true,
        headed,
        screenshot: path.relative(repoRoot, outFile),
        results
    }, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
