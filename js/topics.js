// /Mythogin/js/topics.js
(function () {
  "use strict";

  async function initTopics() {
    const grids = document.querySelectorAll(".topics-grid[data-category]");
    if (!grids.length) return;

    const stories = await window.MythoginData.loadStories();

    grids.forEach(grid => {
      const cat = grid.getAttribute("data-category");
      const list = stories.filter(s => s.category === cat);

      // choose 2 “selected” stories for each category (simple rule for now)
      const selected = list.slice(0, 2);

      grid.innerHTML = selected.map(s => window.MythoginData.renderTopicsCard(s, cat)).join("");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initTopics().catch(console.warn));
  } else {
    initTopics().catch(console.warn);
  }
})();
