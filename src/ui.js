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
            'energy',
            'upgrade-points',
            'angle-display',
            'power-bar',
            'fire-btn',
            'advance-btn',
            'upgrade-target-flag-btn'
        ]) : {};
    }

    update(game) {
        if (!game || !this.el['fire-btn']) return;

        this.renderHud(game);
        this.renderAngle(game);
        this.renderPower(game);
        this.renderButtons(game);
        this.renderUpgrades(game);
    }

    renderHud(game) {
        this.el.level.innerHTML = `<span class="hud-label">LEVEL</span><span class="hud-value">${game.level}</span>`;
        this.el.hp.innerHTML = `<span class="hud-label">HP</span><span class="hud-value">${Math.max(0, game.baseHP)}</span>`;
        this.el.energy.innerHTML = `<span class="hud-label">EN</span><span class="hud-value">${game.missileEnergy}/${game.config.MISSILE_ENERGY_MAX}</span>`;
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
            fireBtn.textContent = `FIRE (${missilesLeft} | EN ${game.missileEnergy})`;
            fireBtn.className = (!game.isAnimating && missilesLeft > 0) ? 'pulse' : '';
        }

        const canFire = game.isCharging || game.canCharge();
        fireBtn.disabled = !canFire;

        advanceBtn.disabled = game.isAnimating;
        advanceBtn.classList.toggle('is-disabled', game.isAnimating);
    }

    renderUpgrades(game) {
        const upgradePoints = this.el['upgrade-points'];
        const flagBtn = this.el['upgrade-target-flag-btn'];
        if (!upgradePoints || !flagBtn) return;

        upgradePoints.innerHTML = `<span class="hud-label">UP</span><span class="hud-value">${game.upgradePoints}</span>`;

        const targetFlag = game.upgrades.targetFlags;
        if (targetFlag.level > 0) {
            flagBtn.textContent = 'TARGET FLAG: ONLINE';
            flagBtn.className = 'upgrade-btn owned';
            flagBtn.disabled = true;
        } else {
            flagBtn.textContent = `UNLOCK TARGET FLAG [${targetFlag.cost} UP]`;
            flagBtn.className = 'upgrade-btn';
            flagBtn.disabled = game.upgradePoints < targetFlag.cost;
        }
    }
}

window.EarthGuardUI = EarthGuardUI;
