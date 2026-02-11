/* ==========================================================================
   features-nav.js — Topic Nav Widget (Features playlists)
   - Reads /Mythogin/data/features.json (fallback: /data/features.json)
   - Drives breadcrumb + prev/next pager INSIDE [data-topic-nav="features"]
   - Requires on each child page:
       data-topic-nav="features"
       data-topic-playlist="<playlist_key>"   (e.g., popular_myths)
       data-topic-slug="<story_slug>"         (e.g., fate-dream)
   ========================================================================== */

(function () {
  "use strict";

  const SITE_ROOT = "/Mythogin/";

  const CANDIDATE_JSON = [
    SITE_ROOT + "data/features.json",
    "/data/features.json" // optional fallback if you ever host at domain root
  ];

  // Where playlist crumb should link.
  // If you later add dedicated playlist pages, change this.
  function playlistHref(playlistKey) {
    return SITE_ROOT + `features/index.html#${encodeURIComponent(playlistKey)}`;
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
    throw lastErr?.err || new Error("Failed to load features.json");
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

  function findStoryIndex(stories, slug, currentPath) {
    // 1) slug exact match
    if (slug) {
      const i = stories.findIndex(s => (s.slug || "").toLowerCase() === slug.toLowerCase());
      if (i !== -1) return i;
    }

    // 2) URL normalized match
    if (currentPath) {
      const i = stories.findIndex(s => normPath(s.url || "") === currentPath);
      if (i !== -1) return i;
    }

    // 3) URL contains slug (last resort)
    if (slug) {
      const i = stories.findIndex(s => (s.url || "").toLowerCase().includes(`/${slug.toLowerCase()}`));
      if (i !== -1) return i;
    }

    return -1;
  }

  function resolvePrevNext(stories, idx) {
    const n = stories.length;
    if (n === 0 || idx < 0) return null;

    // LOOPING BEHAVIOR
    const prevIndex = (idx - 1 + n) % n;
    const nextIndex = (idx + 1) % n;

    return {
      prev: { ...stories[prevIndex], index: prevIndex },
      next: { ...stories[nextIndex], index: nextIndex }
    };
  }

  async function init() {
    const widgets = document.querySelectorAll('[data-topic-nav="features"]');
    if (!widgets.length) return;

    const data = await fetchFirstJson(CANDIDATE_JSON);

    widgets.forEach(widget => {
      const playlistKey = widget.getAttribute("data-topic-playlist") || "";
      const slug = widget.getAttribute("data-topic-slug") || "";

      const playlist = data?.[playlistKey];
      const playlistName = playlist?.name || "";
      const stories = Array.isArray(playlist?.stories) ? playlist.stories : [];

      // Elements
      const elCrumbCurrent = widget.querySelector("[data-crumb-current]");
      const elPlaylistText = widget.querySelector("[data-crumb-playlist-text]");
      const elPlaylistLink = widget.querySelector("[data-crumb-playlist-link]");

      const aPrev = widget.querySelector("[data-pager-prev]");
      const aNext = widget.querySelector("[data-pager-next]");
      const tPrev = widget.querySelector("[data-prev-title]");
      const tNext = widget.querySelector("[data-next-title]");

      // If playlist missing, fail gracefully
      if (!playlist || !stories.length) {
        setText(elCrumbCurrent, "Unknown feature");
        setText(elPlaylistText, "Features");
        setLink(elPlaylistLink, SITE_ROOT + "features/index.html", "Features");
        hide(aPrev);
        hide(aNext);
        return;
      }

      // Playlist crumb
      setText(elPlaylistText, playlistName || playlistKey);
      setLink(elPlaylistLink, playlistHref(playlistKey), playlistName || playlistKey);

      // Find current story in this playlist
      const currentPath = normPath(window.location.href);
      const idx = findStoryIndex(stories, slug, currentPath);

      // Resolve current title
      const currentStory = idx >= 0 ? stories[idx] : null;
      setText(elCrumbCurrent, currentStory?.title || document.title.replace(/^Mythogin\s+—\s+/i, ""));

      // If we can't find the index, still avoid broken prev/next
      if (idx < 0) {
        hide(aPrev);
        hide(aNext);
        return;
      }

      // If only one story in playlist: no pager
      if (stories.length <= 1) {
        hide(aPrev);
        hide(aNext);
        return;
      }

      const pn = resolvePrevNext(stories, idx);
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
