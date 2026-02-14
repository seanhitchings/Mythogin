// /mythogin/js/main-featured.js
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
    var s = String(str == null ? "" : str);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
    s = s.replace(/\\/g, "/");
    s = s.replace(/^\/+/, "");
    return s;
  }

  function safeAudioFromUrl(itemUrl) {
    var u = String(itemUrl || "").trim();
    if (!u) return "";

    if (/index\.html(\?.*)?$/i.test(u)) {
      return u.replace(/index\.html(\?.*)?$/i, "audio.mp3");
    }

    if (u.charAt(u.length - 1) === "/") return u + "audio.mp3";
    return u + "/audio.mp3";
  }

  // ---------------------------------------------
  // Featured card renderer
  // ---------------------------------------------
  function renderFeaturedCard(s) {
    s = s || {};

    var titleMain = escapeHtml(s.titleMain || "");
    var titleSub = escapeHtml(s.titleSub || "");
    var desc = escapeHtml(s.desc || "");
    var href = escapeHtml(s.href || "#");
    var browseHref = escapeHtml(s.browseHref || (SITE_ROOT + "hero-journeys/index.html"));
    var imageUrl = escapeHtml(s.imageUrl || "");

    var audioHref = escapeHtml(s.audioHref || "");
    var listenBtn = audioHref ? '<a class="btn" href="' + audioHref + '">Listen</a>' : "";

    return (
      '\n<div class="featured-body">\n' +
      '  <div class="featured-media" aria-hidden="true">\n' +
      (imageUrl
        ? '    <img src="' + imageUrl + '" alt="" loading="lazy" decoding="async">\n'
        : "") +
      "  </div>\n\n" +

      '  <div class="featured-copy">\n' +
      '    <h3 class="featured-name">\n' +
      '      <span class="title-main">' + titleMain + "</span>\n" +
      (titleSub ? '      <span class="title-sub">' + titleSub + "</span>\n" : "") +
      "    </h3>\n\n" +

      '    <p class="featured-desc">' + desc + "</p>\n\n" +

      '    <div class="featured-actions">\n' +
      '      <a class="btn primary" href="' + href + '">Read Essay</a>\n' +
      "      " + listenBtn + "\n" +
      '      <a class="btn" href="' + browseHref + '">Browse</a>\n' +
      "    </div>\n" +
      "  </div>\n" +
      "</div>\n"
    );
  }

  // ---------------------------------------------
  // search-index loader
  // ---------------------------------------------
  function loadSearchIndexItems() {
    return fetch(SITE_ROOT + "data/search-index.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load search-index.json");
        return res.json();
      })
      .then(function (data) {
        if (data && Array.isArray(data.items)) return data.items;
        return [];
      });
  }

  // ---------------------------------------------
  // Map search-index item -> featured card model
  // ---------------------------------------------
  function mapMainFeatured(item) {
    item = item || {};

    var desc =
      item.question ||
      item.desc ||
      item.comments ||
      item.text ||
      "";

    return {
      titleMain: item.title || "",
      titleSub: "",
      desc: desc,
      href: item.url || "#",
      browseHref: SITE_ROOT + "hero-journeys/index.html",
      imageUrl: normalizeImgUrl(item.image_url),
      audioHref: safeAudioFromUrl(item.url)
    };
  }

  // ---------------------------------------------
  // Main featured loader (ONLY main-highlighted)
  // ---------------------------------------------
  function initFeaturedSlot() {
    var mount = document.getElementById("featured-slot");
    if (!mount) return;

    loadSearchIndexItems()
      .then(function (items) {
        var mainItem = null;

        for (var i = 0; i < items.length; i++) {
          if (coerceBool(items[i] && items[i]["main-highlighted"])) {
            mainItem = items[i];
            break;
          }
        }

        if (!mainItem) {
          console.warn("No main-highlighted item found in search-index.json");
          mount.innerHTML = "";
          return;
        }

        var cardData = mapMainFeatured(mainItem);
        mount.innerHTML = renderFeaturedCard(cardData);
      })
      .catch(function (err) {
        console.warn("Featured load failed:", err);
        mount.innerHTML = "";
      });
  }

  // ---------------------------------------------
  // Boot
  // ---------------------------------------------
  function boot() {
    initFeaturedSlot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
1