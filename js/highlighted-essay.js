// /mythogin/js/highlighted-essay.js
(function () {
  "use strict";

  // ---------------------------------------------
  // Base / utilities (max browser support)
  // ---------------------------------------------
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
    // no ?? / replaceAll
    var s = String(str == null ? "" : str);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function dayIndex(length) {
    var now = new Date();
    var dayKey = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var dayNumber = Math.floor(dayKey / 86400000);
    return ((dayNumber % length) + length) % length;
  }

  function coerceBool(v) {
    if (v === true) return true;
    if (v === false) return false;
    var s = String(v == null ? "" : v).trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }

  function normalizeImgUrl(img) {
    var s = String(img == null ? "" : img).trim();
    if (!s) return "";
    // no replaceAll
    s = s.replace(/\\/g, "/");
    // trim leading slashes
    s = s.replace(/^\/+/, "");
    return s;
  }

  function niceTitleFromSlug(slug) {
    var raw = String(slug || "").trim();
    if (!raw) return "";
    var spaced = raw.replace(/-/g, " ");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  function getMainEl() {
    return document.querySelector("main[data-hub]") || document.querySelector("main");
  }

  function getMainDataset() {
    var main = getMainEl();
    return main ? main.dataset : {};
  }

  // ---------------------------------------------
  // Mode A: Home/other pages "featured-slot" (unchanged semantics)
  // (kept as-is, but max-support syntax)
  // ---------------------------------------------
  function renderFeaturedCard(s) {
    s = s || {};
    var titleMain = escapeHtml(s.titleMain || "");
    var titleSub = escapeHtml(s.titleSub || "");
    var desc = escapeHtml(s.desc || "");
    var href = escapeHtml(s.href || "#");

    var browseHref = escapeHtml(s.browseHref || (SITE_ROOT + "hero-journeys/index.html"));
    var imageClass = escapeHtml(s.imageClass || "");

    var audioHref = escapeHtml(s.audioHref || (s.href ? s.href + "#audio" : "#audio"));
    var listenBtn = s.audio ? '<a class="btn" href="' + audioHref + '">Listen</a>' : "";

    return (
      '\n      <div class="featured-body">\n' +
      '        <div class="featured-media ' + imageClass + '" aria-hidden="true"></div>\n\n' +
      '        <div class="featured-copy">\n' +
      '          <h3 class="featured-name">\n' +
      '            <span class="title-main">' + titleMain + '</span>\n' +
      (titleSub ? '            <span class="title-sub">' + titleSub + '</span>\n' : "") +
      "          </h3>\n\n" +
      '          <p class="featured-desc">' + desc + "</p>\n\n" +
      '          <div class="featured-actions">\n' +
      '            <a class="btn primary" href="' + href + '">Read Essay</a>\n' +
      "            " + listenBtn + "\n" +
      '            <a class="btn" href="' + browseHref + '">Browse</a>\n' +
      "          </div>\n" +
      "        </div>\n" +
      "      </div>\n    "
    );
  }

  function initFeaturedSlot() {
    var mount = document.getElementById("featured-slot");
    if (!mount) return;

    fetch(SITE_ROOT + "data/stories.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load stories.json");
        return res.json();
      })
      .then(function (stories) {
        if (!Array.isArray(stories) || stories.length === 0) {
          mount.innerHTML = "";
          return;
        }
        var s = stories[dayIndex(stories.length)];
        mount.innerHTML = renderFeaturedCard(s);
      })
      .catch(function (err) {
        console.warn("Featured story failed:", err);
      });
  }

  // ---------------------------------------------
  // Shared helpers (Highlighted grids)
  // ---------------------------------------------
  function safeAudioFromUrl(itemUrl) {
    var u = String(itemUrl || "").trim();
    if (!u) return null;

    if (/index\.html(\?.*)?$/i.test(u)) {
      return u.replace(/index\.html(\?.*)?$/i, "audio.mp3");
    }

    if (u.charAt(u.length - 1) === "/") return u + "audio.mp3";
    return u + "/audio.mp3";
  }

  function renderHighlightedCopy(item) {
    item = item || {};

    // Match hubloader priority + classes:
    // question -> card-question (orange)
    // desc/comments -> card-desc
    var q = String(item.question == null ? "" : item.question).trim();
    if (q) return '<p class="card-question">' + escapeHtml(q) + "</p>";

    var d = String(item.desc == null ? "" : item.desc).trim();
    if (d) return '<p class="card-desc">' + escapeHtml(d) + "</p>";

    var c = String(item.comments == null ? "" : item.comments).trim();
    if (c) return '<p class="card-desc">' + escapeHtml(c) + "</p>";

    // fallback: series line
    var seriesName = String(item.series_name == null ? "" : item.series_name).trim();
    if (seriesName) return '<p class="card-desc">' + escapeHtml("Part of " + seriesName + ".") + "</p>";

    var series = String(item.series == null ? "" : item.series).trim();
    if (series) return '<p class="card-desc">' + escapeHtml("Part of " + series.replace(/-/g, " ") + ".") + "</p>";

    return "";
  }

  function getCategoryLine(item) {
    item = item || {};

    // Prefer series_name / series for a "kicker" line when available.
    var seriesName = String(item.series_name == null ? "" : item.series_name).trim();
    if (seriesName) return seriesName;

    var series = String(item.series == null ? "" : item.series).trim();
    if (series) return niceTitleFromSlug(series);

    // Otherwise show type/category.
    var type = String(item.type == null ? "" : item.type).trim();
    if (type) return niceTitleFromSlug(type);

    var cat = String(item.category == null ? "" : item.category).trim();
    if (cat) return niceTitleFromSlug(cat);

    return "Featured";
  }

  // ---------------------------------------------
  // Fallback image logic (channel images)
  // ---------------------------------------------
  function topicThumbFromKey(key) {
    var k = String(key || "").trim().toLowerCase();
    if (!k) return "";
    return "images/topics/" + k + ".webp";
  }

  function getSmartFallbackImg(item, gridEl, cfg) {
    item = item || {};
    cfg = cfg || {};

    // Priority:
    // 1) <main data-hub-parent-img="...">
    // 2) grid data-hub-parent-img="..."
    // 3) item.type -> images/topics/<type>.webp
    // 4) cfg.type  -> images/topics/<type>.webp
    // 5) item.category -> images/topics/<category>.webp
    // 6) cfg.category  -> images/topics/<category>.webp
    // 7) features default

    var mainDs = getMainDataset();
    var gridDs = gridEl ? gridEl.dataset : {};

    var mainOverride = String(mainDs.hubParentImg || "").trim();
    if (mainOverride) return normalizeImgUrl(mainOverride);

    var gridOverride = String(gridDs.hubParentImg || "").trim();
    if (gridOverride) return normalizeImgUrl(gridOverride);

    var itemType = String(item.type || "").trim();
    if (itemType) return topicThumbFromKey(itemType);

    var cfgType = String(cfg.type || "").trim();
    if (cfgType) return topicThumbFromKey(cfgType);

    var itemCat = String(item.category || "").trim();
    if (itemCat) return topicThumbFromKey(itemCat);

    var cfgCat = String(cfg.category || "").trim();
    if (cfgCat) return topicThumbFromKey(cfgCat);

    return "images/topics/features.webp";
  }

  // search-index.json emits image_url only when has_image=true
  function getCardImage(item, gridEl, cfg) {
    item = item || {};
    var raw = normalizeImgUrl(item.image_url);
    if (raw) return raw;
    return getSmartFallbackImg(item, gridEl, cfg);
  }

  // ---------------------------------------------
  // Card renderer (Highlighted)
  // ---------------------------------------------
  function renderHighlightedCard(item, gridEl, cfg) {
    item = item || {};
    cfg = cfg || {};

    var title = escapeHtml(item.title || "Untitled");
    var href = escapeHtml(item.url || "#");

    var categoryLine = escapeHtml(getCategoryLine(item));

    // Match hubloader behavior:
    // - question -> <p class="card-question"> (orange via CSS)
    // - desc/comments/fallback -> <p class="card-desc">
    var question = String(item.question == null ? "" : item.question).trim();
    var descText = String(item.desc == null ? "" : item.desc).trim();
    var comments = String(item.comments == null ? "" : item.comments).trim();

    var copyHtml = "";
    if (question) {
      copyHtml = '<p class="card-question">' + escapeHtml(question) + "</p>";
    } else if (descText) {
      copyHtml = '<p class="card-desc">' + escapeHtml(descText) + "</p>";
    } else if (comments) {
      copyHtml = '<p class="card-desc">' + escapeHtml(comments) + "</p>";
    } else {
      // fallback: series-based line (kept, but rendered as card-desc)
      var seriesName = String(item.series_name == null ? "" : item.series_name).trim();
      if (seriesName) {
        copyHtml = '<p class="card-desc">' + escapeHtml("Part of " + seriesName + ".") + "</p>";
      } else {
        var series = String(item.series == null ? "" : item.series).trim();
        if (series) {
          copyHtml = '<p class="card-desc">' + escapeHtml("Part of " + series.replace(/-/g, " ") + ".") + "</p>";
        }
      }
    }

    var img = escapeHtml(getCardImage(item, gridEl, cfg));

    var audioEnabled = String(getMainDataset().hubAudio || "").toLowerCase() === "on";
    var audioUrl = audioEnabled ? safeAudioFromUrl(item.url) : null;
    var audioHref = audioUrl ? escapeHtml(audioUrl) : "";

    var audioChip = "";
    if (audioEnabled) {
      audioChip =
        '\n        <div class="audio-chip" aria-label="Audio options">\n' +
        '          <span class="audio-chip-label">🎧 Audio</span> \n' +
        '          <div class="audio-chip-actions">\n' +
        '            <a class="audio-chip-btn" href="' + audioHref + '">Listen</a>\n' +
        '            <a class="audio-chip-btn" href="' + audioHref + '" download>Download</a>\n' +
        "          </div>\n" +
        "        </div>\n      ";
    }

    return (
      '\n      <article class="section-card card--portrait card--stack card--contain">\n' +
      '        <div class="card-media" aria-hidden="true">\n' +
      '          <img src="' + img + '" alt="" loading="lazy" decoding="async" />\n' +
      "        </div>\n\n" +
      '        <div class="card-body">\n' +
      '          <div class="card-head">\n' +
      '            <span class="card-kicker">' + categoryLine + "</span>\n" +
      "          </div>\n\n" +
      '          <h3 class="card-title">\n' +
      '            <a href="' + href + '" style="color:inherit; text-decoration:none;">' + title + "</a>\n" +
      "          </h3>\n\n" +
      (copyHtml ? "          " + copyHtml + "\n\n" : "") +
      '          <div class="card-actions" style="justify-content:center">\n' +
      '            <a class="btn primary" href="' + href + '">Explore</a>\n' +
      "          </div>\n\n" +
      "          " + audioChip + "\n" +
      "        </div>\n" +
      "      </article>\n    "
    );
  }

  // ---------------------------------------------
  // Mode B: Generic "Highlighted" grids from search-index.json
  // ---------------------------------------------
  function readCfg(gridEl) {
    var mainDs = getMainDataset();
    var ds = gridEl ? gridEl.dataset : {};

    // grid wins
    var category = String(ds.topPicksCategory || mainDs.topPicksCategory || "").trim();
    var type = String(ds.topPicksType || mainDs.topPicksType || "").trim();

    // inherit from hub semantics if not set
    if (!category) category = String(mainDs.hubCategory || "features").trim();
    if (!type) type = String(mainDs.hubType || "").trim();

    var limitRaw = String(ds.topPicksLimit || mainDs.topPicksLimit || "6");
    var limit = Math.max(0, parseInt(limitRaw, 10) || 6);

    var order = String(ds.topPicksOrder || mainDs.topPicksOrder || "series").trim().toLowerCase();

    return { category: category, type: type, limit: limit, order: order };
  }

  function sortHighlighted(list, order) {
    if (order === "title") {
      return list.sort(function (a, b) {
        var ta = String((a && a.title) || "").toLowerCase();
        var tb = String((b && b.title) || "").toLowerCase();
        return ta.localeCompare(tb);
      });
    }

    // default: series_name/series then title
    return list.sort(function (a, b) {
      var sa = String(((a && (a.series_name || a.series)) || "")).toLowerCase();
      var sb = String(((b && (b.series_name || b.series)) || "")).toLowerCase();
      if (sa < sb) return -1;
      if (sa > sb) return 1;

      var ta = String((a && a.title) || "").toLowerCase();
      var tb = String((b && b.title) || "").toLowerCase();
      return ta.localeCompare(tb);
    });
  }

  function loadSearchIndexItems() {
    return fetch(SITE_ROOT + "data/search-index.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load search-index.json");
        return res.json();
      })
      .then(function (data) {
        return Array.isArray(data && data.items) ? data.items : [];
      });
  }

  // NEW: parent highlighted flags for FEATURES series
  // returns:
  //   - object map { "<seriesKey>": true/false } on success
  //   - null on failure (fail closed for features gating)
  function loadFeatureSeriesFlags() {
    return fetch(SITE_ROOT + "data/features.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load features.json");
        return res.json();
      })
      .then(function (data) {
        var map = {};
        if (!data || typeof data !== "object") return map;

        for (var key in data) {
          if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
          var seriesObj = data[key];
          if (!seriesObj || typeof seriesObj !== "object") continue;

          // parent gate: highlighted (default false)
          map[key] = coerceBool(seriesObj.highlighted);
        }
        return map;
      })
      .catch(function (err) {
        console.warn("features.json load failed (parent gating -> closed):", err);
        return null;
      });
  }

  function parentAllowsFeatureChild(item, seriesFlagMap) {
    // If we can't validate parent gate, block.
    if (seriesFlagMap === null) return false;

    item = item || {};
    var seriesKey = String(item.series == null ? "" : item.series).trim();
    if (!seriesKey) return false;

    // Unknown series => block (prevents corrupted / orphaned items)
    if (!Object.prototype.hasOwnProperty.call(seriesFlagMap, seriesKey)) return false;

    // Parent must be true
    return seriesFlagMap[seriesKey] === true;
  }

  // Hubs use "highlighted"
  // UPDATED: features requires parent+child gating
  function filterHighlighted(items, cfg, featureSeriesFlags) {
    cfg = cfg || {};
    var cat = cfg.category;

    return (items || [])
      .filter(function (it) { return String((it && it.category) || "") === cat; })
      .filter(function (it) { return !cfg.type || String((it && it.type) || "") === cfg.type; })
      .filter(function (it) {
        // child gate always required
        if (!coerceBool(it && it.highlighted)) return false;

        // parent gate only for features
        if (cat === "features") {
          return parentAllowsFeatureChild(it, featureSeriesFlags);
        }
        return true;
      });
  }

  function emptyMessage(cfg) {
    var label = cfg.type ? (cfg.category + " / " + cfg.type) : cfg.category;
    return (
      '<p class="section-sub" style="text-align:center; margin: 0;">' +
      "No highlighted items yet for <code>" + escapeHtml(label) + "</code>. " +
      "Mark entries as <code>highlighted: true</code>." +
      "</p>"
    );
  }

  function initHighlightedGrids() {
    var grids = Array.prototype.slice.call(document.querySelectorAll("[data-top-picks-grid]"));
    if (grids.length === 0) return;

    grids.forEach(function (g) { g.setAttribute("aria-busy", "true"); });

    // Decide whether any grid needs feature parent gating
    var needsFeatureGate = false;
    for (var i = 0; i < grids.length; i++) {
      var cfg = readCfg(grids[i]);
      if (cfg && cfg.category === "features") {
        needsFeatureGate = true;
        break;
      }
    }

    var pItems = loadSearchIndexItems();

    // Only load features.json if at least one grid is features
    var pFlags = needsFeatureGate ? loadFeatureSeriesFlags() : Promise.resolve({});

    Promise.all([pItems, pFlags])
      .then(function (res) {
        var items = res[0] || [];
        var featureSeriesFlags = res[1]; // {} if unused, or map/null if used

        grids.forEach(function (grid) {
          var cfg = readCfg(grid);

          var picks = filterHighlighted(items, cfg, featureSeriesFlags);
          picks = sortHighlighted(picks, cfg.order);

          if (!picks || picks.length === 0) {
            grid.innerHTML = emptyMessage(cfg);
            return;
          }

          var slice = picks.slice(0, cfg.limit);
          grid.innerHTML = slice.map(function (it) {
            return renderHighlightedCard(it, grid, cfg);
          }).join("");
        });
      })
      .catch(function (err) {
        console.warn("Highlighted load failed:", err);
        grids.forEach(function (g) { g.innerHTML = ""; });
      })
      .then(function () {
        grids.forEach(function (g) { g.setAttribute("aria-busy", "false"); });
      });
  }

  // ---------------------------------------------
  // Boot
  // ---------------------------------------------
  function boot() {
    initFeaturedSlot();
    initHighlightedGrids();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();