// /mythogin/js/hub-loader-features.js
(function () {
  "use strict";

  function getBaseRootPath() {
    try {
      var p = new URL(document.baseURI).pathname || "/";
      if (p.charAt(p.length - 1) !== "/") p += "/";
      return p;
    } catch (e) {
      return "/";
    }
  }

  var SITE_ROOT = getBaseRootPath();

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

  function resolveKeyFromGrid(gridEl) {
    var direct = String(gridEl.getAttribute("data-hub-cat-grid") || "").trim();
    if (direct) return direct;

    var section = gridEl.closest ? gridEl.closest("[data-hub-cat]") : null;
    var fromSection = section ? String(section.getAttribute("data-hub-cat") || "").trim() : "";
    if (fromSection) return fromSection;

    return "";
  }

  function readCfg(root, gridEl) {
    var dsRoot = root && root.dataset ? root.dataset : {};
    var dsGrid = gridEl && gridEl.dataset ? gridEl.dataset : {};

    var onlyHighlighted =
      String(dsGrid.hubOnlyHighlighted || dsRoot.hubOnlyHighlighted || "").toLowerCase() === "on";

    var limitRaw = String(dsGrid.hubLimit || dsRoot.hubLimit || "");
    var limit = parseInt(limitRaw, 10);
    if (!(limit > 0)) limit = 0;

    return { onlyHighlighted: onlyHighlighted, limit: limit };
  }

  function renderCopy(story) {
    story = story || {};
    var d = typeof story.desc === "string" ? story.desc.trim() : "";
    var c = typeof story.comments === "string" ? story.comments.trim() : "";
    var t = typeof story.text === "string" ? story.text.trim() : "";

    if (d) return '<p class="card-desc">' + escapeHtml(d) + "</p>";
    if (c) return '<p class="card-desc">' + escapeHtml(c) + "</p>";

    var cleaned = cleanTextFallback(t, story.title);
    if (cleaned) return '<p class="card-desc">' + escapeHtml(cleaned) + "</p>";

    return "";
  }

  // Prefer story image when has_image=true, else series image when has_image=true,
  // else fallback from main data-hub-parent-img, else features topic image.
  function pickImage(seriesObj, storyObj, root) {
    var storyImg = storyObj && storyObj.image ? storyObj.image : null;
    var seriesImg = seriesObj && seriesObj.image ? seriesObj.image : null;

    var storyHas = storyImg ? coerceBool(storyImg.has_image) : false;
    var storyUrl = storyImg ? String(storyImg.url || "").trim() : "";

    if (storyHas && storyUrl) return normalizeImgUrl(storyUrl);

    var seriesHas = seriesImg ? coerceBool(seriesImg.has_image) : false;
    var seriesUrl = seriesImg ? String(seriesImg.url || "").trim() : "";

    if (seriesHas && seriesUrl) return normalizeImgUrl(seriesUrl);

    var parentImg = String(root.getAttribute("data-hub-parent-img") || "").trim();
    if (parentImg) return normalizeImgUrl(parentImg);

    return "images/topics/features.webp";
  }

  function safeAudioFromUrl(itemUrl) {
    var u = String(itemUrl || "").trim();
    if (!u) return "";
    if (/index\.html(\?.*)?$/i.test(u)) return u.replace(/index\.html(\?.*)?$/i, "audio.mp3");
    if (u.charAt(u.length - 1) === "/") return u + "audio.mp3";
    return "";
  }

  function deriveAudio(storyObj) {
    // If story has explicit audio, use it.
    var a = storyObj && storyObj.audio ? String(storyObj.audio).trim() : "";
    if (a) return normalizeUrl(a);
    // else derive from url
    var u = storyObj && storyObj.url ? String(storyObj.url).trim() : "";
    return normalizeUrl(safeAudioFromUrl(u));
  }

  function renderAudioChip(story, root, titleText) {
    var audioOn = String(root.getAttribute("data-hub-audio") || "").toLowerCase() !== "off";
    if (!audioOn) return "";

    var audioHref = deriveAudio(story);
    if (!audioHref) return "";

    var a = escapeHtml(audioHref);
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

  function renderCard(seriesObj, storyObj, root) {
    var titleRaw = storyObj && storyObj.title != null ? storyObj.title : "";
    var urlRaw = storyObj && storyObj.url != null ? storyObj.url : "#";

    var title = escapeHtml(titleRaw);
    var url = escapeHtml(normalizeUrl(urlRaw));
    var imgSrc = escapeHtml(pickImage(seriesObj, storyObj, root));

    return (
      '\n    <article class="section-card card--portrait card--stack card--contain">\n' +
      '      <div class="card-media" aria-hidden="true">\n' +
      '        <img src="' + imgSrc + '" alt="" loading="lazy" decoding="async">\n' +
      "      </div>\n\n" +
      '      <div class="card-body">\n' +
      '        <h3 class="card-title">\n' +
      '          <a href="' + url + '" style="color:inherit; text-decoration:none;">' + title + "</a>\n" +
      "        </h3>\n\n" +
      "        " + renderCopy(storyObj) + "\n\n" +
      '        <div class="card-actions" style="justify-content:center">\n' +
      '          <a class="btn primary" href="' + url + '">Explore</a>\n' +
      "        </div>\n\n" +
      "        " + renderAudioChip(storyObj, root, titleRaw) + "\n" +
      "      </div>\n" +
      "    </article>\n"
    );
  }

  function setSeriesTitle(sectionEl, seriesObj, seriesKey) {
    if (!sectionEl) return;
    var h2 = sectionEl.querySelector ? sectionEl.querySelector("[data-hub-cat-title]") : null;
    if (!h2) return;

    var name = seriesObj && seriesObj.name ? String(seriesObj.name).trim() : "";
    h2.textContent = name || seriesKey;
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load: " + url);
        return res.json();
      });
  }

  function initHubLoaderFeatures() {
    var root = document.querySelector("main[data-hub]") || document.querySelector("[data-hub]");
    if (!root) return;

    // default input = features.json; allow override
    var urlAttr = String(root.getAttribute("data-hub-json") || root.getAttribute("data-hub-jsons") || "").trim();
    var inputUrl = urlAttr ? normalizeUrl(urlAttr.split(",")[0]) : "data/features.json";

    var grids = Array.prototype.slice.call(document.querySelectorAll("[data-hub-cat-grid]"));
    if (!grids.length) return;

    fetchJson(SITE_ROOT + inputUrl)
      .then(function (data) {
        if (!data || typeof data !== "object") return;

        grids.forEach(function (gridEl) {
          var seriesKey = String(resolveKeyFromGrid(gridEl) || "").trim();
          if (!seriesKey) return;

          var seriesObj = data[seriesKey];
          if (!seriesObj) return;

          var cfg = readCfg(root, gridEl);

          // Parent gate (only when onlyHighlighted=on)
          var parentOk = true;
          if (cfg.onlyHighlighted) {
            parentOk = coerceBool(seriesObj.highlighted);
          }
          if (!parentOk) {
            gridEl.innerHTML = "";
            return;
          }

          var stories = Array.isArray(seriesObj.stories) ? seriesObj.stories : [];
          if (!stories.length) return;

          // Child gate (only when onlyHighlighted=on)
          var list = cfg.onlyHighlighted
            ? stories.filter(function (s) { return coerceBool(s && s.highlighted); })
            : stories.slice(0);

          if (!list.length) {
            gridEl.innerHTML = "";
            return;
          }

          if (cfg.limit > 0) list = list.slice(0, cfg.limit);

          var sectionEl = gridEl.closest ? (gridEl.closest("section") || document) : document;
          setSeriesTitle(sectionEl, seriesObj, seriesKey);

          gridEl.innerHTML = list.map(function (s) { return renderCard(seriesObj, s, root); }).join("");
        });
      })
      .catch(function (err) {
        console.warn("Hub loader (features) failed:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHubLoaderFeatures);
  } else {
    initHubLoaderFeatures();
  }
})();