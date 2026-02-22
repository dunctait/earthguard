/**
 * EarthGuard - Canvas Renderer
 *
 * Handles all visual rendering and input.
 */

class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Setup canvas sizing
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Setup input handlers
        this.setupInput();

        // Start render loop
        this.game.onTick = () => this.render();
        this.render();
    }

    resize() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight - 100; // Leave room for controls
        this.render();
    }

    setupInput() {
        // Touch/click to set target
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.handleTouch(touch.clientX, touch.clientY);
        });

        // Fuse slider
        document.getElementById('fuse-slider').addEventListener('input', (e) => {
            this.game.setFuse(parseFloat(e.target.value));
        });

        // Fire button
        document.getElementById('fire-btn').addEventListener('click', () => {
            if (this.game.targetX !== null) {
                this.game.fireMissile(
                    this.game.targetX,
                    this.game.targetY,
                    this.game.fuseTime
                );
            }
        });
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.canvas.width;
        const y = this.screenToWorld((e.clientY - rect.top) / this.canvas.height);
        this.game.setTarget(x, y);
        this.render();
    }

    handleTouch(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left) / this.canvas.width;
        const y = this.screenToWorld((clientY - rect.top) / this.canvas.height);
        this.game.setTarget(x, y);
        this.render();
    }

    // Convert screen Y (0=top, 1=bottom) to world Y (0=earth, 10=spawn)
    screenToWorld(screenY) {
        return this.game.SPAWN_HEIGHT * (1 - screenY);
    }

    // Convert world Y to screen Y
    worldToScreen(worldY) {
        return 1 - (worldY / this.game.SPAWN_HEIGHT);
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear
        ctx.fillStyle = '#0a0a2e';
        ctx.fillRect(0, 0, w, h);

        // Draw stars (simple background)
        ctx.fillStyle = '#ffffff22';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % w;
            const y = (i * 73) % h;
            ctx.fillRect(x, y, 1, 1);
        }

        // Draw Earth (bottom)
        const earthHeight = h * 0.08;
        const gradient = ctx.createLinearGradient(0, h - earthHeight, 0, h);
        gradient.addColorStop(0, '#2a5a3a');
        gradient.addColorStop(1, '#1a3a2a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, h - earthHeight, w, earthHeight);

        // Draw target marker
        if (this.game.targetX !== null) {
            const tx = this.game.targetX * w;
            const ty = this.worldToScreen(this.game.targetY) * h;

            ctx.strokeStyle = '#4a9';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(tx, ty, 15, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(tx - 20, ty);
            ctx.lineTo(tx + 20, ty);
            ctx.moveTo(tx, ty - 20);
            ctx.lineTo(tx, ty + 20);
            ctx.stroke();
        }

        // Draw missiles
        ctx.fillStyle = '#fff';
        for (const missile of this.game.missiles) {
            const mx = missile.x * w;
            const my = this.worldToScreen(missile.y) * h;

            ctx.beginPath();
            ctx.arc(mx, my, 4, 0, Math.PI * 2);
            ctx.fill();

            // Trail
            ctx.strokeStyle = '#ff884444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(mx, my + 20);
            ctx.stroke();
        }

        // Draw explosions
        for (const explosion of this.game.explosions) {
            const ex = explosion.x * w;
            const ey = this.worldToScreen(explosion.y) * h;
            const radius = (explosion.radius / this.game.SPAWN_HEIGHT) * h;
            const alpha = 1 - (explosion.age / 3);

            const grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, radius);
            grad.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
            grad.addColorStop(0.5, `rgba(255, 100, 50, ${alpha * 0.5})`);
            grad.addColorStop(1, `rgba(255, 50, 0, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ex, ey, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw aliens
        for (const alien of this.game.aliens) {
            const ax = alien.x * w;
            const ay = this.worldToScreen(alien.y) * h;

            // Alien body
            ctx.fillStyle = '#c44';
            ctx.beginPath();
            ctx.moveTo(ax, ay - 12);
            ctx.lineTo(ax - 10, ay + 8);
            ctx.lineTo(ax + 10, ay + 8);
            ctx.closePath();
            ctx.fill();

            // Glow
            ctx.shadowColor = '#f44';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}
