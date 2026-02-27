/**
 * EarthGuard - Meta progression state helpers
 */

(() => {
    const STORAGE_KEY = 'earthguard.meta.v1';

    function getStorageKey() {
        return STORAGE_KEY;
    }

    function getDefaultMetaProgress() {
        return {
            schemaVersion: 1,
            totalRuns: 0,
            bestLevelReached: 0,
            metaCurrency: 0,
            metaUpgrades: {},
            bestMoneyByLevel: {},
            preferredJumpStartLevel: null,
            lastRun: null,
            runHistory: [],
            careerBest: {
                maxRunMoney: 0,
                maxKills: 0,
                maxCycles: 0,
                maxSalvageReward: 0
            }
        };
    }

    function normalizeMetaProgress(parsed) {
        const fallback = getDefaultMetaProgress();
        if (!parsed || parsed.schemaVersion !== 1) return fallback;
        return {
            ...fallback,
            ...parsed,
            metaUpgrades: (parsed.metaUpgrades && typeof parsed.metaUpgrades === 'object') ? parsed.metaUpgrades : {},
            bestMoneyByLevel: (parsed.bestMoneyByLevel && typeof parsed.bestMoneyByLevel === 'object') ? parsed.bestMoneyByLevel : {},
            runHistory: Array.isArray(parsed.runHistory) ? parsed.runHistory.slice(0, 5) : [],
            careerBest: (parsed.careerBest && typeof parsed.careerBest === 'object')
                ? {
                    maxRunMoney: Math.floor(parsed.careerBest.maxRunMoney || 0),
                    maxKills: Math.floor(parsed.careerBest.maxKills || 0),
                    maxCycles: Math.floor(parsed.careerBest.maxCycles || 0),
                    maxSalvageReward: Math.floor(parsed.careerBest.maxSalvageReward || 0)
                }
                : fallback.careerBest
        };
    }

    function loadMetaProgress(root) {
        const fallback = getDefaultMetaProgress();
        try {
            const storage = root?.localStorage;
            if (!storage) return fallback;
            const raw = storage.getItem(getStorageKey());
            if (!raw) return fallback;
            return normalizeMetaProgress(JSON.parse(raw));
        } catch {
            return fallback;
        }
    }

    function saveMetaProgress(root, metaProgress) {
        try {
            const storage = root?.localStorage;
            if (!storage) return false;
            storage.setItem(getStorageKey(), JSON.stringify(metaProgress));
            return true;
        } catch {
            return false;
        }
    }

    function shouldShowSplashOnBoot(metaProgress) {
        const totalRuns = Math.floor(metaProgress?.totalRuns || 0);
        return totalRuns > 0;
    }

    function applyRunResult(metaProgress, runResult) {
        const next = normalizeMetaProgress(metaProgress || {});
        const reward = Math.max(0, Math.floor(runResult.metaReward || 0));
        next.totalRuns = Math.floor(next.totalRuns || 0) + 1;
        next.bestLevelReached = Math.max(Math.floor(next.bestLevelReached || 0), Math.floor(runResult.level || 0));
        next.metaCurrency = Math.max(0, Math.floor(next.metaCurrency || 0)) + reward;
        next.lastRun = {
            level: Math.floor(runResult.level || 0),
            totalCycles: Math.floor(runResult.totalCycles || 0),
            money: Math.floor(runResult.money || 0),
            kills: Math.floor(runResult.kills || 0),
            reason: runResult.reason || '',
            metaReward: reward
        };
        const historyEntry = {
            level: Math.floor(runResult.level || 0),
            cycles: Math.floor(runResult.totalCycles || 0),
            kills: Math.floor(runResult.kills || 0),
            money: Math.floor(runResult.money || 0),
            salvage: reward,
            reason: runResult.reason || ''
        };
        const careerBest = next.careerBest || getDefaultMetaProgress().careerBest;
        careerBest.maxRunMoney = Math.max(Math.floor(careerBest.maxRunMoney || 0), historyEntry.money);
        careerBest.maxKills = Math.max(Math.floor(careerBest.maxKills || 0), historyEntry.kills);
        careerBest.maxCycles = Math.max(Math.floor(careerBest.maxCycles || 0), historyEntry.cycles);
        careerBest.maxSalvageReward = Math.max(Math.floor(careerBest.maxSalvageReward || 0), historyEntry.salvage);
        next.careerBest = careerBest;
        const history = Array.isArray(next.runHistory) ? next.runHistory : [];
        next.runHistory = [historyEntry, ...history].slice(0, 5);
        return next;
    }

    function recordBestMoney(metaProgress, level, money) {
        const next = normalizeMetaProgress(metaProgress || {});
        const numericLevel = Math.max(1, Math.floor(level || 0));
        const levelKey = String(numericLevel);
        const moneyValue = Math.max(0, Math.floor(money || 0));
        const previous = Math.floor(next.bestMoneyByLevel?.[levelKey] || 0);
        if (moneyValue <= previous) {
            return { changed: false, metaProgress: next };
        }
        next.bestMoneyByLevel[levelKey] = moneyValue;
        return { changed: true, metaProgress: next };
    }

    function getAvailableJumpStartLevels(metaProgress) {
        return Object.entries(metaProgress?.bestMoneyByLevel || {})
            .map(([level, money]) => ({ level: Math.floor(Number(level)), money: Math.floor(Number(money) || 0) }))
            .filter((entry) => Number.isFinite(entry.level) && entry.level >= 2 && entry.money >= 0)
            .sort((a, b) => a.level - b.level);
    }

    function getPreferredJumpStartLevel(metaProgress) {
        const value = Math.floor(Number(metaProgress?.preferredJumpStartLevel) || 0);
        return value >= 2 ? value : null;
    }

    function setPreferredJumpStartLevel(metaProgress, level) {
        const next = normalizeMetaProgress(metaProgress || {});
        const numericLevel = Math.floor(Number(level) || 0);
        next.preferredJumpStartLevel = numericLevel >= 2 ? numericLevel : null;
        return next;
    }

    const EarthGuardMetaProgression = {
        getStorageKey,
        getDefaultMetaProgress,
        normalizeMetaProgress,
        loadMetaProgress,
        saveMetaProgress,
        shouldShowSplashOnBoot,
        applyRunResult,
        recordBestMoney,
        getAvailableJumpStartLevels,
        getPreferredJumpStartLevel,
        setPreferredJumpStartLevel
    };

    if (typeof window !== 'undefined') {
        window.EarthGuardMetaProgression = EarthGuardMetaProgression;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EarthGuardMetaProgression;
    }
})();
