// /mythogin/js/recommendations-drawer.js
// Recommendations "On this page" TOC drawer (right side)
// - Default OPEN on >= 640px, CLOSED under
// - User can open/close on any size
// - Persists preference in localStorage
// - Uses robust same-page href (base-safe) + scrollIntoView
// - Links: Top + sections (chart + lists + each medium)
//
// BRIDGE (IMPORTANT):
// This file now supports BOTH naming schemes:
//   Old:  body.recs-toc-open + [data-recs-toc-*] + #recsTocPanel
//   New:  body.toc-open      + [data-toc-*]      + .toc-panel (shared drawer.css)
// It keeps body classes in sync so drawer.css always responds.

(function () {
  "use strict";

  const STORAGE_KEY = "mythogin_recs_toc_open_v1";
  const MQ_DESKTOP = window.matchMedia("(min-width: 640px)");

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }
  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  // -----------------------------
  // BRIDGE: resolve elements across both naming schemes
  // -----------------------------
  function getPanel() {
    return qs("#recsTocPanel") || qs("#tocPanel") || qs(".toc-panel");
  }

  function getNav(panel) {
    if (!panel) return null;
    return qs(".toc-panel-nav", panel) || qs(".toc-panel-nav");
  }

  function getBackdrop() {
    return qs("[data-recs-toc-backdrop]") || qs("[data-toc-backdrop]") || qs(".toc-backdrop");
  }

  function getOpeners() {
    return qsa("[data-recs-toc-open], [data-toc-open]");
  }

  function getClosers() {
    return qsa("[data-recs-toc-close], [data-toc-close]");
  }

  // Keep both body classes in sync (drawer.css uses toc-open)
  function syncBodyClasses(isOpen) {
    document.body.classList.toggle("recs-toc-open", !!isOpen);
    document.body.classList.toggle("toc-open", !!isOpen);
  }

  // If some other script toggles one of the classes, mirror it.
  function startClassSyncObserver() {
    const body = document.body;
    if (!body) return;

    let lock = false;

    const obs = new MutationObserver(() => {
      if (lock) return;

      const a = body.classList.contains("recs-toc-open");
      const b = body.classList.contains("toc-open");

      if (a === b) return;

      lock = true;
      // Prefer whichever is currently true; otherwise both false.
      const target = a || b;
      body.classList.toggle("recs-toc-open", target);
      body.classList.toggle("toc-open", target);
      lock = false;
    });

    obs.observe(body, { attributes: true, attributeFilter: ["class"] });
  }

  // -----------------------------
  // Storage
  // -----------------------------
  function getStoredPref() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === null) return null;
      return v === "1";
    } catch {
      return null;
    }
  }

  function setStoredPref(isOpen) {
    try {
      localStorage.setItem(STORAGE_KEY, isOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  // -----------------------------
  // Open/Close
  // -----------------------------
  function setOpenState(isOpen, opts = { persist: true }) {
    const panel = getPanel();
    if (!panel) return;

    const openers = getOpeners();
    const closers = getClosers();
    const backdrop = getBackdrop();

    syncBodyClasses(!!isOpen);

    panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    openers.forEach((btn) => btn.setAttribute("aria-expanded", isOpen ? "true" : "false"));
    if (backdrop) backdrop.setAttribute("aria-hidden", isOpen ? "false" : "true");

    // keep focus behavior unchanged
    closers.forEach((btn) => btn.setAttribute("tabindex", "0"));

    if (opts.persist) setStoredPref(!!isOpen);
  }

  function isOpenNow() {
    // Either class means "open" (bridge keeps them synced anyway)
    return (
      document.body.classList.contains("recs-toc-open") ||
      document.body.classList.contains("toc-open")
    );
  }

  function toggle() {
    setOpenState(!isOpenNow(), { persist: true });
  }

  function defaultState() {
    const stored = getStoredPref();
    if (stored !== null) return stored;
    return MQ_DESKTOP.matches;
  }

  // -----------------------------
  // TOC building
  // -----------------------------
  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function ensureId(el, fallbackText, prefix) {
    if (!el) return null;
    if (el.id && el.id.trim()) return el.id;

    const base = slugify(fallbackText) || "section";
    const pre = prefix ? `${prefix}-` : "";
    let id = `${pre}${base}`;

    let n = 2;
    while (document.getElementById(id)) id = `${pre}${base}-${n++}`;
    el.id = id;
    return id;
  }

  function samePageHref(id) {
    const path = window.location.pathname || "/";
    const qsPart = window.location.search || "";
    return `${path}${qsPart}#${id}`;
  }

  // Fixed structure (no scanning H2/H3); recs page has known anchors.
  function buildTOC() {
    const panel = getPanel();
    const nav = getNav(panel);
    if (!nav) return;

    nav.textContent = "";

    const targets = [
      { id: "top", label: "Back to top" },
      { id: "chart", label: "Top Picks (Summary Chart)" },
      { id: "lists", label: "Complete Catalogue" },
      { id: "lists-books", label: "Books" },
      { id: "lists-tv", label: "TV" },
      { id: "lists-film", label: "Film" },
      { id: "lists-games", label: "Games" },
      { id: "lists-podcasts", label: "Podcasts" },
      { id: "lists-documentaries", label: "Documentaries" }
    ];

    // Ensure #top exists (create a tiny anchor if missing)
    let topEl = document.getElementById("top");
    if (!topEl) {
      const main = qs("main.recs") || document.body;
      const anchor = document.createElement("div");
      anchor.id = "top";
      anchor.style.position = "relative";
      anchor.style.top = "-12px";
      main.prepend(anchor);
      topEl = anchor;
    }

    // Ensure ids exist for other targets if present
    targets.forEach((t) => {
      const el = document.getElementById(t.id);
      if (!el) return;
      ensureId(el, t.label, "");
    });

    const frag = document.createDocumentFragment();

    targets.forEach((t) => {
      const el = document.getElementById(t.id);
      if (!el) return;

      const a = document.createElement("a");
      a.className = t.id === "top" ? "toc-link toc-link--top" : "toc-link";
      a.href = samePageHref(t.id);
      a.textContent = t.label;
      a.dataset.tocTarget = t.id;

      frag.appendChild(a);
    });

    nav.appendChild(frag);
  }

  function updateActiveTOC() {
    const panel = getPanel();
    const nav = getNav(panel);
    if (!nav) return;

    const links = qsa("a[data-toc-target]", nav);
    if (!links.length) return;

    const targets = links
      .map((a) => document.getElementById(a.dataset.tocTarget))
      .filter(Boolean);

    if (!targets.length) return;

    const y = window.scrollY || window.pageYOffset || 0;
    const threshold = 140;

    let activeId = targets[0].id;
    for (const el of targets) {
      const top = el.getBoundingClientRect().top + y;
      if (top - threshold <= y) activeId = el.id;
      else break;
    }

    links.forEach((a) => {
      a.classList.toggle("is-active", a.dataset.tocTarget === activeId);
    });
  }

  function wireTOCClicks() {
    const panel = getPanel();
    const nav = getNav(panel);
    if (!nav) return;

    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-toc-target]");
      if (!a) return;

      e.preventDefault();

      const id = a.dataset.tocTarget;
      const el = document.getElementById(id);
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "start" });

      const newUrl = samePageHref(id);
      try {
        history.pushState(null, "", newUrl);
      } catch {
        window.location.hash = `#${id}`;
      }

      updateActiveTOC();

      // Close after navigation on small screens
      if (window.matchMedia("(max-width: 639px)").matches) {
        setOpenState(false, { persist: true });
      }
    });
  }

  // -----------------------------
  // KEY FIX: Keep TOC rail below hero (desktop only)
  // - Sets CSS var: --recs-toc-sticky-top
  // - While hero is visible, sticky top becomes (heroBottom + gap)
  // - After hero scrolls away, sticky top reverts to nav height + 18px
  // -----------------------------
  function startKeepBelowHero() {
    if (!document.body.classList.contains("recs-page")) return;

    const root = document.documentElement;
    const topbar = qs(".topbar");

    // Use the card (best), fallback to section
    const hero = qs(".recs-hero-card") || qs(".recs-hero");
    if (!hero) return;

    const GAP = 18; // visual breathing room under hero

    let ticking = false;

    function compute() {
      ticking = false;

      // Base top used by drawer.css
      const topbarH = topbar ? topbar.getBoundingClientRect().height : 72;
      const baseTop = Math.round(topbarH + 18);

      // If hero bottom is below baseTop, we push sticky top down to hero bottom (+ gap).
      const heroBottom = hero.getBoundingClientRect().bottom;
      const stickyTop = heroBottom > baseTop ? Math.round(heroBottom + GAP) : baseTop;

      root.style.setProperty("--recs-toc-sticky-top", `${stickyTop}px`);
    }

    function requestCompute() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(compute);
    }

    compute();
    window.addEventListener("scroll", requestCompute, { passive: true });
    window.addEventListener("resize", requestCompute);

    // If images/fonts shift hero height after load, recompute once more
    window.addEventListener("load", compute, { once: true });
  }

  // -----------------------------
  // Wiring
  // -----------------------------
  function wire() {
    const panel = getPanel();
    if (!panel) return;

    startClassSyncObserver();

    if (!panel.hasAttribute("aria-hidden")) panel.setAttribute("aria-hidden", "true");

    // Openers (support both old and new attrs)
    getOpeners().forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        toggle();
      });
    });

    // Closers (support both old and new attrs)
    getClosers().forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        setOpenState(false, { persist: true });
      });
    });

    const backdrop = getBackdrop();
    if (backdrop) {
      backdrop.addEventListener("click", () => setOpenState(false, { persist: true }));
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpenNow()) {
        setOpenState(false, { persist: true });
      }
    });

    buildTOC();
    wireTOCClicks();

    updateActiveTOC();
    window.addEventListener("scroll", () => updateActiveTOC(), { passive: true });

    // Apply default open state
    setOpenState(defaultState(), { persist: false });

    MQ_DESKTOP.addEventListener("change", () => {
      const stored = getStoredPref();
      if (stored !== null) setOpenState(stored, { persist: false });
      else setOpenState(MQ_DESKTOP.matches, { persist: false });
    });

    // KEY: keep TOC below hero (desktop rail)
    startKeepBelowHero();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
