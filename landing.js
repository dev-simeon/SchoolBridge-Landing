let cleanupLandingPage;
let cleanupFeatureShowcase;
let cleanupSchoolDayIndicators;
let aosLoadPromise;

function loadAos() {
    if (window.AOS) return Promise.resolve(window.AOS);
    if (aosLoadPromise) return aosLoadPromise;

    aosLoadPromise = new Promise(resolve => {
        const script = document.createElement("script");
        script.src = "assets/aos.js";
        script.onload = () => resolve(window.AOS ?? null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
    });
    return aosLoadPromise;
}

async function initializeLandingAnimations() {
    const root = document.querySelector(".public-landing");
    if (!root) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (root.dataset.aosInitialized === "true") {
        window.AOS?.refreshHard();
        return;
    }

    const aos = await loadAos();
    if (!aos || !root.isConnected) return;

    const animate = (selector, effect = "fade-up", delays = []) => {
        root.querySelectorAll(selector).forEach((element, index) => {
            element.dataset.aos = Array.isArray(effect) ? effect[index % effect.length] : effect;
            if (delays.length) element.dataset.aosDelay = String(delays[index % delays.length]);
        });
    };

    const animateFromSide = (element, effect, delay = 0) => {
        if (!element) return;
        element.dataset.aos = effect;
        if (delay) element.dataset.aosDelay = String(delay);
    };

    // Apply AOS only after the CDN is available so a CDN failure never hides page content.
    animate(".platform-section .section-heading, .feature-heading, .workflow-section .section-heading, .pricing-section .section-heading", "fade-up");
    animate(".surface-role-card", "fade-up", [0, 100, 200]);
    animateFromSide(root.querySelector(".school-day-heading-copy"), "fade-right");
    animateFromSide(root.querySelector(".school-day-heading-description"), "fade-left", 80);
    animate(".school-day-card", "fade-up", [0, 80, 160, 240]);
    animate(".workflow-step", ["fade-right", "fade-up", "fade-left"], [0, 80, 160]);
    animate(".pricing-card", "fade-up", [0, 90, 180, 270]);
    animate(".faq-intro", "fade-up");
    animate(".faq-list", "fade-up");
    animate(".closing-banner", "fade-up");

    try {
        aos.init({
            duration: 650,
            easing: "ease-out-cubic",
            offset: 80,
            once: true,
            anchorPlacement: "top-bottom"
        });
        root.dataset.aosInitialized = "true";
    } catch (error) {
        root.querySelectorAll("[data-aos]").forEach(element => {
            element.removeAttribute("data-aos");
            element.removeAttribute("data-aos-delay");
        });
        console.warn("Landing page animations could not be initialized:", error);
    }
}

function enableFeatureShowcaseScrollSync() {
    cleanupFeatureShowcase?.();
    cleanupFeatureShowcase = undefined;

    const layout = document.querySelector(".feature-sticky-layout[data-feature-sync]");
    if (!layout) return;

    const steps = [...layout.querySelectorAll("[data-feature-step]")];
    const scenes = [...layout.querySelectorAll("[data-feature-scene]")];
    if (!steps.length) return;

    const activate = key => {
        const activeStep = steps.find(step => step.dataset.featureStep === key);
        if (!activeStep) return;

        steps.forEach(step => {
            const active = step === activeStep;
            step.classList.toggle("is-active", active);
        });
        scenes.forEach(scene => {
            const active = scene.dataset.featureScene === key;
            scene.classList.toggle("is-active", active);
            scene.setAttribute("aria-hidden", String(!active));
        });
    };
    activate(steps[0].dataset.featureStep);
    if (!("IntersectionObserver" in window)) return;

    let observer;
    const observeSteps = () => {
        observer?.disconnect();
        const verticalInset = Math.round(window.innerHeight * 0.38);
        observer = new IntersectionObserver(entries => {
        const visibleSteps = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => {
                const viewportCenter = window.innerHeight / 2;
                const distanceA = Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - viewportCenter);
                const distanceB = Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - viewportCenter);
                return distanceA - distanceB;
            });
        if (visibleSteps.length) activate(visibleSteps[0].target.dataset.featureStep);
        }, {
            root: null,
            rootMargin: `-${verticalInset}px 0px -${verticalInset}px 0px`,
            threshold: 0
        });
        steps.forEach(step => observer.observe(step));
    };

    observeSteps();
    window.addEventListener("resize", observeSteps, { passive: true });
    cleanupFeatureShowcase = () => {
        observer?.disconnect();
        window.removeEventListener("resize", observeSteps);
    };
}

function enableSchoolDayScrollIndicators() {
    cleanupSchoolDayIndicators?.();
    cleanupSchoolDayIndicators = undefined;

    const grid = document.querySelector(".school-day-grid");
    const indicatorGroup = document.querySelector(".school-day-indicators");
    if (!grid || !indicatorGroup) return;

    let frame = 0;
    const updateActiveIndicator = () => {
        frame = 0;
        const buttons = [...indicatorGroup.querySelectorAll("button")];
        if (!buttons.length) return;
        const page = Math.round(grid.scrollLeft / Math.max(1, grid.clientWidth));
        buttons.forEach((button, index) => {
            button.setAttribute("aria-pressed", String(index === page));
        });
    };
    const scheduleIndicatorUpdate = () => {
        if (!frame) frame = window.requestAnimationFrame(updateActiveIndicator);
    };
    const renderIndicators = () => {
        indicatorGroup.replaceChildren();
        const maxScroll = grid.scrollWidth - grid.clientWidth;
        if (maxScroll <= 1 || grid.clientWidth <= 0) return;

        const pageCount = Math.ceil(grid.scrollWidth / grid.clientWidth);
        for (let page = 0; page < pageCount; page += 1) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "school-day-indicator";
            button.setAttribute("aria-label", `Show school day card group ${page + 1}`);
            button.setAttribute("aria-pressed", String(page === 0));
            button.addEventListener("click", () => {
                grid.scrollTo({
                    left: Math.min(page * grid.clientWidth, grid.scrollWidth - grid.clientWidth),
                    behavior: "smooth"
                });
            });
            indicatorGroup.append(button);
        }
        updateActiveIndicator();
    };

    grid.addEventListener("scroll", scheduleIndicatorUpdate, { passive: true });
    window.addEventListener("resize", renderIndicators, { passive: true });
    renderIndicators();
    cleanupSchoolDayIndicators = () => {
        grid.removeEventListener("scroll", scheduleIndicatorUpdate);
        window.removeEventListener("resize", renderIndicators);
        if (frame) window.cancelAnimationFrame(frame);
    };
}

