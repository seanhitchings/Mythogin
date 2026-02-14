(function(){
  // Mythogin Topic Nav (ESSAYS.JSON + legacy-safe)
  // Canonical source for essays: data/essays.json
  // Legacy fallback: data/nav-index.json

  const CANDIDATE_ESSAYS_JSON = ["data/essays.json"];
  const CANDIDATE_NAV_INDEX_JSON = ["data/nav-index.json"];
  const CANDIDATE_PERSPECTIVE_JSON = ["data/perspective.json"];

  const SECTION_LABELS = {
    books: "Books",
    film: "Film",
    tv: "TV",
    games: "Games",
    documentaries: "Documentaries",
    podcasts: "Podcasts",
    philosophy: "Philosophy",
    industry: "Industry"
  };

  function setText(el, txt){ if (el) el.textContent = txt; }
  function setHref(el, href){ if (el) el.setAttribute("href", href); }
  function hide(el){ if (el) el.style.display = "none"; }
  function show(el){ if (el) el.style.display = ""; }

  async function fetchFirstJson(urls){
    let lastErr = null;
    for (const url of urls){
      try{
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return await res.json();
      }catch(err){
        lastErr = { url, err };
      }
    }
    throw lastErr;
  }

  function normPathnameFromUrl(u){
    try{
      const abs = new URL(u, window.location.origin);
      let p = abs.pathname.toLowerCase();
      p = p.replace(/\/index\.html$/i, "");
      p = p.replace(/\/+$/, "");
      return p;
    }catch(e){
      return "";
    }
  }

  function hrefToPath(rawHref){
    try{
      return normPathnameFromUrl(new URL(rawHref, document.baseURI).href);
    }catch(e){
      return "";
    }
  }

  function findIndexBySlug(items, slug){
    const s = (slug || "").trim().toLowerCase();
    if (!s) return -1;
    return items.findIndex(it => ((it.slug || "").toLowerCase() === s));
  }

  function findIndexByUrl(items){
    const here = normPathnameFromUrl(window.location.href);
    return items.findIndex(it => {
      const u = it && it.url ? hrefToPath(it.url) : "";
      return u && u === here;
    });
  }

  function getStoryTypeFromBody(){
    const m = document.body && document.body.className
      ? document.body.className.match(/\bstory--([a-z0-9-]+)\b/i)
      : null;
    return (m && m[1]) ? m[1].toLowerCase() : "";
  }

  // IMPORTANT: keep hrefs base-relative, but ALSO normalize legacy "herojourneys/" -> "hero-journeys/"
  function normalizeHref(raw){
    let s = (raw || "").trim();
    if (!s) return "#";

    // Fix common legacy path, without touching other parts
    // (also handles "/herojourneys/..." and "herojourneys/...")
    s = s.replace(/^\/?herojourneys\//i, "hero-journeys/");

    return s;
  }

  function buildSectionFromPerspectiveJson(persp, sectionKey){
    const sec = persp && persp[sectionKey];
    if (!sec || !Array.isArray(sec.stories) || sec.stories.length === 0) return null;

    const browse_url = `perspective/${sectionKey}/index.html`;

    const items = sec.stories
      .map(s => ({
        name: (s && (s.title || s.name)) ? String(s.title || s.name) : "",
        slug: s && s.slug ? String(s.slug) : "",
        url: s && s.url ? String(s.url) : ""
      }))
      .filter(it => it.slug && it.url);

    if (!items.length) return null;

    return {
      name: sec.name || SECTION_LABELS[sectionKey] || sectionKey,
      browse_url,
      items
    };
  }

  function buildSectionFromEssaysJson(essaysJson, sectionKey){
    const arr = essaysJson && Array.isArray(essaysJson.items) ? essaysJson.items : [];
    if (!arr.length) return null;

    const items = arr
      .filter(r =>
        String(r.category || "").toLowerCase() === "essays" &&
        String(r.type || "").toLowerCase() === String(sectionKey || "").toLowerCase() &&
        r.url && r.slug
      )
      // deterministic ordering for prev/next
      .slice()
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" }))
      .map(r => ({
        name: String(r.title || r.name || "—"),
        slug: String(r.slug || ""),
        url: normalizeHref(String(r.url || "")) // normalize on ingest
      }));

    if (!items.length) return null;

    return {
      name: SECTION_LABELS[sectionKey] || sectionKey,
      browse_url: `hero-journeys/${sectionKey}/index.html`,
      items
    };
  }

  async function init(){
    const typeFromBody = getStoryTypeFromBody();

    const selector =
      (typeFromBody && typeFromBody !== "perspective")
        ? `.topic-nav-surface--story[data-topic-nav="${typeFromBody}"][data-topic-slug]`
        : `.topic-nav-surface--story[data-topic-nav][data-topic-slug]`;

    const widget = document.querySelector(selector);
    if (!widget) return;

    const sectionKey = (widget.getAttribute("data-topic-nav") || "").trim().toLowerCase();
    const slug = (widget.getAttribute("data-topic-slug") || "").trim().toLowerCase();

    const crumbSectionText = widget.querySelector("[data-crumb-section-text]");
    const crumbSectionLink = widget.querySelector("[data-crumb-section-link]");
    const crumbCurrent = widget.querySelector("[data-crumb-current]");

    const backEl = widget.querySelector("[data-pager-back]");
    const prevEl = widget.querySelector("[data-pager-prev]");
    const nextEl = widget.querySelector("[data-pager-next]");
    const prevTitle = widget.querySelector("[data-prev-title]");
    const nextTitle = widget.querySelector("[data-next-title]");

    setText(crumbSectionText, SECTION_LABELS[sectionKey] || sectionKey || "—");
    setText(crumbCurrent, "Loading…");

    try{
      let section = null;

      // Perspective special case
      if (sectionKey === "philosophy" || sectionKey === "industry"){
        try{
          const persp = await fetchFirstJson(CANDIDATE_PERSPECTIVE_JSON);
          section = buildSectionFromPerspectiveJson(persp, sectionKey);
        }catch(e){
          console.warn("[topic-nav] perspective.json load failed; falling back.", e);
        }
      }

      // Canonical: essays.json for story types
      if (!section){
        try{
          const essays = await fetchFirstJson(CANDIDATE_ESSAYS_JSON);
          section = buildSectionFromEssaysJson(essays, sectionKey);
        }catch(e){
          console.warn("[topic-nav] essays.json load failed; falling back to nav-index.", e);
        }
      }

      // Legacy fallback
      if (!section){
        const nav = await fetchFirstJson(CANDIDATE_NAV_INDEX_JSON);
        section = nav ? nav[sectionKey] : null;
        // normalize legacy urls if present
        if (section && Array.isArray(section.items)){
          section.items = section.items.map(it => ({
            ...it,
            url: normalizeHref(it && it.url ? String(it.url) : "")
          }));
          if (section.browse_url) section.browse_url = normalizeHref(String(section.browse_url));
        }
      }

      if (!section || !Array.isArray(section.items) || section.items.length === 0){
        setText(crumbCurrent, "—");
        hide(prevEl); hide(nextEl); hide(backEl);
        return;
      }

      const items = section.items;
      const browseUrl = normalizeHref(section.browse_url || "");

      // Back (optional)
      if (browseUrl && browseUrl !== "#" && backEl){
        setHref(backEl, browseUrl);
        show(backEl);
      }else{
        hide(backEl);
      }

      // Breadcrumb section link
      setHref(crumbSectionLink, browseUrl || "#");

      // Resolve current
      let idx = findIndexBySlug(items, slug);
      if (idx === -1) idx = findIndexByUrl(items);

      if (idx === -1){
        setText(crumbCurrent, "—");
        hide(prevEl); hide(nextEl);
        return;
      }

      const current = items[idx];
      setText(crumbCurrent, current.name || "—");

      // Prev/Next wrap
      const prevIdx = (idx - 1 + items.length) % items.length;
      const nextIdx = (idx + 1) % items.length;

      const p = items[prevIdx];
      const n = items[nextIdx];

      if (p && p.url){
        setHref(prevEl, normalizeHref(p.url));
        setText(prevTitle, p.name || "Previous");
        show(prevEl);
      }else{
        hide(prevEl);
      }

      if (n && n.url){
        setHref(nextEl, normalizeHref(n.url));
        setText(nextTitle, n.name || "Next");
        show(nextEl);
      }else{
        hide(nextEl);
      }

    }catch(e){
      console.error("[topic-nav] Failed to load nav data", e);
      setText(crumbCurrent, "—");
      hide(prevEl); hide(nextEl); hide(backEl);
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
})();
