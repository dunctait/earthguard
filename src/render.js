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

        // Generate terrain once
        this.terrainPoints = null;

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
        this.generateTerrain();
        this.render();
    }

    generateTerrain() {
        // Generate noisy terrain with a hill in the center
        const w = this.canvas.width;
        const baseY = this.canvas.height - 30;
        const points = [];
        const segments = 40;

        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * w;
            const normalizedX = i / segments;

            // Central hill (gaussian-ish bump)
            const distFromCenter = Math.abs(normalizedX - 0.5);
            const hillHeight = Math.exp(-distFromCenter * distFromCenter * 20) * 25;

            // Small noise
            const noise = Math.sin(i * 1.5) * 3 + Math.sin(i * 3.7) * 2;

            points.push({ x, y: baseY - hillHeight - noise });
        }

        this.terrainPoints = points;
        this.hillTopY = baseY - 25; // Top of the central hill
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
        ctx.fillStyle = 'rgba(0, 20, 0, 0.08)';
        for (let y = 0; y < h; y += 3) {
            ctx.fillRect(0, y, w, 1);
        }

        // Cannon position - on top of the hill
        const cannonX = w / 2;
        const cannonY = this.hillTopY - 5;
        const angleRad = this.gameAngleToRad(this.game.launcherAngle);

        // Draw terrain
        if (this.terrainPoints && this.terrainPoints.length > 0) {
            ctx.strokeStyle = c.greenMid;
            ctx.lineWidth = 2;
            this.setGlow(c.greenGlow, 8);
            ctx.beginPath();
            ctx.moveTo(this.terrainPoints[0].x, this.terrainPoints[0].y);
            for (let i = 1; i < this.terrainPoints.length; i++) {
                ctx.lineTo(this.terrainPoints[i].x, this.terrainPoints[i].y);
            }
            ctx.stroke();
            this.clearGlow();
        }

        // Draw locked missiles predictions
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
            ctx.moveTo(cannonX, cannonY);
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
            ctx.moveTo(cannonX, cannonY);
            ctx.lineTo(
                cannonX + Math.cos(angleRad) * h,
                cannonY - Math.sin(angleRad) * h
            );
            ctx.stroke();
            ctx.setLineDash([]);
            this.clearGlow();
        }

        // Draw cannon - solid shape
        this.drawCannon(cannonX, cannonY, angleRad);

        // Draw missiles in flight
        for (const missile of this.game.missiles) {
            if (missile.exploded) continue;

            const startX = cannonX;
            const startY = cannonY;
            const endPos = this.worldToScreen(missile.targetX, missile.targetY);

            const currentX = startX + (endPos.x - startX) * missile.progress;
            const currentY = startY + (endPos.y - startY) * missile.progress;

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
                startX + (endPos.x - startX) * trailProgress,
                startY + (endPos.y - startY) * trailProgress
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

        // Draw aliens - UFO shape
        for (const alien of this.game.aliens) {
            const pos = this.worldToScreen(alien.x, alien.y);
            const size = this.worldToScreenSize(alien.radius);
            this.drawUFO(pos.x, pos.y, size);
        }

        // Border frame
        ctx.strokeStyle = c.greenDim;
        ctx.lineWidth = 1;
        ctx.strokeRect(1, 1, w - 2, h - 2);
    }

    drawCannon(x, y, angleRad) {
        const ctx = this.ctx;
        const c = this.colors;

        // Cannon base - trapezoid shape
        ctx.fillStyle = c.greenMid;
        this.setGlow(c.greenGlow, 10);
        ctx.beginPath();
        ctx.moveTo(x - 18, y + 8);
        ctx.lineTo(x + 18, y + 8);
        ctx.lineTo(x + 12, y - 2);
        ctx.lineTo(x - 12, y - 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = c.greenBright;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cannon turret - rotating part
        ctx.save();
        ctx.translate(x, y - 2);
        ctx.rotate(-angleRad + Math.PI / 2);

        // Turret base circle
        ctx.fillStyle = c.greenMid;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c.greenBright;
        ctx.stroke();

        // Barrel
        ctx.fillStyle = c.greenMid;
        ctx.fillRect(-3, -28, 6, 25);
        ctx.strokeStyle = c.greenBright;
        ctx.strokeRect(-3, -28, 6, 25);

        // Barrel tip
        ctx.fillRect(-4, -32, 8, 5);
        ctx.strokeRect(-4, -32, 8, 5);

        ctx.restore();
        this.clearGlow();
    }

    drawUFO(x, y, size) {
        const ctx = this.ctx;
        const c = this.colors;

        const width = size * 3;
        const height = size * 0.8;
        const domeHeight = size * 1.2;

        ctx.strokeStyle = c.red;
        ctx.lineWidth = 2;
        this.setGlow(c.redGlow, 12);

        // Main body - flat ellipse
        ctx.beginPath();
        ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Dome on top
        ctx.beginPath();
        ctx.ellipse(x, y - height * 0.5, width * 0.4, domeHeight, 0, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Bottom detail line
        ctx.beginPath();
        ctx.ellipse(x, y + height * 0.3, width * 0.6, height * 0.3, 0, 0, Math.PI);
        ctx.stroke();

        // Lights/windows
        ctx.fillStyle = c.red;
        const lightCount = 3;
        for (let i = 0; i < lightCount; i++) {
            const lx = x + (i - 1) * (width * 0.5);
            ctx.beginPath();
            ctx.arc(lx, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        this.clearGlow();
    }
}
