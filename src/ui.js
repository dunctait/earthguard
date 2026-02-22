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
            'upgrade-modal-overlay',
            'upgrade-menu',
            'upgrade-menu-title',
            'upgrade-menu-close-btn',
            'upgrade-list'
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
        const displayedCycle = Math.max(1, game.levelCycles || 0);
        const liveBonus = game.getWaveClearSpeedBonus(displayedCycle, game.level);
        this.el.level.innerHTML = `<span class="hud-line"><span class="hud-label">LEVEL</span><span class="hud-value">${game.level}</span></span><span class="hud-line"><span class="hud-label">CYCLE</span><span class="hud-value">${displayedCycle}</span></span><span class="hud-line"><span class="hud-label">BONUS</span><span class="hud-value">+$${liveBonus}</span></span>`;
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
        const missilesLeft = game.getMissilesPerTurn() - game.missilesLockedThisTurn;
        const idleCost = game.getMissileEnergyCostForPower(game.config.MISSILE_MIN_ENERGY_COST);
        const currentCost = game.getMissileEnergyCostForPower(game.power || game.config.MISSILE_MIN_ENERGY_COST);

        if (game.isCharging) {
            fireBtn.textContent = `CHARGING | COST ${currentCost}`;
            fireBtn.className = 'terminal-btn charging';
        } else if (missilesLeft === 0) {
            fireBtn.textContent = 'LAUNCHING...';
            fireBtn.className = 'terminal-btn charged';
        } else {
            fireBtn.textContent = `FIRE (${missilesLeft} | COST ${idleCost})`;
            fireBtn.className = (!game.isAnimating && missilesLeft > 0) ? 'terminal-btn pulse' : 'terminal-btn';
        }

        const canFire = game.isCharging || game.canCharge();
        fireBtn.disabled = !canFire;

        advanceBtn.disabled = game.isAnimating;
        advanceBtn.classList.toggle('is-disabled', game.isAnimating);
    }

    renderUpgrades(game) {
        const money = this.el['money'];
        const menuBtn = this.el['upgrade-menu-btn'];
        const overlay = this.el['upgrade-modal-overlay'];
        const menu = this.el['upgrade-menu'];
        const list = this.el['upgrade-list'];
        if (!money || !menuBtn || !menu || !list || !overlay) return;

        const availableUpgradeCount = game.getAvailableUpgradeCount();

        this.renderModal({
            overlayEl: overlay,
            modalEl: menu,
            titleEl: this.el['upgrade-menu-title'],
            isOpen: game.isUpgradeMenuOpen,
            titleText: 'UPGRADES'
        });
        menuBtn.className = game.isUpgradeMenuOpen ? 'terminal-btn upgrade-btn owned' : 'terminal-btn upgrade-btn';
        menuBtn.textContent = game.isUpgradeMenuOpen
            ? `CLOSE UPGRADES (${availableUpgradeCount})`
            : `UPGRADES (${availableUpgradeCount})`;

        list.innerHTML = Object.values(game.upgrades).map((upgrade) => {
            const nextTier = game.getNextUpgradeTier(upgrade.key);
            const isOwnedOut = upgrade.level >= upgrade.maxLevel;
            const canBuy = game.canPurchaseUpgrade(upgrade.key);
            const levelText = `L${upgrade.level}/${upgrade.maxLevel}`;
            const effectText = game.getUpgradeNextTierText(upgrade.key);
            const costText = isOwnedOut
                ? 'OWNED'
                : `BUY [$${nextTier.moneyCost} | EN ${nextTier.energyCost}]`;
            const btnClass = isOwnedOut ? 'terminal-btn upgrade-btn owned' : 'terminal-btn upgrade-btn';
            const disabledAttr = (isOwnedOut || !canBuy) ? 'disabled' : '';

            return `
                <div class="terminal-panel upgrade-row">
                    <div class="upgrade-copy">
                        <div class="upgrade-name">${upgrade.name} <span class="upgrade-level">${levelText}</span></div>
                        <div class="upgrade-meta">${upgrade.description}</div>
                        <div class="upgrade-effect">${effectText}</div>
                    </div>
                    <button class="${btnClass}" data-upgrade-key="${upgrade.key}" ${disabledAttr}>${costText}</button>
                </div>
            `;
        }).join('');
    }

    renderModal({ overlayEl, modalEl, titleEl, isOpen, titleText }) {
        if (!modalEl) return;
        if (overlayEl) {
            overlayEl.classList.toggle('is-hidden', !isOpen);
            overlayEl.setAttribute('aria-hidden', String(!isOpen));
        }
        if (titleEl && typeof titleText === 'string') {
            titleEl.textContent = titleText;
        }
    }
}

window.EarthGuardUI = EarthGuardUI;
