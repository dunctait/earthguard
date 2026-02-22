/**
 * EarthGuard UI controller
 * Keeps DOM querying and button state rendering out of core game logic.
 */
class EarthGuardUI {
    constructor() {
        const utils = window.EarthGuardUtils;
        this.el = utils ? utils.cacheDom([
            'level',
            'hp',
            'angle-display',
            'power-bar',
            'fire-btn',
            'advance-btn'
        ]) : {};
    }

    update(game) {
        if (!game || !this.el.fireBtn) return;

        this.renderHud(game);
        this.renderAngle(game);
        this.renderPower(game);
        this.renderButtons(game);
    }

    renderHud(game) {
        this.el.level.innerHTML = `<span class="hud-label">LEVEL</span><span class="hud-value">${game.level}</span>`;
        this.el.hp.innerHTML = `<span class="hud-label">HP</span><span class="hud-value">${Math.max(0, game.baseHP)}</span>`;
    }

    renderAngle(game) {
        this.el['angle-display'].textContent = `${game.launcherAngle}\u00B0`;
    }

    renderPower(game) {
        this.el['power-bar'].style.width = `${game.power}%`;
    }

    renderButtons(game) {
        const fireBtn = this.el['fire-btn'];
        const advanceBtn = this.el['advance-btn'];
        const missilesLeft = game.config.MISSILES_PER_TURN - game.missilesLockedThisTurn;

        if (game.isCharging) {
            fireBtn.textContent = 'CHARGING...';
            fireBtn.className = 'charging';
        } else if (missilesLeft === 0) {
            fireBtn.textContent = 'LAUNCHING...';
            fireBtn.className = 'charged';
        } else {
            fireBtn.textContent = `FIRE (${missilesLeft} left)`;
            fireBtn.className = (!game.isAnimating && missilesLeft > 0) ? 'pulse' : '';
        }

        advanceBtn.disabled = game.isAnimating;
        advanceBtn.classList.toggle('is-disabled', game.isAnimating);
    }
}

window.EarthGuardUI = EarthGuardUI;
