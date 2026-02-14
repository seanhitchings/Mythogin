// /mythogin/js/search.js
(function () {
  "use strict";

  // -----------------------------
  // Element lookup
  // -----------------------------
  const elStatus = document.getElementById("searchStatus");
  const elResults = document.getElementById("searchResults");
  const elResultsPanel = document.querySelector(".panel-results");
  const elControls = document.getElementById("searchControls");

  const elQ = document.getElementById("searchQuery");
  const elCat = document.getElementById("filterCategory");
  const elType = document.getElementById("filterType");
  const elSort = document.getElementById("sortBy");
  const elClear = document.getElementById("clearBtn");

  if (
    !elStatus ||
    !elResults ||
    !elResultsPanel ||
    !elControls ||
    !elQ ||
    !elCat ||
    !elType ||
    !elSort ||
    !elClear
  ) {
    console.warn("Search: Missing required DOM elements.");
    return;
  }

  // -----------------------------
  // Base-aware paths
  // -----------------------------
  function getBaseRootPath() {
    try {
      let p = new URL(document.baseURI).pathname || "/";
      p = p.replace(/\/+$/, "");
      return p || "/";
    } catch {
      return "/";
    }
  }

  const BASE_ROOT = getBaseRootPath(); // e.g. "/mythogin"
  function baseJoin(rel) {
    if (!rel) return rel;
    if (/^https?:\/\//i.test(rel)) return rel;
    if (rel.startsWith("/")) return rel;
    const root = BASE_ROOT.endsWith("/") ? BASE_ROOT.slice(0, -1) : BASE_ROOT;
    return root + "/" + rel.replace(/^\.?\//, "");
  }

  // -----------------------------
  // Config
  // -----------------------------
  const RECOMMENDATION_PLACEHOLDER = "images/search/rec.webp";
  const PORTRAIT_RATIO = "2 / 3";
  const LANDSCAPE_RATIO = "16 / 9";

  // -----------------------------
  // State
  // -----------------------------
  let ITEMS = [];
  let HAS_INTERACTED = false;
  let HAS_SCROLLED = false;
  let SHOULD_AUTO_FOCUS_ON_RESULTS = false;

  // -----------------------------
  // Utilities
  // -----------------------------
  const norm = (s) => (s || "").toString().trim().toLowerCase();

  function escapeHtml(str) {
    return (str || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(text, good = false) {
    elStatus.textContent = text;
    elStatus.classList.toggle("is-good", !!good);
  }

  function isTypingInControls() {
    const a = document.activeElement;
    return a && elControls.contains(a);
  }

  function uniqTags(list) {
    const out = [];
    const seen = new Set();
    for (const t of list || []) {
      const raw = (t || "").toString().trim();
      if (!raw) continue;
      const k = norm(raw);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(raw);
    }
    return out;
  }

  function asTags(item) {
    return uniqTags(item?.tags || []);
  }

  // -----------------------------
  // URL → query sync (navbar search)
  // -----------------------------
  function syncQueryFromUrl() {
    try {
      const q = new URLSearchParams(location.search).get("q");
      if (q && q.trim()) {
        elQ.value = q.trim();
        HAS_INTERACTED = true;
        SHOULD_AUTO_FOCUS_ON_RESULTS = true;
        HAS_SCROLLED = false;
      }
    } catch {}
  }

  // -----------------------------
  // Dropdowns
  // -----------------------------
  function clearSelect(selectEl) {
    while (selectEl.options.length > 1) selectEl.remove(1);
  }

  function addOption(selectEl, value, label) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  }

  function prettyCategory(c) {
    return (
      {
        recommendations: "Recommendations",
        essays: "Essays",
        features: "Features",
      }[c] || c || ""
    );
  }

  function prettyType(t) {
    return (
      {
        "film-drama": "Film — Drama",
        "film-comedy": "Film — Comedy",
        "film-sci-fi": "Film — Sci-Fi",
        tv: "TV",
        books: "Books",
        games: "Games",
        documentaries: "Documentaries",
        podcasts: "Podcasts",
        multimedia: "Multimedia",
        film: "Film",
      }[t] || t || ""
    );
  }

  function buildDropdowns(items) {
    clearSelect(elCat);
    clearSelect(elType);

    const cats = new Set();
    const types = new Set();

    for (const it of items) {
      if (!it) continue;
      if (it.category) cats.add(it.category);
      if (it.type) types.add(it.type);
    }

    Array.from(cats).sort().forEach((c) => addOption(elCat, c, prettyCategory(c)));
    Array.from(types).sort().forEach((t) => addOption(elType, t, prettyType(t)));
  }

  // -----------------------------
  // Matching + scoring
  // -----------------------------
  function scoreItem(item, q) {
    if (!q) return 0;
    const qq = norm(q);
    if (norm(item.title) === qq) return 6;
    if (norm(item.title).includes(qq)) return 4;
    if (norm(item.text).includes(qq)) return 2;
    return 0;
  }

  function applyFilters(items) {
    const q = elQ.value.trim();
    const cat = elCat.value;
    const type = elType.value;
    const sortBy = elSort.value;

    let out = [];

    for (const it of items) {
      if (cat && it.category !== cat) continue;
      if (type && it.type !== type) continue;

      const s = scoreItem(it, q);
      if (q && s <= 0) continue;

      out.push({ it, s });
    }

    const byTitle = (a, b) => (a.it.title || "").localeCompare(b.it.title || "");

    if (sortBy === "title_asc") out.sort(byTitle);
    else if (sortBy === "title_desc") out.sort((a, b) => byTitle(b, a));
    else if (sortBy === "year_desc")
      out.sort((a, b) => (b.it.year || 0) - (a.it.year || 0) || byTitle(a, b));
    else if (sortBy === "year_asc")
      out.sort((a, b) => (a.it.year || 0) - (b.it.year || 0) || byTitle(a, b));
    else out.sort((a, b) => b.s - a.s || byTitle(a, b));

    return out.map((x) => x.it);
  }

  // -----------------------------
  // Focus + scroll
  // -----------------------------
  function focusResultsPanelOnce() {
    if (HAS_SCROLLED || isTypingInControls()) return;

    elResultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });

    if (SHOULD_AUTO_FOCUS_ON_RESULTS) {
      elResultsPanel.setAttribute("tabindex", "-1");
      elResultsPanel.focus({ preventScroll: true });
    }

    HAS_SCROLLED = true;
    SHOULD_AUTO_FOCUS_ON_RESULTS = false;
  }

  // -----------------------------
  // Image helpers
  // -----------------------------
  function pickImageUrl(it) {
    if (it.image_url) return baseJoin(it.image_url);
    if (it.category === "recommendations") return baseJoin(RECOMMENDATION_PLACEHOLDER);
    return "";
  }

  function isLandscape(it) {
    return it.category === "features" || it.type === "multimedia";
  }

  // -----------------------------
  // Render
  // -----------------------------
  function render(items) {
    const hasInput = elQ.value.trim() || elCat.value || elType.value;

    if (!HAS_INTERACTED && !hasInput) {
      elResults.innerHTML = "";
      setStatus("Enter a search or choose a filter.");
      return;
    }

    if (!items.length) {
      elResults.innerHTML = `<div class="results-empty muted">No matches.</div>`;
      setStatus("No matches.");
      return;
    }

    elResults.innerHTML = items
      .map((it) => {
        const img = pickImageUrl(it);
        const ratio = isLandscape(it) ? LANDSCAPE_RATIO : PORTRAIT_RATIO;

        const skip = new Set([
          norm(it.category),
          norm(it.type),
          norm(prettyCategory(it.category)),
          norm(prettyType(it.type)),
        ]);

        const tagBadges = uniqTags(asTags(it))
          .filter((t) => !skip.has(norm(t)))
          .slice(0, 6)
          .map((t) => `<span class="badge">${escapeHtml(t)}</span>`)
          .join("");

        return `
          <article class="result-card">
            <a class="result-media" href="${baseJoin(it.url)}">
              <div class="result-img" style="aspect-ratio:${ratio}">
                ${
                  img
                    ? `<img src="${img}" loading="lazy" decoding="async" />`
                    : ""
                }
              </div>
            </a>

            <div class="result-body">
              <div class="result-top">
                <a class="result-title" href="${baseJoin(it.url)}">
                  ${escapeHtml(it.title)}
                </a>
                ${it.year ? `<span class="result-year">${it.year}</span>` : ""}
              </div>

                <div class="badges">
                  <span class="badge">${prettyCategory(it.category)}</span>
                  <span class="badge">${prettyType(it.type)}</span>
                  ${tagBadges}
                </div>

                ${
                  it.text
                    ? `<p class="result-text">
                        ${escapeHtml(it.text)}
                      </p>`
                    : ""
                }
            </div>
          </article>
        `;
      })
      .join("");

    setStatus(`${items.length} result${items.length === 1 ? "" : "s"}`, true);
    focusResultsPanelOnce();
  }

  function update() {
    HAS_INTERACTED = true;
    render(applyFilters(ITEMS));
  }

  function clearAll() {
    elQ.value = "";
    elCat.value = "";
    elType.value = "";
    elSort.value = "relevance";
    HAS_INTERACTED = false;
    HAS_SCROLLED = false;
    render([]);
  }

  // -----------------------------
  // Init
  // -----------------------------
  async function loadIndex() {
    setStatus("Loading index…");
    const res = await fetch(baseJoin("data/search-index.json"), { cache: "no-store" });
    const data = await res.json();
    ITEMS = Array.isArray(data.items) ? data.items : [];
    buildDropdowns(ITEMS);
    syncQueryFromUrl();
    if (elQ.value.trim()) update();
    else render([]);
  }

  elQ.addEventListener("input", update);
  elCat.addEventListener("change", update);
  elType.addEventListener("change", update);
  elSort.addEventListener("change", update);
  elClear.addEventListener("click", clearAll);

  loadIndex().catch(() => setStatus("Failed to load index."));
})();
