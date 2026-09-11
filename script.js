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

    let scrollTicking = false;
    function onScroll() {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
            if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 24);
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
       Footer year
       ------------------------------------------------------------------ */
    const year = document.getElementById('footer-year');
    if (year) year.textContent = String(new Date().getFullYear());
})();
