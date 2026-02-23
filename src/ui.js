/**
 * EarthGuard UI controller
 * Keeps DOM querying and button state rendering out of core game logic.
 */
class EarthGuardUI {
    constructor() {
        const utils = window.EarthGuardUtils;
        this.prevHudValues = {
            energy: null,
            money: null
        };
        this.hudDeltaFx = {
            energy: null,
            money: null
        };
        this.el = utils ? utils.cacheDom([
            'level',
            'hp',
            'energy',
            'money',
            'missiles-status',
            'angle-display',
            'power-bar-container',
            'power-bar',
            'power-lock-marker',
            'fire-btn',
            'advance-btn',
            'upgrade-menu-btn',
            'upgrade-modal-overlay',
            'upgrade-menu',
            'upgrade-menu-title',
            'upgrade-menu-close-btn',
            'upgrade-list',
            'game-over-overlay',
            'game-over-modal',
            'game-over-title',
            'game-over-subtitle',
            'play-again-btn'
        ]) : {};
    }

    update(game) {
        if (!game || !this.el['fire-btn']) return;

        this.trackHudDeltas(game);
        this.renderHud(game);
        this.renderAngle(game);
        this.renderPower(game);
        this.renderButtons(game);
        this.renderUpgrades(game);
        this.renderGameOver(game);
    }

    trackHudDeltas(game) {
        this.trackHudDelta('energy', game.missileEnergy, 'EN');
        this.trackHudDelta('money', game.money, '$');
    }

    trackHudDelta(key, nextValue, prefix) {
        const prevValue = this.prevHudValues[key];
        if (typeof prevValue === 'number' && nextValue > prevValue) {
            this.hudDeltaFx[key] = {
                text: `+${prefix === '$' ? '$' : ''}${this.formatHudNumber(nextValue - prevValue)}`,
                until: Date.now() + 1400
            };
        }
        this.prevHudValues[key] = nextValue;
    }

    getHudDeltaMarkup(key) {
        const fx = this.hudDeltaFx[key];
        if (!fx || Date.now() > fx.until) return '';
        return `<span class="hud-delta">${fx.text}</span>`;
    }

    formatHudNumber(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return '0';
        return String(Math.floor(num));
    }

    formatUpgradeLevelText(upgrade) {
        const maxText = (upgrade.maxLevel === null || upgrade.maxLevel === undefined) ? '∞' : upgrade.maxLevel;
        return `L${upgrade.level}/${maxText}`;
    }

    formatUpgradeCostText(tier) {
        if (!tier) return 'BUY';
        const parts = [];
        if ((tier.moneyCost ?? 0) > 0) parts.push(`$${tier.moneyCost}`);
        if ((tier.energyCost ?? 0) > 0) parts.push(`EN ${tier.energyCost}`);
        if (parts.length === 0) return 'BUY [FREE]';
        return `BUY [${parts.join(' | ')}]`;
    }

    renderHud(game) {
        // HUD shows the upcoming decision cycle (the cycle the player is about to spend).
        const displayedCycle = Math.max(1, (game.levelCycles || 0) + 1);
        const liveBonus = game.getWaveClearSpeedBonus(displayedCycle, game.level);
        this.el.level.innerHTML = `<span class="hud-line"><span class="hud-label">LEVEL</span><span class="hud-value">${game.level}</span></span><span class="hud-line"><span class="hud-label">CYCLE</span><span class="hud-value">${displayedCycle}</span></span><span class="hud-line"><span class="hud-label">BONUS</span><span class="hud-value hud-value-hypo">+$${liveBonus}</span></span>`;
        this.el.hp.innerHTML = `<span class="hud-label">HP</span><span class="hud-value">${Math.max(0, game.baseHP)}</span>`;
        this.el.energy.innerHTML = `<span class="hud-label">EN</span><span class="hud-value">${this.formatHudNumber(game.missileEnergy)}/${this.formatHudNumber(game.config.MISSILE_ENERGY_MAX)}</span>${this.getHudDeltaMarkup('energy')}`;
        this.el.money.innerHTML = `<span class="hud-label">$</span><span class="hud-value">${this.formatHudNumber(game.money)}</span>${this.getHudDeltaMarkup('money')}`;
        if (this.el['missiles-status']) {
            this.el['missiles-status'].innerHTML = `MISSILES TARGETED: <span class="hud-inline-value">${game.missilesLockedThisTurn}/${game.getMissilesPerTurn()}</span>`;
        }
    }

