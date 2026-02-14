/* ==========================================================================
   Mythogin — Hub Loader (search-index compatible)
   - Supports essays + features
   - Essays: grid key matches item.type
   - Features: grid key matches item.series

   Expects: { items:[...] } where items may include:
     category, type, series, series_name, title, url, image_url,
     question, desc, comments, text

   Root options (on [data-hub]):
     data-hub-jsons="data/search-index.json"
     data-hub-category="essays" | "features" (default: "essays")
     data-hub-audio="on|off" (default: on)
     data-hub-parent-img="images/..." (optional global fallback image)
   ========================================================================== */

(function () {
  "use strict";

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getCandidateUrls(root) {
    const fromAttr =
      root.getAttribute("data-hub-jsons") ||
      root.getAttribute("data-hub-json") ||
      "";

    const list = fromAttr
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    return list.length ? list : ["data/search-index.json"];
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
    throw lastErr?.err || new Error("Failed to load JSON");
  }

  function cleanTextFallback(raw, titleRaw) {
    const t = String(raw || "").trim();
    if (!t) return "";

    const m = t.match(/^([^:]{1,120}):\s*(.+)$/);
    if (m) {
      const left = m[1].trim().toLowerCase();
      const title = String(titleRaw || "").trim().toLowerCase();
      if (title && left === title) return m[2].trim();
      if (left.length > 0 && left.length <= 80) return m[2].trim();
    }
    return t;
  }

  function renderCopy(item) {
    const q = (typeof item?.question === "string") ? item.question.trim() : "";
    const d = (typeof item?.desc === "string") ? item.desc.trim() : "";
    const c = (typeof item?.comments === "string") ? item.comments.trim() : "";
    const t = (typeof item?.text === "string") ? item.text.trim() : "";

    if (q) return `<p class="card-question">${escapeHtml(q)}</p>`;
    if (d) return `<p class="card-desc">${escapeHtml(d)}</p>`;
    if (c) return `<p class="card-desc">${escapeHtml(c)}</p>`;

    const cleaned = cleanTextFallback(t, item?.title);
    if (cleaned) return `<p class="card-desc">${escapeHtml(cleaned)}</p>`;
    return "";
  }

  function pickImage(item, root) {
    const explicit = (typeof item?.image_url === "string") ? item.image_url.trim() : "";
    if (explicit) return explicit;

    const parentImg = (root.getAttribute("data-hub-parent-img") || "").trim();
    if (parentImg) return parentImg;

    return "images/topics/features.webp";
  }

  function deriveAudioUrl(item) {
    const url = (typeof item?.url === "string") ? item.url.trim() : "";
    if (!url) return "";
    if (url.endsWith("/index.html")) return url.replace(/\/index\.html$/i, "/audio.mp3");
    if (url.endsWith("/")) return url + "audio.mp3";
    return "";
  }

  function renderAudioChip(item, root, titleText) {
    const audioOn = (root.getAttribute("data-hub-audio") || "").toLowerCase() !== "off";
    if (!audioOn) return "";

    const audioHref = deriveAudioUrl(item);
    if (!audioHref) return "";

    const a = escapeHtml(audioHref);
    const title = escapeHtml(titleText || "Audio");

    return `
      <div class="audio-chip" aria-label="Audio options">
        <span class="audio-chip-label">🎧 Audio</span>
        <div class="audio-chip-actions">
          <a class="audio-chip-btn" href="${a}" aria-label="Listen to ${title}">Listen</a>
          <a class="audio-chip-btn" href="${a}" download aria-label="Download audio for ${title}">Download</a>
        </div>
      </div>
    `;
  }

  function renderCard(item, root) {
    const titleRaw = item?.title ?? "";
    const urlRaw = item?.url ?? "#";

    const title = escapeHtml(titleRaw);
    const url = escapeHtml(urlRaw);
    const imgSrc = escapeHtml(pickImage(item, root));

    return `
      <article class="section-card card--portrait card--stack card--contain">
        <div class="card-media" aria-hidden="true">
          <img src="${imgSrc}" alt="" loading="lazy" decoding="async">
        </div>

        <div class="card-body">
          <h3 class="card-title">
            <a href="${url}" style="color:inherit; text-decoration:none;">
              ${title}
            </a>
          </h3>

          ${renderCopy(item)}

          <div class="card-actions" style="justify-content:center">
            <a class="btn primary" href="${url}">Explore</a>
          </div>

          ${renderAudioChip(item, root, titleRaw)}
        </div>
      </article>
    `;
  }

  function resolveKeyFromGrid(gridEl) {
    const direct = (gridEl.getAttribute("data-hub-cat-grid") || "").trim();
    if (direct) return direct;

    const section = gridEl.closest("[data-hub-cat]");
    const fromSection = (section?.getAttribute("data-hub-cat") || "").trim();
    if (fromSection) return fromSection;

    return "";
  }

  function setTitle(sectionEl, key, hubCategory, list) {
    const h2 =
      sectionEl.querySelector("[data-hub-cat-title]") ||
      document.querySelector(`[data-hub-cat-title="${CSS.escape(key)}"]`);

    if (!h2) return;

    if (hubCategory === "features") {
      const first = list && list[0];
      const seriesName = (typeof first?.series_name === "string") ? first.series_name.trim() : "";
      h2.textContent = seriesName || key;
      return;
    }

    // essays fallback
    const pretty = {
      books: "Books",
      film: "Film",
      tv: "TV",
      games: "Games",
      podcasts: "Podcasts",
      documentaries: "Documentaries"
    };
    h2.textContent = pretty[key] || key;
  }

  async function initHubLoader() {
    const root = document.querySelector("[data-hub]");
    if (!root) return;

    let data;
    try {
      data = await fetchFirstJson(getCandidateUrls(root));
    } catch (err) {
      console.warn("Hub loader failed:", err);
      return;
    }

    const items = Array.isArray(data?.items) ? data.items : null;
    if (!items) {
      console.warn("Hub loader: expected { items:[...] } but got:", data);
      return;
    }

    const hubCategory = (root.getAttribute("data-hub-category") || "essays").toLowerCase();

    const grids = Array.from(document.querySelectorAll("[data-hub-cat-grid]"));
    if (!grids.length) return;

    grids.forEach((gridEl) => {
      const key = String(resolveKeyFromGrid(gridEl) || "").toLowerCase();
      if (!key) return;

      let list = [];

      if (hubCategory === "features") {
        list = items.filter(it =>
          String(it?.category || "").toLowerCase() === "features" &&
          String(it?.series || "").toLowerCase() === key
        );
      } else {
        // essays (legacy behavior)
        list = items.filter(it =>
          String(it?.category || "").toLowerCase() === "essays" &&
          String(it?.type || "").toLowerCase() === key
        );
      }

      if (!list.length) return;

      const sectionEl = gridEl.closest("section") || document;
      setTitle(sectionEl, key, hubCategory, list);

      gridEl.innerHTML = list.map(it => renderCard(it, root)).join("");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHubLoader);
  } else {
    initHubLoader();
  }
})();
1