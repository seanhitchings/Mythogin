// main.js
(function init() {
    setFooterYear();
    setActiveNav();
    wireNavSearchFill();
    enableTopicsSearchIfPresent();
  
    function setFooterYear() {
      const yearEl = document.getElementById("year");
      if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    }
  
    function setActiveNav() {
      const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
      document.querySelectorAll(".navlinks a[href]").forEach(a => {
        const href = (a.getAttribute("href") || "").toLowerCase();
        if (!href.includes("#") && href.endsWith(path)) {
          a.setAttribute("aria-current", "page");
        }
        if ((path === "" || path === "/") && href.endsWith("index.html")) {
          a.setAttribute("aria-current", "page");
        }
      });
    }
  
    // If URL contains ?q=..., auto-fill the navbar search input
    function wireNavSearchFill() {
      const params = new URLSearchParams(location.search);
      const q = (params.get("q") || "").trim();
      if (!q) return;
  
      const input = document.querySelector('.nav-search-input[name="q"]');
      if (input) input.value = q;
    }
  
    // Topics page: filter topic blocks by query (title/desc/category text)
    function enableTopicsSearchIfPresent() {
      const root = document.getElementById("topicsRoot");
      if (!root) return;
  
      const params = new URLSearchParams(location.search);
      const initial = (params.get("q") || "").trim();
  
      const navInput = document.querySelector('.nav-search-input[name="q"]');
      const status = document.getElementById("searchStatus");
  
      const blocks = Array.from(root.querySelectorAll("article.block"));
  
      const index = blocks.map(block => ({
        block,
        text: block.innerText.replace(/\s+/g, " ").toLowerCase()
      }));
  
      function apply(query) {
        const q = (query || "").trim().toLowerCase();
        let shown = 0;
  
        index.forEach(({ block, text }) => {
          const match = !q || text.includes(q);
          block.style.display = match ? "" : "none";
          if (match) shown++;
        });
  
        if (!status) return;
        if (!q) {
          status.textContent = "";
          return;
        }
  
        status.textContent = shown
          ? `Showing ${shown} result${shown === 1 ? "" : "s"} for “${query}”.`
          : `No results for “${query}”.`;
      }
  
      if (initial) apply(initial);
      if (navInput) navInput.addEventListener("input", () => apply(navInput.value));
    }
    document.addEventListener("click", e=>{
  const btn = e.target.closest(".audio-btn[data-action]");
  if(!btn) return;

  const audio = btn.parentElement.querySelector("audio");

  if(audio.paused){
    audio.play();
    btn.textContent = "⏸ Pause";
  }else{
    audio.pause();
    btn.textContent = "▶ Listen";
  }
});

  })();
  
  (() => {
  const panel = document.querySelector('[data-toc-panel]');
  const toggle = document.querySelector('[data-toc-toggle]');
  const closeBtn = document.querySelector('[data-toc-close]');
  const backdrop = document.querySelector('[data-toc-backdrop]');

  if (!panel || !toggle) return;

  const open = () => {
    document.body.classList.add('toc-open');
    toggle.setAttribute('aria-expanded', 'true');
  };

  const close = () => {
    document.body.classList.remove('toc-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    document.body.classList.contains('toc-open') ? close() : open();
  });

  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Close drawer on link click (only matters on mobile)
  panel.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    if (window.matchMedia('(max-width: 980px)').matches) close();
  });

  // Optional: active section highlighting
  const links = [...panel.querySelectorAll('.toc-link[href^="#"]')];
  const targets = links
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  if (targets.length) {
    const obs = new IntersectionObserver((entries) => {
      // pick the top-most visible section
      const visible = entries
        .filter(en => en.isIntersecting)
        .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top))[0];

      if (!visible) return;

      const id = `#${visible.target.id}`;
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === id));
    }, { rootMargin: '-25% 0px -65% 0px', threshold: 0.01 });

    targets.forEach(t => obs.observe(t));
  }
})();
