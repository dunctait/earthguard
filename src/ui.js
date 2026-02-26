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
        this.clearDataConfirmUntil = 0;
        this.el = utils ? utils.cacheDom([
            'level',
            'hp',
            'energy',
            'money',
            'missiles-status',
            'splash-overlay',
            'splash-modal',
            'splash-title',
            'splash-new-game-btn',
            'splash-open-meta-upgrades-btn',
            'splash-jump-level-select',
            'splash-jump-highest-btn',
            'splash-jump-start-btn',
            'splash-jump-preview',
            'splash-stats',
            'splash-clear-data-btn',
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
            'game-over-battle-overlay',
            'game-over-battle-title',
            'game-over-battle-subtitle',
            'game-over-continue-btn',
            'upgrade-list',
            'game-over-overlay',
            'game-over-modal',
            'game-over-title',
            'game-over-subtitle',
            'game-over-stats',
            'career-stats',
            'recent-runs',
            'open-meta-upgrades-btn',
            'play-again-btn',
            'meta-upgrade-overlay',
            'meta-upgrade-modal',
            'meta-upgrade-title',
            'meta-upgrade-salvage',
            'meta-upgrade-close-btn',
            'meta-upgrade-list',
            'game-over-jump',
            'jump-level-select',
            'jump-highest-btn',
            'jump-start-btn',
            'jump-start-hint',
            'jump-start-preview'
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
        this.renderSplash(game);
        this.renderGameOverBattlefieldPrompt(game);
        this.renderGameOver(game);
    }

    armClearDataConfirmation() {
        this.clearDataConfirmUntil = Date.now() + 3500;
        return true;
    }

    isClearDataConfirmArmed() {
        return Date.now() < (this.clearDataConfirmUntil || 0);
    }

    consumeClearDataConfirmation() {
        const armed = this.isClearDataConfirmArmed();
        this.clearDataConfirmUntil = 0;
        return armed;
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

    formatMetaUpgradeCostText(cost, canAfford) {
        const missing = !canAfford;
        return `BUY [<span class="upgrade-cost-token${missing ? ' missing' : ''}">SALVAGE ${Math.floor(cost || 0)}</span>]`;
    }

    renderHud(game) {
        // HUD shows the upcoming decision cycle (the cycle the player is about to spend).
        const displayedCycle = Math.max(1, (game.levelCycles || 0) + 1);
        const liveBonus = game.getWaveClearSpeedBonus(displayedCycle, game.level);
        this.el.level.innerHTML = `<span class="hud-line"><span class="hud-label">LEVEL</span><span class="hud-value">${game.level}</span></span><span class="hud-line"><span class="hud-label">CYCLE</span><span class="hud-value">${displayedCycle}</span></span><span class="hud-line"><span class="hud-label">BONUS</span><span class="hud-value hud-value-hypo">+$${liveBonus}</span></span>${this.getWaveBonusMarkup()}`;
        this.el.hp.innerHTML = `<span class="hud-label">HP</span><span class="hud-value">${Math.max(0, game.baseHP)}</span>`;
        const maxEnergy = (typeof game.getMaxEnergy === 'function') ? game.getMaxEnergy() : game.config.MISSILE_ENERGY_MAX;
        this.el.energy.innerHTML = `<span class="hud-label">EN</span><span class="hud-value">${this.formatHudNumber(game.missileEnergy)}/${this.formatHudNumber(maxEnergy)}</span>${this.getHudDeltaMarkup('energy')}`;
        const postBossPhase = Math.max(0, game.viewZoomStage || game.bossesDefeatedThisRun || 0);
        const phaseMarkup = postBossPhase > 0
            ? `<span class="hud-line hud-phase-line"><span class="hud-label">SECTOR</span><span class="hud-value hud-value-hypo">x${postBossPhase + 1}</span></span>`
            : '';
        this.el.money.innerHTML = `<span class="hud-line"><span class="hud-label">$</span><span class="hud-value">${this.formatHudNumber(game.money)}</span></span>${phaseMarkup}${this.getHudDeltaMarkup('money')}`;
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
        const isIdleCycleState = !game.isAnimating && !game.isGameOver && (game.pendingMissiles?.length || 0) === 0;
        advanceBtn.textContent = game.isAnimating ? 'CYCLING...' : (isIdleCycleState ? 'IDLE CYCLE' : 'CYCLE');
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
            isOpen: !!(game.isGameOver && game.isGameOverSummaryOpen),
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
            const shots = Math.max(0, Math.floor(stats.missilesLaunched || 0));
            const kills = Math.max(0, Math.floor(stats.kills || 0));
            const exactHits = Math.max(0, Math.floor(stats.exactHitKills || 0));
            const hitRate = shots > 0 ? Math.floor((kills / shots) * 100) : 0;
            const bossesDefeated = Math.max(0, Math.floor(game.bossesDefeatedThisRun || 0));
            statsEl.innerHTML = [
                `<div class="game-over-stat-row"><span class="hud-label">LEVEL</span><span class="hud-value">${Math.floor(game.level || 1)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">CYCLES</span><span class="hud-value">${Math.floor(game.totalCycles || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">KILLS</span><span class="hud-value">${kills}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">SHOTS</span><span class="hud-value">${shots}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">HIT RATE</span><span class="hud-value">${hitRate}%</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">EXACT</span><span class="hud-value">${exactHits}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">BOSSES</span><span class="hud-value">${bossesDefeated}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">$ RUN</span><span class="hud-value">${Math.floor(game.money || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">SALVAGE</span><span class="hud-value">+${lastRunMetaReward} (${totalMetaCurrency})</span></div>`,
                `<div class="game-over-upgrades"><span class="hud-label">UPGRADES</span><span class="game-over-upgrade-list">${boughtSummary}</span></div>`
            ].join('');
        }
        this.renderCareerSummary(game);

        const jumpWrap = this.el['game-over-jump'];
        const jumpSelect = this.el['jump-level-select'];
        const jumpHighestBtn = this.el['jump-highest-btn'];
        const jumpBtn = this.el['jump-start-btn'];
        const jumpHint = this.el['jump-start-hint'];
        const jumpPreviewEl = this.el['jump-start-preview'];
        if (jumpWrap && jumpSelect && jumpBtn) {
            const options = typeof game.getAvailableJumpStartLevels === 'function'
                ? game.getAvailableJumpStartLevels()
                : [];
            jumpWrap.classList.toggle('is-hidden', options.length === 0);
            if (jumpHighestBtn) {
                jumpHighestBtn.disabled = options.length === 0 || !game.isGameOver;
            }
            if (options.length > 0) {
                const currentValue = jumpSelect.value;
                jumpSelect.innerHTML = options.map((opt) => {
                    const label = `L${Math.floor(opt.level)} | $${Math.floor(opt.money)}`;
                    return `<option value="${Math.floor(opt.level)}">${label}</option>`;
                }).join('');
                if (currentValue && options.some((o) => String(o.level) === String(currentValue))) {
                    jumpSelect.value = currentValue;
                } else {
                    const preferredLevel = typeof game.getPreferredJumpStartLevel === 'function'
                        ? game.getPreferredJumpStartLevel()
                        : null;
                    const preferred = options.find((o) => o.level === preferredLevel);
                    jumpSelect.value = String((preferred || options[options.length - 1] || options[0]).level);
                }
                const selected = options.find((o) => String(o.level) === String(jumpSelect.value)) || options[0];
                const highest = options[options.length - 1];
                if (jumpHighestBtn) {
                    const alreadyHighest = !!selected && !!highest && selected.level === highest.level;
                    jumpHighestBtn.disabled = !game.isGameOver || alreadyHighest;
                    jumpHighestBtn.textContent = alreadyHighest ? 'HIGHEST ✓' : 'HIGHEST';
                }
                if (jumpHint && selected) {
                    jumpHint.textContent = `Start at level ${Math.floor(selected.level)} with $${Math.floor(selected.money)}, full EN, and no upgrades.`;
                }
                if (jumpPreviewEl && selected && typeof game.getJumpStartPreview === 'function') {
                    const preview = game.getJumpStartPreview(selected.level);
                    if (preview) {
                        const bonusParts = [];
                        if (preview.startBonusMoney > 0) bonusParts.push(`+$${preview.startBonusMoney}`);
                        if (preview.startBonusEnergy > 0) bonusParts.push(`+EN ${preview.startBonusEnergy}`);
                        jumpPreviewEl.innerHTML = [
                            `<span class="hud-label">WAVE</span> <span class="hud-inline-value">L${preview.level}</span>`,
                            `<span class="hud-label">THREATS</span> <span class="hud-inline-value">${preview.enemyCount}</span>`,
                            `<span class="hud-label">SPD</span> <span class="hud-inline-value">${Math.floor(preview.enemySpeed)}</span>`,
                            `<span class="hud-label">START</span> <span class="hud-inline-value">$${preview.money}${bonusParts.length ? ` ${bonusParts.join(' ')}` : ''}</span>`
                        ].join(' &nbsp; ');
                    } else {
                        jumpPreviewEl.textContent = '';
                    }
                }
                jumpBtn.disabled = !game.isGameOver;
                jumpBtn.textContent = selected ? `JUMP L${Math.floor(selected.level)}` : 'JUMP';
            }
        }

        this.renderMetaUpgradeModal(game);
    }

    renderSplash(game) {
        const overlay = this.el['splash-overlay'];
        const modal = this.el['splash-modal'];
        if (!overlay || !modal) return;
        this.renderModal({
            overlayEl: overlay,
            modalEl: modal,
            titleEl: this.el['splash-title'],
            isOpen: !!game.isSplashOpen,
            titleText: 'EARTHGUARD'
        });

        const jumpSelect = this.el['splash-jump-level-select'];
        const jumpStartBtn = this.el['splash-jump-start-btn'];
        const jumpHighestBtn = this.el['splash-jump-highest-btn'];
        const jumpPreviewEl = this.el['splash-jump-preview'];
        const jumpOptions = typeof game.getAvailableJumpStartLevels === 'function' ? game.getAvailableJumpStartLevels() : [];
        if (jumpSelect) {
            if (jumpOptions.length) {
                jumpSelect.disabled = false;
                const currentValue = jumpSelect.value;
                jumpSelect.innerHTML = jumpOptions.map((opt) => `<option value="${Math.floor(opt.level)}">L${Math.floor(opt.level)} | $${Math.floor(opt.money)}</option>`).join('');
                if (currentValue && jumpOptions.some((o) => String(o.level) === String(currentValue))) {
                    jumpSelect.value = currentValue;
                } else {
                    const preferred = typeof game.getPreferredJumpStartLevel === 'function' ? game.getPreferredJumpStartLevel() : null;
                    const selected = jumpOptions.find((o) => o.level === preferred) || jumpOptions[jumpOptions.length - 1];
                    jumpSelect.value = selected ? String(selected.level) : '';
                }
                const selected = jumpOptions.find((o) => String(o.level) === String(jumpSelect.value)) || jumpOptions[jumpOptions.length - 1];
                const highest = jumpOptions[jumpOptions.length - 1];
                if (jumpStartBtn) {
                    jumpStartBtn.disabled = !selected;
                    jumpStartBtn.textContent = selected ? `JUMP L${selected.level}` : 'JUMP';
                }
                if (jumpHighestBtn) {
                    const alreadyHighest = !!selected && !!highest && selected.level === highest.level;
                    jumpHighestBtn.disabled = jumpOptions.length === 0 || alreadyHighest;
                    jumpHighestBtn.textContent = alreadyHighest ? 'HIGHEST ✓' : 'HIGHEST';
                }
                if (jumpPreviewEl && selected && typeof game.getJumpStartPreview === 'function') {
                    const preview = game.getJumpStartPreview(selected.level);
                    jumpPreviewEl.innerHTML = preview
                        ? `L${preview.level} • THREATS ${preview.enemyCount} • SPD ${Math.floor(preview.enemySpeed)} • START $${preview.money}`
                        : '';
                }
            } else {
                jumpSelect.innerHTML = '<option value="">NO JUMPS YET</option>';
                jumpSelect.disabled = true;
                if (jumpStartBtn) jumpStartBtn.disabled = true;
                if (jumpHighestBtn) jumpHighestBtn.disabled = true;
                if (jumpPreviewEl) jumpPreviewEl.textContent = 'Reach higher levels to unlock jump starts.';
            }
        }

        const splashStats = this.el['splash-stats'];
        if (splashStats) {
            const m = game.metaProgress || {};
            const best = m.careerBest || {};
            const bestMoneyEntries = Object.entries(m.bestMoneyByLevel || {})
                .map(([level, money]) => ({ level: Math.floor(Number(level)), money: Math.floor(Number(money) || 0) }))
                .filter((e) => Number.isFinite(e.level) && e.level >= 1)
                .sort((a, b) => b.level - a.level)
                .slice(0, 3);
            const history = Array.isArray(m.runHistory) ? m.runHistory.slice(0, 2) : [];
            splashStats.innerHTML = [
                `<div class="game-over-stat-row"><span class="hud-label">RUNS</span><span class="hud-value">${Math.floor(m.totalRuns || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">BEST LV</span><span class="hud-value">${Math.floor(m.bestLevelReached || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">SALVAGE</span><span class="hud-value">${Math.floor(m.metaCurrency || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">BEST KILLS</span><span class="hud-value">${Math.floor(best.maxKills || 0)}</span></div>`,
                `<div class="game-over-upgrades"><span class="hud-label">BEST $</span><span class="game-over-upgrade-list">${bestMoneyEntries.length ? bestMoneyEntries.map((e) => `L${e.level}:$${e.money}`).join(' • ') : 'NONE'}</span></div>`,
                `<div class="game-over-upgrades"><span class="hud-label">RECENT</span><span class="game-over-upgrade-list">${history.length ? history.map((r) => `L${Math.floor(r.level || 0)}/$${Math.floor(r.money || 0)}`).join(' • ') : 'NONE'}</span></div>`
            ].join('');
        }
        const clearBtn = this.el['splash-clear-data-btn'];
        if (clearBtn) {
            const armed = this.isClearDataConfirmArmed();
            clearBtn.textContent = armed ? 'CONFIRM CLEAR DATA' : 'CLEAR LOCAL DATA';
            clearBtn.classList.toggle('pulse', armed);
        }
    }

    renderMetaUpgradeModal(game) {
        const overlay = this.el['meta-upgrade-overlay'];
        const modal = this.el['meta-upgrade-modal'];
        if (overlay && modal) {
            this.renderModal({
                overlayEl: overlay,
                modalEl: modal,
                titleEl: this.el['meta-upgrade-title'],
                isOpen: !!game.isMetaUpgradeModalOpen,
                titleText: 'META UPGRADES'
            });
        }
        const metaList = this.el['meta-upgrade-list'];
        if (this.el['meta-upgrade-salvage']) {
            const salvage = Math.floor(game.metaProgress?.metaCurrency || 0);
            this.el['meta-upgrade-salvage'].textContent = `SALVAGE ${salvage}`;
        }
        if (!metaList) return;
        const metaUpgrades = typeof game.getMetaUpgradeState === 'function' ? game.getMetaUpgradeState() : [];
        metaList.innerHTML = metaUpgrades.map((upgrade) => {
            const isMaxed = upgrade.level >= upgrade.maxLevel;
            const tier = upgrade.nextTier;
            const canBuy = !isMaxed && typeof game.canPurchaseMetaUpgrade === 'function' && game.canPurchaseMetaUpgrade(upgrade.key);
            const label = isMaxed ? 'MAXED' : this.formatMetaUpgradeCostText(tier?.cost || 0, canBuy);
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

    renderCareerSummary(game) {
        const careerEl = this.el['career-stats'];
        const recentRunsEl = this.el['recent-runs'];
        if (!careerEl && !recentRunsEl) return;

        const metaProgress = game.metaProgress || {};
        const totalRuns = Math.floor(metaProgress.totalRuns || 0);
        const bestLevelReached = Math.floor(metaProgress.bestLevelReached || 0);
        const careerBest = (metaProgress.careerBest && typeof metaProgress.careerBest === 'object') ? metaProgress.careerBest : {};
        const preferredJump = (typeof game.getPreferredJumpStartLevel === 'function')
            ? game.getPreferredJumpStartLevel()
            : null;
        const currentLevel = Math.floor(game.level || 1);
        const bestCurrentLevelMoney = Math.floor(metaProgress.bestMoneyByLevel?.[String(currentLevel)] || 0);

        if (careerEl) {
            const bestMoneyEntries = Object.entries(metaProgress.bestMoneyByLevel || {})
                .map(([level, money]) => ({ level: Math.floor(Number(level)), money: Math.floor(Number(money) || 0) }))
                .filter((e) => Number.isFinite(e.level) && e.level >= 1)
                .sort((a, b) => b.level - a.level)
                .slice(0, 5);
            const bestMoneyMarkup = bestMoneyEntries.length
                ? bestMoneyEntries.map((e) => `L${e.level}:$${e.money}`).join(' • ')
                : 'NONE';
            careerEl.innerHTML = [
                `<div class="game-over-stat-row"><span class="hud-label">RUNS</span><span class="hud-value">${totalRuns}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">BEST LV</span><span class="hud-value">${bestLevelReached}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">BEST KILLS</span><span class="hud-value">${Math.floor(careerBest.maxKills || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">BEST SALVAGE</span><span class="hud-value">${Math.floor(careerBest.maxSalvageReward || 0)}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">BEST $ @ L${currentLevel}</span><span class="hud-value">${bestCurrentLevelMoney}</span></div>`,
                `<div class="game-over-stat-row"><span class="hud-label">JUMP PREF</span><span class="hud-value">${preferredJump ? `L${preferredJump}` : 'NONE'}</span></div>`,
                `<div class="game-over-upgrades"><span class="hud-label">BEST $ BY LV</span><span class="game-over-upgrade-list">${bestMoneyMarkup}</span></div>`
            ].join('');
        }

        if (recentRunsEl) {
            const history = Array.isArray(metaProgress.runHistory) ? metaProgress.runHistory.slice(0, 5) : [];
            recentRunsEl.innerHTML = history.length
                ? history.map((run, idx) => `
                    <div class="recent-run-row">
                        <span class="hud-label">#${idx + 1}</span>
                        <span class="recent-run-summary">L${Math.floor(run.level || 0)} • C${Math.floor(run.cycles || 0)} • K${Math.floor(run.kills || 0)} • $${Math.floor(run.money || 0)} • +S${Math.floor(run.salvage || 0)}</span>
                    </div>
                `).join('')
                : '<div class="recent-run-empty">NO PRIOR RUNS</div>';
        }
    }

    renderGameOverBattlefieldPrompt(game) {
        const overlay = this.el['game-over-battle-overlay'];
        if (!overlay) return;
        const isOpen = !!(game.isGameOver && !game.isGameOverSummaryOpen);
        overlay.classList.toggle('is-hidden', !isOpen);
        overlay.setAttribute('aria-hidden', String(!isOpen));
        if (this.el['game-over-battle-title']) {
            this.el['game-over-battle-title'].textContent = game.gameOverReason || 'DEFENSE BREACHED!';
        }
        if (this.el['game-over-battle-subtitle']) {
            const remainingMs = Math.max(0, Math.floor((game.gameOverContinueUnlockAtMs || 0) - Date.now()));
            const waitText = remainingMs > 0 ? ` Review breach (${Math.ceil(remainingMs / 100) / 10}s)...` : ' Continue for run report and upgrades.';
            this.el['game-over-battle-subtitle'].textContent = (game.gameOverReason === 'EARTH BREACHED')
                ? `Enemy contact reached the earth line.${waitText}`
                : `Projected breach was unavoidable.${waitText}`;
        }
        if (this.el['game-over-continue-btn']) {
            const locked = Date.now() < Math.max(0, game.gameOverContinueUnlockAtMs || 0);
            this.el['game-over-continue-btn'].disabled = locked;
            this.el['game-over-continue-btn'].textContent = locked ? 'ANALYZING...' : 'CONTINUE';
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
