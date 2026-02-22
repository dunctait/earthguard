const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

async function main() {
    const repoRoot = path.resolve(__dirname, '..');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

    await page.goto(pathToFileURL(path.join(repoRoot, 'index.html')).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.game && window.renderer);
    await page.waitForTimeout(200);

    // Ensure enough energy and a clean starting state.
    await page.evaluate(() => {
        window.game.missileEnergy = 100;
        window.game.power = 0;
        window.game.isCharging = false;
        window.game.notify();
    });

    // Simulate duplicate-start path (touch + mouse) that previously could stack intervals.
    await page.evaluate(() => {
        const btn = document.getElementById('fire-btn');
        btn.dispatchEvent(new Event('touchstart', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new Event('mousedown', { bubbles: true, cancelable: true }));
    });

    const samples = [];
    for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(35);
        samples.push(await page.evaluate(() => window.game.power));
    }

    await page.evaluate(() => {
        const btn = document.getElementById('fire-btn');
        btn.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true }));
        btn.dispatchEvent(new Event('mouseup', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(60);

    const result = await page.evaluate(() => ({
        power: window.game.power,
        pendingMissiles: window.game.pendingMissiles.length,
        isCharging: window.game.isCharging,
        fireText: document.getElementById('fire-btn')?.textContent
    }));

    await browser.close();

    const monotonic = samples.every((v, i) => i === 0 || v >= samples[i - 1]);
    const jumpedToFull = samples.some((v, i) => i < 3 && v >= 90);
    const maxObserved = Math.max(...samples, 0);

    const ok = monotonic && !jumpedToFull && maxObserved < 80 && result.pendingMissiles >= 1 && result.isCharging === false;

    console.log(JSON.stringify({
        ok,
        samples,
        maxObserved,
        monotonic,
        jumpedToFull,
        result
    }, null, 2));

    if (!ok) process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
