/**
 * EarthGuard - Canvas Renderer
 */

class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

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
        // Hold-to-repeat helper
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

        // Rotation buttons with hold-to-repeat
        setupHoldButton(document.getElementById('rot-left-big'), () => this.game.rotateLeft(10));
        setupHoldButton(document.getElementById('rot-left-small'), () => this.game.rotateLeft(1));
        setupHoldButton(document.getElementById('rot-right-small'), () => this.game.rotateRight(1));
        setupHoldButton(document.getElementById('rot-right-big'), () => this.game.rotateRight(10));

        // Angle input
        const angleInput = document.getElementById('angle-input');
        angleInput.addEventListener('change', () => {
            const val = parseInt(angleInput.value, 10);
            if (!isNaN(val)) {
                this.game.launcherAngle = Math.max(this.game.MIN_ANGLE, Math.min(this.game.MAX_ANGLE, val));
                this.game.notify();
                this.game.updateUI();
            }
        });

        // Fire button - hold to charge
        const fireBtn = document.getElementById('fire-btn');
        let chargeInterval = null;

        const startCharge = (e) => {
            e.preventDefault();
            this.game.startCharging();
            chargeInterval = setInterval(() => this.game.updateCharge(), 30);
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

        // Advance button
        document.getElementById('advance-btn').addEventListener('click', () => this.game.advance());
    }

    // Convert world coords to screen coords
    worldToScreen(x, y) {
        const scaleX = this.canvas.width / this.game.WORLD_WIDTH;
        const scaleY = this.canvas.height / this.game.WORLD_HEIGHT;
        return {
            x: x * scaleX,
            y: this.canvas.height - (y * scaleY) // Flip Y so 0 is bottom
        };
    }

    worldToScreenSize(size) {
        return size * (this.canvas.width / this.game.WORLD_WIDTH);
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear with gradient sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#0a0a2e');
        skyGrad.addColorStop(1, '#1a1a3e');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Stars
        ctx.fillStyle = '#ffffff33';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37 + 13) % w;
            const y = (i * 73 + 7) % (h * 0.7);
            ctx.fillRect(x, y, 1, 1);
        }

        // Earth/ground
        const groundHeight = this.worldToScreenSize(8);
        const groundGrad = ctx.createLinearGradient(0, h - groundHeight, 0, h);
        groundGrad.addColorStop(0, '#2a5a3a');
        groundGrad.addColorStop(1, '#1a3a2a');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, h - groundHeight, w, groundHeight);

        // Draw prediction (before other entities so it's behind)
        const prediction = this.game.getPrediction();
        if (prediction && !this.game.isAnimating) {
            const predScreen = this.worldToScreen(prediction.x, prediction.y);
            const predRadius = this.worldToScreenSize(prediction.radius);

            // Prediction circle
            ctx.strokeStyle = this.game.hasCharged ? '#4a9' : '#f8444488';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(predScreen.x, predScreen.y, predRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Fill with transparent color
            ctx.fillStyle = this.game.hasCharged ? '#4a944422' : '#f8444422';
            ctx.fill();

            // Trajectory line
            const launcherPos = this.worldToScreen(this.game.WORLD_WIDTH / 2, 5);
            ctx.strokeStyle = '#ffffff44';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(launcherPos.x, launcherPos.y);
            ctx.lineTo(predScreen.x, predScreen.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw launcher
        const launcherPos = this.worldToScreen(this.game.WORLD_WIDTH / 2, 5);
        const launcherLength = 35;
        const angleRad = this.game.launcherAngle * Math.PI / 180;

        // Aiming guide line (shows direction before charging)
        if (!this.game.isAnimating && !this.game.hasCharged) {
            ctx.strokeStyle = '#ffffff22';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.moveTo(launcherPos.x, launcherPos.y);
            ctx.lineTo(
                launcherPos.x + Math.cos(angleRad) * h,
                launcherPos.y - Math.sin(angleRad) * h
            );
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Launcher base
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(launcherPos.x, launcherPos.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Launcher barrel
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(launcherPos.x, launcherPos.y);
        ctx.lineTo(
            launcherPos.x + Math.cos(angleRad) * launcherLength,
            launcherPos.y - Math.sin(angleRad) * launcherLength
        );
        ctx.stroke();

        // Draw missiles in flight
        for (const missile of this.game.missiles) {
            if (missile.exploded) continue;

            const startPos = this.worldToScreen(this.game.WORLD_WIDTH / 2, 5);
            const endPos = this.worldToScreen(missile.targetX, missile.targetY);

            const currentX = startPos.x + (endPos.x - startPos.x) * missile.progress;
            const currentY = startPos.y + (endPos.y - startPos.y) * missile.progress;

            // Missile
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Trail
            ctx.strokeStyle = '#ff884466';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(startPos.x + (endPos.x - startPos.x) * Math.max(0, missile.progress - 0.1),
                       startPos.y + (endPos.y - startPos.y) * Math.max(0, missile.progress - 0.1));
            ctx.stroke();
        }

        // Draw explosions
        for (const explosion of this.game.explosions) {
            const pos = this.worldToScreen(explosion.x, explosion.y);
            const radius = this.worldToScreenSize(explosion.radius);
            const alpha = 1 - (explosion.age / explosion.maxAge);

            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
            grad.addColorStop(0, `rgba(255, 220, 100, ${alpha})`);
            grad.addColorStop(0.4, `rgba(255, 100, 50, ${alpha * 0.7})`);
            grad.addColorStop(1, `rgba(255, 50, 0, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw aliens
        for (const alien of this.game.aliens) {
            const pos = this.worldToScreen(alien.x, alien.y);
            const size = this.worldToScreenSize(alien.radius);

            // Alien body (inverted triangle)
            ctx.fillStyle = '#c44';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y - size * 1.5);
            ctx.lineTo(pos.x - size, pos.y + size);
            ctx.lineTo(pos.x + size, pos.y + size);
            ctx.closePath();
            ctx.fill();

            // Glow effect
            ctx.shadowColor = '#f44';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}
