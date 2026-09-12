(() => {
    'use strict';

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const systemLight = window.matchMedia('(prefers-color-scheme: light)');

    /* ------------------------------------------------------------------
       Theme toggle (system preference by default, manual override saved)
       ------------------------------------------------------------------ */
    const themeButton = document.querySelector('[data-theme-toggle]');
    const themeMetas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
    const THEME_COLORS = { dark: '#0a0a0b', light: '#f7f7f5' };

    function currentTheme() {
        const explicit = root.getAttribute('data-theme');
        if (explicit === 'light' || explicit === 'dark') return explicit;
        return systemLight.matches ? 'light' : 'dark';
    }

    function syncThemeUi() {
        const theme = currentTheme();
        if (themeButton) {
            const next = theme === 'dark' ? 'light' : 'dark';
            themeButton.setAttribute('aria-label', `Switch to ${next} theme`);
        }
        // Only override the media-matched metas when the user picked a theme explicitly.
        const explicit = root.getAttribute('data-theme');
        themeMetas.forEach((meta) => {
            if (explicit) {
                meta.setAttribute('content', THEME_COLORS[explicit]);
            } else {
                const media = meta.getAttribute('media') || '';
                meta.setAttribute('content', media.includes('light') ? THEME_COLORS.light : THEME_COLORS.dark);
            }
        });
    }

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            /* storage unavailable — keep in-memory only */
        }
        syncThemeUi();
    }

    if (themeButton) {
        themeButton.addEventListener('click', () => {
            setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
        });
    }

    systemLight.addEventListener('change', syncThemeUi);
    syncThemeUi();

    /* ------------------------------------------------------------------
       Navigation: scrolled state, mobile menu, scroll spy
       ------------------------------------------------------------------ */
    const nav = document.querySelector('.nav');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = Array.from(document.querySelectorAll('.nav-link'));

    function setMenu(open) {
        if (!navToggle || !navMenu) return;
        navMenu.classList.toggle('is-open', open);
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.body.classList.toggle('nav-open', open);
    }

    function isMenuOpen() {
        return Boolean(navMenu && navMenu.classList.contains('is-open'));
    }

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => setMenu(!isMenuOpen()));

        document.addEventListener('click', (event) => {
            if (!isMenuOpen()) return;
            if (navToggle.contains(event.target) || navMenu.contains(event.target)) return;
            setMenu(false);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && isMenuOpen()) {
                setMenu(false);
                navToggle.focus();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 820 && isMenuOpen()) setMenu(false);
        });
    }

    navLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));

    // Hide the floating header on scroll down, reveal it on scroll up.
    // A small threshold avoids flicker from trackpad/rubber-band jitter, and the
    // header always stays put near the top and while the mobile menu is open.
    const siteHeader = document.querySelector('.site-header');
    const HIDE_THRESHOLD = 12;
    const REVEAL_ZONE = 80;
    let lastY = window.scrollY;
    let scrollTicking = false;

    function onScroll() {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
            const y = Math.max(0, window.scrollY);
            if (nav) nav.classList.toggle('is-scrolled', y > 24);

            if (siteHeader && !isMenuOpen()) {
                const delta = y - lastY;
                if (y <= REVEAL_ZONE) {
                    siteHeader.classList.remove('is-hidden');
                } else if (delta > HIDE_THRESHOLD) {
                    siteHeader.classList.add('is-hidden');
                } else if (delta < -HIDE_THRESHOLD) {
                    siteHeader.classList.remove('is-hidden');
                }
            }

            lastY = y;
            scrollTicking = false;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Scroll spy: highlight the nav link for the section nearest the top of the viewport.
    const spyTargets = navLinks
        .map((link) => {
            const href = link.getAttribute('href') || '';
            const section = href.startsWith('#') ? document.querySelector(href) : null;
            return section ? { link, section } : null;
        })
        .filter(Boolean);

    if (spyTargets.length && 'IntersectionObserver' in window) {
        const visible = new Map();
        const spy = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
                let active = null;
                for (const { section } of spyTargets) {
                    if (visible.get(section)) {
                        active = section;
                        break;
                    }
                }
                spyTargets.forEach(({ link, section }) => {
                    link.classList.toggle('active', section === active);
                });
            },
            { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
        );
        spyTargets.forEach(({ section }) => spy.observe(section));
    }

    /* ------------------------------------------------------------------
       Scroll reveal
       ------------------------------------------------------------------ */
    const revealEls = Array.from(document.querySelectorAll('.reveal'));
    if (revealEls.length) {
        if (reduceMotion.matches || !('IntersectionObserver' in window)) {
            revealEls.forEach((el) => el.classList.add('is-visible'));
        } else {
            const revealer = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    });
                },
                { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
            );
            revealEls.forEach((el) => revealer.observe(el));
        }
    }

    /* ------------------------------------------------------------------
       Pointer spotlight on cards
       ------------------------------------------------------------------ */
    if (window.matchMedia('(hover: hover)').matches) {
        document.querySelectorAll('.spot').forEach((card) => {
            card.addEventListener('pointermove', (event) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
                card.style.setProperty('--my', `${event.clientY - rect.top}px`);
            });
        });
    }

    /* ------------------------------------------------------------------
       Copy email
       ------------------------------------------------------------------ */
    document.querySelectorAll('[data-copy]').forEach((button) => {
        const wrapper = button.closest('.email-copy');
        const feedback = wrapper ? wrapper.querySelector('.copy-feedback') : null;
        let resetTimer = null;

        button.addEventListener('click', async () => {
            const value = button.getAttribute('data-copy') || '';
            let copied = false;
            try {
                await navigator.clipboard.writeText(value);
                copied = true;
            } catch (e) {
                copied = false;
            }
            if (wrapper) wrapper.classList.toggle('is-copied', copied);
            if (feedback) feedback.textContent = copied ? 'Copied to clipboard' : 'Copy failed — select the address instead';
            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => {
                if (wrapper) wrapper.classList.remove('is-copied');
                if (feedback) feedback.textContent = '';
            }, 2000);
        });
    });

    /* ------------------------------------------------------------------
       Background grid pulses
       Every few seconds a pulse starts in a random square and spreads
       outward: each square border it reaches lights up, holds briefly,
       then fades on its own. Borders light in order of distance, so the
       fade follows outward too, and the middle starts fading while the
       edges are still lighting. Each border also gets a small random
       delay, and outer borders glow less, so the lit area has soft,
       uneven edges.
       Drawn on a canvas over the CSS grid with the same cell size, offset
       and mask, so the grid itself still renders without JavaScript.
       ------------------------------------------------------------------ */
    (function initGridPulses() {
        const bg = document.querySelector('.bg');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!bg || !ctx) return;

        const CELL = 56; // must match .bg::after background-size
        const SPEED = 260; // px per second the pulse spreads
        const JITTER_MS = 140; // up to this much extra delay before a border lights
        const RISE_MS = 180; // how quickly a reached border lights up
        const HOLD_MS = 200; // each border stays fully lit this long
        const FADE_MS = 900; // then fades out on its own
        const GAP_MS = [1200, 3200]; // pause before the next pulse
        const MAX_PULSES = 3;

        let width = 0;
        let height = 0;
        let originX = 0; // x of a vertical grid line
        let pulses = [];
        let rafId = 0;
        let timerId = 0;
        let resizeRaf = 0;
        let running = false;

        canvas.className = 'bg-pulse';
        canvas.setAttribute('aria-hidden', 'true');
        bg.appendChild(canvas);

        function smoothstep(edge0, edge1, x) {
            const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
            return t * t * (3 - 2 * t);
        }

        // Stable pseudo-random value in [0, 1) per border, so each pulse lights unevenly.
        function noise(a, b, seed) {
            let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(seed, 1103515245);
            h = Math.imul(h ^ (h >>> 13), 1274126177);
            return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
        }

        // Mirrors --grid-mask: radial-gradient(ellipse 90% 70% at 50% 0%, #000 10%, transparent 70%)
        function gridVisibility(x, y) {
            const e = Math.hypot((x - width / 2) / (width * 0.9), y / (height * 0.7));
            return Math.min(1, Math.max(0, (0.7 - e) / 0.6));
        }

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const nextWidth = bg.clientWidth;
            if (nextWidth !== width) pulses = []; // grid shifted sideways; old pulses no longer line up
            width = nextWidth;
            height = bg.clientHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // background-position: center puts a tile edge at (width - CELL) / 2
            originX = ((((width - CELL) / 2) % CELL) + CELL) % CELL;
        }

        function spawn() {
            const styles = getComputedStyle(root);
            const rgb = styles.getPropertyValue('--pulse-rgb').trim() || '168, 245, 66';
            const strength = parseFloat(styles.getPropertyValue('--pulse-strength')) || 0.55;

            // Try random squares, keeping one with odds matching how visible the faded grid is there.
            for (let attempt = 0; attempt < 24; attempt++) {
                const x0 = originX + Math.floor((Math.random() * width - originX) / CELL) * CELL;
                const y0 = (1 + Math.floor((Math.random() * height * 0.55) / CELL)) * CELL;
                const cx = x0 + CELL / 2;
                const cy = y0 + CELL / 2;
                if (x0 < 0 || x0 + CELL > width || Math.random() > gridVisibility(cx, cy)) continue;
                // Don't start on top of a patch that is still lit.
                if (pulses.some((p) => Math.hypot(p.cx - cx, p.cy - cy) < p.reach + CELL * 2)) continue;
                pulses.push({
                    x0,
                    y0,
                    cx,
                    cy,
                    rgb,
                    strength,
                    start: performance.now(),
                    reach: CELL * (2.5 + Math.random() * 2),
                    seed: (Math.random() * 2147483647) | 0,
                });
                if (!rafId) rafId = requestAnimationFrame(frame);
                return;
            }
        }

        // One square border: a soft glow plus a crisp core exactly on the 1px grid line.
        function strokeBorder(x1, y1, x2, y2, rgb, alpha) {
            if (alpha < 0.004) return;
            ctx.strokeStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(x1 + 0.5, y1 + 0.5);
            ctx.lineTo(x2 + 0.5, y2 + 0.5);
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Brightness of one border at this moment. `a`, `b` and `axis` identify it for the per-border randomness.
        function borderAlpha(p, x1, y1, x2, y2, elapsed, a, b, axis) {
            const dist = Math.hypot((x1 + x2) / 2 - p.cx, (y1 + y2) / 2 - p.cy);
            if (dist > p.reach) return 0;
            const onAt = (dist / SPEED) * 1000 + noise(a, b, p.seed + axis) * JITTER_MS;
            const lit = smoothstep(onAt, onAt + RISE_MS, elapsed);
            if (lit <= 0) return 0;
            const fadeFrom = onAt + RISE_MS + HOLD_MS;
            const remaining = 1 - smoothstep(fadeFrom, fadeFrom + FADE_MS, elapsed);
            if (remaining <= 0) return 0;
            const settle = 0.85 + 0.15 * (1 - smoothstep(onAt + RISE_MS, onAt + RISE_MS + 400, elapsed)); // slight brightness as it turns on
            const falloff = 1 - smoothstep(p.reach * 0.35, p.reach, dist); // outer borders glow less
            const variance = 0.55 + 0.45 * noise(b, a, p.seed ^ (axis + 0x5bd1e995));
            return p.strength * lit * remaining * settle * falloff * variance;
        }

        function drawPulse(p, now) {
            const elapsed = Math.max(0, now - p.start);
            // The farthest border lights last; the pulse is over once that one has faded.
            const end = (p.reach / SPEED) * 1000 + JITTER_MS + RISE_MS + HOLD_MS + FADE_MS;
            if (elapsed >= end) return false;

            const n = Math.ceil(p.reach / CELL);

            for (let b = -n; b <= n + 1; b++) {
                const y = p.y0 + b * CELL;
                for (let a = -n; a <= n; a++) {
                    const x = p.x0 + a * CELL;
                    strokeBorder(x, y, x + CELL, y, p.rgb, borderAlpha(p, x, y, x + CELL, y, elapsed, a, b, 0));
                }
            }
            for (let a = -n; a <= n + 1; a++) {
                const x = p.x0 + a * CELL;
                for (let b = -n; b <= n; b++) {
                    const y = p.y0 + b * CELL;
                    strokeBorder(x, y, x, y + CELL, p.rgb, borderAlpha(p, x, y, x, y + CELL, elapsed, a, b, 1));
                }
            }
            return true;
        }

        function frame(now) {
            ctx.clearRect(0, 0, width, height);
            pulses = pulses.filter((p) => drawPulse(p, now));
            rafId = pulses.length ? requestAnimationFrame(frame) : 0;
        }

        function schedule(delay) {
            clearTimeout(timerId);
            timerId = window.setTimeout(() => {
                if (!document.hidden && pulses.length < MAX_PULSES) spawn();
                schedule(GAP_MS[0] + Math.random() * (GAP_MS[1] - GAP_MS[0]));
            }, delay);
        }

        function start() {
            if (running) return;
            running = true;
            resize();
            schedule(900);
        }

        function stop() {
            running = false;
            clearTimeout(timerId);
            cancelAnimationFrame(rafId);
            rafId = 0;
            pulses = [];
            ctx.clearRect(0, 0, width, height);
        }

        window.addEventListener('resize', () => {
            if (!running || resizeRaf) return;
            resizeRaf = requestAnimationFrame(() => {
                resizeRaf = 0;
                resize();
            });
        });

        if (!reduceMotion.matches) start();
        reduceMotion.addEventListener('change', () => (reduceMotion.matches ? stop() : start()));
    })();

    /* ------------------------------------------------------------------
       Footer year
       ------------------------------------------------------------------ */
    const year = document.getElementById('footer-year');
    if (year) year.textContent = String(new Date().getFullYear());
})();
