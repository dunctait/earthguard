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
            'money',
            'angle-display',
            'power-bar',
            'fire-btn',
            'advance-btn',
            'upgrade-menu-btn',
            'upgrade-menu',
            'upgrade-target-area-meta',
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
        this.el.money.innerHTML = `<span class="hud-label">$</span><span class="hud-value">${game.money}</span>`;
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
        const idleCost = game.getMissileEnergyCostForPower(game.config.MISSILE_MIN_ENERGY_COST);
        const currentCost = game.getMissileEnergyCostForPower(game.power || game.config.MISSILE_MIN_ENERGY_COST);

        if (game.isCharging) {
            fireBtn.textContent = `CHARGING | COST ${currentCost}`;
            fireBtn.className = 'charging';
        } else if (missilesLeft === 0) {
            fireBtn.textContent = 'LAUNCHING...';
            fireBtn.className = 'charged';
        } else {
            fireBtn.textContent = `FIRE (${missilesLeft} | COST ${idleCost})`;
            fireBtn.className = (!game.isAnimating && missilesLeft > 0) ? 'pulse' : '';
        }

        const canFire = game.isCharging || game.canCharge();
        fireBtn.disabled = !canFire;

        advanceBtn.disabled = game.isAnimating;
        advanceBtn.classList.toggle('is-disabled', game.isAnimating);
    }

    renderUpgrades(game) {
        const money = this.el['money'];
        const menuBtn = this.el['upgrade-menu-btn'];
        const menu = this.el['upgrade-menu'];
        const meta = this.el['upgrade-target-area-meta'];
        const flagBtn = this.el['upgrade-target-flag-btn'];
        if (!money || !flagBtn || !menuBtn || !menu || !meta) return;

        menu.classList.toggle('is-hidden', !game.isUpgradeMenuOpen);
        menuBtn.className = game.isUpgradeMenuOpen ? 'upgrade-btn owned' : 'upgrade-btn';
        menuBtn.textContent = game.isUpgradeMenuOpen ? 'CLOSE UPGRADES' : 'UPGRADES';

        const targetAreaUpgrade = game.upgrades.targetAreas;
        if (targetAreaUpgrade.level > 0) {
            flagBtn.textContent = 'TARGET AREA: ONLINE';
            flagBtn.className = 'upgrade-btn owned';
            flagBtn.disabled = true;
            meta.textContent = 'TARGET AREA PREVIEW | ACTIVE';
        } else {
            flagBtn.textContent = `BUY  [$${targetAreaUpgrade.moneyCost} | EN ${targetAreaUpgrade.energyCost}]`;
            flagBtn.className = 'upgrade-btn';
            flagBtn.disabled = !game.canPurchaseUpgrade('targetAreas');
            meta.textContent = 'TARGET AREA PREVIEW | SHOWS IMPACT CIRCLES';
        }
    }
}

window.EarthGuardUI = EarthGuardUI;
