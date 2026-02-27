/**
 * EarthGuard - Enemy/formation construction helpers
 */

(() => {
    function relaxAlienFormation(aliens, { config, utils }, options = {}) {
        const minSepFactor = options.minSepFactor || 1.2;
        const horizontalBias = options.horizontalBias || 0.28;
        const verticalBias = options.verticalBias || 0.18;
        const worldMinX = 6;
        const worldMaxX = config.WORLD_WIDTH - 6;
        for (let iter = 0; iter < 28; iter++) {
            let moved = false;
            for (let i = 0; i < aliens.length; i++) {
                for (let j = i + 1; j < aliens.length; j++) {
                    const a = aliens[i];
                    const b = aliens[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.max(0.001, Math.hypot(dx, dy));
                    const minDist = ((a.radius || config.ALIEN_RADIUS) + (b.radius || config.ALIEN_RADIUS)) * minSepFactor;
                    if (dist >= minDist) continue;
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const pushX = (nx === 0 ? (Math.random() > 0.5 ? 1 : -1) : nx) * overlap * horizontalBias;
                    const pushY = (ny === 0 ? 0 : ny) * overlap * verticalBias;
                    a.x = utils.clamp(a.x - pushX, worldMinX, worldMaxX);
                    b.x = utils.clamp(b.x + pushX, worldMinX, worldMaxX);
                    a.y -= pushY;
                    b.y += pushY;
                    moved = true;
                }
            }
            if (!moved) break;
        }
    }

    function createAliensFromWaveSpec(spec, incoming = false, context) {
        const { config, utils } = context;
        const aliens = [];
        const minSpacing = config.ALIEN_WAVE_VERTICAL_SPACING || 8;
        const spacing = Math.max(minSpacing, (config.ALIEN_RADIUS * (spec.maxSizeMultiplier || 1) * 2.6));
        const activeTopY = spec.activeTopY ?? config.ALIEN_ACTIVE_SPAWN_TOP_Y ?? (config.WORLD_HEIGHT - 5);
        const isSwarm = spec.level >= 8;
        const bandStep = isSwarm ? Math.max(2.2, spacing * 0.38) : spacing;
        const bandJitter = isSwarm ? Math.max(0.4, bandStep * 0.18) : 0;

        const maxBandIndex = spec.enemies.reduce((max, e) => Math.max(max, e.yBand || 0), 0);
        const formationHeight = (maxBandIndex * bandStep) + (bandJitter * 2);
        const incomingLowestY = activeTopY + (config.ALIEN_INCOMING_WAVE_GAP || 4);
        const incomingStartY = incomingLowestY + formationHeight;
        const startY = incoming ? incomingStartY : activeTopY;

        const clusterCount = isSwarm ? Math.min(4, Math.max(2, Math.round(spec.alienCount / 3.5))) : 0;
        const clusterCenters = isSwarm
            ? Array.from({ length: clusterCount }, (_, i) => {
                const lane = (i + 1) / (clusterCount + 1);
                const laneJitter = (Math.random() - 0.5) * 6;
                return utils.clamp((lane * config.WORLD_WIDTH) + laneJitter, 8, config.WORLD_WIDTH - 8);
            })
            : null;

        for (let i = 0; i < spec.alienCount; i++) {
            const enemyTemplate = spec.enemies[i] || { type: 'saucer', sizeMultiplier: 1 };
            const sizeMultiplier = enemyTemplate.sizeMultiplier || 1;
            const bandOffset = (enemyTemplate.yBand || 0) * bandStep;
            const enemyType = enemyTemplate.type || 'saucer';
            const isScout = enemyType === 'scout';
            const isBoss = enemyType === 'boss';
            const radius = config.ALIEN_RADIUS * sizeMultiplier * (isScout ? 0.62 : 1);
            let x = 10 + Math.random() * (config.WORLD_WIDTH - 20);
            let y = startY - bandOffset;
            if (isSwarm && clusterCenters) {
                const center = clusterCenters[i % clusterCenters.length];
                const spreadX = config.ALIEN_SWARM_CLUSTER_SPREAD_X || 14;
                const minSepFactor = config.ALIEN_SWARM_MIN_SEPARATION_FACTOR || 1.9;
                let placed = false;
                for (let attempt = 0; attempt < 16; attempt++) {
                    const candidateX = utils.clamp(center + ((Math.random() - 0.5) * spreadX * 2), 6, config.WORLD_WIDTH - 6);
                    const candidateY = (startY - bandOffset) - ((Math.random() - 0.5) * bandJitter * 2);
                    const overlaps = aliens.some((other) => {
                        const minDist = ((other.radius || config.ALIEN_RADIUS) + radius) * minSepFactor;
                        return utils.distance(candidateX - other.x, candidateY - other.y) < minDist;
                    });
                    if (!overlaps) {
                        x = candidateX;
                        y = candidateY;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    x = utils.clamp(center + ((Math.random() - 0.5) * (spreadX + 8) * 2), 6, config.WORLD_WIDTH - 6);
                    y = (startY - bandOffset) - ((Math.random() - 0.5) * bandJitter * 3);
                }
            } else {
                const jitterY = isSwarm ? ((Math.random() - 0.5) * bandJitter * 2) : 0;
                y = startY - bandOffset - jitterY;
            }
            aliens.push({
                x,
                y,
                speed: spec.speed * (enemyTemplate.speedMultiplier || 1),
                hp: enemyTemplate.hp ?? ((spec.level >= 8 && !isScout && !isBoss && (i % 5 === 1)) ? 2 : 1),
                maxHp: enemyTemplate.hp ?? ((spec.level >= 8 && !isScout && !isBoss && (i % 5 === 1)) ? 2 : 1),
                damage: config.ALIEN_DAMAGE,
                radius,
                type: enemyType,
                sizeMultiplier,
                waveLevel: spec.level,
                incoming,
                zigzagDir: isScout ? (Math.random() > 0.5 ? 1 : -1) : 0,
                zigzagSpeedX: isScout ? (4.2 + (Math.random() * 2.2)) : 0,
                zigzagRunRemaining: isScout ? (2.6 + (Math.random() * 4.2)) : 0,
                bossPhase: isBoss ? (Math.random() * Math.PI * 2) : 0,
                bossDriftAmplitude: isBoss ? (6 + (Math.random() * 2)) : 0,
                bossDriftSpeed: isBoss ? (0.045 + (Math.random() * 0.02)) : 0
            });
        }

        if (aliens.length > 1) {
            relaxAlienFormation(aliens, { config, utils }, {
                minSepFactor: isSwarm ? (config.ALIEN_SWARM_MIN_SEPARATION_FACTOR || 1.9) : 1.38,
                horizontalBias: isSwarm ? 0.42 : 0.32,
                verticalBias: isSwarm ? 0.10 : 0.14
            });
        }
        return aliens;
    }

    const EarthGuardEnemyFactory = {
        createAliensFromWaveSpec,
        relaxAlienFormation
    };

    if (typeof window !== 'undefined') {
        window.EarthGuardEnemyFactory = EarthGuardEnemyFactory;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EarthGuardEnemyFactory;
    }
})();