function enableScrollSpy() {
    disableScrollSpy();
    void initializeLandingAnimations();
    enableFeatureShowcaseScrollSync();
    enableSchoolDayScrollIndicators();

    const navs = [...document.querySelectorAll(".public-landing .public-nav, .public-landing .mobile-nav-links")];
    const header = document.querySelector(".public-landing .public-header");
    if (!navs.length) return;

    const entries = navs.flatMap(nav => [...nav.querySelectorAll('a[href^="#"]')])
        .map(link => ({ link, section: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
        .filter(entry => entry.section)
        .sort((a, b) => {
            const position = a.section.compareDocumentPosition(b.section);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
            return 0;
        });

    if (!entries.length) return;

    let frame = 0;
    let navigationFrame = 0;
    let requestedEntry = null;
    const setActiveEntry = activeEntry => {
        for (const entry of entries) {
            const isActive = entry.section === activeEntry.section;
            entry.link.classList.toggle("active", isActive);
            if (isActive) entry.link.setAttribute("aria-current", "location");
            else entry.link.removeAttribute("aria-current");
        }
    };

    // Clear any server-rendered or stale active state before measuring the page.
    setActiveEntry(entries[0]);

    const updateActiveLink = () => {
        frame = 0;
        if (requestedEntry) {
            setActiveEntry(requestedEntry);
            return;
        }
        const activationLine = (header?.getBoundingClientRect().bottom ?? 0) + 28;
        let activeEntry = entries[0];

        for (const entry of entries) {
            if (entry.section.getBoundingClientRect().top <= activationLine) activeEntry = entry;
            else break;
        }

        setActiveEntry(activeEntry);
    };

    const scheduleUpdate = () => {
        if (!frame) frame = window.requestAnimationFrame(updateActiveLink);
    };

    const handleNavigationClick = event => {
        const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
        const entry = entries.find(candidate => candidate.link === link);
        if (!entry) return;

        event.preventDefault();
        requestedEntry = entry;
        setActiveEntry(entry);
        if (window.location.hash !== link.hash) history.pushState(null, "", link.hash);
        entry.section.scrollIntoView({ behavior: "smooth", block: "start" });

        // Do not depend on scrollend support: finish after the smooth scroll settles.
        if (navigationFrame) window.cancelAnimationFrame(navigationFrame);
        const startedAt = performance.now();
        let lastScrollY = window.scrollY;
        let stableFrames = 0;
        const monitorScroll = now => {
            if (!requestedEntry) {
                navigationFrame = 0;
                return;
            }

            const currentScrollY = window.scrollY;
            stableFrames = Math.abs(currentScrollY - lastScrollY) < 0.5 ? stableFrames + 1 : 0;
            lastScrollY = currentScrollY;

            if (now - startedAt >= 120 && stableFrames >= 5) {
                finishNavigationScroll();
                navigationFrame = 0;
                return;
            }
            navigationFrame = window.requestAnimationFrame(monitorScroll);
        };
        navigationFrame = window.requestAnimationFrame(monitorScroll);
    };
    const finishNavigationScroll = () => {
        if (!requestedEntry) return;
        requestedEntry = null;
        if (navigationFrame) window.cancelAnimationFrame(navigationFrame);
        navigationFrame = 0;
        scheduleUpdate();
    };

    const handleHashChange = () => {
        requestedEntry = null;
        scheduleUpdate();
    };

    document.addEventListener("scroll", scheduleUpdate, { capture: true, passive: true });
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("scrollend", finishNavigationScroll);
    document.addEventListener("scrollend", finishNavigationScroll);
    navs.forEach(nav => nav.addEventListener("click", handleNavigationClick));
    window.addEventListener("pageshow", scheduleUpdate);
    scheduleUpdate();

    cleanupLandingPage = () => {
        document.removeEventListener("scroll", scheduleUpdate, true);
        window.removeEventListener("scroll", scheduleUpdate);
        window.removeEventListener("resize", scheduleUpdate);
        window.removeEventListener("hashchange", handleHashChange);
        window.removeEventListener("scrollend", finishNavigationScroll);
        document.removeEventListener("scrollend", finishNavigationScroll);
        window.removeEventListener("pageshow", scheduleUpdate);
        navs.forEach(nav => nav.removeEventListener("click", handleNavigationClick));
        if (frame) window.cancelAnimationFrame(frame);
        if (navigationFrame) window.cancelAnimationFrame(navigationFrame);
        frame = 0;
        navigationFrame = 0;
    };
}

function disableScrollSpy() {
    cleanupLandingPage?.();
    cleanupLandingPage = undefined;
    cleanupFeatureShowcase?.();
    cleanupFeatureShowcase = undefined;
    cleanupSchoolDayIndicators?.();
    cleanupSchoolDayIndicators = undefined;
}

enableScrollSpy();

