(() => {
    'use strict';

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const systemLight = window.matchMedia('(prefers-color-scheme: light)');

    // Marks that this script is running. Styles that depend on it (the project filter,
    // clamped descriptions, cover animations held on their first frame) are scoped to
    // this class, so a page where script.js never loads keeps its plain, complete layout.
    root.classList.add('enhanced');

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
                        const el = entry.target;
                        el.classList.add('is-visible');
                        observer.unobserve(el);
                        // .reveal replaces the element's own transitions and adds a stagger
                        // delay, which would otherwise also delay a card's hover lift. Once
                        // the entrance has played, hand the element back its own styles.
                        const index = parseFloat(getComputedStyle(el).getPropertyValue('--i')) || 0;
                        window.setTimeout(() => el.classList.remove('reveal', 'is-visible'), 700 + index * 70);
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
       Projects: "More" on clamped descriptions, and the type filter
       ------------------------------------------------------------------ */
    const projectGrid = document.querySelector('.project-grid');
    const projects = projectGrid ? Array.from(projectGrid.querySelectorAll('.project')) : [];

    // Every card gets a toggle; it is only shown where three lines really cut the text off.
    const descToggles = projects
        .map((project) => {
            const desc = project.querySelector('.project-desc');
            if (!desc) return null;
            const title = project.querySelector('.project-link-cover');
            const name = title ? title.textContent.trim() : 'this project';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'desc-toggle';
            button.hidden = true;
            const sync = () => {
                const open = project.classList.contains('is-expanded');
                button.textContent = open ? 'Less' : 'More';
                button.setAttribute('aria-expanded', String(open));
                button.setAttribute('aria-label', `${open ? 'Show less' : 'Show more'} about ${name}`);
            };
            button.addEventListener('click', () => {
                project.classList.toggle('is-expanded');
                sync();
            });
            desc.after(button);
            sync();
            return { project, desc, button, sync };
        })
        .filter(Boolean);

    function refreshDescToggles({ collapse = false } = {}) {
        descToggles.forEach(({ project, desc, button, sync }) => {
            if (collapse) {
                project.classList.remove('is-expanded');
                sync();
            }
            if (project.hidden || project.classList.contains('is-expanded')) return;
            button.hidden = desc.scrollHeight <= desc.clientHeight + 1;
        });
    }

    if (descToggles.length) {
        refreshDescToggles();
        // Line breaks move once the web font replaces the fallback, and whenever the width changes.
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refreshDescToggles());
        let clampRaf = 0;
        window.addEventListener('resize', () => {
            if (clampRaf) return;
            clampRaf = requestAnimationFrame(() => {
                clampRaf = 0;
                refreshDescToggles();
            });
        });
    }

    const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
    const filterStatus = document.querySelector('[data-filter-status]');

    if (projectGrid && filterButtons.length) {
        // A name per card lets the browser move each one to its new place when the filter changes.
        projects.forEach((project, index) => {
            project.style.viewTransitionName = `project-${index}`;
        });

        const applyFilter = (filter) => {
            let shown = 0;
            projectGrid.dataset.view = filter === 'all' ? 'all' : 'filtered';
            projects.forEach((project) => {
                const tags = (project.dataset.tags || '').split(' ');
                const match = filter === 'all' || tags.includes(filter);
                project.hidden = !match;
                if (match) shown += 1;
            });
            filterButtons.forEach((button) => {
                const active = button.dataset.filter === filter;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            if (filterStatus) filterStatus.textContent = `Showing ${shown} of ${projects.length} projects`;
            refreshDescToggles({ collapse: true });
        };

        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                if (button.classList.contains('is-active')) return;
                const filter = button.dataset.filter;
                if (document.startViewTransition && !reduceMotion.matches) {
                    document.startViewTransition(() => applyFilter(filter));
                } else {
                    applyFilter(filter);
                }
            });
        });
    }

    /* ------------------------------------------------------------------
       Living covers and counters
       Each project cover plays once when it scrolls into view — bars grow,
       terminal lines print, a selection steps to its final option, numbers
       count up. The markup always holds the finished picture; this only
       rewinds it to the first frame beforehand, and only for visitors who
       haven't asked for reduced motion. The motion itself is CSS (see
       "Living covers" in style.css), released by the .is-in class.
       ------------------------------------------------------------------ */
    (function initLivingCovers() {
        const stages = Array.from(document.querySelectorAll('.project-cover, .bento-stats'));
        if (!stages.length) return;

        const players = new Map();
        const onPlay = (stage, fn) => {
            if (!stage) return;
            if (!players.has(stage)) players.set(stage, []);
            players.get(stage).push(fn);
        };
        const play = (stage) => {
            stage.classList.add('is-in');
            (players.get(stage) || []).forEach((fn) => fn());
        };

        if (reduceMotion.matches || !('IntersectionObserver' in window)) {
            stages.forEach(play);
            return;
        }

        // Stagger index for items that arrive one after another.
        document.querySelectorAll('.mock-menubar, .mock-chart, .mock-schedule, .mock-subs, .mock-listing').forEach((group) => {
            Array.from(group.children).forEach((child, index) => child.style.setProperty('--n', index));
        });

        // Terminals: one element per line, so lines can print in turn.
        document.querySelectorAll('.mock-term').forEach((term) => {
            term.innerHTML = term.innerHTML
                .split('\n')
                .map((line, index) => `<span class="mock-line" style="--n: ${index}">${line}</span>`)
                .join('\n');
        });

        // Rewind a selection to its first option, then step it forward to the one the markup marks.
        function prepareSteps(items, activeClass, doneClass) {
            const last = items.findIndex((item) => item.classList.contains(activeClass));
            if (last < 1) return;
            items.forEach((item) => {
                item.classList.remove(activeClass);
                if (doneClass) item.classList.remove(doneClass);
            });
            items[0].classList.add(activeClass);
            onPlay(items[0].closest('.project-cover'), () => {
                for (let step = 1; step <= last; step++) {
                    window.setTimeout(() => {
                        items[step - 1].classList.remove(activeClass);
                        if (doneClass) items[step - 1].classList.add(doneClass);
                        items[step].classList.add(activeClass);
                    }, 500 + step * 650);
                }
            });
        }

        document.querySelectorAll('.mock-seg').forEach((seg) => prepareSteps(Array.from(seg.children), 'is-on'));
        document.querySelectorAll('.mock-schedule').forEach((list) => prepareSteps(Array.from(list.children), 'is-live'));
        document.querySelectorAll('.mock-stepper').forEach((list) => prepareSteps(Array.from(list.children), 'is-on', 'is-done'));

        // Numbers count up to the value already in the markup.
        document.querySelectorAll('[data-count]').forEach((el) => {
            const to = parseFloat(el.dataset.count);
            if (Number.isNaN(to)) return;
            const from = parseFloat(el.dataset.countFrom || '0');
            const decimals = parseInt(el.dataset.decimals || '0', 10);
            const prefix = el.dataset.prefix || '';
            const delay = parseInt(el.dataset.countDelay || '150', 10);
            const duration = 1100;
            const format = (value) =>
                prefix + value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

            el.textContent = format(from);
            onPlay(el.closest('.project-cover, .bento-stats'), () => {
                const start = performance.now() + delay;
                const tick = (now) => {
                    const t = Math.min(1, Math.max(0, (now - start) / duration));
                    el.textContent = format(from + (to - from) * (1 - (1 - t) ** 3));
                    if (t < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            });
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    observer.unobserve(entry.target);
                    play(entry.target);
                });
            },
            { threshold: 0.35 },
        );
        stages.forEach((stage) => observer.observe(stage));
    })();

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
       Every few seconds a pulse fires from a random grid intersection:
       a few sparks of light leave it along the square borders, each with
       a bright head, a fading trail and a flash at every crossing. Sparks
       run at slightly different speeds and turn at random intersections,
       so the light moves through the grid on uneven paths rather than
       spreading as one shape, and each spark dims as it travels.
       Drawn on a canvas over the CSS grid with the same cell size, offset
       and mask, so the grid itself still renders without JavaScript.
       ------------------------------------------------------------------ */
    (function initGridPulses() {
        const bg = document.querySelector('.bg');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!bg || !ctx) return;

        const CELL = 56; // must match .bg::after background-size
        const SPEED = 240; // px per second along the lines
        const HEAD = 14; // px of glow ahead of each spark
        const TRAIL = 130; // px of fading trail behind it
        const TURN_CHANCE = 0.35; // chance a spark turns at an intersection
        const GAP_MS = [1400, 3600]; // pause before the next pulse
        const MAX_PULSES = 3;
        const DIRECTIONS = [
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
        ];

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

        // Stable pseudo-random value in [0, 1) per border, so a spark's brightness varies a little along its path.
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

        // A spark's route: a run of whole borders from the origin, turning left or right now and then, never back.
        function makeSpark(ox, oy, direction, delay) {
            const borders = 4 + Math.floor(Math.random() * 6);
            const points = [[ox, oy]];
            let [dx, dy] = DIRECTIONS[direction];
            let x = ox;
            let y = oy;
            for (let i = 0; i < borders; i++) {
                if (i > 0 && Math.random() < TURN_CHANCE) {
                    [dx, dy] = Math.random() < 0.5 ? [dy, -dx] : [-dy, dx];
                }
                x += dx * CELL;
                y += dy * CELL;
                points.push([x, y]);
            }
            return {
                points,
                length: borders * CELL,
                delay,
                speed: SPEED * (0.85 + Math.random() * 0.3),
                seed: (Math.random() * 2147483647) | 0,
            };
        }

        function spawn() {
            const styles = getComputedStyle(root);
            const rgb = styles.getPropertyValue('--pulse-rgb').trim() || '168, 245, 66';
            const strength = parseFloat(styles.getPropertyValue('--pulse-strength')) || 0.55;

            // Pick an intersection, favouring places where the faded grid is actually visible.
            for (let attempt = 0; attempt < 20; attempt++) {
                const ox = originX + Math.round((Math.random() * width - originX) / CELL) * CELL;
                const oy = Math.max(1, Math.round((Math.random() * height * 0.6) / CELL)) * CELL;
                if (ox < 0 || ox > width || Math.random() > gridVisibility(ox, oy)) continue;

                // 3 to 5 sparks, leaving in different directions first, a moment apart.
                const order = [0, 1, 2, 3];
                for (let i = order.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [order[i], order[j]] = [order[j], order[i]];
                }
                const count = 3 + Math.floor(Math.random() * 3);
                const sparks = [];
                for (let i = 0; i < count; i++) {
                    sparks.push(makeSpark(ox, oy, order[i % 4], i * 90 + Math.random() * 120));
                }
                pulses.push({ ox, oy, rgb, strength, sparks, start: performance.now() });
                if (!rafId) rafId = requestAnimationFrame(frame);
                return;
            }
        }

        // A soft glow plus a crisp core exactly on the 1px grid line.
        function strokeGlow(x1, y1, x2, y2, style) {
            ctx.strokeStyle = style;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Lights the part of one border inside a spark's moving band [head - TRAIL, head + HEAD].
        // (x0, y0) is where the spark enters the border, (ux, uy) its direction of travel,
        // and `at` how far along its route that entry point is.
        function drawBorder(x0, y0, ux, uy, at, head, end, alpha, rgb) {
            const from = Math.max(at, head - TRAIL);
            const to = Math.min(at + CELL, head + HEAD, end);
            if (to <= from || alpha < 0.004) return;

            const gradient = ctx.createLinearGradient(
                x0 + ux * (head - TRAIL - at),
                y0 + uy * (head - TRAIL - at),
                x0 + ux * (head + HEAD - at),
                y0 + uy * (head + HEAD - at),
            );
            const peak = TRAIL / (TRAIL + HEAD);
            gradient.addColorStop(0, `rgba(${rgb}, 0)`);
            gradient.addColorStop(peak * 0.6, `rgba(${rgb}, ${(alpha * 0.2).toFixed(3)})`);
            gradient.addColorStop(peak, `rgba(${rgb}, ${alpha.toFixed(3)})`);
            gradient.addColorStop(1, `rgba(${rgb}, 0)`);
            strokeGlow(x0 + ux * (from - at), y0 + uy * (from - at), x0 + ux * (to - at), y0 + uy * (to - at), gradient);
        }

        // A small bright dot on a grid intersection.
        function flash(x, y, rgb, alpha) {
            if (alpha < 0.004) return;
            ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
            ctx.fillRect(x - 1, y - 1, 3, 3);
        }

        // Returns false once the spark has run its whole route.
        function drawSpark(p, spark, elapsed) {
            const t = elapsed - spark.delay;
            if (t <= 0) return true;
            const head = (t / 1000) * spark.speed;
            if (head >= spark.length) return false;

            // Quick fade-in, then dim steadily as it travels.
            const alpha = p.strength * Math.min(1, t / 160) * (1 - smoothstep(spark.length * 0.3, spark.length, head));

            for (let k = 0; k < spark.points.length - 1; k++) {
                const at = k * CELL;
                if (at > head + HEAD) break;
                if (at + CELL < head - TRAIL) continue;
                const [ax, ay] = spark.points[k];
                const [bx, by] = spark.points[k + 1];
                const variance = 0.6 + 0.4 * noise(k, 0, spark.seed);
                drawBorder(ax + 0.5, ay + 0.5, (bx - ax) / CELL, (by - ay) / CELL, at, head, spark.length, alpha * variance, p.rgb);
            }

            // Intersections flash as the spark passes through them.
            for (let k = 1; k < spark.points.length; k++) {
                const d = Math.abs(head - k * CELL);
                if (d <= 20) flash(spark.points[k][0], spark.points[k][1], p.rgb, alpha * (1 - d / 20) ** 2);
            }
            return true;
        }

        function drawPulse(p, now) {
            const elapsed = Math.max(0, now - p.start);
            let alive = false;
            for (const spark of p.sparks) {
                if (drawSpark(p, spark, elapsed)) alive = true;
            }

            // A soft spark where the pulse fires.
            const glow = 1 - elapsed / 700;
            if (glow > 0) {
                ctx.fillStyle = `rgba(${p.rgb}, ${(p.strength * glow * 0.35).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(p.ox + 0.5, p.oy + 0.5, 3 + (1 - glow) * 6, 0, Math.PI * 2);
                ctx.fill();
            }
            return alive || glow > 0;
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