    renderAngle(game) {
        this.el['angle-display'].textContent = `${game.launcherAngle}\u00B0`;
    }

    renderPower(game) {
        const power = Math.max(0, Math.min(100, game.power || 0));
        const powerScale = typeof game.getTargetRangeProgressForPower === 'function'
            ? game.getTargetRangeProgressForPower(power)
            : (power / 100);
        const bar = this.el['power-bar'];
        if (bar) {
            bar.style.setProperty('--power-scale', String(powerScale));
            // Keep width fixed so the transform scale is the single source of truth.
            bar.style.width = '100%';
        }
        const marker = this.el['power-lock-marker'];
        if (marker) {
            const lastLockedPower = Math.max(0, Math.min(100, game.lastLockedPower || 0));
            const markerScale = typeof game.getTargetRangeProgressForPower === 'function'
                ? game.getTargetRangeProgressForPower(lastLockedPower)
                : (lastLockedPower / 100);
            marker.style.left = `${Math.max(0, Math.min(100, markerScale * 100))}%`;
            marker.classList.toggle('is-visible', !!(lastLockedPower > 0 && game.hasPowerMemory && game.hasPowerMemory()));
        }
    }

    renderButtons(game) {
        const fireBtn = this.el['fire-btn'];
        const advanceBtn = this.el['advance-btn'];
        const missilesLeft = game.getMissilesPerTurn() - game.missilesLockedThisTurn;
        const idleCost = game.getMissileEnergyCostForPower(game.config.MISSILE_MIN_ENERGY_COST);
        const currentCost = game.getMissileEnergyCostForPower(game.power || game.config.MISSILE_MIN_ENERGY_COST);

        if (game.isCharging) {
            fireBtn.textContent = `TARGETING | COST ${currentCost}`;
            fireBtn.className = 'terminal-btn charging';
        } else if (missilesLeft === 0) {
            fireBtn.textContent = 'TARGETS LOCKED';
            fireBtn.className = 'terminal-btn charged';
        } else {
            fireBtn.textContent = `TARGET (${missilesLeft} LEFT | COST ${idleCost})`;
            fireBtn.className = (!game.isAnimating && missilesLeft > 0) ? 'terminal-btn pulse' : 'terminal-btn';
        }

        const canFire = !game.isGameOver && (game.isCharging || game.canCharge());
        fireBtn.disabled = !canFire;

        advanceBtn.disabled = game.isAnimating || game.isGameOver;
        advanceBtn.classList.toggle('is-disabled', game.isAnimating || game.isGameOver);
        advanceBtn.textContent = game.isAnimating ? 'CYCLING...' : 'CYCLE';
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
            isOpen: game.isUpgradeMenuOpen && !game.isGameOver,
            titleText: 'UPGRADES'
        });
        menuBtn.className = game.isUpgradeMenuOpen ? 'terminal-btn upgrade-btn owned' : 'terminal-btn upgrade-btn';
        menuBtn.textContent = game.isUpgradeMenuOpen
            ? `CLOSE UPGRADES (${availableUpgradeCount})`
            : `UPGRADES (${availableUpgradeCount})`;

        list.innerHTML = game.getOrderedUpgrades().map((upgrade) => {
            const nextTier = game.getNextUpgradeTier(upgrade.key);
            const isOwnedOut = (upgrade.maxLevel !== null) && (upgrade.level >= upgrade.maxLevel);
            const canBuy = game.canPurchaseUpgrade(upgrade.key);
            const levelText = this.formatUpgradeLevelText(upgrade);
            const effectText = game.getUpgradeNextTierText(upgrade.key);
            const costText = isOwnedOut
                ? 'OWNED'
                : this.formatUpgradeCostText(nextTier);
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

    renderGameOver(game) {
        const overlay = this.el['game-over-overlay'];
        const modal = this.el['game-over-modal'];
        if (!overlay || !modal) return;
        this.renderModal({
            overlayEl: overlay,
            modalEl: modal,
            titleEl: this.el['game-over-title'],
            isOpen: !!game.isGameOver,
            titleText: 'GAME OVER'
        });
        if (this.el['game-over-subtitle']) {
            this.el['game-over-subtitle'].textContent = game.gameOverReason || 'EARTH BREACHED';
        }
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
