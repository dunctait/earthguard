/**
 * EarthGuard visual theme
 * Single source of truth for palette, glow tiers, line weights, and motion tuning.
 */
(function () {
    const theme = {
        palette: {
            greenPrimary: '#00ff66',
            greenSecondary: '#00aa44',
            greenTertiary: '#004422',
            greenUiCool: '#00d67a',
            redEnemy: '#ff3344',
            amberWarning: '#ffaa00',
            cyanTargeting: '#33e6ff',
            whiteHot: '#f3fff6',
            bgBlack: '#000000',
            bgTop: '#000f05',
            bgBottom: '#001e0b',
            grid: 'rgba(0, 255, 102, 0.05)',
            scanline: 'rgba(0, 20, 0, 0.06)'
        },
        glow: {
            primaryStrong: 'rgba(0, 255, 102, 0.65)',
            primaryMedium: 'rgba(0, 255, 102, 0.35)',
            secondaryMedium: 'rgba(0, 170, 68, 0.42)',
            tertiarySubtle: 'rgba(0, 68, 34, 0.22)',
            enemy: 'rgba(255, 51, 68, 0.55)',
            amber: 'rgba(255, 170, 0, 0.45)'
        },
        line: {
            primary: 3,
            secondary: 2,
            tertiary: 1
        },
        depth: {
            topBrightness: 0.7,
            middleBrightness: 0.85,
            bottomBrightness: 1
        },
        motion: {
            cameraDriftPx: 0.5,
            cannonRecoilPx: 4,
            cannonRecoilMs: 80
        },
        ui: {
            trackingLabel: '0.24em',
            trackingValue: '0.12em',
            controlPanelHeightScale: 0.9
        }
    };

    function applyCssVariables(targetTheme) {
        const root = document.documentElement;
        const vars = {
            '--green-primary': targetTheme.palette.greenPrimary,
            '--green-secondary': targetTheme.palette.greenSecondary,
            '--green-tertiary': targetTheme.palette.greenTertiary,
            '--green-ui-cool': targetTheme.palette.greenUiCool,
            '--green-glow-strong': targetTheme.glow.primaryStrong,
            '--green-glow-medium': targetTheme.glow.secondaryMedium,
            '--green-glow-subtle': targetTheme.glow.tertiarySubtle,
            '--red-enemy': targetTheme.palette.redEnemy,
            '--red-glow': targetTheme.glow.enemy,
            '--amber-warning': targetTheme.palette.amberWarning,
            '--amber-glow': targetTheme.glow.amber,
            '--cyan-friendly': targetTheme.palette.cyanTargeting,
            '--bg-black': targetTheme.palette.bgBlack,
            '--bg-gradient-top': targetTheme.palette.bgTop,
            '--bg-gradient-bottom': targetTheme.palette.bgBottom,
            '--hud-grid': targetTheme.palette.grid,
            '--scanline-color': targetTheme.palette.scanline,
            '--line-primary': `${targetTheme.line.primary}px`,
            '--line-secondary': `${targetTheme.line.secondary}px`,
            '--line-tertiary': `${targetTheme.line.tertiary}px`,
            '--tracking-label': targetTheme.ui.trackingLabel,
            '--tracking-value': targetTheme.ui.trackingValue
        };

        for (const [key, value] of Object.entries(vars)) {
            root.style.setProperty(key, value);
        }
    }

    window.EarthGuardTheme = theme;
    if (typeof document !== 'undefined') {
        applyCssVariables(theme);
    }
})();
