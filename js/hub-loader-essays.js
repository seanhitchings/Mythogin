// /mythogin/js/hub-loader-essays.js
(function () {
  "use strict";

  // -------------------------------------------------
  // Utilities (older browser friendly)
  // -------------------------------------------------
  function getBaseRootPath() {
    try {
      var p = new URL(document.baseURI).pathname || "/";
      if (p.charAt(p.length - 1) !== "/") p += "/";
      return p;
    } catch (e) {
      return "/";
    }
  }

  var SITE_ROOT = getBaseRootPath(); // e.g. "/mythogin/"

  function escapeHtml(str) {
    var s = String(str == null ? "" : str);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeUrl(u) {
    var s = String(u == null ? "" : u).trim();
    if (!s) return "";
    s = s.replace(/\\/g, "/");
    s = s.replace(/^\/+/, "");
    return s;
  }

  function normalizeImgUrl(img) {
    var s = String(img == null ? "" : img).trim();
    if (!s) return "";
    s = s.replace(/\\/g, "/");
    s = s.replace(/^\/+/, "");
    return s;
  }

  function coerceBool(v) {
    if (v === true) return true;
    if (v === false) return false;
    var s = String(v == null ? "" : v).trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }

  // -------------------------------------------------
  // Canonicalize category/type keys (film -> films)
  // -------------------------------------------------
  function canonicalType(key) {
    var k = String(key || "").trim().toLowerCase();
    if (!k) return "";
    // your rename: film -> films
    if (k === "film") return "films";
    // optional convenience aliases (won't hurt anything)
    if (k === "movie" || k === "movies") return "films";
    return k;
  }

  function cleanTextFallback(raw, titleRaw) {
    var t = String(raw || "").trim();
    if (!t) return "";

    var m = t.match(/^([^:]{1,120}):\s*(.+)$/);
    if (m) {
      var left = String(m[1] || "").trim().toLowerCase();
      var title = String(titleRaw || "").trim().toLowerCase();
      if (title && left === title) return String(m[2] || "").trim();
      if (left.length > 0 && left.length <= 80) return String(m[2] || "").trim();
    }
    return t;
  }

  function renderCopy(item) {
    item = item || {};
    var q = typeof item.question === "string" ? item.question.trim() : "";
    var d = typeof item.desc === "string" ? item.desc.trim() : "";
    var c = typeof item.comments === "string" ? item.comments.trim() : "";
    var t = typeof item.text === "string" ? item.text.trim() : "";

    if (q) return '<p class="card-question">' + escapeHtml(q) + "</p>";
    if (d) return '<p class="card-desc">' + escapeHtml(d) + "</p>";
    if (c) return '<p class="card-desc">' + escapeHtml(c) + "</p>";

    var cleaned = cleanTextFallback(t, item.title);
    if (cleaned) return '<p class="card-desc">' + escapeHtml(cleaned) + "</p>";

    return "";
  }

  function topicThumbFromKey(key) {
    var k = canonicalType(key);
    if (!k) return "";
    return "images/topics/" + k + ".webp";
  }

  function pickImage(item, root, cfg) {
    item = item || {};
    cfg = cfg || {};

    // 1) explicit item.image_url
    var explicit = typeof item.image_url === "string" ? item.image_url.trim() : "";
    if (explicit) return normalizeImgUrl(explicit);

    // 2) main override <main data-hub-parent-img="...">
    var parentImg = String(root.getAttribute("data-hub-parent-img") || "").trim();
    if (parentImg) return normalizeImgUrl(parentImg);

    // 3) fallback to topic thumb by type
    var t = canonicalType(item.type || cfg.type || "");
    if (t) return topicThumbFromKey(t);

    // 4) final fallback
    return "images/topics/essays.webp";
  }

  function safeAudioFromUrl(itemUrl) {
    var u = String(itemUrl || "").trim();
    if (!u) return "";
    if (/index\.html(\?.*)?$/i.test(u)) return u.replace(/index\.html(\?.*)?$/i, "audio.mp3");
    if (u.charAt(u.length - 1) === "/") return u + "audio.mp3";
    return "";
  }

  function renderAudioChip(item, root, titleText) {
    var audioOn = String(root.getAttribute("data-hub-audio") || "").toLowerCase() !== "off";
    if (!audioOn) return "";

    var url = String(item && item.url ? item.url : "").trim();
    var audioHref = safeAudioFromUrl(url);
    if (!audioHref) return "";

    var a = escapeHtml(normalizeUrl(audioHref));
    var title = escapeHtml(titleText || "Audio");

    return (
      '\n      <div class="audio-chip" aria-label="Audio options">\n' +
      '        <span class="audio-chip-label">🎧 Audio</span>\n' +
      '        <div class="audio-chip-actions">\n' +
      '          <a class="audio-chip-btn" href="' + a + '" aria-label="Listen to ' + title + '">Listen</a>\n' +
      '          <a class="audio-chip-btn" href="' + a + '" download aria-label="Download audio for ' + title + '">Download</a>\n' +
      "        </div>\n" +
      "      </div>\n"
    );
  }

  function renderCard(item, root, cfg) {
    item = item || {};
    cfg = cfg || {};

    var titleRaw = item.title != null ? item.title : "";
    var urlRaw = item.url != null ? item.url : "#";

    var title = escapeHtml(titleRaw);
    var url = escapeHtml(normalizeUrl(urlRaw));
    var imgSrc = escapeHtml(pickImage(item, root, cfg));

    return (
      '\n    <article class="section-card card--portrait card--stack card--contain">\n' +
      '      <div class="card-media" aria-hidden="true">\n' +
      '        <img src="' + imgSrc + '" alt="" loading="lazy" decoding="async">\n' +
      "      </div>\n\n" +
      '      <div class="card-body">\n' +
      '        <h3 class="card-title">\n' +
      '          <a href="' + url + '" style="color:inherit; text-decoration:none;">' + title + "</a>\n" +
      "        </h3>\n\n" +
      "        " + renderCopy(item) + "\n\n" +
      '        <div class="card-actions" style="justify-content:center">\n' +
      '          <a class="btn primary" href="' + url + '">Explore</a>\n' +
      "        </div>\n\n" +
      "        " + renderAudioChip(item, root, titleRaw) + "\n" +
      "      </div>\n" +
      "    </article>\n"
    );
  }

  function resolveKeyFromGrid(gridEl) {
    var direct = String(gridEl.getAttribute("data-hub-cat-grid") || "").trim();
    if (direct) return direct;

    var section = gridEl.closest ? gridEl.closest("[data-hub-cat]") : null;
    var fromSection = section ? String(section.getAttribute("data-hub-cat") || "").trim() : "";
    if (fromSection) return fromSection;

    return "";
  }

  function setTitle(sectionEl, key) {
    if (!sectionEl) return;

    var h2 = sectionEl.querySelector ? sectionEl.querySelector("[data-hub-cat-title]") : null;
    if (!h2) return;

    var pretty = {
      books: "Books",
      films: "Films",
      // keep legacy mapping harmless if anything still says "film"
      film: "Films",
      tv: "TV",
      games: "Games",
      podcasts: "Podcasts",
      documentaries: "Documentaries"
    };

    var k = canonicalType(key);
    h2.textContent = pretty[k] || pretty[key] || k || key;
  }

  function extractEssayList(data) {
    if (!data) return [];
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.essays)) return data.essays;
    if (Array.isArray(data)) return data;
    return [];
  }

  function readCfg(root, gridEl) {
    // Optional behavior knobs (defaults are safe)
    // data-hub-only-highlighted="on" -> only render highlighted:true
    // data-hub-limit="12" -> cap per grid
    var dsRoot = root && root.dataset ? root.dataset : {};
    var dsGrid = gridEl && gridEl.dataset ? gridEl.dataset : {};

    var onlyHighlighted =
      String(dsGrid.hubOnlyHighlighted || dsRoot.hubOnlyHighlighted || "").toLowerCase() === "on";

    var limitRaw = String(dsGrid.hubLimit || dsRoot.hubLimit || "");
    var limit = parseInt(limitRaw, 10);
    if (!(limit > 0)) limit = 0; // 0 means "no cap"

    return { onlyHighlighted: onlyHighlighted, limit: limit };
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load: " + url);
        return res.json();
      });
  }

  function initHubLoaderEssays() {
    var root = document.querySelector("main[data-hub]") || document.querySelector("[data-hub]");
    if (!root) return;

    // default input = essays.json; allow override
    var urlAttr = String(root.getAttribute("data-hub-json") || root.getAttribute("data-hub-jsons") || "").trim();
    var inputUrl = urlAttr ? normalizeUrl(urlAttr.split(",")[0]) : "data/essays.json";

    var grids = Array.prototype.slice.call(document.querySelectorAll("[data-hub-cat-grid]"));
    if (!grids.length) return;

    fetchJson(SITE_ROOT + inputUrl)
      .then(function (data) {
        var items = extractEssayList(data);
        if (!items || !items.length) return;

        grids.forEach(function (gridEl) {
          var rawKey = resolveKeyFromGrid(gridEl);
          var key = canonicalType(rawKey);
          if (!key) return;

          var cfg = readCfg(root, gridEl);

          // Essays grid key matches item.type (with canonical aliasing)
          var list = items.filter(function (it) {
            var t = canonicalType((it && it.type) || "");
            if (t !== key) return false;
            if (cfg.onlyHighlighted) return coerceBool(it && it.highlighted);
            return true;
          });

          if (!list.length) return;

          if (cfg.limit > 0) list = list.slice(0, cfg.limit);

          var sectionEl = gridEl.closest ? (gridEl.closest("section") || document) : document;
          setTitle(sectionEl, key);

          var cfgForCard = { type: key };
          gridEl.innerHTML = list.map(function (it) { return renderCard(it, root, cfgForCard); }).join("");
        });
      })
      .catch(function (err) {
        console.warn("Hub loader (essays) failed:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHubLoaderEssays);
  } else {
    initHubLoaderEssays();
  }
})();