/**
 * EarthGuard - Canvas Renderer
 * Retro vector style: green line art on black with glow
 */

class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Retro color palette
        this.colors = {
            black: '#000000',
            greenBright: '#00ff41',
            greenMid: '#00cc33',
            greenDim: '#00661a',
            greenGlow: 'rgba(0, 255, 65, 0.4)',
            red: '#ff3333',
            redGlow: 'rgba(255, 51, 51, 0.4)',
            orange: '#ff8800',
            orangeGlow: 'rgba(255, 136, 0, 0.4)'
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.setupInput();

        this.game.onStateChange = () => {
            this.render();
            this.game.updateUI();
        };

        this.render();
        this.game.updateUI();
    }

    resize() {
        const container = this.canvas.parentElement;
        const controlsHeight = document.getElementById('controls').offsetHeight || 150;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight - controlsHeight;
        this.render();
    }

    setupInput() {
        const setupHoldButton = (element, action, initialDelay = 300, repeatDelay = 50) => {
            let timeout, interval;
            const start = (e) => {
                e.preventDefault();
                action();
                timeout = setTimeout(() => {
                    interval = setInterval(action, repeatDelay);
                }, initialDelay);
            };
            const stop = () => {
                clearTimeout(timeout);
                clearInterval(interval);
            };
            element.addEventListener('mousedown', start);
            element.addEventListener('mouseup', stop);
            element.addEventListener('mouseleave', stop);
            element.addEventListener('touchstart', start);
            element.addEventListener('touchend', stop);
            element.addEventListener('touchcancel', stop);
        };

        setupHoldButton(document.getElementById('rot-left-big'), () => this.game.rotateLeft(10));
        setupHoldButton(document.getElementById('rot-left-small'), () => this.game.rotateLeft(1));
        setupHoldButton(document.getElementById('rot-right-small'), () => this.game.rotateRight(1));
        setupHoldButton(document.getElementById('rot-right-big'), () => this.game.rotateRight(10));

        const fireBtn = document.getElementById('fire-btn');
        let chargeInterval = null;

        const startCharge = (e) => {
            e.preventDefault();
            this.game.startCharging();
            chargeInterval = setInterval(() => this.game.updateCharge(), this.game.config.POWER_UPDATE_INTERVAL);
        };

        const stopCharge = (e) => {
            e.preventDefault();
            if (chargeInterval) {
                clearInterval(chargeInterval);
                chargeInterval = null;
            }
            this.game.stopCharging();
        };

        fireBtn.addEventListener('mousedown', startCharge);
        fireBtn.addEventListener('mouseup', stopCharge);
        fireBtn.addEventListener('mouseleave', stopCharge);
        fireBtn.addEventListener('touchstart', startCharge);
        fireBtn.addEventListener('touchend', stopCharge);
        fireBtn.addEventListener('touchcancel', stopCharge);

        document.getElementById('advance-btn').addEventListener('click', () => this.game.advance());
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

    // Set glow effect
    setGlow(color, blur = 10) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = blur;
    }

    clearGlow() {
        this.ctx.shadowBlur = 0;
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const config = this.game.config;
        const c = this.colors;

        // Clear - pure black
        ctx.fillStyle = c.black;
        ctx.fillRect(0, 0, w, h);

        // Scanline effect (subtle)
        ctx.fillStyle = 'rgba(0, 20, 0, 0.1)';
        for (let y = 0; y < h; y += 3) {
            ctx.fillRect(0, y, w, 1);
        }

        const launcherPos = this.worldToScreen(config.WORLD_WIDTH / 2, config.LAUNCHER_Y);
        const angleRad = this.gameAngleToRad(this.game.launcherAngle);

        // Ground line
        const groundY = this.worldToScreen(0, config.LAUNCHER_Y).y;
        ctx.strokeStyle = c.greenMid;
        ctx.lineWidth = 2;
        this.setGlow(c.greenGlow, 8);
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w, groundY);
        ctx.stroke();
        this.clearGlow();

        // Draw locked missiles predictions (green circles)
        const lockedPredictions = this.game.getLockedMissilesPredictions();
        for (const pred of lockedPredictions) {
            const predScreen = this.worldToScreen(pred.x, pred.y);
            const predRadius = this.worldToScreenSize(pred.radius);

            ctx.strokeStyle = c.greenBright;
            ctx.lineWidth = 1;
            this.setGlow(c.greenGlow, 15);
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(predScreen.x, predScreen.y, predRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            this.clearGlow();
        }

        // Draw current charging prediction
        const prediction = this.game.getPrediction();
        if (prediction && !this.game.isAnimating) {
            const predScreen = this.worldToScreen(prediction.x, prediction.y);
            const predRadius = this.worldToScreenSize(prediction.radius);

            ctx.strokeStyle = c.orange;
            ctx.lineWidth = 1;
            this.setGlow(c.orangeGlow, 15);
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(predScreen.x, predScreen.y, predRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Trajectory line
            ctx.strokeStyle = c.greenDim;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 6]);
            ctx.beginPath();
            ctx.moveTo(launcherPos.x, launcherPos.y);
            ctx.lineTo(predScreen.x, predScreen.y);
            ctx.stroke();
            ctx.setLineDash([]);
            this.clearGlow();
        }

        // Aiming guide line
        if (!this.game.isAnimating && !prediction) {
            ctx.strokeStyle = c.greenDim;
            ctx.lineWidth = 1;
            this.setGlow(c.greenGlow, 5);
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.moveTo(launcherPos.x, launcherPos.y);
            ctx.lineTo(
                launcherPos.x + Math.cos(angleRad) * h,
                launcherPos.y - Math.sin(angleRad) * h
            );
            ctx.stroke();
            ctx.setLineDash([]);
            this.clearGlow();
        }

        // Launcher base - simple circle
        ctx.strokeStyle = c.greenBright;
        ctx.lineWidth = 2;
        this.setGlow(c.greenGlow, 10);
        ctx.beginPath();
        ctx.arc(launcherPos.x, launcherPos.y, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Launcher barrel - line
        const launcherLength = 30;
        ctx.strokeStyle = c.greenBright;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(launcherPos.x, launcherPos.y);
        ctx.lineTo(
            launcherPos.x + Math.cos(angleRad) * launcherLength,
            launcherPos.y - Math.sin(angleRad) * launcherLength
        );
        ctx.stroke();
        this.clearGlow();

        // Draw missiles in flight
        for (const missile of this.game.missiles) {
            if (missile.exploded) continue;

            const startPos = this.worldToScreen(missile.startX, missile.startY);
            const endPos = this.worldToScreen(missile.targetX, missile.targetY);

            const currentX = startPos.x + (endPos.x - startPos.x) * missile.progress;
            const currentY = startPos.y + (endPos.y - startPos.y) * missile.progress;

            // Missile - bright dot
            ctx.fillStyle = c.greenBright;
            this.setGlow(c.greenGlow, 15);
            ctx.beginPath();
            ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
            ctx.fill();

            // Trail
            ctx.strokeStyle = c.greenMid;
            ctx.lineWidth = 2;
            const trailProgress = Math.max(0, missile.progress - 0.15);
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(
                startPos.x + (endPos.x - startPos.x) * trailProgress,
                startPos.y + (endPos.y - startPos.y) * trailProgress
            );
            ctx.stroke();
            this.clearGlow();

            // Target zone
            const targetScreen = this.worldToScreen(missile.targetX, missile.targetY);
            const radius = this.worldToScreenSize(config.EXPLOSION_RADIUS);
            ctx.strokeStyle = c.greenDim;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 6]);
            ctx.beginPath();
            ctx.arc(targetScreen.x, targetScreen.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw explosions
        for (const explosion of this.game.explosions) {
            const pos = this.worldToScreen(explosion.x, explosion.y);
            const radius = this.worldToScreenSize(explosion.radius);
            const progress = explosion.age / explosion.maxAge;
            const alpha = 1 - progress;

            // Expanding ring
            ctx.strokeStyle = `rgba(0, 255, 65, ${alpha})`;
            ctx.lineWidth = 3;
            this.setGlow(c.greenGlow, 20 * alpha);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius * (0.5 + progress * 0.5), 0, Math.PI * 2);
            ctx.stroke();

            // Inner flash
            if (progress < 0.3) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius * 0.3, 0, Math.PI * 2);
                ctx.stroke();
            }
            this.clearGlow();
        }

        // Draw aliens - triangle wireframes
        for (const alien of this.game.aliens) {
            const pos = this.worldToScreen(alien.x, alien.y);
            const size = this.worldToScreenSize(alien.radius);

            ctx.strokeStyle = c.red;
            ctx.lineWidth = 2;
            this.setGlow(c.redGlow, 12);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - size * 1.5);
            ctx.lineTo(pos.x - size, pos.y + size);
            ctx.lineTo(pos.x + size, pos.y + size);
            ctx.closePath();
            ctx.stroke();
            this.clearGlow();
        }

        // Border frame
        ctx.strokeStyle = c.greenDim;
        ctx.lineWidth = 1;
        ctx.strokeRect(1, 1, w - 2, h - 2);
    }
}
