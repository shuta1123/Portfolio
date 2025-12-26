(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---- safe helper: nullなら何もしない ----
  const on = (el, ev, fn) => {
    if (el) el.addEventListener(ev, fn);
  };

  // Year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme
  const THEME_KEY = "theme";
  const applyTheme = (theme) => {
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");

    const icon = $("#themeToggle .icon");
    if (icon) icon.textContent = theme === "light" ? "☀" : "☾";
  };

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "light" || savedTheme === "dark") {
    applyTheme(savedTheme);
  } else {
    const prefersLight =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }

  on($("#themeToggle"), "click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const next = isLight ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  // Reveal on scroll
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    // fallback
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Contact template copy (optional: buttonが無いなら何もしない)
  on($("#copyTemplateBtn"), "click", async () => {
    const template =
`shuta1123 さんへ
ポートフォリオを拝見しました。以下について質問したいです。

- 内容:
- 関連リンク(Repoなど):

よろしくお願いします。`;

    try {
      await navigator.clipboard.writeText(template);
      const hint = $("#copyHint");
      if (hint) {
        hint.textContent = "コピーしました。";
        setTimeout(() => (hint.textContent = ""), 1400);
      }
    } catch {
      const hint = $("#copyHint");
      if (hint) {
        hint.textContent = "コピーに失敗しました（ブラウザ設定を確認してください）。";
        setTimeout(() => (hint.textContent = ""), 1800);
      }
    }
  });

  // Works (required elements check)
  const els = {
    grid: $("#worksGrid"),
    empty: $("#worksEmpty"),
    q: $("#q"),
    tag: $("#tagSelect"),
    sort: $("#sortSelect"),
    clear: $("#clearBtn"),
    statProjects: $("#statProjects"),
    modal: $("#projectModal"),
    modalTitle: $("#modalTitle"),
    modalSub: $("#modalSub"),
    modalDesc: $("#modalDesc"),
    modalTags: $("#modalTags"),
    modalLinks: $("#modalLinks"),
    modalBullets: $("#modalBullets"),
    modalClose: $("#modalClose"),
  };

  // Worksに必要なDOMが無ければ以降をスキップ（ページ崩れ防止）
  const hasWorksCore = !!(els.grid && els.empty && els.q && els.tag && els.sort && els.clear);
  const state = { all: [], q: "", tag: "__ALL__", sort: "new" };

  const normalize = (s) => (s || "").toString().toLowerCase().trim();
  const escapeHtml = (s) =>
    (s ?? "")
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const buildTagOptions = () => {
    if (!els.tag) return;
    const tags = new Set();
    state.all.forEach((p) => (p.tags || []).forEach((t) => tags.add(t)));
    const sorted = Array.from(tags).sort((a, b) => a.localeCompare(b));
    els.tag.innerHTML =
      `<option value="__ALL__">すべて</option>` +
      sorted.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  };

  const byNewest = (a, b) => (b.year ?? 0) - (a.year ?? 0);
  const byAZ = (a, b) =>
    (a.title ?? "").localeCompare(b.title ?? "", undefined, { sensitivity: "base" });

  const matches = (p) => {
    const q = normalize(state.q);
    const tag = state.tag;

    if (tag !== "__ALL__") {
      const has = (p.tags || []).includes(tag);
      if (!has) return false;
    }
    if (!q) return true;

    const hay = normalize([p.title, p.summary, p.description, (p.tags || []).join(" ")].join(" "));
    return hay.includes(q);
  };

  const closeModal = () => {
    if (els.modal && els.modal.open && typeof els.modal.close === "function") els.modal.close();
    else if (els.modal) els.modal.removeAttribute("open");
  };

  const openModal = (p) => {
    if (!els.modal || !els.modalTitle || !els.modalSub || !els.modalDesc) return;

    els.modalTitle.textContent = p.title || "Project";
    const sub = [];
    if (p.year) sub.push(String(p.year));
    if (p.tags && p.tags.length) sub.push(p.tags.join(" · "));
    els.modalSub.textContent = sub.join("  |  ") || "";

    els.modalDesc.textContent = p.description || p.summary || "";

    if (els.modalTags) {
      els.modalTags.innerHTML = "";
      (p.tags || []).forEach((t) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        els.modalTags.appendChild(span);
      });
    }

    if (els.modalLinks) {
      els.modalLinks.innerHTML = "";
      if (p.demo) {
        const a = document.createElement("a");
        a.className = "btn btn-primary";
        a.href = p.demo;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = "デモを開く ↗";
        els.modalLinks.appendChild(a);
      }
      if (p.repo) {
        const a = document.createElement("a");
        a.className = "btn btn-ghost";
        a.href = p.repo;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = "Repoを開く ↗";
        els.modalLinks.appendChild(a);
      }
    }

    if (els.modalBullets) {
      els.modalBullets.innerHTML = "";
      (p.bullets || []).forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        els.modalBullets.appendChild(li);
      });
    }

    if (typeof els.modal.showModal === "function") els.modal.showModal();
    else els.modal.setAttribute("open", "open");
  };

  const renderCard = (p) => {
    const card = document.createElement("article");
    card.className = "card work-card reveal is-visible";

    const tags = (p.tags || []).slice(0, 6).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

    const repoBtn = p.repo
      ? `<a class="btn btn-ghost" href="${escapeHtml(p.repo)}" target="_blank" rel="noreferrer">Repo ↗</a>`
      : "";

    const demoBtn = p.demo
      ? `<a class="btn btn-primary" href="${escapeHtml(p.demo)}" target="_blank" rel="noreferrer">デモ ↗</a>`
      : "";

    const detailsBtn = els.modal ? `<button class="btn btn-ghost" type="button" data-open="1">詳細 →</button>` : "";

    card.innerHTML = `
      <div class="work-top">
        <h3 class="work-title">${escapeHtml(p.title || "Untitled")}</h3>
        <div class="work-year">${escapeHtml(p.year ?? "")}</div>
      </div>
      <p class="work-desc">${escapeHtml(p.summary || "")}</p>
      <div class="work-tags">${tags}</div>
      <div class="work-actions">
        ${demoBtn}
        ${repoBtn}
        ${detailsBtn}
      </div>
    `;

    const btn = card.querySelector('button[data-open="1"]');
    if (btn) on(btn, "click", () => openModal(p));

    return card;
  };

  const render = () => {
    if (!hasWorksCore) return;

    const filtered = state.all.filter(matches);
    const sorted = [...filtered].sort(state.sort === "az" ? byAZ : byNewest);

    els.grid.innerHTML = "";
    els.empty.hidden = sorted.length !== 0;

    sorted.forEach((p) => els.grid.appendChild(renderCard(p)));

    if (els.statProjects) els.statProjects.textContent = String(state.all.length);
  };

  if (hasWorksCore) {
    on(els.q, "input", () => {
      state.q = els.q.value;
      render();
    });
    on(els.tag, "change", () => {
      state.tag = els.tag.value;
      render();
    });
    on(els.sort, "change", () => {
      state.sort = els.sort.value;
      render();
    });
    on(els.clear, "click", () => {
      state.q = "";
      state.tag = "__ALL__";
      state.sort = "new";
      els.q.value = "";
      els.tag.value = "__ALL__";
      els.sort.value = "new";
      render();
    });

    // modal close handlers (optional)
    on(els.modalClose, "click", closeModal);
    on(els.modal, "click", (e) => {
      if (!els.modal) return;
      const rect = els.modal.getBoundingClientRect();
      const inDialog =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inDialog) closeModal();
    });
    on(window, "keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    // Load projects
    fetch("data/projects.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("projects.json fetch failed");
        return r.json();
      })
      .then((list) => {
        state.all = Array.isArray(list) ? list : [];
        buildTagOptions();
        render();
      })
      .catch(() => {
        state.all = [];
        buildTagOptions();
        render();

        // 読み込み失敗の表示（gridがある時だけ）
        if (els.grid) {
          els.grid.innerHTML = `
            <div class="card">
              <h3>projects.json が読み込めません</h3>
              <p class="muted">パス: <code>data/projects.json</code> を確認してください（大文字小文字も含む）。</p>
            </div>
          `;
        }
      });
  }
})();
