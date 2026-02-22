/**
 * EarthGuard - Canvas Renderer
 * Retro vector style with depth hierarchy and motion
 */

class Renderer {
    constructor(game) {
        this.game = game;
        this.utils = window.EarthGuardUtils || {
            lerp: (a, b, t) => a + (b - a) * t,
            distance: (dx, dy) => Math.sqrt((dx * dx) + (dy * dy)),
            bindHoldAction: () => {},
            bindPressHandlers: () => {},
            cacheDom: () => ({})
        };
        this.dom = this.utils.cacheDom([
            'game-canvas',
            'controls',
            'upgrade-menu-btn',
            'upgrade-modal-overlay',
            'upgrade-menu',
            'upgrade-menu-close-btn',
            'rot-left-big',
            'rot-left-small',
            'rot-right-small',
            'rot-right-big',
            'fire-btn',
            'advance-btn'
        ]);
        this.canvas = this.dom['game-canvas'];
        this.ctx = this.canvas.getContext('2d');
        this.theme = window.EarthGuardTheme || null;

        const t = this.theme;
        this.colors = t ? {
            primary: t.palette.greenPrimary,
            primaryGlow: t.glow.primaryStrong,
            primaryGlowSoft: t.glow.primaryMedium,
            secondary: t.palette.greenSecondary,
            secondaryGlow: t.glow.secondaryMedium,
            tertiary: t.palette.greenTertiary,
            tertiaryGlow: t.glow.tertiarySubtle,
            enemy: t.palette.redEnemy,
            enemyGlow: t.glow.enemy,
            amber: t.palette.amberWarning,
            amberGlow: t.glow.amber,
            cyan: t.palette.cyanTargeting,
            white: t.palette.whiteHot,
            black: t.palette.bgBlack,
            bgTop: t.palette.bgTop,
            bgBottom: t.palette.bgBottom,
            grid: t.palette.grid,
            scanline: t.palette.scanline
        } : {
            primary: '#00ff66',
            primaryGlow: 'rgba(0, 255, 102, 0.6)',
            primaryGlowSoft: 'rgba(0, 255, 102, 0.35)',
            secondary: '#00aa44',
            secondaryGlow: 'rgba(0, 170, 68, 0.4)',
            tertiary: '#004422',
            tertiaryGlow: 'rgba(0, 68, 34, 0.2)',
            enemy: '#ff3344',
            enemyGlow: 'rgba(255, 51, 68, 0.5)',
            amber: '#ffaa00',
            amberGlow: 'rgba(255, 170, 0, 0.45)',
            cyan: '#00ffff',
            white: '#ffffff',
            black: '#000000',
            bgTop: '#000800',
            bgBottom: '#001a08',
            grid: 'rgba(0, 255, 102, 0.05)',
            scanline: 'rgba(0, 20, 0, 0.05)'
        };

        // Animation state
        this.frameCount = 0;
        this.stars = [];
        this.terrainPoints = null;
        this.lastMissileCount = 0;
        this.lastExplosionCount = 0;
        this.cannonRecoil = 0;
        this.impactFlash = 0;
        this.seenGameExplosionIds = new Set();
        this.seenEnemyDeathFxIds = new Set();
        this.seenWaveClearFxIds = new Set();
        this.playerExplosionFx = [];
        this.enemyExplosionFx = [];
        this.waveClearBanners = [];

        this.generateStars();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        if (typeof ResizeObserver !== 'undefined' && this.dom.controls) {
            this.controlsResizeObserver = new ResizeObserver(() => this.resize());
            this.controlsResizeObserver.observe(this.dom.controls);
        }
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => this.resize()).catch(() => {});
        }

        this.setupInput();

        this.game.onStateChange = () => {
            this.render();
            this.game.updateUI();
        };

        this.game.updateUI();

        // Start animation loop for continuous motion
        this.animate();
    }

    generateStars() {
        this.stars = [];
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random() * 0.7,
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.0001 + 0.00005,
                brightness: Math.random() * 0.3 + 0.1
            });
        }
    }

    resize() {
        const container = this.canvas.parentElement;
        const controlsHeight = Math.ceil(this.dom.controls.getBoundingClientRect().height || this.dom.controls.offsetHeight || 150);
        const availableWidth = container.clientWidth;
        const availableHeight = Math.max(120, container.clientHeight - controlsHeight);

        // Target aspect ratio (portrait - taller than wide)
        const targetAspect = 9 / 16; // width / height

        let canvasWidth, canvasHeight;

        if (availableWidth / availableHeight > targetAspect) {
            // Too wide - constrain by height
            canvasHeight = availableHeight;
            canvasWidth = canvasHeight * targetAspect;
        } else {
            // Too tall - constrain by width
            canvasWidth = availableWidth;
            canvasHeight = canvasWidth / targetAspect;
        }

        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;

        // Center and size the displayed canvas to match the internal buffer.
        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;
        this.canvas.style.marginLeft = `${Math.max(0, (availableWidth - canvasWidth) / 2)}px`;
        this.canvas.style.marginRight = `${Math.max(0, (availableWidth - canvasWidth) / 2)}px`;

        this.generateTerrain();
        this.render();
    }

    generateTerrain() {
        const w = this.canvas.width;
        const baseY = this.canvas.height - 25;
        const points = [];
        const segments = 50;

        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * w;
            const normalizedX = i / segments;

            // Central hill
            const distFromCenter = Math.abs(normalizedX - 0.5);
            const hillHeight = Math.exp(-distFromCenter * distFromCenter * 18) * 30;

            // Noise layers
            const noise1 = Math.sin(i * 1.3) * 4;
            const noise2 = Math.sin(i * 3.1) * 2;
            const noise3 = Math.sin(i * 7.3) * 1;

            points.push({ x, y: baseY - hillHeight - noise1 - noise2 - noise3 });
        }

        this.terrainPoints = points;
        this.hillTopY = baseY - 30;
    }

    setupInput() {
        this.utils.bindHoldAction(this.dom['rot-left-big'], () => this.game.rotateLeft(10));
        this.utils.bindHoldAction(this.dom['rot-left-small'], () => this.game.rotateLeft(1));
        this.utils.bindHoldAction(this.dom['rot-right-small'], () => this.game.rotateRight(1));
        this.utils.bindHoldAction(this.dom['rot-right-big'], () => this.game.rotateRight(10));

        const fireBtn = this.dom['fire-btn'];
        let chargeInterval = null;

        const startCharge = () => {
            // Guard against duplicate mouse+touch event sequences creating stacked timers.
            if (chargeInterval || this.game.isCharging) return;
            const started = this.game.startCharging();
            if (!started) return;
            chargeInterval = setInterval(() => this.game.updateCharge(), this.game.config.POWER_UPDATE_INTERVAL);
        };

        const stopCharge = () => {
            if (chargeInterval) {
                clearInterval(chargeInterval);
                chargeInterval = null;
            }
            if (!this.game.isCharging) return;
            this.game.stopCharging();
        };

        this.utils.bindPressHandlers(fireBtn, { onStart: startCharge, onEnd: stopCharge });

        this.dom['advance-btn'].addEventListener('click', () => this.game.advance());
        if (this.dom['upgrade-menu-btn']) {
            this.dom['upgrade-menu-btn'].addEventListener('click', () => this.game.toggleUpgradeMenu());
        }
        if (this.dom['upgrade-menu-close-btn']) {
            this.dom['upgrade-menu-close-btn'].addEventListener('click', () => this.game.closeUpgradeMenu());
        }
        if (this.dom['upgrade-menu']) {
            this.dom['upgrade-menu'].addEventListener('click', (event) => {
                const button = event.target.closest('[data-upgrade-key]');
                if (!button) return;
                this.game.purchaseUpgrade(button.dataset.upgradeKey);
            });
        }
        if (this.dom['upgrade-modal-overlay']) {
            this.dom['upgrade-modal-overlay'].addEventListener('click', (event) => {
                if (event.target === this.dom['upgrade-modal-overlay']) {
                    this.game.closeUpgradeMenu();
                }
            });
        }
    }

    animate() {
        this.frameCount++;
        this.render();
        requestAnimationFrame(() => this.animate());
    }

    worldToScreen(x, y) {
        const scaleX = this.canvas.width / this.game.WORLD_WIDTH;
        const scaleY = this.canvas.height / this.game.WORLD_HEIGHT;
        return {
            x: x * scaleX,
            y: this.canvas.height - (y * scaleY)
        };
    }

    worldToScreenSize(size) {
        return size * (this.canvas.width / this.game.WORLD_WIDTH);
    }

    gameAngleToRad(angle) {
        return (90 - angle) * Math.PI / 180;
    }

    // Layered glow: core + medium halo + large halo
    setGlow(color, blur = 10) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = blur;
    }

    clearGlow() {
        this.ctx.shadowBlur = 0;
    }

    drawBloomStroke(drawPath, coreColor, glowColor, coreWidth, mediumBlur = 8, largeBlur = 16, alpha = 1) {
        const ctx = this.ctx;

        ctx.save();
        ctx.globalAlpha = alpha * 0.1;
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = coreWidth + 6;
        this.setGlow(glowColor, largeBlur);
        drawPath();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = coreWidth + 2;
        this.setGlow(glowColor, mediumBlur);
        drawPath();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = coreWidth;
        this.setGlow(glowColor, Math.max(2, Math.round(mediumBlur * 0.5)));
        drawPath();
        ctx.stroke();
        ctx.restore();

        this.clearGlow();
    }

    drawBloomCircle(x, y, radius, coreColor, glowColor, coreWidth, alpha = 1) {
        this.drawBloomStroke(() => {
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        }, coreColor, glowColor, coreWidth, 10, 20, alpha);
    }

    getDepthBrightness(y) {
        const h = this.canvas.height || 1;
        const t = Math.max(0, Math.min(1, y / h));
        if (t < 0.5) {
            return this.utils.lerp(0.7, 0.85, t / 0.5);
        }
        return this.utils.lerp(0.85, 1, (t - 0.5) / 0.5);
    }

    updateVisualEffects() {
        const missileCount = this.game.missiles.filter((m) => !m.exploded).length;
        const explosionCount = this.game.explosions.length;

        if (missileCount > this.lastMissileCount) {
            this.cannonRecoil = 1;
        }

        if (explosionCount > this.lastExplosionCount) {
            this.impactFlash = 1;
        }

        this.lastMissileCount = missileCount;
        this.lastExplosionCount = explosionCount;

        this.cannonRecoil *= 0.82;
        this.impactFlash *= 0.88;

        for (const fx of this.playerExplosionFx) fx.age++;
        for (const fx of this.enemyExplosionFx) fx.age++;
        for (const banner of this.waveClearBanners) banner.age++;
        this.playerExplosionFx = this.playerExplosionFx.filter((fx) => fx.age <= fx.maxAge);
        this.enemyExplosionFx = this.enemyExplosionFx.filter((fx) => fx.age <= fx.maxAge);
        this.waveClearBanners = this.waveClearBanners.filter((fx) => fx.age <= fx.maxAge);
    }

    syncFxFromGameState() {
        for (const explosion of this.game.explosions || []) {
            if (this.seenGameExplosionIds.has(explosion.id)) continue;
            this.seenGameExplosionIds.add(explosion.id);
            this.playerExplosionFx.push({
                x: explosion.x,
                y: explosion.y,
                radius: explosion.radius,
                age: 0,
                maxAge: 18
            });
        }

        for (const event of this.game.enemyDeathFxEvents || []) {
            if (this.seenEnemyDeathFxIds.has(event.id)) continue;
            this.seenEnemyDeathFxIds.add(event.id);
            this.enemyExplosionFx.push({
                x: event.x,
                y: event.y,
                radius: event.radius,
                age: 0,
                maxAge: 14,
                exactHit: Boolean(event.exactHit)
            });
        }

        for (const event of this.game.waveClearFxEvents || []) {
            if (this.seenWaveClearFxIds.has(event.id)) continue;
            this.seenWaveClearFxIds.add(event.id);
            this.waveClearBanners.push({
                title: event.title,
                subtitle: event.subtitle || '',
                age: 0,
                maxAge: 85
            });
        }
    }

    drawTransientExplosionFxList(list, mode = 'player') {
        const ctx = this.ctx;
        const c = this.colors;
        const isEnemy = mode === 'enemy';

        for (const fx of list) {
            const pos = this.worldToScreen(fx.x, fx.y);
            const radius = this.worldToScreenSize(fx.radius);
            const progress = fx.age / Math.max(1, fx.maxAge);
            const alpha = Math.max(0, 1 - progress);
            const depth = this.getDepthBrightness(pos.y);
            const coreColor = isEnemy ? c.enemy : c.primary;
            const glowColor = isEnemy ? c.enemyGlow : c.primaryGlow;
            if (!isEnemy) {
                this.drawBloomCircle(
                    pos.x,
                    pos.y,
                    radius * (0.35 + progress * 0.9),
                    coreColor,
                    glowColor,
                    3,
                    alpha * depth * 0.9
                );

                ctx.strokeStyle = `rgba(0, 255, 102, ${alpha * 0.45 * depth})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius * (0.6 + progress * 1.4), 0, Math.PI * 2);
                ctx.stroke();
            }

            const sparkCount = isEnemy ? 10 : 14;
            for (let i = 0; i < sparkCount; i++) {
                const seed = (i / sparkCount) * Math.PI * 2 + (fx.x * 0.13) + (fx.y * 0.19);
                const travel = radius * (0.25 + progress * (isEnemy ? 0.9 : 1.2));
                const sx = pos.x + Math.cos(seed + progress * 2.2) * travel;
                const sy = pos.y + Math.sin(seed + progress * 2.2) * travel;
                const sparkAlpha = alpha * (isEnemy ? 0.5 : 0.35);
                if (isEnemy) {
                    // Debris-like shard strokes instead of circular blast rings.
                    const len = 3 + (i % 4) + progress * 4;
                    const ang = seed + progress * 1.7;
                    const ex = sx + Math.cos(ang) * len;
                    const ey = sy + Math.sin(ang) * len;
                    ctx.strokeStyle = `rgba(255, 70, 70, ${sparkAlpha * depth})`;
                    ctx.lineWidth = 1 + ((i % 2) * 0.4);
                    this.setGlow(c.enemyGlow, 6);
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(ex, ey);
                    ctx.stroke();
                    this.clearGlow();
                }
                ctx.fillStyle = isEnemy
                    ? `rgba(255, 70, 70, ${sparkAlpha * depth})`
                    : `rgba(180, 255, 210, ${sparkAlpha * depth})`;
                ctx.beginPath();
                ctx.arc(sx, sy, isEnemy ? 1.0 : 1.1, 0, Math.PI * 2);
                ctx.fill();
            }

            if (isEnemy && alpha > 0.2) {
                ctx.fillStyle = `rgba(255, 120, 120, ${alpha * 0.12 * depth})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius * (0.4 + progress * 0.4), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const config = this.game.config;
        const c = this.colors;
        const time = this.frameCount * 0.02;
        this.updateVisualEffects();
        this.syncFxFromGameState();

        // Gradient background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, c.bgTop);
        bgGrad.addColorStop(1, c.bgBottom);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Faint radar grid for depth
        ctx.strokeStyle = c.grid;
        ctx.lineWidth = 1;
        for (let gy = 24; gy < h; gy += 120) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
        }
        for (let gx = 24; gx < w; gx += 160) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
            ctx.stroke();
        }

        // Parallax stars with drift
        for (const star of this.stars) {
            const x = star.x * w;
            const y = ((star.y + time * star.speed) % 0.7) * h;
            const flicker = 0.7 + Math.sin(time * 3 + star.x * 100) * 0.3;

            ctx.fillStyle = `rgba(0, 255, 102, ${star.brightness * flicker})`;
            ctx.beginPath();
            ctx.arc(x, y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Subtle scanlines
        ctx.fillStyle = c.scanline;
        for (let y = 0; y < h; y += 4) {
            ctx.fillRect(0, y, w, 1);
        }

        const camX = Math.sin(time * 0.4) * 0.5;
        const camY = Math.cos(time * 0.33) * 0.5;
        ctx.save();
        ctx.translate(camX, camY);

        const cannonX = w / 2;
        const cannonY = this.hillTopY - 5;
        const angleRad = this.gameAngleToRad(this.game.launcherAngle);

        // Terrain with glow
        if (this.terrainPoints && this.terrainPoints.length > 0) {
            const drawTerrainPath = () => {
                ctx.beginPath();
                ctx.moveTo(this.terrainPoints[0].x, this.terrainPoints[0].y);
                for (let i = 1; i < this.terrainPoints.length; i++) {
                    ctx.lineTo(this.terrainPoints[i].x, this.terrainPoints[i].y);
                }
            };

            // Under-shadow line for lit terrain edge
            ctx.strokeStyle = 'rgba(0, 40, 10, 0.6)';
            ctx.lineWidth = 3;
            drawTerrainPath();
            ctx.stroke();

            this.drawBloomStroke(drawTerrainPath, c.secondary, c.secondaryGlow, 2, 8, 18, 0.85);

            // Highlight ridge
            ctx.strokeStyle = c.primary;
            ctx.lineWidth = 1;
            this.setGlow(c.primaryGlowSoft, 6);
            ctx.beginPath();
            ctx.moveTo(this.terrainPoints[0].x, this.terrainPoints[0].y);
            for (let i = 1; i < this.terrainPoints.length; i++) {
                ctx.lineTo(this.terrainPoints[i].x, this.terrainPoints[i].y - 1);
            }
            ctx.stroke();
            this.clearGlow();
        }

        // Ground reflection glow
        ctx.fillStyle = 'rgba(0, 170, 68, 0.06)';
        ctx.fillRect(0, h - 40, w, 40);

        // Locked missiles predictions
        const lockedPredictions = this.game.getLockedMissilesPredictions();
        for (const pred of lockedPredictions) {
            const predScreen = this.worldToScreen(pred.x, pred.y);
            const predRadius = this.worldToScreenSize(pred.radius);

            if (this.game.hasUpgrade('targetAreas')) {
                ctx.setLineDash([4, 4]);
                this.drawBloomCircle(predScreen.x, predScreen.y, predRadius, c.secondary, c.secondaryGlow, 1, this.getDepthBrightness(predScreen.y));
                ctx.setLineDash([]);
            }
        }

        // Current charging prediction
        const prediction = this.game.getPrediction();
        if (prediction && !this.game.isAnimating) {
            const predScreen = this.worldToScreen(prediction.x, prediction.y);
            const predRadius = this.worldToScreenSize(prediction.radius);

            if (this.game.hasUpgrade('targetAreas')) {
                ctx.setLineDash([4, 4]);
                this.drawBloomCircle(predScreen.x, predScreen.y, predRadius, c.amber, c.amberGlow, 1, this.getDepthBrightness(predScreen.y));
                ctx.setLineDash([]);
            }

            // Animated trajectory dots
            this.drawAnimatedTrajectory(cannonX, cannonY, predScreen.x, predScreen.y);
        }

        // Aiming guide (animated dots)
        if (!this.game.isAnimating && !prediction) {
            const endX = cannonX + Math.cos(angleRad) * h;
            const endY = cannonY - Math.sin(angleRad) * h;
            this.drawAnimatedTrajectory(cannonX, cannonY, endX, endY, true);
        }

        // Cannon
        this.drawCannon(cannonX, cannonY, angleRad);

        // Missiles in flight
        for (const missile of this.game.missiles) {
            if (missile.exploded) continue;

            const endPos = this.worldToScreen(missile.targetX, missile.targetY);
            const currentX = cannonX + (endPos.x - cannonX) * missile.progress;
            const currentY = cannonY + (endPos.y - cannonY) * missile.progress;
            const missileAlpha = this.getDepthBrightness(currentY);

            // Missile with layered glow
            this.setGlow(c.primaryGlow, 18);
            ctx.fillStyle = `rgba(0, 255, 102, ${missileAlpha})`;
            ctx.beginPath();
            ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Bright core
            ctx.fillStyle = c.white;
            ctx.beginPath();
            ctx.arc(currentX, currentY, 2, 0, Math.PI * 2);
            ctx.fill();
            this.clearGlow();

            // Trail
            ctx.strokeStyle = `rgba(0, 170, 68, ${Math.max(0.35, missileAlpha * 0.75)})`;
            ctx.lineWidth = 2;
            const trailProgress = Math.max(0, missile.progress - 0.2);
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(
                cannonX + (endPos.x - cannonX) * trailProgress,
                cannonY + (endPos.y - cannonY) * trailProgress
            );
            ctx.stroke();

            // Target zone
            const radius = this.worldToScreenSize(missile.explosionRadius || this.game.getCurrentExplosionRadius());
            ctx.strokeStyle = `rgba(0, 68, 34, ${this.getDepthBrightness(endPos.y) * 0.8})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 6]);
            ctx.beginPath();
            ctx.arc(endPos.x, endPos.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Explosions
        for (const explosion of this.game.explosions) {
            const pos = this.worldToScreen(explosion.x, explosion.y);
            const radius = this.worldToScreenSize(explosion.radius);
            const progress = explosion.age / explosion.maxAge;
            const alpha = 1 - progress;
            const depth = this.getDepthBrightness(pos.y);

            // Outer ring
            this.drawBloomCircle(pos.x, pos.y, radius * (0.3 + progress * 0.7), c.primary, c.primaryGlow, 3, alpha * depth * 0.7);

            // Inner ring
            ctx.strokeStyle = `rgba(0, 255, 102, ${alpha * depth})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius * 0.5 * (1 - progress), 0, Math.PI * 2);
            ctx.stroke();

            // Expanding shockwave line
            ctx.strokeStyle = `rgba(255,255,255, ${alpha * 0.16})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius * (0.6 + progress * 1.8), 0, Math.PI * 2);
            ctx.stroke();

            // Flash
            if (progress < 0.2) {
                ctx.fillStyle = `rgba(255, 255, 255, ${(1 - progress * 5) * 0.5 * depth})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Spark particles (renderer-only, derived from explosion progress)
            const sparkCount = 14;
            for (let i = 0; i < sparkCount; i++) {
                const seed = (i / sparkCount) * Math.PI * 2 + (explosion.x * 0.17) + (explosion.y * 0.11);
                const travel = radius * (0.35 + progress * 1.15);
                const sx = pos.x + Math.cos(seed + progress * 2.6) * travel;
                const sy = pos.y + Math.sin(seed + progress * 2.6) * travel;
                const sparkAlpha = alpha * (0.25 + ((i % 3) * 0.12));
                ctx.fillStyle = `rgba(180, 255, 210, ${sparkAlpha * 0.6})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
            this.clearGlow();
        }

        // Persistent renderer-driven explosion FX, so impacts remain visible after turn cleanup.
        this.drawTransientExplosionFxList(this.playerExplosionFx, 'player');
        this.drawTransientExplosionFxList(this.enemyExplosionFx, 'enemy');

        // Blast residue markers (persist for one turn to show last impact locations)
        for (const residue of this.game.blastResidue || []) {
            const pos = this.worldToScreen(residue.x, residue.y);
            const radius = this.worldToScreenSize(residue.radius);
            const depth = this.getDepthBrightness(pos.y);

            const isRedResidue = residue.color === 'red';
            ctx.strokeStyle = isRedResidue
                ? `rgba(255, 80, 90, ${0.24 * depth})`
                : `rgba(0, 170, 68, ${0.28 * depth})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius * (isRedResidue ? 0.65 : 0.9), 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            for (const p of residue.particles) {
                const px = pos.x + this.worldToScreenSize(p.x);
                const py = pos.y - this.worldToScreenSize(p.y);
                ctx.fillStyle = isRedResidue
                    ? `rgba(255, 80, 90, ${Math.min(0.5, p.alpha * 1.7) * depth})`
                    : `rgba(120, 255, 170, ${Math.min(0.72, p.alpha * 2.2) * depth})`;
                ctx.beginPath();
                ctx.arc(px, py, p.size + (isRedResidue ? 0.2 : 0.5), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Incoming next-wave previews (dimmed, non-interactive), revealed after a few cycles.
        if ((this.game.levelCycles || 0) >= (this.game.config.INCOMING_PREVIEW_REVEAL_CYCLE || 2)) {
            for (const alien of (this.game.incomingAliens || [])) {
                const pos = this.worldToScreen(alien.x, alien.y);
                // Keep previews in upper staging area to avoid overlap clutter.
                if (pos.y > h * 0.38 || pos.y < -40) continue;
                const size = this.worldToScreenSize(alien.radius);
                const distanceAlpha = Math.max(0.3, this.getDepthBrightness(pos.y) * 0.45);
                this.drawUFO(pos.x, pos.y, size, distanceAlpha);
            }
        }

        // Active aliens
        for (const alien of this.game.aliens) {
            const pos = this.worldToScreen(alien.x, alien.y);
            const size = this.worldToScreenSize(alien.radius);
            const distanceAlpha = Math.max(0.7, this.getDepthBrightness(pos.y));
            this.drawUFO(pos.x, pos.y, size, distanceAlpha);
        }

        ctx.restore();

        if (this.impactFlash > 0.02) {
            ctx.fillStyle = `rgba(180, 255, 220, ${this.impactFlash * 0.08})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Corner brackets instead of full border
        this.drawCornerBrackets();
        this.drawWaveClearBanners();
    }

    drawAnimatedTrajectory(x1, y1, x2, y2, faded = false) {
        const ctx = this.ctx;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = this.utils.distance(dx, dy);
        const dotSpacing = 12;
        const dotCount = Math.floor(dist / dotSpacing);
        const animOffset = (this.frameCount * 0.5) % dotSpacing;
        const fadeStrength = (typeof this.game.getTrajectoryFadeStrength === 'function')
            ? this.game.getTrajectoryFadeStrength()
            : (this.game.config.TRAJECTORY_FADE_STRENGTH || 1.8);

        for (let i = 0; i < dotCount; i++) {
            const t = (i * dotSpacing + animOffset) / dist;
            if (t > 1) continue;

            const x = x1 + dx * t;
            const y = y1 + dy * t;

            // Fade toward end
            const fadeCurve = Math.pow(Math.max(0, 1 - t), fadeStrength);
            const fadeAlpha = faded ? (0.35 * fadeCurve) : fadeCurve;
            const dotRadius = 1 + (1 - t) * 1.2;
            const alpha = fadeAlpha * this.getDepthBrightness(y) * 0.85;
            ctx.fillStyle = `rgba(0, 170, 68, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawCannon(x, y, angleRad) {
        const ctx = this.ctx;
        const c = this.colors;
        const recoilOffset = this.cannonRecoil * 4;

        // Base with layered glow
        this.setGlow(c.secondaryGlow, 15);

        // Trapezoid base
        ctx.fillStyle = c.tertiary;
        ctx.beginPath();
        ctx.moveTo(x - 20, y + 10);
        ctx.lineTo(x + 20, y + 10);
        ctx.lineTo(x + 14, y);
        ctx.lineTo(x - 14, y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = c.secondary;
        ctx.lineWidth = 1;
        ctx.stroke();
        this.clearGlow();

        // Ground glow under cannon
        const groundGlow = ctx.createRadialGradient(x, y + 10, 0, x, y + 10, 28);
        groundGlow.addColorStop(0, 'rgba(0, 255, 102, 0.08)');
        groundGlow.addColorStop(1, 'rgba(0, 255, 102, 0)');
        ctx.fillStyle = groundGlow;
        ctx.beginPath();
        ctx.ellipse(x, y + 11, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Turret
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-angleRad + Math.PI / 2);
        ctx.translate(0, recoilOffset);

        // Turret base
        this.setGlow(c.primaryGlow, 12);
        ctx.fillStyle = c.tertiary;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c.primary;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Barrel
        ctx.fillStyle = c.tertiary;
        ctx.fillRect(-4, -30, 8, 26);
        ctx.strokeStyle = c.primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(-4, -30, 8, 26);

        // Barrel segment lines for mechanical feel
        ctx.strokeStyle = c.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4, -22);
        ctx.lineTo(4, -22);
        ctx.moveTo(-4, -14);
        ctx.lineTo(4, -14);
        ctx.stroke();

        // Barrel tip
        ctx.fillRect(-5, -35, 10, 6);
        ctx.strokeRect(-5, -35, 10, 6);

        // Inner detail
        ctx.strokeStyle = c.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
        this.clearGlow();
    }

    drawTargetFlag(x, y, alpha = 1, active = false) {
        const ctx = this.ctx;
        const c = this.colors;
        const poleH = active ? 16 : 12;
        const flagW = active ? 10 : 8;
        const flagH = active ? 7 : 6;
        const color = active ? c.cyan : c.secondary;
        const glow = active ? 'rgba(51, 230, 255, 0.35)' : c.secondaryGlow;

        ctx.save();
        ctx.globalAlpha = alpha;
        this.setGlow(glow, active ? 10 : 6);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(x, y + 3);
        ctx.lineTo(x, y - poleH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y - poleH);
        ctx.lineTo(x + flagW, y - poleH + 2);
        ctx.lineTo(x, y - poleH + flagH);
        ctx.closePath();
        ctx.stroke();

        // Small base marker ring to tie it to the target zone
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
        this.clearGlow();
    }

    drawUFO(x, y, size, alpha = 1) {
        const ctx = this.ctx;
        const c = this.colors;
        const time = this.frameCount * 0.03;
        const bobY = Math.sin(time + x * 0.015) * 4;
        const drawY = y + bobY;

        const width = size * 3.1;
        const height = size * 0.95;
        const bodyInset = size * 2.0;

        // Slight rotation drift
        ctx.save();
        ctx.translate(x, drawY);
        ctx.rotate(Math.sin(time + x * 0.01) * 0.035);
        ctx.translate(-x, -drawY);

        this.setGlow(`rgba(255, 51, 68, ${0.3 * alpha})`, 10);
        ctx.strokeStyle = `rgba(255, 51, 68, ${alpha})`;
        ctx.lineWidth = 2;

        // 2D outline saucer (angular, no fill) to match cannon line-art
        ctx.beginPath();
        ctx.moveTo(x - width, drawY);
        ctx.lineTo(x - bodyInset, drawY - height);
        ctx.lineTo(x + bodyInset, drawY - height);
        ctx.lineTo(x + width, drawY);
        ctx.lineTo(x + bodyInset * 0.8, drawY + height * 0.75);
        ctx.lineTo(x - bodyInset * 0.8, drawY + height * 0.75);
        ctx.closePath();
        ctx.stroke();

        // Inner frame
        ctx.strokeStyle = `rgba(255, 51, 68, ${alpha * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - bodyInset * 0.65, drawY - height * 0.3);
        ctx.lineTo(x + bodyInset * 0.65, drawY - height * 0.3);
        ctx.lineTo(x + bodyInset * 0.45, drawY + height * 0.35);
        ctx.lineTo(x - bodyInset * 0.45, drawY + height * 0.35);
        ctx.closePath();
        ctx.stroke();

        // Center emitter dot + scan pulse
        const pulse = 0.45 + Math.sin(time * 5) * 0.25;
        ctx.fillStyle = `rgba(255, 51, 68, ${alpha * pulse})`;
        ctx.beginPath();
        ctx.arc(x, drawY, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Scan pulse
        const pulseRadius = (time % 2) * width;
        if (pulseRadius < width) {
            ctx.strokeStyle = `rgba(255, 51, 68, ${(1 - pulseRadius / width) * 0.3 * alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, drawY, pulseRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
        this.clearGlow();
    }

    drawWaveClearBanners() {
        if (!this.waveClearBanners.length) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const banner = this.waveClearBanners[this.waveClearBanners.length - 1];
        const t = banner.age / Math.max(1, banner.maxAge);
        const fadeIn = Math.min(1, t / 0.12);
        const fadeOut = Math.min(1, (1 - t) / 0.28);
        const alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.95;
        if (alpha <= 0) return;

        const pulse = 1 + Math.sin(this.frameCount * 0.12) * 0.01;
        const centerX = w / 2;
        const centerY = h * 0.46;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(pulse, pulse);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = "700 18px Orbitron, 'Share Tech Mono', monospace";
        ctx.fillStyle = `rgba(0, 255, 102, ${alpha * 0.9})`;
        ctx.shadowColor = 'rgba(0, 255, 102, 0.35)';
        ctx.shadowBlur = 12;
        ctx.fillText(banner.title, 0, 0);

        if (banner.subtitle) {
            ctx.font = "700 12px 'Share Tech Mono', monospace";
            ctx.fillStyle = `rgba(255, 170, 0, ${alpha * 0.85})`;
            ctx.shadowColor = 'rgba(255, 170, 0, 0.22)';
            ctx.shadowBlur = 8;
            ctx.fillText(banner.subtitle, 0, 18);
        }

        ctx.restore();
    }

    drawCornerBrackets() {
        const ctx = this.ctx;
        const c = this.colors;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const size = 25;
        const offset = 8;

        ctx.strokeStyle = c.secondary;
        ctx.lineWidth = 2;
        this.setGlow(c.secondaryGlow, 8);

        // Top-left
        ctx.beginPath();
        ctx.moveTo(offset, offset + size);
        ctx.lineTo(offset, offset);
        ctx.lineTo(offset + size, offset);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(w - offset - size, offset);
        ctx.lineTo(w - offset, offset);
        ctx.lineTo(w - offset, offset + size);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(offset, h - offset - size);
        ctx.lineTo(offset, h - offset);
        ctx.lineTo(offset + size, h - offset);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(w - offset - size, h - offset);
        ctx.lineTo(w - offset, h - offset);
        ctx.lineTo(w - offset, h - offset - size);
        ctx.stroke();

        // Instrument ticks on top and bottom edges
        ctx.strokeStyle = c.tertiary;
        ctx.lineWidth = 1;
        this.setGlow(c.tertiaryGlow, 4);
        const tickStep = 70;
        for (let x = 40; x < w - 40; x += tickStep) {
            ctx.beginPath();
            ctx.moveTo(x, offset);
            ctx.lineTo(x, offset + 4);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x, h - offset);
            ctx.lineTo(x, h - offset - 4);
            ctx.stroke();
        }

        this.clearGlow();
    }
}
