// /mythogin/js/main.js
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Base-aware path helpers (CASE-INSENSITIVE for /mythogin vs /Mythogin)
  // ---------------------------------------------------------------------------

  function getBaseRootPath() {
    try {
      let p = new URL(document.baseURI).pathname || "/";
      p = p.replace(/\/+$/, "");
      return p || "/";
    } catch {
      return "/";
    }
  }

  const BASE_ROOT = getBaseRootPath();            // e.g. "/Mythogin" or "/mythogin" or "/"
  const BASE_ROOT_L = BASE_ROOT.toLowerCase();    // lowercase for robust compare

  function stripBase(pathname) {
    if (!pathname) return "/";

    // Always work with a leading slash
    const original = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const lower = original.toLowerCase();

    if (BASE_ROOT_L === "/") return original;

    // Handle exact base
    if (lower === BASE_ROOT_L) return "/";

    // Handle base + "/..."
    if (lower.startsWith(BASE_ROOT_L + "/")) {
      // Slice using base length (works even if cases differ)
      const sliced = original.slice(BASE_ROOT.length);
      return sliced || "/";
    }

    // If base differs by case-length edge (rare), try slicing by lowercase length
    if (lower.startsWith(BASE_ROOT_L + "/")) {
      const sliced = original.slice(BASE_ROOT_L.length);
      return sliced || "/";
    }

    return original;
  }

  function normPath(p) {
    if (!p) return "";
    return p
      .toLowerCase()
      .replace(/\/index\.html$/i, "")
      .replace(/\/$/, "");
  }

  function hrefToSitePath(rawHref) {
    try {
      const abs = new URL(rawHref, document.baseURI);
      return normPath(stripBase(abs.pathname));
    } catch {
      return "";
    }
  }

  function sitePathNow() {
    return normPath(stripBase(location.pathname || ""));
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  setFooterYear();
  setActiveNav();
  wireNavSearchFill();
  enableTopicsSearchIfPresent();
  wireAudioButtons();
  wireTocDrawer();
  wirePinnedSubmenus();

  // ---------------------------------------------------------------------------
  // Footer year
  // ---------------------------------------------------------------------------

  function setFooterYear() {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  // ---------------------------------------------------------------------------
  // Active nav + submenu item highlight
  // ---------------------------------------------------------------------------

  function setActiveNav() {
    const currentPath = normPath(stripBase(new URL(location.href).pathname));

    // Clear existing markers
    document.querySelectorAll('.navlinks a[aria-current="page"]').forEach(a => {
      a.removeAttribute("aria-current");
    });

    // 1) Exact match
    let matched = false;
    document.querySelectorAll(".navlinks a[href]").forEach(a => {
      const rawHref = (a.getAttribute("href") || "").trim();
      if (!rawHref || rawHref.startsWith("#")) return;

      const hrefPath = hrefToSitePath(rawHref);
      if (hrefPath && hrefPath === currentPath) {
        a.setAttribute("aria-current", "page");
        matched = true;
      }
    });

    if (matched) return;

    // FEATURES fallback
    if (currentPath === "/features" || currentPath.startsWith("/features/")) {
      const featuresTop = Array.from(document.querySelectorAll('.navlinks a.nav-link[href]'))
        .find(a => {
          const p = hrefToSitePath(a.getAttribute("href"));
          return p === "/features" || p === "/features/index";
        });
      if (featuresTop) featuresTop.setAttribute("aria-current", "page");
      return;
    }

    // PERSPECTIVE fallback + submenu highlight
    if (currentPath === "/perspective" || currentPath.startsWith("/perspective/")) {
      const perspTop = Array.from(document.querySelectorAll('.navlinks a.nav-link[href]'))
        .find(a => {
          const p = hrefToSitePath(a.getAttribute("href"));
          return p === "/perspective" || p === "/perspective/index";
        });

      if (perspTop) perspTop.setAttribute("aria-current", "page");

      const submenuLinks = Array.from(document.querySelectorAll(".nav-item.has-submenu .submenu a[href]"));
      const perspSub = submenuLinks.find(a => {
        const p = hrefToSitePath(a.getAttribute("href"));
        return p && (p === currentPath || currentPath.startsWith(p + "/"));
      });

      if (perspSub) perspSub.setAttribute("aria-current", "page");
      return;
    }

    // HERO-JOURNEYS fallback + submenu highlight
    const bodyClass = (document.body && document.body.className) ? document.body.className : "";
    const m = bodyClass.match(/\bstory--([a-z0-9-]+)\b/i);
    let sectionKey = m ? m[1].toLowerCase() : "";

    if (!sectionKey) {
      const pm = currentPath.match(/^\/(hero-journeys)\/([a-z0-9-]+)\b/i);
      sectionKey = pm ? pm[2].toLowerCase() : "";
    }

    const inHJ = currentPath.startsWith("/hero-journeys/");
    if (!inHJ) return;

    const hjTop = Array.from(document.querySelectorAll('.navlinks a.nav-link[href]'))
      .find(a => {
        const p = hrefToSitePath(a.getAttribute("href"));
        return p === "/hero-journeys" || p === "/hero-journeys/index";
      });

    if (hjTop) hjTop.setAttribute("aria-current", "page");

    if (!sectionKey) return;

    const submenuLinks = Array.from(document.querySelectorAll(".nav-item.has-submenu .submenu a[href]"));
    const sectionLink = submenuLinks.find(a => {
      const p = hrefToSitePath(a.getAttribute("href"));
      return p && p.includes(`/hero-journeys/${sectionKey}`);
    });

    if (sectionLink) sectionLink.setAttribute("aria-current", "page");
  }

  // ---------------------------------------------------------------------------
  // Nav search fill
  // ---------------------------------------------------------------------------

  function wireNavSearchFill() {
    const params = new URLSearchParams(location.search);
    const q = (params.get("q") || "").trim();
    if (!q) return;

    const input = document.querySelector('.nav-search-input[name="q"]');
    if (input) input.value = q;
  }

  // ---------------------------------------------------------------------------
  // Topics search (only if #topicsRoot exists)
  // ---------------------------------------------------------------------------

  function enableTopicsSearchIfPresent() {
    const root = document.getElementById("topicsRoot");
    if (!root) return;

    const params = new URLSearchParams(location.search);
    const initial = (params.get("q") || "").trim();

    const navInput = document.querySelector('.nav-search-input[name="q"]');
    const status = document.getElementById("searchStatus");

    const blocks = Array.from(root.querySelectorAll("article.block"));
    const index = blocks.map(block => ({
      block,
      text: block.innerText.replace(/\s+/g, " ").toLowerCase()
    }));

    function apply(query) {
      const q = (query || "").trim().toLowerCase();
      let shown = 0;

      index.forEach(({ block, text }) => {
        const match = !q || text.includes(q);
        block.style.display = match ? "" : "none";
        if (match) shown++;
      });

      if (!status) return;
      if (!q) {
        status.textContent = "";
        return;
      }

      status.textContent = shown
        ? `Showing ${shown} result${shown === 1 ? "" : "s"} for “${query}”.`
        : `No results for “${query}”.`;
    }

    if (initial) apply(initial);
    if (navInput) navInput.addEventListener("input", () => apply(navInput.value));
  }

  // ---------------------------------------------------------------------------
  // Audio button toggle
  // ---------------------------------------------------------------------------

  function wireAudioButtons() {
    document.addEventListener("click", e => {
      const btn = e.target.closest(".audio-btn[data-action]");
      if (!btn) return;

      const audio = btn.parentElement.querySelector("audio");
      if (!audio) return;

      if (audio.paused) {
        audio.play();
        btn.textContent = "⏸ Pause";
      } else {
        audio.pause();
        btn.textContent = "▶ Listen";
      }
    });
  }

  // ---------------------------------------------------------------------------
  // TOC drawer (mobile)
  // ---------------------------------------------------------------------------

  function wireTocDrawer() {
    const panel = document.querySelector('[data-toc-panel]');
    const toggle = document.querySelector('[data-toc-toggle]');
    const closeBtn = document.querySelector('[data-toc-close]');
    const backdrop = document.querySelector('[data-toc-backdrop]');

    if (!panel || !toggle) return;

    const open = () => {
      document.body.classList.add("toc-open");
      toggle.setAttribute("aria-expanded", "true");
    };

    const close = () => {
      document.body.classList.remove("toc-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      document.body.classList.contains("toc-open") ? close() : open();
    });

    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    panel.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      if (window.matchMedia("(max-width: 980px)").matches) close();
    });

    const links = [...panel.querySelectorAll('.toc-link[href^="#"]')];
    const targets = links
      .map(a => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);

    if (targets.length) {
      const obs = new IntersectionObserver((entries) => {
        const visible = entries
          .filter(en => en.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (!visible) return;

        const id = `#${visible.target.id}`;
        links.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === id));
      }, { rootMargin: "-25% 0px -65% 0px", threshold: 0.01 });

      targets.forEach(t => obs.observe(t));
    }
  }

  // ---------------------------------------------------------------------------
  // Pinned submenus: semi-permanent open within section (desktop-only pin)
  // ---------------------------------------------------------------------------

  function wirePinnedSubmenus() {
    const path = sitePathNow();

    const inHJ = (path === "/hero-journeys" || path.startsWith("/hero-journeys/"));
    const inPerspective = (path === "/perspective" || path.startsWith("/perspective/"));

    document.body.classList.toggle("in-hero-journey", inHJ);
    document.body.classList.toggle("in-perspective", inPerspective);

    const nav = document.querySelector(".navlinks");
    if (!nav) return;

    // Find submenu host by prefix using base-aware href parsing
    function findHost(prefix) {
      const hosts = Array.from(nav.querySelectorAll(":scope > .nav-item.has-submenu"));
      for (const host of hosts) {
        const top = host.querySelector(":scope > .nav-link[href]");
        if (!top) continue;

        const p = hrefToSitePath(top.getAttribute("href"));
        if (p === prefix || p.startsWith(prefix + "/")) return host;
      }
      return null;
    }

    const hjHost = findHost("/hero-journeys");
    const perspHost = findHost("/perspective");

    function setMenuOpen(host, open) {
      if (!host) return;
      const menu = host.querySelector(":scope > .submenu");
      const top = host.querySelector(":scope > .nav-link");
      if (!menu) return;

      if (open) {
        menu.style.opacity = "1";
        menu.style.visibility = "visible";
        menu.style.pointerEvents = "auto";
        menu.style.transform = "translateY(0)";
        menu.style.transition = "opacity .16s ease, transform .16s ease, visibility 0s";
        top?.setAttribute("aria-expanded", "true");
      } else {
        // Clear inline overrides to restore normal CSS/hover behavior
        menu.style.opacity = "";
        menu.style.visibility = "";
        menu.style.pointerEvents = "";
        menu.style.transform = "";
        menu.style.transition = "";
        top?.setAttribute("aria-expanded", "false");
      }
    }

    function wirePinnedMenu({ enabled, host, closedClass }) {
      if (!enabled || !host) return;

      const top = host.querySelector(":scope > .nav-link");
      const menu = host.querySelector(":scope > .submenu");

      // Pinned-open by default (desktop), but we’ll gate it by breakpoint below.
      document.body.classList.remove(closedClass);
      setMenuOpen(host, true);

      // Close when hovering/focusing any OTHER top-level nav link
      const topLinks = Array.from(nav.querySelectorAll(":scope > .nav-link, :scope > .nav-item > .nav-link"));
      topLinks.forEach(a => {
        if (a === top) return;
        a.addEventListener("mouseenter", () => {
          document.body.classList.add(closedClass);
          setMenuOpen(host, false);
        });
        a.addEventListener("focus", () => {
          document.body.classList.add(closedClass);
          setMenuOpen(host, false);
        });
      });

      // Search also closes pinned menu
      const search = nav.querySelector(":scope > .nav-search");
      if (search) {
        search.addEventListener("mouseenter", () => {
          document.body.classList.add(closedClass);
          setMenuOpen(host, false);
        });
        search.addEventListener("focusin", () => {
          document.body.classList.add(closedClass);
          setMenuOpen(host, false);
        });
      }

      // Re-open when hovering the pinned item or submenu
      host.addEventListener("mouseenter", () => {
        document.body.classList.remove(closedClass);
        setMenuOpen(host, true);
      });
      top?.addEventListener("mouseenter", () => {
        document.body.classList.remove(closedClass);
        setMenuOpen(host, true);
      });
      menu?.addEventListener("mouseenter", () => {
        document.body.classList.remove(closedClass);
        setMenuOpen(host, true);
      });

      // Leaving the whole navbar restores pinned-open (desktop), but breakpoint-gated
      nav.addEventListener("mouseleave", () => {
        document.body.classList.remove(closedClass);
        setMenuOpen(host, true);
      });

      // -------------------------------------------------------------------
      // Option A: Pin only on widescreen; auto-unpin when below breakpoint
      // -------------------------------------------------------------------
      // Set this to match where your nav stops behaving like a full desktop bar.
      const PIN_MIN_WIDTH = 1100;
      const mq = window.matchMedia(`(min-width: ${PIN_MIN_WIDTH}px)`);

      function applyPinnedForViewport() {
        if (mq.matches) {
          // Desktop: restore pinned-open UX
          document.body.classList.remove(closedClass);
          setMenuOpen(host, true);
        } else {
          // Small screens: relinquish control back to CSS (critical: clears inline styles)
          document.body.classList.add(closedClass);
          setMenuOpen(host, false);
        }
      }

      // Run once immediately
      applyPinnedForViewport();

      // React when breakpoint crosses
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", applyPinnedForViewport);
      } else {
        // Safari fallback
        mq.addListener(applyPinnedForViewport);
      }

      // Guard against font/scrollbar/zoom/layout shifts that don’t always fire MQ change cleanly
      let _pinResizeT = 0;
      window.addEventListener("resize", () => {
        clearTimeout(_pinResizeT);
        _pinResizeT = setTimeout(applyPinnedForViewport, 80);
      }, { passive: true });
    }

    wirePinnedMenu({ enabled: inHJ, host: hjHost, closedClass: "hj-menu-closed" });
    wirePinnedMenu({ enabled: inPerspective, host: perspHost, closedClass: "persp-menu-closed" });
  }
})();
