/**
 * EarthGuard - Wave/Level construction helpers
 */

(() => {
    const levelDefinitions = {
        1: {
            enemies: [
                { type: 'saucer', sizeMultiplier: 2.0 },
                { type: 'saucer', sizeMultiplier: 2.0 }
            ]
        },
        2: {
            enemies: [
                { type: 'saucer', sizeMultiplier: 1.5 },
                { type: 'saucer', sizeMultiplier: 1.5 }
            ]
        },
        3: {
            enemies: [
                { type: 'saucer', sizeMultiplier: 1.2 },
                { type: 'saucer', sizeMultiplier: 1.2 },
                { type: 'saucer', sizeMultiplier: 1.2 }
            ]
        },
        5: {
            enemies: [
                { type: 'miniboss', sizeMultiplier: 1.35, hp: 3, speedMultiplier: 0.5, yBand: 0 },
                { type: 'saucer', sizeMultiplier: 1.0, yBand: 1 },
                { type: 'saucer', sizeMultiplier: 1.0, yBand: 1 },
                { type: 'scout', sizeMultiplier: 0.72, yBand: 2 },
                { type: 'scout', sizeMultiplier: 0.72, yBand: 2 }
            ]
        },
        10: {
            enemies: [
                { type: 'boss', sizeMultiplier: 2.3, hp: 7, speedMultiplier: 0.42, yBand: 0 },
                { type: 'tanker', sizeMultiplier: 0.92, hp: 3, speedMultiplier: 0.72, yBand: 1 },
                { type: 'saucer', sizeMultiplier: 0.72, yBand: 1 },
                { type: 'saucer', sizeMultiplier: 0.72, yBand: 1 },
                { type: 'scout', sizeMultiplier: 0.65, yBand: 2 },
                { type: 'scout', sizeMultiplier: 0.65, yBand: 2 },
                { type: 'scout', sizeMultiplier: 0.65, yBand: 1 },
                { type: 'saucer', sizeMultiplier: 0.7, yBand: 2 }
            ]
        },
        12: {
            enemies: [
                { type: 'boss', sizeMultiplier: 2.8, hp: 8, speedMultiplier: 0.45, yBand: 0 },
                { type: 'tanker', sizeMultiplier: 0.95, hp: 3, speedMultiplier: 0.68, yBand: 1 },
                { type: 'saucer', sizeMultiplier: 0.78, yBand: 1 },
                { type: 'saucer', sizeMultiplier: 0.76, yBand: 2 },
                { type: 'scout', sizeMultiplier: 0.72, yBand: 2 },
                { type: 'scout', sizeMultiplier: 0.72, yBand: 1 },
                { type: 'scout', sizeMultiplier: 0.72, yBand: 2 },
                { type: 'saucer', sizeMultiplier: 0.74, yBand: 1 }
            ]
        }
    };

    function getLevelDefinition(level) {
        return levelDefinitions[level] || null;
    }

    function getAlienSpeedForLevel(config, level, viewZoomStage = 0) {
        const base = config.BASE_ALIEN_SPEED + (level * config.ALIEN_SPEED_PER_LEVEL);
        const midStart = config.ALIEN_SPEED_MIDGAME_BONUS_START_LEVEL || 5;
        const lateStart = config.ALIEN_SPEED_LATEGAME_BONUS_START_LEVEL || 8;
        const midBonus = Math.max(0, level - midStart + 1) * (config.ALIEN_SPEED_MIDGAME_BONUS_PER_LEVEL || 0);
        const lateBonus = Math.max(0, level - lateStart + 1) * (config.ALIEN_SPEED_LATEGAME_BONUS_PER_LEVEL || 0);
        const postBossSpeedBonus = (viewZoomStage > 0 && level > 12)
            ? (viewZoomStage * 0.5)
            : 0;
        return base + midBonus + lateBonus + postBossSpeedBonus;
    }

    function getWaveEnemyTemplates({ level, viewZoomStage = 0 }) {
        const levelDef = getLevelDefinition(level);
        if (levelDef && Array.isArray(levelDef.enemies) && levelDef.enemies.length > 0) {
            return levelDef.enemies.map((enemy) => ({
                type: enemy.type || 'saucer',
                sizeMultiplier: enemy.sizeMultiplier || 1,
                yBand: enemy.yBand || 0,
                hp: enemy.hp || undefined,
                speedMultiplier: enemy.speedMultiplier || 1
            }));
        }

        if (level % 5 === 0) {
            const escortCount = Math.min(7, Math.max(3, Math.floor(level * 0.6)));
            const sizeMultiplier = level >= 15 ? 0.82 : 0.95;
            return [
                { type: 'miniboss', sizeMultiplier: Math.max(1.1, sizeMultiplier * 1.35), hp: Math.min(5, 3 + Math.floor(level / 10)), speedMultiplier: 0.54, yBand: 0 },
                ...Array.from({ length: escortCount }, (_, i) => ({
                    type: level >= 14 && (i % 4 === 2) ? 'swarmer' : ((i % 4 === 1) ? 'scout' : 'saucer'),
                    sizeMultiplier: i % 3 === 2 ? Math.max(0.62, sizeMultiplier * 0.78) : sizeMultiplier,
                    yBand: 1 + (i % 3)
                }))
            ];
        }

        let alienCount = Math.min(Math.max(2, level), 10);
        if (level >= 5) alienCount += Math.floor((level - 4) / 2);
        if (level >= 6) alienCount += 1;
        if (level >= 9) alienCount += 1;
        alienCount = Math.min(alienCount, 14);

        let sizeMultiplier = level <= 4 ? 1 : Math.max(0.8, 1.1 - ((level - 4) * 0.03));
        if (level >= 8) {
            sizeMultiplier = Math.max(0.55, 0.9 - ((level - 8) * 0.05));
        }
        if (viewZoomStage > 0 && level > 12) {
            alienCount = Math.min(18, alienCount + viewZoomStage);
            sizeMultiplier = Math.max(0.45, sizeMultiplier - (viewZoomStage * 0.04));
        }

        const useBandedRows = level >= 4;
        if (level >= 8) {
            const bandCount = Math.min(3, Math.max(2, Math.ceil(alienCount / 4)));
            return Array.from({ length: alienCount }, (_, i) => ({
                type: (level >= 14 && (i % 8) === 4)
                    ? 'swarmer'
                    : ((level >= 11 && (i % 7) === 2)
                    ? 'tanker'
                    : ((level >= 9 && (i % 6) === 0) ? 'scout' : 'saucer')),
                sizeMultiplier,
                yBand: i % bandCount
            }));
        }

        return Array.from({ length: alienCount }, () => ({
            type: 'saucer',
            sizeMultiplier,
            yBand: 0
        })).map((enemy, i) => ({
            ...enemy,
            yBand: useBandedRows ? (i % Math.min(3, Math.max(2, Math.ceil(alienCount / 4)))) : 0
        }));
    }

    function getWaveSpec({ level, config, viewZoomStage = 0 }) {
        const enemyTemplates = getWaveEnemyTemplates({ level, viewZoomStage });
        const maxSizeMultiplier = enemyTemplates.reduce((max, enemy) => Math.max(max, enemy.sizeMultiplier || 1), 1);
        return {
            level,
            levelDef: getLevelDefinition(level),
            enemies: enemyTemplates,
            alienCount: enemyTemplates.length,
            speed: getAlienSpeedForLevel(config, level, viewZoomStage),
            activeTopY: level === 1 ? 78 : (config.ALIEN_ACTIVE_SPAWN_TOP_Y || (config.WORLD_HEIGHT - 5)),
            maxSizeMultiplier
        };
    }

    const EarthGuardWaveFactory = {
        LevelDefinitions: levelDefinitions,
        getLevelDefinition,
        getWaveEnemyTemplates,
        getAlienSpeedForLevel,
        getWaveSpec
    };

    if (typeof window !== 'undefined') {
        window.EarthGuardWaveFactory = EarthGuardWaveFactory;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EarthGuardWaveFactory;
    }
})();
