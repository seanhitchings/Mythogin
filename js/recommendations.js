// /mythogin/js/recommendations.js
(function () {
  "use strict";

  // ------------------------------------------------------------
  // Base-aware root (works with /mythogin/ vs /Mythogin/ vs /)
  // ------------------------------------------------------------
  function getBaseRootPath() {
    try {
      let p = new URL(document.baseURI).pathname || "/";
      if (!p.endsWith("/")) p += "/";
      return p;
    } catch {
      return "/";
    }
  }

  const BASE = getBaseRootPath(); // e.g. "/mythogin/"
  const SEARCH_INDEX_URL = BASE + "data/search-index.json";

  // ------------------------------------------------------------
  // Media + rules
  // ------------------------------------------------------------
  const MEDIA = ["books", "tv", "film", "games", "podcasts", "documentaries"];

  // Media where genre buckets are NOT applicable (single list)
  const NO_GENRE_MEDIA = new Set(["games", "podcasts", "documentaries"]);

  const GENRES = [
    { key: "comedy", label: "Comedy" },
    { key: "drama", label: "Drama" },
    { key: "scifi", label: "Sci-Fi" },
    { key: "nonfiction", label: "Non-Fiction" }
  ];

  // Used only for legacy anchor IDs and by-genre sections.
  // (For NO_GENRE_MEDIA we keep these as invisible anchors so old links won’t break.)
  const SECTION_ID = {
    books: { comedy: "books-comedy-list", drama: "books-drama-list", scifi: "books-scifi-list", nonfiction: "books-nonfiction-list" },
    tv: { comedy: "tv-comedy-list", drama: "tv-drama-list", scifi: "tv-scifi-list", nonfiction: "tv-nonfiction-list" },
    film: { comedy: "film-comedy-list", drama: "film-drama-list", scifi: "film-scifi-list", nonfiction: "film-nonfiction-list" },
    games: { comedy: "games-comedy-list", drama: "games-drama-list", scifi: "games-scifi-list", nonfiction: "games-nonfiction-list" },
    podcasts: { comedy: "podcasts-comedy-list", drama: "podcasts-drama-list", scifi: "podcasts-scifi-list", nonfiction: "podcasts-nonfiction-list" },
    documentaries: {
      comedy: "documentaries-comedy-list",
      drama: "documentaries-drama-list",
      scifi: "documentaries-scifi-list",
      nonfiction: "documentaries-nonfiction-list"
    }
  };

  const ITEM_PREFIX = {
    books: "bk",
    tv: "tv",
    film: "fm",
    games: "gm",
    podcasts: "pd",
    documentaries: "dc"
  };

  // ------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------
  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }

  function normalizeGenre(raw) {
    const g = norm(raw);
    if (!g || g === "unknown") return "";

    if (g === "comedy") return "comedy";
    if (g === "drama") return "drama";

    if (g === "sci-fi" || g === "sci fi" || g === "scifi" || g === "science fiction" || g === "science-fiction") return "scifi";

    if (g === "non fiction" || g === "non-fiction" || g === "nonfiction") return "nonfiction";

    return "";
  }

  // type might be "tv", "books", "podcasts", "documentaries"
  // OR "film-drama"/"film-sci-fi"/etc
  function extractMedium(type) {
    const t = norm(type);
    if (!t) return "";

    if (MEDIA.includes(t)) return t;

    const dash = t.indexOf("-");
    if (dash > 0) {
      const head = t.slice(0, dash);
      if (MEDIA.includes(head)) return head;
      if (head === "movie" || head === "movies") return "film";
    }

    if (t === "movie" || t === "movies") return "film";
    return "";
  }

  function inferGenreFromType(type) {
    const t = norm(type);
    const dash = t.indexOf("-");
    if (dash <= 0) return "";
    return normalizeGenre(t.slice(dash + 1));
  }

  function inferGenreFromTags(tags) {
    const set = new Set((tags || []).map(norm));
    if (set.has("comedy")) return "comedy";
    if (set.has("drama")) return "drama";
    if (set.has("sci-fi") || set.has("scifi") || set.has("science fiction") || set.has("science-fiction")) return "scifi";
    if (set.has("non fiction") || set.has("non-fiction") || set.has("nonfiction")) return "nonfiction";
    return "";
  }

  function pickGenre(item) {
    const g1 = normalizeGenre(item?.genre);
    if (g1) return g1;

    const g2 = inferGenreFromType(item?.type);
    if (g2) return g2;

    const g3 = inferGenreFromTags(item?.tags);
    if (g3) return g3;

    // Default bucket (used only for genre-media)
    return "drama";
  }

  function slugify(title) {
    return String(title || "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function titleKey(it) {
    return String(it?.title || it?.slug || "").toLowerCase();
  }

  function yearNum(it) {
    const y = Number(it?.year);
    return Number.isFinite(y) ? y : 0;
  }

  function sortByTitleAsc(a, b) {
    return titleKey(a).localeCompare(titleKey(b));
  }

  function sortByTitleDesc(a, b) {
    return titleKey(b).localeCompare(titleKey(a));
  }

  // New → Old (desc). Missing year sinks to bottom.
  function sortByYearDesc(a, b) {
    const ya = yearNum(a);
    const yb = yearNum(b);

    if (ya === 0 && yb === 0) return sortByTitleAsc(a, b);
    if (ya === 0) return 1;
    if (yb === 0) return -1;

    if (yb !== ya) return yb - ya;
    return sortByTitleAsc(a, b);
  }

  // Old → New (asc). Missing year sinks to bottom.
  function sortByYearAsc(a, b) {
    const ya = yearNum(a);
    const yb = yearNum(b);

    if (ya === 0 && yb === 0) return sortByTitleAsc(a, b);
    if (ya === 0) return 1;
    if (yb === 0) return -1;

    if (ya !== yb) return ya - yb;
    return sortByTitleAsc(a, b);
  }

  function getSortMode() {
    const sel = document.querySelector("[data-recs-sort]");
    const v = norm(sel?.value || "title-asc");
    if (v === "title-desc") return "title-desc";
    if (v === "year-desc") return "year-desc";
    if (v === "year-asc") return "year-asc";
    return "title-asc";
  }

  function getSorter(mode) {
    switch (mode) {
      case "title-desc": return sortByTitleDesc;
      case "year-desc": return sortByYearDesc;
      case "year-asc": return sortByYearAsc;
      case "title-asc":
      default: return sortByTitleAsc;
    }
  }

  // IMPORTANT: tolerate top_pick being boolean OR string OR number
  function isTopPick(it) {
    const v = it?.top_pick;
    if (v === true) return true;
    if (v === 1) return true;
    const s = norm(v);
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }

  function buildExternalLink(medium, title, year) {
    const q = encodeURIComponent(title + (year ? ` ${year}` : ""));
    switch (medium) {
      case "books":
        // Wikipedia search
        return {
          href: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(title)}`,
          label: "Wikipedia →"
        };

      case "tv":
      case "film":
      case "documentaries":
        // IMDb search
        return { href: `https://www.imdb.com/find/?q=${q}`, label: "IMDb →" };

      case "games":
        return {
          href: `https://www.google.com/search?q=${encodeURIComponent(title + " game")}`,
          label: "Link →"
        };

      case "podcasts":
        return {
          href: `https://www.google.com/search?q=${encodeURIComponent(title + " podcast")}`,
          label: "Link →"
        };

      default:
        return { href: `https://www.google.com/search?q=${q}`, label: "Link →" };
    }
  }

  function noteLine(it) {
    // Prefer canonical "question", then "comments", then "text"
    const parts = [];
    if (it?.year) parts.push(String(it.year));
    if (it?.question) parts.push(String(it.question).trim());
    else if (it?.comments) parts.push(String(it.comments).trim());
    else if (it?.text) parts.push(String(it.text).trim());
    return parts.join(" — ");
  }

  // ------------------------------------------------------------
  // Hero-Journeys internal linking (NEW)
  // ------------------------------------------------------------
  function isHeroJourneyItem(it) {
    const u = String(it?.url || "").trim();
    if (!u) return false;
    return u.replace(/^\//, "").startsWith("hero-journeys/");
  }

  function buildInternalHref(url) {
    const u = String(url || "").trim().replace(/^\//, "");
    return BASE + u;
  }

  // IMPORTANT: make the Hero-Journey pill anchor ONLY use .recs-item-hj
  // so it won't inherit external-link colors.
  function buildHeroJourneyLink(it) {
    if (!isHeroJourneyItem(it)) return "";
    const href = buildInternalHref(it.url);
    return `<a class="recs-item-hj" href="${escapeHtml(href)}">Hero-Journey →</a>`;
  }

  // ------------------------------------------------------------
  // Fetch + parse
  // ------------------------------------------------------------
  async function loadSearchIndex() {
    const res = await fetch(SEARCH_INDEX_URL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText} (${SEARCH_INDEX_URL})`);
    }
    const data = await res.json();
    if (!data || !Array.isArray(data.items)) {
      throw new Error(`search-index.json missing items[] (${SEARCH_INDEX_URL})`);
    }
    return data;
  }

  function isRecommendationItem(it) {
    // - real rec items: category === "recommendations"
    // - merged essay items: category === "essays" && tags includes "recommendations"
    const cat = norm(it?.category);
    if (cat === "recommendations") return true;
    if (cat === "essays") {
      const tags = (it?.tags || []).map(norm);
      return tags.includes("recommendations");
    }
    return false;
  }

  function getRecommendationItems(data) {
    return data.items.filter(isRecommendationItem);
  }

  function groupByMedium(items) {
    const map = new Map();
    for (const m of MEDIA) map.set(m, []);
    for (const it of items) {
      const medium = extractMedium(it?.type);
      if (medium && map.has(medium)) map.get(medium).push(it);
    }
    return map;
  }

  // ------------------------------------------------------------
  // Render helpers
  // ------------------------------------------------------------
  function renderItem(medium, it) {
    const title = it.title || it.slug || "Untitled";
    const year = it.year;
    const slug = it.slug || slugify(title);
    const id = `${ITEM_PREFIX[medium] || "it"}-${slug}`;

    const ext = buildExternalLink(medium, title, year);
    const hjHtml = buildHeroJourneyLink(it);

    return `
      <article class="recs-item" id="${escapeHtml(id)}">
        <header class="recs-item-head">
          <h4 class="recs-item-title">${escapeHtml(title)}</h4>
        </header>

        <div class="recs-item-links">
          ${hjHtml}
          <a class="recs-item-link" href="${escapeHtml(ext.href)}" target="_blank" rel="noopener">${escapeHtml(ext.label)}</a>
        </div>

        <p class="recs-item-notes">Notes: ${escapeHtml(noteLine(it) || "—")}</p>
      </article>
    `;
  }

  function removeSubindexForMount(mount) {
    const mediumBody = mount.closest(".recs-medium-body");
    if (!mediumBody) return;

    const subindex = mediumBody.querySelector(".recs-subindex");
    if (subindex) subindex.remove();

    // You asked to remove the description container too:
    const desc = mediumBody.querySelector(".recs-sub-index");
    if (desc) desc.remove();
  }

  function legacyAnchorsHtml(medium) {
    const ids = SECTION_ID[medium];
    if (!ids) return "";
    return ["comedy", "drama", "scifi", "nonfiction"]
      .map((g) => `<div id="${escapeHtml(ids[g])}" style="position:relative; top:-12px;"></div>`)
      .join("");
  }

  function renderSingleList(medium, mount, items, sorter) {
    removeSubindexForMount(mount);

    const sorted = [...items].sort(sorter);

    mount.innerHTML = `
      ${legacyAnchorsHtml(medium)}
      <section class="recs-type-group" id="${escapeHtml(medium)}-list" aria-label="${escapeHtml(
        (medium[0].toUpperCase() + medium.slice(1)) + " — All"
      )}">
        <h3 class="recs-type-title">All ${escapeHtml(medium[0].toUpperCase() + medium.slice(1))}</h3>
        ${
          sorted.length
            ? sorted.map((it) => renderItem(medium, it)).join("")
            : `
              <div class="recs-item">
                <p class="recs-item-notes">Notes: No entries yet.</p>
              </div>
            `
        }
      </section>
    `;
  }

  // ------------------------------------------------------------
  // Render full lists into mounts
  // ------------------------------------------------------------
  function renderMedium(medium, items, sorter) {
    const mount = document.querySelector(`[data-recs-mount="${medium}"]`);
    if (!mount) return;

    // Single-list media (no genre buckets)
    if (NO_GENRE_MEDIA.has(medium)) {
      renderSingleList(medium, mount, items, sorter);
      return;
    }

    const byGenre = { comedy: [], drama: [], scifi: [], nonfiction: [] };
    for (const it of items) {
      const g = pickGenre(it);
      if (byGenre[g]) byGenre[g].push(it);
    }

    Object.keys(byGenre).forEach((k) => byGenre[k].sort(sorter));

    let html = "";

    for (const genre of GENRES) {
      const listId = SECTION_ID[medium]?.[genre.key];
      if (!listId) continue;

      const groupItems = byGenre[genre.key] || [];

      html += `
        <section class="recs-type-group" id="${escapeHtml(listId)}" aria-label="${escapeHtml(
          (medium === "tv" ? "TV" : medium[0].toUpperCase() + medium.slice(1)) + " — " + genre.label
        )}">
          <h3 class="recs-type-title">${escapeHtml(genre.label)}</h3>

          ${
            groupItems.length
              ? groupItems.map((it) => renderItem(medium, it)).join("")
              : `
                <div class="recs-item">
                  <p class="recs-item-notes">Notes: No entries yet.</p>
                </div>
              `
          }
        </section>
      `;
    }

    mount.innerHTML = html;
  }

  // ------------------------------------------------------------
  // Top Picks (Summary Chart)
  // - Keep title sort (stable + predictable)
  // ------------------------------------------------------------
  function renderTopPicks(byMedium) {
    const tops = document.querySelectorAll("[data-top-mount][data-top-genre]");
    if (!tops.length) return;

    tops.forEach((el) => {
      const medium = norm(el.getAttribute("data-top-mount"));
      const genreKey = norm(el.getAttribute("data-top-genre"));

      const list = byMedium.get(medium) || [];

      const picked = list
        .filter((it) => it && isTopPick(it))
        .filter((it) => (NO_GENRE_MEDIA.has(medium) ? true : pickGenre(it) === genreKey))
        .sort(sortByTitleAsc)
        .slice(0, 6);

      el.innerHTML = picked.length
        ? `<ul class="recs-list">
            ${picked
              .map((it) => {
                const title = it.title || it.slug || "Untitled";
                const slug = it.slug || slugify(title);
                const id = `${ITEM_PREFIX[medium] || "it"}-${slug}`;
                return `<li><a href="#${escapeHtml(id)}">${escapeHtml(title)}</a></li>`;
              })
              .join("")}
          </ul>`
        : `<ul class="recs-list"><li><span style="opacity:.7">No picks yet</span></li></ul>`;
    });
  }

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  async function main() {
    try {
      const data = await loadSearchIndex();
      const recs = getRecommendationItems(data);
      const byMedium = groupByMedium(recs);

      function renderAll() {
        const mode = getSortMode();
        const sorter = getSorter(mode);

        for (const medium of MEDIA) {
          renderMedium(medium, byMedium.get(medium) || [], sorter);
        }

        // top picks unaffected by catalogue sort
        renderTopPicks(byMedium);
      }

      // initial render
      renderAll();

      // wire up sort control (if present)
      const sel = document.querySelector("[data-recs-sort]");
      if (sel) {
        sel.addEventListener("change", () => {
          renderAll();
        });
      }
    } catch (e) {
      console.error(e);

      document.querySelectorAll("[data-recs-mount]").forEach((el) => {
        el.innerHTML = `
          <section class="recs-type-group" aria-label="Load error">
            <h3 class="recs-type-title">Load error</h3>
            <div class="recs-item">
              <p class="recs-item-notes">Notes: ${escapeHtml(e?.message || String(e))}</p>
            </div>
          </section>
        `;
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();
})();
