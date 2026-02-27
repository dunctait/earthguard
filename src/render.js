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
            'ui-bottom-overlay',
            'splash-overlay',
            'splash-new-game-btn',
            'splash-open-meta-upgrades-btn',
            'splash-jump-level-select',
            'splash-jump-highest-btn',
            'splash-jump-start-btn',
            'splash-clear-data-btn',
            'upgrade-menu-btn',
            'ai-upgrade-menu-btn',
            'upgrade-modal-overlay',
            'upgrade-menu',
            'upgrade-menu-close-btn',
            'ai-upgrade-modal-overlay',
            'ai-upgrade-menu',
            'ai-upgrade-menu-close-btn',
            'game-over-battle-overlay',
            'game-over-battle-title',
            'game-over-battle-subtitle',
            'game-over-continue-btn',
            'game-over-overlay',
            'open-meta-upgrades-btn',
            'meta-upgrade-overlay',
            'meta-upgrade-close-btn',
            'play-again-btn',
            'meta-upgrade-list',
            'jump-level-select',
            'jump-highest-btn',
            'jump-start-btn',
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
        this.terrainProfile = null;
        this.terrainPoints = null;
        this.lastMissileCount = 0;
        this.lastExplosionCount = 0;
        this.lastBossesDefeated = 0;
        this.cannonRecoil = 0;
        this.impactFlash = 0;
        this.viewZoom = 1;
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
        this.positionBottomHudOverlay();
        this.positionGameOverBattleOverlay();
        this.render();
    }

    positionBottomHudOverlay() {
        const overlay = this.dom['ui-bottom-overlay'];
        const container = this.canvas?.parentElement;
        if (!overlay || !container || !this.canvas) return;
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const left = canvasRect.left - containerRect.left;
        const top = (canvasRect.bottom - containerRect.top) - 22;
        overlay.style.left = `${left}px`;
        overlay.style.width = `${canvasRect.width}px`;
        overlay.style.right = 'auto';
        overlay.style.top = `${top}px`;
        overlay.style.bottom = 'auto';
    }

    positionGameOverBattleOverlay() {
        const overlay = this.dom['game-over-battle-overlay'];
        const container = this.canvas?.parentElement;
        if (!overlay || !container || !this.canvas) return;
        const canvasRect = this.canvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        overlay.style.left = `${canvasRect.left - containerRect.left}px`;
        overlay.style.top = `${canvasRect.top - containerRect.top}px`;
        overlay.style.width = `${canvasRect.width}px`;
        overlay.style.height = `${canvasRect.height}px`;
        overlay.style.right = 'auto';
        overlay.style.bottom = 'auto';
    }

    generateTerrain() {
        const segments = 280;
        const profile = [];
        for (let i = 0; i <= segments; i++) {
            const u = i / segments;
            const centered = (u - 0.5) * 2.6;
            const hillHeightNorm = Math.exp(-(centered * centered) * 2.1) * 0.26;
            const lowFreq = Math.sin(u * Math.PI * 9.3) * 0.016;
            const midFreq = Math.sin(u * Math.PI * 23.1) * 0.009;
            const highFreq = Math.sin(u * Math.PI * 57.7) * 0.004;
            profile.push({ u, h: hillHeightNorm + lowFreq + midFreq + highFreq });
        }
        this.terrainProfile = profile;
    }

    getTerrainPointsForZoom(zoom = 1) {
        if (!Array.isArray(this.terrainProfile) || this.terrainProfile.length === 0) return [];
        const w = this.canvas.width;
        const h = this.canvas.height;
        const baseY = h - 25;
        const maxTerrainHeightPx = Math.min(60, h * 0.22);
        const normalizedZoom = this.utils.clamp((zoom - 0.72) / (1 - 0.72), 0, 1);
        const visibleFraction = this.utils.lerp(1, 0.62, normalizedZoom);
        const startU = (1 - visibleFraction) * 0.5;
        const endU = 1 - startU;
        const points = [];

        for (const point of this.terrainProfile) {
            if (point.u < startU || point.u > endU) continue;
            const t = (point.u - startU) / Math.max(0.0001, (endU - startU));
            const x = t * w;
            const y = baseY - (point.h * maxTerrainHeightPx);
            points.push({ x, y });
        }
        return points;
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
        if (this.dom['ai-upgrade-menu-btn']) {
            this.dom['ai-upgrade-menu-btn'].addEventListener('click', () => this.game.toggleAICannonUpgradeMenu?.());
        }
        if (this.dom['upgrade-menu-close-btn']) {
            this.dom['upgrade-menu-close-btn'].addEventListener('click', () => this.game.closeUpgradeMenu());
        }
        if (this.dom['ai-upgrade-menu-close-btn']) {
            this.dom['ai-upgrade-menu-close-btn'].addEventListener('click', () => this.game.closeAICannonUpgradeMenu?.());
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
        if (this.dom['ai-upgrade-menu']) {
            this.dom['ai-upgrade-menu'].addEventListener('click', (event) => {
                const button = event.target.closest('[data-upgrade-key]');
                if (!button) return;
                this.game.purchaseUpgrade(button.dataset.upgradeKey);
            });
        }
        if (this.dom['ai-upgrade-modal-overlay']) {
            this.dom['ai-upgrade-modal-overlay'].addEventListener('click', (event) => {
                if (event.target === this.dom['ai-upgrade-modal-overlay']) {
                    this.game.closeAICannonUpgradeMenu?.();
                }
            });
        }
        if (this.dom['play-again-btn']) {
            this.dom['play-again-btn'].addEventListener('click', () => this.game.reset());
        }
        if (this.dom['game-over-continue-btn']) {
            this.dom['game-over-continue-btn'].addEventListener('click', () => this.game.openGameOverSummary());
        }
        if (this.dom['jump-start-btn']) {
            this.dom['jump-start-btn'].addEventListener('click', () => {
                const level = Number(this.dom['jump-level-select']?.value || 0);
                this.game.startJumpRun(level);
            });
        }
        if (this.dom['jump-highest-btn']) {
            this.dom['jump-highest-btn'].addEventListener('click', () => {
                if (!this.dom['jump-level-select']) {
                    this.game.startHighestJumpRun?.();
                    return;
                }
                const highest = this.game.getHighestJumpStartLevel?.();
                if (highest?.level) {
                    this.dom['jump-level-select'].value = String(highest.level);
                    this.game.setPreferredJumpStartLevel?.(highest.level);
                    this.game.notify();
                }
            });
        }
        if (this.dom['jump-level-select']) {
            this.dom['jump-level-select'].addEventListener('change', () => {
                const level = Number(this.dom['jump-level-select']?.value || 0);
                if (typeof this.game.setPreferredJumpStartLevel === 'function') {
                    this.game.setPreferredJumpStartLevel(level);
                }
                this.game.notify();
            });
        }
        if (this.dom['meta-upgrade-list']) {
            this.dom['meta-upgrade-list'].addEventListener('click', (event) => {
                const button = event.target.closest('[data-meta-upgrade-key]');
                if (!button) return;
                this.game.purchaseMetaUpgrade(button.dataset.metaUpgradeKey);
            });
        }
        if (this.dom['splash-new-game-btn']) {
            this.dom['splash-new-game-btn'].addEventListener('click', () => {
                this.game.reset();
                this.game.closeSplash?.();
            });
        }
        if (this.dom['splash-jump-start-btn']) {
            this.dom['splash-jump-start-btn'].addEventListener('click', () => {
                const level = Number(this.dom['splash-jump-level-select']?.value || 0);
                this.game.startJumpRun(level);
            });
        }
        if (this.dom['splash-jump-highest-btn']) {
            this.dom['splash-jump-highest-btn'].addEventListener('click', () => {
                const highest = this.game.getHighestJumpStartLevel?.();
                if (!highest?.level || !this.dom['splash-jump-level-select']) return;
                this.dom['splash-jump-level-select'].value = String(highest.level);
                this.game.setPreferredJumpStartLevel?.(highest.level);
                this.game.notify();
            });
        }
        if (this.dom['splash-jump-level-select']) {
            this.dom['splash-jump-level-select'].addEventListener('change', () => {
                const level = Number(this.dom['splash-jump-level-select']?.value || 0);
                this.game.setPreferredJumpStartLevel?.(level);
                this.game.notify();
            });
        }
        if (this.dom['splash-clear-data-btn']) {
            this.dom['splash-clear-data-btn'].addEventListener('click', () => {
                if (!this.game.ui?.consumeClearDataConfirmation?.()) {
                    this.game.ui?.armClearDataConfirmation?.();
                    this.game.notify();
                    return;
                }
                this.game.clearAllLocalData?.();
            });
        }
        if (this.dom['splash-open-meta-upgrades-btn']) {
            this.dom['splash-open-meta-upgrades-btn'].addEventListener('click', () => this.game.openMetaUpgradeModal?.());
        }
        if (this.dom['open-meta-upgrades-btn']) {
            this.dom['open-meta-upgrades-btn'].addEventListener('click', () => this.game.openMetaUpgradeModal?.());
        }
        if (this.dom['meta-upgrade-close-btn']) {
            this.dom['meta-upgrade-close-btn'].addEventListener('click', () => this.game.closeMetaUpgradeModal?.());
        }
        if (this.dom['meta-upgrade-overlay']) {
            this.dom['meta-upgrade-overlay'].addEventListener('click', (event) => {
                if (event.target === this.dom['meta-upgrade-overlay']) {
                    this.game.closeMetaUpgradeModal?.();
                }
            });
        }
        window.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            if (this.game?.isMetaUpgradeModalOpen) {
                this.game.closeMetaUpgradeModal?.();
                return;
            }
            if (this.game?.isAICannonUpgradeMenuOpen) {
                this.game.closeAICannonUpgradeMenu?.();
                return;
            }
            if (this.game?.isUpgradeMenuOpen) {
                this.game.closeUpgradeMenu?.();
            }
        });
    }

    animate() {
        this.frameCount++;
        // Keep charge/power feedback responsive even if a state-change notification is dropped.
        if (this.game?.ui && typeof this.game.ui.renderPower === 'function') {
            this.game.ui.renderPower(this.game);
        }
        if (this.game?.isGameOver && !this.game?.isGameOverSummaryOpen && this.game?.ui && typeof this.game.ui.renderGameOverBattlefieldPrompt === 'function') {
            this.game.ui.renderGameOverBattlefieldPrompt(this.game);
        }
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

    getCannonTipPosition(x, y, angleRad) {
        const theta = (-angleRad + Math.PI / 2);
        const recoilOffset = this.cannonRecoil * 4;
        const localX = 0;
        const localY = -38 + recoilOffset;
        return {
            x: x + (localX * Math.cos(theta)) - (localY * Math.sin(theta)),
            y: y + (localX * Math.sin(theta)) + (localY * Math.cos(theta))
        };
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
        const bossesDefeated = this.game.bossesDefeatedThisRun || 0;
        if (bossesDefeated > this.lastBossesDefeated) {
            this.impactFlash = Math.max(this.impactFlash, 1.35);
        }

        this.lastMissileCount = missileCount;
        this.lastExplosionCount = explosionCount;
        this.lastBossesDefeated = bossesDefeated;

        this.cannonRecoil *= 0.82;
        this.impactFlash *= 0.88;

        for (const fx of this.playerExplosionFx) fx.age++;
        for (const fx of this.enemyExplosionFx) fx.age++;
        for (const banner of this.waveClearBanners) banner.age++;
        this.playerExplosionFx = this.playerExplosionFx.filter((fx) => fx.age <= fx.maxAge);
        this.enemyExplosionFx = this.enemyExplosionFx.filter((fx) => fx.age <= fx.maxAge);
        this.waveClearBanners = this.waveClearBanners.filter((fx) => fx.age <= fx.maxAge);

        this.updateAlienEntryFastForwardFx(this.game.aliens);
        this.updateAlienEntryFastForwardFx(this.game.incomingAliens);

        const targetZoom = Math.max(0.75, Math.min(1.05, this.game?.viewZoomTarget || 1));
        this.viewZoom = this.utils.lerp(this.viewZoom || 1, targetZoom, 0.12);
        if (Math.abs((this.viewZoom || 1) - targetZoom) < 0.001) {
            this.viewZoom = targetZoom;
        }
    }

    applyBattlefieldViewTransform() {
        const z = this.viewZoom || 1;
        if (Math.abs(z - 1) < 0.0001) return;
        const cx = this.canvas.width * 0.5;
        const cy = this.canvas.height * 0.52;
        this.ctx.translate(cx, cy);
        this.ctx.scale(z, z);
        this.ctx.translate(-cx, -cy);
    }

    updateAlienEntryFastForwardFx(aliens) {
        if (!Array.isArray(aliens)) return;
        for (const alien of aliens) {
            if (!alien || !alien.entryVisualOffsetY) continue;
            alien.entryVisualOffsetY *= 0.72;
            if (Math.abs(alien.entryVisualOffsetY) < 0.08) {
                alien.entryVisualOffsetY = 0;
            }
        }
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
                maxAge: event.maxAge || 125
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

        ctx.save();
        this.applyBattlefieldViewTransform();
        const camX = Math.sin(time * 0.4) * 0.5;
        const camY = Math.cos(time * 0.33) * 0.5;
        ctx.translate(camX, camY);

        const launcherScreen = this.worldToScreen(this.game.WORLD_WIDTH / 2, this.game.config.LAUNCHER_Y);
        const cannonX = launcherScreen.x;
        const cannonY = launcherScreen.y;
        const angleRad = this.gameAngleToRad(this.game.launcherAngle);
        const cannonTip = this.getCannonTipPosition(cannonX, cannonY, angleRad);

        // Terrain with glow
        this.terrainPoints = this.getTerrainPointsForZoom(this.viewZoom || 1);
        if (this.terrainPoints && this.terrainPoints.length > 1) {
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
        {
            ctx.fillRect(0, h - 40, w, 40);
        }

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

        // Assistant planned targets (visible so player can plan around ally fire).
        const assistantTargets = (typeof this.game.getAssistantPlannedTargets === 'function')
            ? this.game.getAssistantPlannedTargets()
            : [];
        for (const plan of assistantTargets) {
            const start = this.worldToScreen(plan.startX, plan.startY);
            const target = this.worldToScreen(plan.targetX, plan.targetY);
            const radius = this.worldToScreenSize(plan.radius || this.game.getCurrentExplosionRadius());
            ctx.save();
            ctx.setLineDash([5, 8]);
            ctx.lineDashOffset = -(this.frameCount * 0.6);
            ctx.strokeStyle = 'rgba(70, 150, 255, 0.28)';
            ctx.lineWidth = 2.4;
            this.setGlow('rgba(70, 150, 255, 0.2)', 8);
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            this.clearGlow();
            ctx.strokeStyle = 'rgba(70, 150, 255, 0.34)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Current charging prediction
        const prediction = this.game.getPrediction();
        if (prediction && !this.game.isAnimating) {
            const predScreen = this.worldToScreen(prediction.x, prediction.y);

            // Animated trajectory dots
            this.drawAnimatedTrajectory(cannonTip.x, cannonTip.y, predScreen.x, predScreen.y);
        }

        // Aiming guide (animated dots)
        if (!this.game.isAnimating && !prediction) {
            const endX = cannonTip.x + Math.cos(angleRad) * h;
            const endY = cannonTip.y - Math.sin(angleRad) * h;
            this.drawAnimatedTrajectory(cannonTip.x, cannonTip.y, endX, endY, true);
        }

        // Cannon
        this.drawCannon(cannonX, cannonY, angleRad);
        for (const assistant of (this.game.assistantCannons || [])) {
            const pos = this.worldToScreen(assistant.x, assistant.y);
            this.drawAssistantCannon(pos.x, pos.y);
        }

        // Pending (locked) missiles: show only a direction/targeting indicator while time is paused.
        for (const missile of (this.game.pendingMissiles || [])) {
            const endPos = this.worldToScreen(missile.targetX, missile.targetY);
            const startPos = this.worldToScreen(missile.startX ?? (this.game.WORLD_WIDTH / 2), missile.startY ?? this.game.config.LAUNCHER_Y);
            const lockAgeMs = Math.max(0, Date.now() - (missile.lockedAtMs || Date.now()));
            const lockFade = Math.max(0.12, 1 - (lockAgeMs / 1400));

            // Locked-shot direction indicator (behind the stub): thicker, different color than aiming line.
            ctx.save();
            ctx.setLineDash([7, 7]);
            ctx.lineDashOffset = -(this.frameCount * 0.7);
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.22 * lockFade})`;
            ctx.lineWidth = 3;
            this.setGlow('rgba(0, 255, 255, 0.18)', 8);
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
            this.clearGlow();
            ctx.restore();
        }

        // Missiles in flight
        for (const missile of this.game.missiles) {
            if (missile.exploded) continue;

            const endPos = this.worldToScreen(missile.targetX, missile.targetY);
            const startPos = this.worldToScreen(missile.startX ?? (this.game.WORLD_WIDTH / 2), missile.startY ?? this.game.config.LAUNCHER_Y);
            const currentX = startPos.x + (endPos.x - startPos.x) * missile.progress;
            const currentY = startPos.y + (endPos.y - startPos.y) * missile.progress;
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
                startPos.x + (endPos.x - startPos.x) * trailProgress,
                startPos.y + (endPos.y - startPos.y) * trailProgress
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
            const incomingAliens = [...(this.game.incomingAliens || [])]
                .sort((a, b) => ((b.y + (b.entryVisualOffsetY || 0)) - (a.y + (a.entryVisualOffsetY || 0))));
            for (const alien of incomingAliens) {
                const displayY = alien.y + (alien.entryVisualOffsetY || 0);
                const pos = this.worldToScreen(alien.x, displayY);
                if (pos.y < -40) continue;
                const size = this.worldToScreenSize(alien.radius) * 0.75;
                const distanceAlpha = Math.max(0.3, this.getDepthBrightness(pos.y) * 0.45);
                if (alien.type === 'scout') {
                    this.drawScoutAlien(pos.x, pos.y, size, distanceAlpha, alien, true);
                } else if (alien.type === 'boss') {
                    this.drawBossAlien(pos.x, pos.y, size, distanceAlpha * 0.9, alien);
                } else {
                    this.drawUFO(pos.x, pos.y, size, distanceAlpha, alien);
                }
            }
        }

        // Active aliens
        const activeAliens = [...this.game.aliens]
            .sort((a, b) => ((b.y + (b.entryVisualOffsetY || 0)) - (a.y + (a.entryVisualOffsetY || 0))));
        for (const alien of activeAliens) {
            const displayY = alien.y + (alien.entryVisualOffsetY || 0);
            const pos = this.worldToScreen(alien.x, displayY);
            const size = this.worldToScreenSize(alien.radius) * 0.75;
            const distanceAlpha = Math.max(0.7, this.getDepthBrightness(pos.y));
            if (alien.type === 'scout') {
                this.drawScoutAlien(pos.x, pos.y, size, distanceAlpha, alien, false);
            } else if (alien.type === 'boss') {
                this.drawBossAlien(pos.x, pos.y, size, distanceAlpha, alien);
            } else {
                this.drawUFO(pos.x, pos.y, size, distanceAlpha, alien);
            }
        }

        this.drawBossHud();

        ctx.restore();

        // Top vignette to improve HUD readability and de-emphasize high-altitude clutter.
        const topFadeHeight = h * 0.20;
        const topFade = ctx.createLinearGradient(0, 0, 0, topFadeHeight);
        topFade.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        topFade.addColorStop(0.45, 'rgba(0, 0, 0, 0.45)');
        topFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = topFade;
        ctx.fillRect(0, 0, w, topFadeHeight);

        if (this.impactFlash > 0.02) {
            ctx.fillStyle = `rgba(180, 255, 220, ${this.impactFlash * 0.08})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Corner brackets instead of full border
        this.drawCornerBrackets();
        this.drawGameOverBattlefieldMessage();
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

        // Ground glow under cannon
        const groundGlow = ctx.createRadialGradient(x, y + 10, 0, x, y + 10, 28);
        groundGlow.addColorStop(0, 'rgba(0, 255, 102, 0.08)');
        groundGlow.addColorStop(1, 'rgba(0, 255, 102, 0)');
        ctx.fillStyle = groundGlow;
        ctx.beginPath();
        ctx.ellipse(x, y + 11, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chassis / mount (outline-heavy, less filled geometry)
        this.setGlow(c.secondaryGlow, 10);
        ctx.fillStyle = 'rgba(0, 22, 8, 0.88)';
        ctx.beginPath();
        ctx.moveTo(x - 22, y + 10);
        ctx.lineTo(x + 22, y + 10);
        ctx.lineTo(x + 15, y + 1);
        ctx.lineTo(x + 8, y + 1);
        ctx.lineTo(x + 4, y - 5);
        ctx.lineTo(x - 4, y - 5);
        ctx.lineTo(x - 8, y + 1);
        ctx.lineTo(x - 15, y + 1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = c.secondary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 22, y + 10);
        ctx.lineTo(x + 22, y + 10);
        ctx.lineTo(x + 15, y + 1);
        ctx.lineTo(x + 8, y + 1);
        ctx.lineTo(x + 4, y - 5);
        ctx.lineTo(x - 4, y - 5);
        ctx.lineTo(x - 8, y + 1);
        ctx.lineTo(x - 15, y + 1);
        ctx.closePath();
        ctx.stroke();

        // Mount panel lines
        ctx.strokeStyle = c.tertiary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 6);
        ctx.lineTo(x + 12, y + 6);
        ctx.moveTo(x - 6, y + 1);
        ctx.lineTo(x + 6, y + 1);
        ctx.stroke();
        this.clearGlow();

        // Turret
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-angleRad + Math.PI / 2);
        ctx.translate(0, recoilOffset);

        this.setGlow(c.primaryGlow, 12);

        // Turret pivot (octagonal outline)
        ctx.fillStyle = 'rgba(0, 28, 10, 0.92)';
        ctx.beginPath();
        ctx.moveTo(-8, -3);
        ctx.lineTo(-5, -8);
        ctx.lineTo(5, -8);
        ctx.lineTo(8, -3);
        ctx.lineTo(8, 3);
        ctx.lineTo(5, 8);
        ctx.lineTo(-5, 8);
        ctx.lineTo(-8, 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = c.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -3);
        ctx.lineTo(-5, -8);
        ctx.lineTo(5, -8);
        ctx.lineTo(8, -3);
        ctx.lineTo(8, 3);
        ctx.lineTo(5, 8);
        ctx.lineTo(-5, 8);
        ctx.lineTo(-8, 3);
        ctx.closePath();
        ctx.stroke();

        // Barrel body (tapered outline)
        ctx.fillStyle = 'rgba(0, 24, 9, 0.9)';
        ctx.beginPath();
        ctx.moveTo(-5, -6);
        ctx.lineTo(-4, -31);
        ctx.lineTo(4, -31);
        ctx.lineTo(5, -6);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -6);
        ctx.lineTo(-4, -31);
        ctx.lineTo(4, -31);
        ctx.lineTo(5, -6);
        ctx.closePath();
        ctx.stroke();

        // Barrel rails
        ctx.strokeStyle = c.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2.5, -8);
        ctx.lineTo(-2.5, -30);
        ctx.moveTo(2.5, -8);
        ctx.lineTo(2.5, -30);
        ctx.stroke();

        // Barrel segment lines for mechanical feel
        ctx.strokeStyle = c.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4.2, -23);
        ctx.lineTo(4.2, -23);
        ctx.moveTo(-4.6, -15);
        ctx.lineTo(4.6, -15);
        ctx.stroke();

        // Muzzle / tip (fork-like outline)
        ctx.fillStyle = 'rgba(0, 20, 7, 0.9)';
        ctx.beginPath();
        ctx.moveTo(-5, -31);
        ctx.lineTo(-5, -38);
        ctx.lineTo(5, -38);
        ctx.lineTo(5, -31);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = c.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -31);
        ctx.lineTo(-5, -38);
        ctx.lineTo(-1.8, -38);
        ctx.moveTo(5, -31);
        ctx.lineTo(5, -38);
        ctx.lineTo(1.8, -38);
        ctx.stroke();

        // Muzzle bridge (dimmer)
        ctx.strokeStyle = c.tertiary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-1.6, -35.5);
        ctx.lineTo(1.6, -35.5);
        ctx.stroke();

        // Inner detail
        ctx.strokeStyle = c.secondary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.moveTo(0, -3);
        ctx.lineTo(0, 3);
        ctx.stroke();

        ctx.restore();
        this.clearGlow();
    }

    drawAssistantCannon(x, y) {
        const ctx = this.ctx;
        const c = this.colors;
        this.setGlow('rgba(70, 150, 255, 0.24)', 8);
        ctx.fillStyle = 'rgba(0, 22, 14, 0.9)';
        ctx.strokeStyle = 'rgba(70, 150, 255, 0.7)';
        ctx.lineWidth = 1.6;

        ctx.beginPath();
        ctx.moveTo(x - 8, y + 5);
        ctx.lineTo(x + 8, y + 5);
        ctx.lineTo(x + 5, y + 1);
        ctx.lineTo(x - 5, y + 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 2, y + 1);
        ctx.lineTo(x - 1, y - 8);
        ctx.lineTo(x + 1, y - 8);
        ctx.lineTo(x + 2, y + 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = c.white;
        ctx.beginPath();
        ctx.arc(x, y - 5, 1.2, 0, Math.PI * 2);
        ctx.fill();
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

    drawUFO(x, y, size, alpha = 1, alien = null) {
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

        this.drawAlienHpIndicator(x, drawY, size, alpha, alien);

        ctx.restore();
        this.clearGlow();
    }

    drawScoutAlien(x, y, size, alpha = 1, alien = null, preview = false) {
        const ctx = this.ctx;
        const time = this.frameCount * 0.05;
        const wobbleY = Math.sin(time + x * 0.03) * (preview ? 1.5 : 2.2);
        const drawY = y + wobbleY;
        const cAlpha = Math.max(0.2, alpha);
        const width = size * 1.9;
        const height = size * 0.75;
        const dir = alien?.zigzagDir || 1;

        ctx.save();
        this.setGlow(`rgba(255, 80, 90, ${0.22 * cAlpha})`, 7);
        ctx.strokeStyle = `rgba(255, 90, 100, ${cAlpha})`;
        ctx.lineWidth = 1.6;

        // Dashed predictor showing the next lateral drift direction.
        const arrowLen = width * 1.45;
        const arrowEndX = x + (dir * arrowLen);
        const arrowEndY = drawY - height * 0.55;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -(this.frameCount * 0.6);
        ctx.strokeStyle = `rgba(255, 120, 120, ${0.35 * cAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, drawY + height * 0.1);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();
        ctx.restore();

        // Obvious directional arrowhead at the end of the predictor.
        ctx.save();
        const arrowPulse = 0.85 + (Math.sin(this.frameCount * 0.18) * 0.12);
        const headSize = Math.max(5, size * 0.9);
        const shaftAngle = Math.atan2(arrowEndY - (drawY + height * 0.1), arrowEndX - x);
        ctx.translate(arrowEndX, arrowEndY);
        ctx.rotate(shaftAngle);
        ctx.fillStyle = `rgba(255, 140, 140, ${0.75 * cAlpha * arrowPulse})`;
        ctx.strokeStyle = `rgba(255, 190, 190, ${0.95 * cAlpha})`;
        ctx.lineWidth = 1;
        this.setGlow('rgba(255, 120, 120, 0.28)', 7);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-headSize, headSize * 0.55);
        ctx.lineTo(-headSize * 0.72, 0);
        ctx.lineTo(-headSize, -headSize * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        this.clearGlow();

        // Small arrow-like zig-zag scout silhouette.
        ctx.beginPath();
        ctx.moveTo(x - width, drawY);
        ctx.lineTo(x - width * 0.25, drawY - height);
        ctx.lineTo(x + width, drawY);
        ctx.lineTo(x - width * 0.25, drawY + height);
        ctx.closePath();
        ctx.stroke();

        // Inner spine line.
        ctx.strokeStyle = `rgba(255, 90, 100, ${cAlpha * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - width * 0.35, drawY);
        ctx.lineTo(x + width * 0.45, drawY);
        ctx.stroke();

        ctx.restore();
        this.clearGlow();

        this.drawAlienHpIndicator(x, drawY, size, alpha, alien);
    }

    drawBossAlien(x, y, size, alpha = 1, alien = null) {
        const ctx = this.ctx;
        const t = this.frameCount * 0.02;
        const bobY = Math.sin(t + x * 0.01) * 1.8;
        const drawY = y + bobY;
        const w = size * 4.2;
        const h = size * 1.4;

        ctx.save();
        this.setGlow(`rgba(255, 90, 90, ${0.28 * alpha})`, 12);
        ctx.strokeStyle = `rgba(255, 90, 90, ${alpha})`;
        ctx.fillStyle = `rgba(30, 4, 6, ${0.28 * alpha})`;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x - w, drawY);
        ctx.lineTo(x - w * 0.62, drawY - h);
        ctx.lineTo(x + w * 0.62, drawY - h);
        ctx.lineTo(x + w, drawY);
        ctx.lineTo(x + w * 0.72, drawY + h * 0.92);
        ctx.lineTo(x - w * 0.72, drawY + h * 0.92);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 90, 90, ${alpha * 0.55})`;
        ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(x + i * (w * 0.22), drawY - h * 0.55);
            ctx.lineTo(x + i * (w * 0.18), drawY + h * 0.45);
            ctx.stroke();
        }

        // Forward intent indicator (subtle dashed heading line) to telegraph drift.
        const dir = Math.cos(alien?.bossPhase || 0) >= 0 ? 1 : -1;
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -(this.frameCount * 0.45);
        ctx.strokeStyle = `rgba(255, 130, 130, ${alpha * 0.28})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, drawY + h * 0.15);
        ctx.lineTo(x + (dir * w * 0.8), drawY - h * 0.1);
        ctx.stroke();
        ctx.restore();

        this.drawAlienHpIndicator(x, drawY, size * 1.2, alpha, alien);
        ctx.restore();
        this.clearGlow();
    }

    drawBossHud() {
        const boss = (this.game.aliens || []).find((a) => a.type === 'boss' && a.hp > 0);
        if (!boss) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "700 10px 'Share Tech Mono', monospace";
        ctx.fillStyle = 'rgba(255, 140, 140, 0.9)';
        ctx.fillText('BOSS', w / 2, 16);

        const maxHp = Math.max(1, boss.maxHp || boss.hp || 1);
        const hp = Math.max(0, boss.hp || 0);
        const spacing = 10;
        const totalWidth = (maxHp - 1) * spacing;
        const startX = (w / 2) - (totalWidth / 2);
        for (let i = 0; i < maxHp; i++) {
            const x = startX + (i * spacing);
            ctx.save();
            ctx.translate(x, 30);
            ctx.rotate(Math.PI / 4);
            ctx.lineWidth = 1;
            const filled = i < hp;
            ctx.strokeStyle = filled ? 'rgba(255,120,130,0.95)' : 'rgba(90,40,45,0.65)';
            ctx.fillStyle = filled ? 'rgba(255,70,80,0.35)' : 'rgba(0,0,0,0)';
            ctx.beginPath();
            ctx.rect(-3, -3, 6, 6);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    drawAlienHpIndicator(x, y, size, alpha = 1, alien = null) {
        if (!alien || !alien.maxHp || alien.maxHp <= 1) return;
        const ctx = this.ctx;
        const hp = Math.max(0, Math.floor(alien.hp || 0));
        const maxHp = Math.max(1, Math.floor(alien.maxHp || 1));
        const heartSpacing = Math.max(5, size * 0.95);
        const totalWidth = (maxHp - 1) * heartSpacing;
        const baseX = x - (totalWidth / 2);
        const yPos = y - Math.max(10, size * 1.7);

        for (let i = 0; i < maxHp; i++) {
            const hx = baseX + (i * heartSpacing);
            const filled = i < hp;
            ctx.save();
            ctx.translate(hx, yPos);
            ctx.rotate(Math.PI / 4);
            ctx.lineWidth = 1;
            ctx.strokeStyle = filled
                ? `rgba(255, 120, 130, ${0.95 * alpha})`
                : `rgba(120, 40, 50, ${0.55 * alpha})`;
            ctx.fillStyle = filled
                ? `rgba(255, 80, 90, ${0.38 * alpha})`
                : 'rgba(0,0,0,0)';
            ctx.beginPath();
            ctx.rect(-2.6, -2.6, 5.2, 5.2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        if (hp > 0 && hp < maxHp) {
            // Damaged indicator pulse ring.
            const pulse = 0.4 + (Math.sin(this.frameCount * 0.18 + x * 0.02) * 0.2);
            ctx.strokeStyle = `rgba(255, 130, 100, ${alpha * pulse})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.arc(x, y, Math.max(5, size * 1.4), 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
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
        const isTargetMsg = banner.title === 'MISSILE TARGETED';
        const isBossMsg = banner.title === 'BOSS DESTROYED';
        const centerY = isTargetMsg ? (h * 0.62) : (h * 0.46);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(pulse, pulse);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = isTargetMsg
            ? "700 13px 'Share Tech Mono', monospace"
            : isBossMsg
                ? "700 20px Orbitron, 'Share Tech Mono', monospace"
            : "700 18px Orbitron, 'Share Tech Mono', monospace";
        ctx.fillStyle = isTargetMsg
            ? `rgba(0, 255, 255, ${alpha * 0.7})`
            : isBossMsg
                ? `rgba(255, 120, 120, ${alpha * 0.92})`
            : `rgba(0, 255, 102, ${alpha * 0.9})`;
        ctx.shadowColor = isTargetMsg
            ? 'rgba(0, 255, 255, 0.20)'
            : (isBossMsg ? 'rgba(255, 90, 90, 0.28)' : 'rgba(0, 255, 102, 0.35)');
        ctx.shadowBlur = isTargetMsg ? 8 : (isBossMsg ? 14 : 12);
        ctx.fillText(banner.title, 0, 0);

        if (banner.subtitle) {
            ctx.font = "700 12px 'Share Tech Mono', monospace";
            ctx.fillStyle = isTargetMsg
                ? `rgba(255, 220, 120, ${alpha * 0.75})`
                : isBossMsg
                    ? `rgba(255, 210, 140, ${alpha * 0.85})`
                : `rgba(255, 170, 0, ${alpha * 0.85})`;
            ctx.shadowColor = isTargetMsg
                ? 'rgba(255, 220, 120, 0.16)'
                : (isBossMsg ? 'rgba(255, 180, 100, 0.25)' : 'rgba(255, 170, 0, 0.22)');
            ctx.shadowBlur = 8;
            ctx.fillText(banner.subtitle, 0, isTargetMsg ? 14 : 18);
        }

        ctx.restore();
    }

    drawGameOverBattlefieldMessage() {
        if (!this.game?.isGameOver || this.game?.isGameOverSummaryOpen) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const title = this.game.gameOverReason || 'DEFENSE BREACHED!';
        const subtitle = (title === 'EARTH BREACHED')
            ? 'ENEMY CONTACT REACHED EARTH LINE'
            : 'PROJECTED IMPACT UNAVOIDABLE';
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "700 16px Orbitron, 'Share Tech Mono', monospace";
        ctx.fillStyle = 'rgba(255, 110, 110, 0.9)';
        ctx.shadowColor = 'rgba(255, 80, 80, 0.25)';
        ctx.shadowBlur = 10;
        ctx.fillText(title, w / 2, h * 0.44);
        ctx.font = "700 10px 'Share Tech Mono', monospace";
        ctx.fillStyle = 'rgba(255, 170, 120, 0.78)';
        ctx.shadowBlur = 6;
        ctx.fillText(subtitle, w / 2, h * 0.47);

        const breachAliens = this.game.gameOverBreachAliens || [];
        for (const alien of breachAliens) {
            const p = this.worldToScreen(alien.x, alien.y);
            const r = Math.max(8, this.worldToScreenSize(alien.radius || 2) * 1.4);
            ctx.strokeStyle = 'rgba(255, 110, 110, 0.85)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(255, 140, 120, 0.55)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - r - 10);
            ctx.lineTo(p.x, p.y - r - 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawCornerBrackets() {
        const ctx = this.ctx;
        const c = this.colors;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const size = 18;
        const offset = 8;

        ctx.lineWidth = 2;
        this.setGlow(c.secondaryGlow, 8);

        // Subtle side rails to delimit the playfield without crowding the HUD.
        const sideInset = 1;
        const railTop = offset + 8;
        const railBottom = h - offset - 8;
        const railGradientLeft = ctx.createLinearGradient(0, railTop, 0, railBottom);
        const railGradientRight = ctx.createLinearGradient(0, railTop, 0, railBottom);
        const midAlpha = 0.6;
        railGradientLeft.addColorStop(0, 'rgba(0, 255, 102, 0)');
        railGradientLeft.addColorStop(0.10, 'rgba(0, 255, 102, 0)');
        railGradientLeft.addColorStop(0.5, `rgba(0, 255, 102, ${midAlpha})`);
        railGradientLeft.addColorStop(0.90, 'rgba(0, 255, 102, 0)');
        railGradientLeft.addColorStop(1, 'rgba(0, 255, 102, 0)');
        railGradientRight.addColorStop(0, 'rgba(0, 255, 102, 0)');
        railGradientRight.addColorStop(0.10, 'rgba(0, 255, 102, 0)');
        railGradientRight.addColorStop(0.5, `rgba(0, 255, 102, ${midAlpha})`);
        railGradientRight.addColorStop(0.90, 'rgba(0, 255, 102, 0)');
        railGradientRight.addColorStop(1, 'rgba(0, 255, 102, 0)');

        ctx.strokeStyle = railGradientLeft;
        ctx.beginPath();
        ctx.moveTo(sideInset, railTop);
        ctx.lineTo(sideInset, railBottom);
        ctx.stroke();

        ctx.strokeStyle = railGradientRight;
        ctx.beginPath();
        ctx.moveTo(w - sideInset, railTop);
        ctx.lineTo(w - sideInset, railBottom);
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
