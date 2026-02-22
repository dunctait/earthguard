const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

async function runViewportCheck(browser, repoRoot, viewport) {
    const page = await browser.newPage({ viewport });
    const outDir = path.join(repoRoot, 'artifacts', 'layout');
    fs.mkdirSync(outDir, { recursive: true });

    await page.goto(pathToFileURL(path.join(repoRoot, 'index.html')).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.game && window.renderer);
    await page.waitForTimeout(250);

    const data = await page.evaluate(() => {
        const rect = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
        };

        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const canvas = rect('#game-canvas');
        const controls = rect('#controls');
        const overlay = rect('#ui-overlay');
        const status = rect('#status');

        return { viewport, canvas, controls, overlay, status };
    });

    const checks = [];
    const pushCheck = (name, ok, detail) => checks.push({ name, ok, detail });

    const { canvas, controls, viewport: vp, status } = data;
    pushCheck('canvas exists', Boolean(canvas), canvas);
    pushCheck('controls exist', Boolean(controls), controls);

    if (canvas) {
        pushCheck('canvas on-screen top', canvas.y >= 0, canvas);
        pushCheck('canvas on-screen left', canvas.x >= -0.5, canvas);
        pushCheck('canvas on-screen right', canvas.right <= vp.width + 0.5, canvas);
        pushCheck('canvas positive height', canvas.height > 100, canvas);
    }

    if (controls) {
        pushCheck('controls on-screen bottom', controls.bottom <= vp.height + 0.5, controls);
        pushCheck('controls positive height', controls.height > 60, controls);
    }

    if (canvas && controls) {
        pushCheck('controls below canvas', controls.y >= canvas.bottom - 1, { canvas, controls });
    }

    if (status) {
        pushCheck('status visible', status.bottom <= vp.height && status.y >= 0, status);
    }

    const fileName = `layout-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: path.join(outDir, fileName), fullPage: true });
    await page.close();

    return {
        viewport,
        ok: checks.every((c) => c.ok),
        checks,
        screenshot: path.join('artifacts', 'layout', fileName)
    };
}

async function main() {
    const repoRoot = path.resolve(__dirname, '..');
    const browser = await chromium.launch({ headless: true });

    const viewports = [
        { width: 375, height: 667 },  // small phone
        { width: 390, height: 844 },  // common phone
        { width: 430, height: 932 }   // larger phone
    ];

    const results = [];
    for (const viewport of viewports) {
        results.push(await runViewportCheck(browser, repoRoot, viewport));
    }

    await browser.close();

    const ok = results.every((r) => r.ok);
    console.log(JSON.stringify({ ok, results }, null, 2));
    if (!ok) process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
