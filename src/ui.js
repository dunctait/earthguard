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
        this.prevTotalCycles = null;
        this.hudDeltaFx = {
            energy: null,
            money: null
        };
        this.waveBonusFx = null;
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
            'idle-cycle-btn',
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
            'game-over-stats',
            'play-again-btn',
            'meta-upgrade-menu',
            'meta-upgrade-list',
            'game-over-jump',
            'jump-level-select',
            'jump-start-btn',
            'jump-start-hint'
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
        this.trackWaveBonusDelta(game);
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

    trackWaveBonusDelta(game) {
        const totalCycles = Math.floor(game.totalCycles || 0);
        const waveMoney = Math.floor(game.lastWaveClearBonus || 0);
        const waveEnergy = Math.floor(game.lastWaveClearEnergyBonus || 0);
        if (this.prevTotalCycles !== null && totalCycles !== this.prevTotalCycles && (waveMoney > 0 || waveEnergy > 0)) {
            const parts = [];
            if (waveMoney > 0) parts.push(`+$${waveMoney}`);
            if (waveEnergy > 0) parts.push(`+EN ${waveEnergy}`);
            this.waveBonusFx = {
                text: `WAVE ${parts.join(' | ')}`,
                until: Date.now() + 2200
            };
        }
        this.prevTotalCycles = totalCycles;
    }

    getWaveBonusMarkup() {
        const fx = this.waveBonusFx;
        if (!fx || Date.now() > fx.until) return '';
        return `<span class="hud-wave-bonus">${fx.text}</span>`;
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

    formatUpgradeCostText(tier, affordability = null) {
        if (!tier) return 'BUY';
        const parts = [];
        if ((tier.moneyCost ?? 0) > 0) {
            const missingMoney = affordability && !affordability.hasEnoughMoney;
            parts.push(`<span class="upgrade-cost-token${missingMoney ? ' missing' : ''}">$${tier.moneyCost}</span>`);
        }
        if ((tier.energyCost ?? 0) > 0) {
            const missingEnergy = affordability && !affordability.hasEnoughEnergy;
            parts.push(`<span class="upgrade-cost-token${missingEnergy ? ' missing' : ''}">EN ${tier.energyCost}</span>`);
        }
        if (parts.length === 0) return 'BUY [FREE]';
        return `BUY [${parts.join(' | ')}]`;
    }

    renderHud(game) {
        // HUD shows the upcoming decision cycle (the cycle the player is about to spend).
        const displayedCycle = Math.max(1, (game.levelCycles || 0) + 1);
        const liveBonus = game.getWaveClearSpeedBonus(displayedCycle, game.level);
        this.el.level.innerHTML = `<span class="hud-line"><span class="hud-label">LEVEL</span><span class="hud-value">${game.level}</span></span><span class="hud-line"><span class="hud-label">CYCLE</span><span class="hud-value">${displayedCycle}</span></span><span class="hud-line"><span class="hud-label">BONUS</span><span class="hud-value hud-value-hypo">+$${liveBonus}</span></span>${this.getWaveBonusMarkup()}`;
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
        const idleCycleBtn = this.el['idle-cycle-btn'];
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
        if (idleCycleBtn) {
            const canIdleCycle = !game.isAnimating && !game.isGameOver && (game.pendingMissiles?.length || 0) === 0;
            idleCycleBtn.disabled = !canIdleCycle;
            idleCycleBtn.classList.toggle('is-disabled', !canIdleCycle);
            idleCycleBtn.textContent = game.isAnimating ? '...' : 'IDLE CYCLE';
        }
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
            const affordability = typeof game.getUpgradeAffordability === 'function'
                ? game.getUpgradeAffordability(upgrade.key)
                : null;
            const levelText = this.formatUpgradeLevelText(upgrade);
            const effectText = game.getUpgradeNextTierText(upgrade.key);
            const costText = isOwnedOut
                ? 'OWNED'
                : this.formatUpgradeCostText(nextTier, affordability);
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
        const statsEl = this.el['game-over-stats'];
        if (statsEl) {
            const stats = game.stats || {};
            const boughtUpgrades = Object.values(game.upgrades || {}).filter((u) => (u?.level || 0) > 0);
            const boughtSummary = boughtUpgrades.length
                ? boughtUpgrades
                    .slice()
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map((u) => `${u.name} L${u.level}`)
                    .join(' • ')
                : 'NONE';
            const metaProgress = game.metaProgress || {};
            const lastRunMetaReward = Math.floor(metaProgress.lastRun?.metaReward || 0);
            const totalMetaCurrency = Math.floor(metaProgress.metaCurrency || 0);
            statsEl.innerHTML = [
                `<div class="game-over-stat-row"><span class="hud-label">LEVEL</span><span class="hud-value">${Math.floor(game.level || 1)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">CYCLES</span><span class="hud-value">${Math.floor(game.totalCycles || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">KILLS</span><span class="hud-value">${Math.floor(stats.kills || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">SHOTS</span><span class="hud-value">${Math.floor(stats.missilesLaunched || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">$ RUN</span><span class="hud-value">${Math.floor(game.money || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">SALVAGE</span><span class="hud-value">+${lastRunMetaReward} (${totalMetaCurrency})</span></div>`,
                `<div class="game-over-upgrades"><span class="hud-label">UPGRADES</span><span class="game-over-upgrade-list">${boughtSummary}</span></div>`
            ].join('');
        }

        const jumpWrap = this.el['game-over-jump'];
        const jumpSelect = this.el['jump-level-select'];
        const jumpBtn = this.el['jump-start-btn'];
        const jumpHint = this.el['jump-start-hint'];
        if (jumpWrap && jumpSelect && jumpBtn) {
            const options = typeof game.getAvailableJumpStartLevels === 'function'
                ? game.getAvailableJumpStartLevels()
                : [];
            jumpWrap.classList.toggle('is-hidden', options.length === 0);
            if (options.length > 0) {
                const currentValue = jumpSelect.value;
                jumpSelect.innerHTML = options.map((opt) => {
                    const label = `L${Math.floor(opt.level)} | $${Math.floor(opt.money)}`;
                    return `<option value="${Math.floor(opt.level)}">${label}</option>`;
                }).join('');
                if (currentValue && options.some((o) => String(o.level) === String(currentValue))) {
                    jumpSelect.value = currentValue;
                }
                const selected = options.find((o) => String(o.level) === String(jumpSelect.value)) || options[0];
                if (jumpHint && selected) {
                    jumpHint.textContent = `Start at level ${Math.floor(selected.level)} with $${Math.floor(selected.money)}, full EN, and no upgrades.`;
                }
                jumpBtn.disabled = !game.isGameOver;
            }
        }

        const metaList = this.el['meta-upgrade-list'];
        if (metaList) {
            const metaUpgrades = typeof game.getMetaUpgradeState === 'function' ? game.getMetaUpgradeState() : [];
            metaList.innerHTML = metaUpgrades.map((upgrade) => {
                const isMaxed = upgrade.level >= upgrade.maxLevel;
                const tier = upgrade.nextTier;
                const canBuy = !isMaxed && typeof game.canPurchaseMetaUpgrade === 'function' && game.canPurchaseMetaUpgrade(upgrade.key);
                const label = isMaxed
                    ? 'MAXED'
                    : `BUY [SALVAGE ${Math.floor(tier?.cost || 0)}]`;
                const effect = isMaxed ? 'MAXED' : (tier?.label || 'NEXT');
                return `
                    <div class="terminal-panel upgrade-row meta-upgrade-row">
                        <div class="upgrade-copy">
                            <div class="upgrade-name">${upgrade.name} <span class="upgrade-level">L${upgrade.level}/${upgrade.maxLevel}</span></div>
                            <div class="upgrade-meta">${upgrade.description}</div>
                            <div class="upgrade-effect">${effect}</div>
                        </div>
                        <button class="terminal-btn upgrade-btn${isMaxed ? ' owned' : ''}" data-meta-upgrade-key="${upgrade.key}" ${(!canBuy || isMaxed) ? 'disabled' : ''}>${label}</button>
                    </div>
                `;
            }).join('');
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
