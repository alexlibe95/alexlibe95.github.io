(() => {
    'use strict';

    const canvas = document.getElementById('matrix');
    const ctx = canvas ? canvas.getContext('2d') : null;

    const matrix = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}';
    const matrixArray = matrix.split('');
    const fontSize = 10;
    const drops = [];

    function setCanvasSize() {
        if (!canvas) return;
        const vv = window.visualViewport;
        const width = vv ? Math.floor(vv.width) : window.innerWidth;
        const height = vv ? Math.floor(vv.height) : window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        const cols = Math.max(1, Math.floor(canvas.width / fontSize));
        while (drops.length < cols) drops.push(1);
        drops.length = cols;
    }

    function draw() {
        if (!ctx || !canvas) return;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let matrixIntervalId = null;

    function syncMatrixAnimation() {
        if (!ctx || !canvas) return;
        if (matrixIntervalId) {
            clearInterval(matrixIntervalId);
            matrixIntervalId = null;
        }
        document.documentElement.classList.toggle('reduce-motion', motionQuery.matches);
        if (!motionQuery.matches) {
            matrixIntervalId = window.setInterval(draw, 35);
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function setMobileViewportHeight() {
        const isMobile = window.innerWidth <= 768;
        if (!isMobile) {
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
            return;
        }
        const vv = window.visualViewport;
        const height = vv ? vv.height : window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
    }

    if (canvas && ctx) {
        setCanvasSize();
        motionQuery.addEventListener('change', syncMatrixAnimation);
        syncMatrixAnimation();

        let resizeRaf;
        function onResize() {
            if (resizeRaf) return;
            resizeRaf = requestAnimationFrame(() => {
                setMobileViewportHeight();
                setCanvasSize();
                resizeRaf = null;
            });
        }
        window.addEventListener('resize', onResize);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', onResize);
        }
    }

    document.documentElement.style.overscrollBehaviorY = 'none';
    document.body.style.overflowY = 'hidden';

    window.addEventListener('load', () => {
        setMobileViewportHeight();
        const y = document.getElementById('footer-year');
        if (y) y.textContent = String(new Date().getFullYear());

        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav-link');

        const idToNav = new Map();
        navLinks.forEach((link) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                idToNav.set(href.slice(1), link);
            }
        });

        let activeId = null;
        function setActiveNav(id) {
            if (!id || activeId === id) return;
            activeId = id;
            navLinks.forEach((link) => link.classList.remove('active'));
            const link = idToNav.get(id);
            if (link) link.classList.add('active');
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                    }
                });
            },
            { rootMargin: '0px 0px -20% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
        );

        sections.forEach((s) => observer.observe(s));

        setTimeout(() => {
            document.body.style.overflowY = 'auto';
            document.documentElement.style.overscrollBehaviorY = '';
        }, 300);

        const scrollBehaviorNav = () =>
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

        navLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#')) return;
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: scrollBehaviorNav(), block: 'start' });
                }
            });
        });

        function updateActiveFromScroll() {
            const anchorY = 90;
            let bestId = null;
            let bestDist = Infinity;
            sections.forEach((section) => {
                const rect = section.getBoundingClientRect();
                const dist = Math.abs(rect.top - anchorY);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestId = section.id;
                }
            });
            setActiveNav(bestId);
        }

        const navEl = document.querySelector('.nav');
        let ticking = false;
        function onScrollStable() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                updateActiveFromScroll();
                if (navEl) navEl.classList.toggle('nav-scrolled', window.scrollY > 16);
                ticking = false;
            });
        }

        window.addEventListener('scroll', onScrollStable, { passive: true });
        window.addEventListener('resize', onScrollStable);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', onScrollStable);

        updateActiveFromScroll();
        if (navEl) navEl.classList.toggle('nav-scrolled', window.scrollY > 16);

        window.addEventListener('resize', setMobileViewportHeight);

        // Decorative home-terminal typing only (does not gate page content)
        initHomeTerminalTyping();
    });

    function initHomeTerminalTyping() {
        const homeTerminal = document.getElementById('home-terminal');
        const introSkip = document.getElementById('intro-skip');
        if (!homeTerminal) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const commandLines = Array.from(homeTerminal.querySelectorAll(':scope > .terminal-body > .command-line'));
        const cursorSpans = Array.from(homeTerminal.querySelectorAll('.cursor'));

        const introSteps = [
            { type: 'type', text: 'whoami', outputs: ['.ascii-name', '.title', '.description'] },
            { type: 'wait', ms: 300 },
            { type: 'type', text: 'ls core-skills/', outputs: ['.ls-output'] },
            { type: 'wait', ms: 300 },
            { type: 'type', text: 'cat status.txt', outputs: ['.status'] },
            { type: 'wait', ms: 300 },
            { type: 'type', text: 'cat network.cfg', outputs: ['.network-config', '.hero-actions'] },
        ];

        function getAsciiSelectorForViewport() {
            return window.innerWidth > 900 ? '.ascii-name-full' : '.ascii-name-mobile';
        }

        let whoamiShown = false;
        let introCancelled = false;

        function showOutputs(selectors) {
            if (!selectors?.length) return;
            selectors.forEach((sel) => {
                if (sel === '.ascii-name') {
                    const el = homeTerminal.querySelector(getAsciiSelectorForViewport());
                    if (el) el.classList.add('terminal-output-show');
                    whoamiShown = true;
                } else {
                    homeTerminal.querySelectorAll(sel).forEach((el) => {
                        el.classList.add('terminal-output-show');
                    });
                }
            });
        }

        function adjustAsciiVariant() {
            if (!whoamiShown) return;
            homeTerminal.querySelector('.ascii-name-full')?.classList.remove('terminal-output-show');
            homeTerminal.querySelector('.ascii-name-mobile')?.classList.remove('terminal-output-show');
            homeTerminal.querySelector(getAsciiSelectorForViewport())?.classList.add('terminal-output-show');
        }

        function finishTyping() {
            homeTerminal.classList.remove('is-typing');
            // Let normal CSS / media queries take over after the decoration ends
            homeTerminal.querySelectorAll('.terminal-output-show').forEach((el) => {
                el.classList.remove('terminal-output-show');
            });
            commandLines.forEach((line) => {
                line.style.display = '';
            });
            if (introSkip) introSkip.style.display = 'none';
        }

        function revealAll() {
            introCancelled = true;
            whoamiShown = true;

            const typedSteps = introSteps.filter((s) => s.type === 'type');
            commandLines.forEach((line, i) => {
                const cmdSpan = line.querySelector('.command');
                if (cmdSpan && typedSteps[i]) {
                    cmdSpan.textContent = typedSteps[i].text;
                } else if (cmdSpan && i >= typedSteps.length) {
                    cmdSpan.textContent = '';
                }
            });
            cursorSpans.forEach((c, i) => {
                c.style.display = i === cursorSpans.length - 1 ? 'inline' : 'none';
            });
            finishTyping();
        }

        async function typeCommand(lineEl, text) {
            const commandSpan = lineEl.querySelector('.command');
            const cursor = lineEl.querySelector('.cursor');
            if (!commandSpan) return;
            commandSpan.textContent = '';
            if (cursor) cursor.style.display = 'inline';
            for (let i = 0; i < text.length; i++) {
                if (introCancelled) return;
                commandSpan.textContent += text[i];
                await new Promise((r) => setTimeout(r, 55));
            }
            if (cursor) cursor.style.display = 'none';
        }

        async function runTyping() {
            introCancelled = false;
            homeTerminal.classList.add('is-typing');
            if (introSkip) introSkip.style.display = 'inline-flex';

            homeTerminal.querySelectorAll('.command').forEach((c) => {
                c.textContent = '';
            });
            commandLines.forEach((line) => {
                line.style.display = 'none';
            });
            homeTerminal
                .querySelectorAll('.terminal-output-show')
                .forEach((el) => el.classList.remove('terminal-output-show'));

            let stepIndex = 0;
            await new Promise((r) => setTimeout(r, 120));

            for (const step of introSteps) {
                if (introCancelled) return;
                if (step.type === 'type') {
                    const lineEl = commandLines[stepIndex];
                    if (!lineEl) continue;
                    lineEl.style.display = 'flex';
                    await typeCommand(lineEl, step.text);
                    if (introCancelled) return;
                    if (step.outputs) showOutputs(step.outputs);
                    stepIndex += 1;
                    const nextLine = commandLines[stepIndex];
                    if (nextLine) nextLine.style.display = 'flex';
                } else if (step.type === 'wait') {
                    await new Promise((r) => setTimeout(r, step.ms));
                }
            }

            if (introCancelled) return;

            // Idle prompt with blinking cursor
            const idleLine = commandLines[commandLines.length - 1];
            if (idleLine) {
                idleLine.style.display = 'flex';
                const idleCmd = idleLine.querySelector('.command');
                if (idleCmd) idleCmd.textContent = '';
                const idleCursor = idleLine.querySelector('.cursor');
                if (idleCursor) idleCursor.style.display = 'inline';
            }

            finishTyping();
        }

        if (reduceMotion) {
            revealAll();
        } else {
            runTyping();
        }

        if (introSkip) {
            introSkip.addEventListener('click', () => {
                revealAll();
            });
        }

        window.addEventListener('resize', adjustAsciiVariant);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', adjustAsciiVariant);
        }
    }

    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const body = document.body;

    function toggleMobileMenu() {
        if (!navToggle || !navMenu) return;
        const isActive = navMenu.classList.contains('nav-menu-active');

        if (isActive) {
            navMenu.classList.remove('nav-menu-active');
            navToggle.classList.remove('nav-toggle-active');
            body.classList.remove('nav-open');
            navToggle.setAttribute('aria-expanded', 'false');
        } else {
            navMenu.classList.add('nav-menu-active');
            navToggle.classList.add('nav-toggle-active');
            body.classList.add('nav-open');
            navToggle.setAttribute('aria-expanded', 'true');
        }
    }

    function closeMobileMenu() {
        if (!navToggle || !navMenu) return;
        navMenu.classList.remove('nav-menu-active');
        navToggle.classList.remove('nav-toggle-active');
        body.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
    }

    if (navToggle && navMenu) navToggle.addEventListener('click', toggleMobileMenu);

    document.querySelectorAll('.nav-link').forEach((link) => {
        link.addEventListener('click', closeMobileMenu);
    });

    document.addEventListener('click', (e) => {
        if (!navToggle || !navMenu) return;
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            closeMobileMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 800) {
            closeMobileMenu();
        }
    });
})();
