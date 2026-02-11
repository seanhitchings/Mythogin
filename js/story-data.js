// /Mythogin/js/story-data.js
(function () {
  "use strict";

  async function loadStories() {
    // Base-relative: resolves under <base href="/Mythogin/">
    const res = await fetch("data/stories.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load data/stories.json");
    const stories = await res.json();
    if (!Array.isArray(stories)) throw new Error("stories.json must be an array");
    return stories;
  }

  function dayIndex(length) {
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

  function cssBgImage(url, position) {
    const safeUrl = escapeHtml(url || "");
    const pos = escapeHtml(position || "center center");
    return `
      background-image: url("${safeUrl}");
      background-size: cover;
      background-repeat: no-repeat;
      background-position: ${pos};
    `.trim();
  }

  // Featured/Topics cards share the SAME internal layout
  function renderFeaturedBody(story) {
    const titleMain = escapeHtml(story.titleMain);
    const titleSub = escapeHtml(story.titleSub);
    const summary = escapeHtml(story.summary);
    const storyHref = escapeHtml(story.storyHref);
    const browseHref = escapeHtml(story.browseHref || "topics/index.html");
    const audioHref = escapeHtml(story.audioHref || (story.storyHref + "#audio"));

    const mediaStyle = cssBgImage(story.image, story.imagePos);

    const listenBtn = story.audio
      ? `<a class="btn" href="${audioHref}">Listen</a>`
      : "";

    return `
      <div class="featured-body">
        <div class="featured-media" style="${mediaStyle}" aria-hidden="true"></div>

        <div class="featured-copy">
          <h3 class="featured-name">
            <span class="title-main">${titleMain}</span>
            ${titleSub ? `<span class="title-sub">${titleSub}</span>` : ``}
          </h3>

          <p class="featured-desc">${summary}</p>

          <div class="featured-actions">
            <a class="btn primary" href="${storyHref}">Read Essay</a>
            ${listenBtn}
            <a class="btn" href="${browseHref}">Browse</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderTopicsCard(story, chipText) {
    const title = escapeHtml(story.titleMain);
    const summary = escapeHtml(story.summary);
    const href = escapeHtml(story.storyHref);
    const chip = escapeHtml(chipText || story.category || "Story");

    const mediaStyle = cssBgImage(story.image, story.imagePos);

    return `
      <a class="topics-card" href="${href}">
        <div class="topics-card-head">
          <h3 class="topics-card-kicker">Selected</h3>
          <span class="topics-chip">${chip}</span>
        </div>

        <div class="topics-card-body">
          <div class="topics-card-media" style="${mediaStyle}" aria-hidden="true"></div>

          <div class="topics-card-copy">
            <h4 class="topics-card-title">${title}</h4>
            <p class="topics-card-desc">${summary}</p>

            <div class="topics-card-actions">
              <span class="btn primary">Read Essay</span>
              ${story.audio ? `<span class="btn">Listen</span>` : `<span class="btn">Browse</span>`}
            </div>
          </div>
        </div>
      </a>
    `;
  }

  // Expose to window (no module tooling required)
  window.MythoginData = {
    loadStories,
    dayIndex,
    renderFeaturedBody,
    renderTopicsCard
  };
})();
