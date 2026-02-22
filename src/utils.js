/**
 * EarthGuard shared helpers
 * No module system: exposed as `window.EarthGuardUtils`.
 */
(function () {
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function distance(dx, dy) {
        return Math.sqrt((dx * dx) + (dy * dy));
    }

    function preventDefaultIfPossible(event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
    }

    function bindHoldAction(element, action, options = {}) {
        if (!element || typeof action !== 'function') return () => {};

        const initialDelay = options.initialDelay ?? 300;
        const repeatDelay = options.repeatDelay ?? 50;
        let timeoutId = null;
        let intervalId = null;

        const stop = () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
            timeoutId = null;
            intervalId = null;
        };

        const start = (event) => {
            preventDefaultIfPossible(event);
            stop();
            action();
            timeoutId = setTimeout(() => {
                intervalId = setInterval(action, repeatDelay);
            }, initialDelay);
        };

        element.addEventListener('mousedown', start);
        element.addEventListener('mouseup', stop);
        element.addEventListener('mouseleave', stop);
        element.addEventListener('touchstart', start);
        element.addEventListener('touchend', stop);
        element.addEventListener('touchcancel', stop);

        return stop;
    }

    function bindPressHandlers(element, handlers) {
        if (!element || !handlers) return () => {};
        const onStart = handlers.onStart || (() => {});
        const onEnd = handlers.onEnd || (() => {});

        const start = (event) => {
            preventDefaultIfPossible(event);
            onStart(event);
        };

        const end = (event) => {
            preventDefaultIfPossible(event);
            onEnd(event);
        };

        element.addEventListener('mousedown', start);
        element.addEventListener('mouseup', end);
        element.addEventListener('mouseleave', end);
        element.addEventListener('touchstart', start);
        element.addEventListener('touchend', end);
        element.addEventListener('touchcancel', end);

        return () => {};
    }

    function cacheDom(ids) {
        const result = {};
        for (const id of ids) {
            result[id] = document.getElementById(id);
        }
        return result;
    }

    window.EarthGuardUtils = {
        clamp,
        lerp,
        distance,
        bindHoldAction,
        bindPressHandlers,
        cacheDom,
        preventDefaultIfPossible
    };
})();
