/* ==========================================================================
   perspective-nav.js — Topic Nav Widget (Perspective lenses)
   - Reads /Mythogin/data/perspective.json (fallback: /data/perspective.json)
   - Drives breadcrumb + prev/next pager INSIDE [data-topic-nav="perspective"]
   - Compatible with your JSON structure:

     {
       "philosophy": { name, intro, pillars:[{title,slug,url}, ...] },
       "Economics":  { name, intro, pillars:[{title,slug,url, chapters?}, ...] }
     }

   - Requires on each child page:
       data-topic-nav="perspective"
       data-topic-section="<section_key>"   (e.g., philosophy | Economics)
       data-topic-slug="<pillar_slug>"      (e.g., meaning | storytelling-machine)
     Optional (only for chapter anchors like Netflix/HBO inside Industry Machine):
       data-topic-chapter="<chapter_slug>"  (e.g., netflix)

   Notes:
   - Prev/Next loops within the selected section's flattened list.
   - "Industry Machine" chapters are flattened as separate nav items,
     but keep the pillar title as a prefix (e.g., "Industry Machine — Netflix").
   ========================================================================== */

(function () {
  "use strict";

  const SITE_ROOT = "/Mythogin/";

  const CANDIDATE_JSON = [
    SITE_ROOT + "data/perspective.json",
    "/data/perspective.json"
  ];

  // Where section crumb should link. (You can change these if you add section hubs.)
  function sectionHref(sectionKey) {
    const key = String(sectionKey || "");
    const lower = key.toLowerCase();
    if (lower === "philosophy") return SITE_ROOT + "perspective/philosophy/index.html";
    if (lower === "economics") return SITE_ROOT + "perspective/economics/index.html";
    // fallback
    return SITE_ROOT + "perspective/index.html";
  }

  function normPath(u) {
    try {
      const abs = new URL(u, window.location.origin);
      let p = abs.pathname;
      if (p.length > 1) p = p.replace(/\/+$/, "");
      return p.toLowerCase();
    } catch (e) {
      return "";
    }
  }

  async function fetchFirstJson(urls) {
    let lastErr = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return await res.json();
      } catch (err) {
        lastErr = { url, err };
      }
    }
    throw lastErr?.err || new Error("Failed to load perspective.json");
  }

  function setText(el, txt) {
    if (!el) return;
    el.textContent = txt;
  }

  function setLink(a, href, label) {
    if (!a) return;
    a.href = href || "#";
    if (label) a.setAttribute("aria-label", label);
  }

  function hide(el) {
    if (!el) return;
    el.setAttribute("aria-hidden", "true");
    el.style.display = "none";
  }

  function show(el) {
    if (!el) return;
    el.removeAttribute("aria-hidden");
    el.style.display = "";
  }

  // Flatten a section into an ordered list for paging:
  // - Each pillar is one item
  // - If pillar has chapters[], each chapter becomes its own item (after the pillar),
  //   labeled "Pillar Title — Chapter Title"
  function flattenSection(sectionObj) {
    const pillars = Array.isArray(sectionObj?.pillars) ? sectionObj.pillars : [];
    const out = [];

    for (const p of pillars) {
      if (!p) continue;

      // Base pillar item
      out.push({
        kind: "pillar",
        title: p.title || "",
        slug: p.slug || "",
        url: p.url || "",
        kicker: p.kicker || "",
        parentSlug: null,
        parentTitle: null
      });

      // Chapter items (if any)
      const chapters = Array.isArray(p.chapters) ? p.chapters : [];
      for (const c of chapters) {
        if (!c) continue;
        const parentTitle = p.title || "Industry Machine";
        out.push({
          kind: "chapter",
          title: `${parentTitle} — ${c.title || ""}`.trim(),
          slug: c.slug || "",
          url: c.url || "",
          kicker: p.kicker || "",
          parentSlug: p.slug || "",
          parentTitle
        });
      }
    }

    return out;
  }

  function findIndex(items, pillarSlug, chapterSlug, currentPath) {
    const pSlug = (pillarSlug || "").toLowerCase();
    const cSlug = (chapterSlug || "").toLowerCase();

    // 0) if chapterSlug provided, prefer matching a chapter item by slug
    if (cSlug) {
      const i = items.findIndex(it => it.kind === "chapter" && (it.slug || "").toLowerCase() === cSlug);
      if (i !== -1) return i;

      // fallback: URL contains #chapter
      const i2 = items.findIndex(it => it.kind === "chapter" && (it.url || "").toLowerCase().includes(`#${cSlug}`));
      if (i2 !== -1) return i2;
    }

    // 1) pillar slug exact match
    if (pSlug) {
      const i = items.findIndex(it => it.kind === "pillar" && (it.slug || "").toLowerCase() === pSlug);
      if (i !== -1) return i;
    }

    // 2) URL normalized match (works when slug attributes are missing)
    if (currentPath) {
      const i = items.findIndex(it => normPath(it.url || "") === currentPath);
      if (i !== -1) return i;
    }

    // 3) URL contains /slug (last resort)
    if (pSlug) {
      const i = items.findIndex(it => (it.url || "").toLowerCase().includes(`/${pSlug}`));
      if (i !== -1) return i;
    }

    return -1;
  }

  function resolvePrevNext(items, idx) {
    const n = items.length;
    if (!n || idx < 0) return null;

    const prevIndex = (idx - 1 + n) % n;
    const nextIndex = (idx + 1) % n;

    return {
      prev: { ...items[prevIndex], index: prevIndex },
      next: { ...items[nextIndex], index: nextIndex }
    };
  }

  function titleFromDocument() {
    return document.title.replace(/^Mythogin\s+—\s+/i, "").trim() || "Perspective";
  }

  async function init() {
    const widgets = document.querySelectorAll('[data-topic-nav="perspective"]');
    if (!widgets.length) return;

    const data = await fetchFirstJson(CANDIDATE_JSON);

    widgets.forEach(widget => {
      const sectionKey = widget.getAttribute("data-topic-section") || "";
      const pillarSlug = widget.getAttribute("data-topic-slug") || "";
      const chapterSlug = widget.getAttribute("data-topic-chapter") || "";

      const sectionObj = data?.[sectionKey];
      const sectionName = sectionObj?.name || sectionKey || "Perspective";
      const items = flattenSection(sectionObj);

      // Elements (match your existing crumb + pager markup pattern)
      const elCrumbCurrent = widget.querySelector("[data-crumb-current]");
      const elSectionText = widget.querySelector("[data-crumb-section-text]");
      const elSectionLink = widget.querySelector("[data-crumb-section-link]");

      const aPrev = widget.querySelector("[data-pager-prev]");
      const aNext = widget.querySelector("[data-pager-next]");
      const tPrev = widget.querySelector("[data-prev-title]");
      const tNext = widget.querySelector("[data-next-title]");

      // If section missing, fail gracefully
      if (!sectionObj || !items.length) {
        setText(elSectionText, "Perspective");
        setLink(elSectionLink, SITE_ROOT + "perspective/index.html", "Perspective");
        setText(elCrumbCurrent, titleFromDocument());
        hide(aPrev);
        hide(aNext);
        return;
      }

      // Section crumb
      setText(elSectionText, sectionName);
      setLink(elSectionLink, sectionHref(sectionKey), sectionName);

      // Find current
      const currentPath = normPath(window.location.href);
      const idx = findIndex(items, pillarSlug, chapterSlug, currentPath);
      const currentItem = idx >= 0 ? items[idx] : null;

      // Current crumb title
      setText(elCrumbCurrent, currentItem?.title || titleFromDocument());

      // If we can't find it, don't show pager
      if (idx < 0 || items.length <= 1) {
        hide(aPrev);
        hide(aNext);
        return;
      }

      const pn = resolvePrevNext(items, idx);
      if (!pn) {
        hide(aPrev);
        hide(aNext);
        return;
      }

      // Prev
      setText(tPrev, pn.prev.title || "Previous");
      setLink(aPrev, pn.prev.url || "#", `Previous: ${pn.prev.title || ""}`);
      show(aPrev);

      // Next
      setText(tNext, pn.next.title || "Next");
      setLink(aNext, pn.next.url || "#", `Next: ${pn.next.title || ""}`);
      show(aNext);
    });
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { init().catch(() => {}); });
  } else {
    init().catch(() => {});
  }
})();