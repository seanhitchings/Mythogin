// /Mythogin/js/featured.js
(function () {
  "use strict";

  function dayIndex(length) {
    // Stable daily rotation in the user's local time.
    const now = new Date();
    const dayKey = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const dayNumber = Math.floor(dayKey / 86400000);
    return ((dayNumber % length) + length) % length;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderFeaturedCard(s) {
    const titleMain = escapeHtml(s.titleMain || "");
    const titleSub = escapeHtml(s.titleSub || "");
    const desc = escapeHtml(s.desc || "");
    const href = escapeHtml(s.href || "#");
    const browseHref = escapeHtml(s.browseHref || "Topics/topics.html");
    const imageClass = escapeHtml(s.imageClass || "");
    const audioHref = escapeHtml(s.audioHref || (s.href ? s.href + "#audio" : "#audio"));

    const listenBtn = s.audio
      ? `<a class="btn" href="${audioHref}">Listen</a>`
      : "";

    return `
      <div class="featured-body">
        <div class="featured-media ${imageClass}" aria-hidden="true"></div>

        <div class="featured-copy">
          <h3 class="featured-name">
            <span class="title-main">${titleMain}</span>
            ${titleSub ? `<span class="title-sub">${titleSub}</span>` : ``}
          </h3>

          <p class="featured-desc">${desc}</p>

          <div class="featured-actions">
            <a class="btn primary" href="${href}">Read Essay</a>
            ${listenBtn}
            <a class="btn" href="${browseHref}">Browse</a>
          </div>
        </div>
      </div>
    `;
  }

  async function initFeatured() {
    const mount = document.getElementById("featured-slot");
    if (!mount) return;

    try {
      const res = await fetch("data/stories.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load stories.json");
      const stories = await res.json();

      if (!Array.isArray(stories) || stories.length === 0) {
        mount.innerHTML = "";
        return;
      }

      const s = stories[dayIndex(stories.length)];
      mount.innerHTML = renderFeaturedCard(s);
    } catch (err) {
      // Fail quietly (don’t break the page layout)
      console.warn("Featured story failed:", err);
    }
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFeatured);
  } else {
    initFeatured();
  }
})();
