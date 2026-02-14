// /Mythogin/js/drawer.js
// Controls the "On this page" TOC panel.
// - Default OPEN on medium+widescreen (>= 640px)
// - Default CLOSED on small screens
// - User can open/close on any size
// - Persists preference in localStorage
// + Builds TOC links from story sections (H2) and subheads (H3)
// + Robust against <base href="/"> by using location.pathname + "#id"
// + Click handler scrolls reliably (does not depend on default fragment navigation)
// + Paint guard: avoids redundant writes

(function () {
  "use strict";

  const STORAGE_KEY = "mythogin_toc_open_v2";
  const MQ_DESKTOP = window.matchMedia("(min-width: 640px)");
  const MQ_MOBILE = window.matchMedia("(max-width: 639px)");

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

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
    } catch { /* ignore */ }
  }

  function hasOpenClass() {
    return document.documentElement.classList.contains("toc-open") ||
           document.body.classList.contains("toc-open");
  }

  function setRootOpenClass(isOpen) {
    const next = !!isOpen;

    // Paint guard: only write if changed
    if (document.documentElement.classList.contains("toc-open") !== next) {
      document.documentElement.classList.toggle("toc-open", next);
    }
    if (document.body.classList.contains("toc-open") !== next) {
      document.body.classList.toggle("toc-open", next);
    }
  }

  function setOpenState(isOpen, opts = { persist: true }) {
    const panel = qs("#tocPanel");
    if (!panel) return;

    const next = !!isOpen;

    setRootOpenClass(next);

    const openers = qsa("[data-toc-open]");
    const closers = qsa("[data-toc-close]");
    const backdrop = qs("[data-toc-backdrop]");

    // ARIA (paint guard)
    const ariaHidden = next ? "false" : "true";
    if (panel.getAttribute("aria-hidden") !== ariaHidden) {
      panel.setAttribute("aria-hidden", ariaHidden);
    }

    const expanded = next ? "true" : "false";
    openers.forEach((btn) => {
      if (btn.getAttribute("aria-expanded") !== expanded) {
        btn.setAttribute("aria-expanded", expanded);
      }
    });

    if (backdrop) {
      const bdHidden = next ? "false" : "true";
      if (backdrop.getAttribute("aria-hidden") !== bdHidden) {
        backdrop.setAttribute("aria-hidden", bdHidden);
      }
    }

    // keep focus behavior unchanged (avoid redundant writes)
    closers.forEach((btn) => {
      if (btn.getAttribute("tabindex") !== "0") btn.setAttribute("tabindex", "0");
    });

    if (opts.persist) setStoredPref(next);
  }

  function toggle() {
    setOpenState(!hasOpenClass(), { persist: true });
  }

  function defaultState() {
    const stored = getStoredPref();
    if (stored !== null) return stored;

    // Respect author state if present
    if (hasOpenClass()) return true;

    return MQ_DESKTOP.matches;
  }

  // ---------- TOC BUILDING ----------

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

  function buildTOC() {
    const panelNav = qs("#tocPanel .toc-panel-nav");
    const article = qs("article.story-article");
    if (!panelNav || !article) return;

    panelNav.textContent = "";

    const sections = qsa("section.story-section", article).filter((sec) => {
      const h2 = qs(".section-title", sec) || qs("h2", sec);
      return (sec.id && sec.id.trim()) || (h2 && h2.textContent.trim());
    });

    if (!sections.length) return;

    const frag = document.createDocumentFragment();

    sections.forEach((sec) => {
      const h2 = qs(".section-title", sec) || qs("h2", sec);
      const titleText = h2 ? h2.textContent.trim() : sec.id;

      const secId = ensureId(sec, titleText, "");

      const a = document.createElement("a");
      a.className = "toc-link";
      a.href = samePageHref(secId);
      a.textContent = titleText;
      a.dataset.tocTarget = secId;
      frag.appendChild(a);

      const subheads = qsa("h3", sec);
      if (subheads.length) {
        const subWrap = document.createElement("div");
        subWrap.className = "toc-sub";

        subheads.forEach((h3) => {
          const subText = h3.textContent.trim();
          if (!subText) return;

          const h3Id = ensureId(h3, subText, secId);

          const subA = document.createElement("a");
          subA.className = "toc-sublink";
          subA.href = samePageHref(h3Id);
          subA.textContent = subText;
          subA.dataset.tocTarget = h3Id;

          subWrap.appendChild(subA);
        });

        if (subWrap.childElementCount) frag.appendChild(subWrap);
      }
    });

    panelNav.appendChild(frag);
  }

  function updateActiveTOC() {
    const nav = qs("#tocPanel .toc-panel-nav");
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

    links.forEach((a) => a.classList.toggle("is-active", a.dataset.tocTarget === activeId));
  }

  function wireTOCClicks() {
    const nav = qs("#tocPanel .toc-panel-nav");
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
      try { history.pushState(null, "", newUrl); }
      catch { window.location.hash = `#${id}`; }

      updateActiveTOC();

      if (MQ_MOBILE.matches) setOpenState(false, { persist: true });
    });
  }

  // ---------- WIRING ----------

  function wire() {
    const panel = qs("#tocPanel");
    if (!panel) return;

    qsa("[data-toc-open]").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.preventDefault(); toggle(); });
    });

    qsa("[data-toc-close]").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.preventDefault(); setOpenState(false, { persist: true }); });
    });

    const backdrop = qs("[data-toc-backdrop]");
    if (backdrop) backdrop.addEventListener("click", () => setOpenState(false, { persist: true }));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && hasOpenClass()) setOpenState(false, { persist: true });
    });

    buildTOC();
    wireTOCClicks();

    updateActiveTOC();
    window.addEventListener("scroll", () => updateActiveTOC(), { passive: true });

    setOpenState(defaultState(), { persist: false });

    MQ_DESKTOP.addEventListener("change", () => {
      const stored = getStoredPref();
      if (stored !== null) setOpenState(stored, { persist: false });
      else setOpenState(MQ_DESKTOP.matches, { persist: false });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
