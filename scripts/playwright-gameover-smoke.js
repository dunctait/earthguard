const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

async function main() {
    const repoRoot = path.resolve(__dirname, '..');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            console.error('[page error]', msg.text());
        }
    });

    await page.goto(pathToFileURL(path.join(repoRoot, 'index.html')).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.game && window.renderer);
    await page.evaluate(() => window.game.closeSplash && window.game.closeSplash());

    // Force an earth breach next cycle.
    await page.evaluate(() => {
        if (window.game.aliens[0]) {
            window.game.aliens[0].y = window.game.config.LAUNCHER_Y + 0.2;
        }
        window.game.advance();
    });

    await page.waitForFunction(() => window.game.isGameOver === true);

    const beforeReset = await page.evaluate(() => ({
        isGameOver: window.game.isGameOver,
        summaryOpen: !!window.game.isGameOverSummaryOpen,
        reason: window.game.gameOverReason,
        battleOverlayVisible: !document.querySelector('#game-over-battle-overlay')?.classList.contains('is-hidden'),
        summaryOverlayHidden: document.querySelector('#game-over-overlay')?.classList.contains('is-hidden'),
        playAgainVisible: !document.querySelector('#play-again-btn')?.disabled
    }));

    await page.waitForFunction(() => {
        const btn = document.querySelector('#game-over-continue-btn');
        return btn && !btn.disabled;
    });
    await page.evaluate(() => document.querySelector('#game-over-continue-btn')?.click());
    await page.waitForFunction(() => window.game.isGameOverSummaryOpen === true);

    await page.evaluate(() => document.querySelector('#play-again-btn')?.click());
    await page.waitForFunction(() => window.game.isGameOver === false);

    const afterReset = await page.evaluate(() => ({
        isGameOver: window.game.isGameOver,
        level: window.game.level,
        hp: window.game.baseHP,
        energy: window.game.missileEnergy,
        overlayHidden: document.querySelector('#game-over-overlay')?.classList.contains('is-hidden') ?? false
    }));

    if (!beforeReset.battleOverlayVisible || beforeReset.summaryOpen || !beforeReset.summaryOverlayHidden || !afterReset.overlayHidden || afterReset.level !== 1 || afterReset.hp !== 100) {
        throw new Error(`Game over / reset flow failed: ${JSON.stringify({ beforeReset, afterReset })}`);
    }

    await browser.close();

    console.log(JSON.stringify({
        ok: true,
        beforeReset,
        afterReset
    }, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
