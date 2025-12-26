(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // nullなら何もしない
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

  // Reveal
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
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Contact template copy（ボタンが無ければ何もしない）
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

  // Works（必要DOM）
  const els = {
    grid: $("#worksGrid"),
    empty: $("#worksEmpty"),
    q: $("#q"),
    tag: $("#tagSelect"),
    sort: $("#sortSelect"),
    clear: $("#clearBtn"),
    statProjects: $("#statProjects"),
  };

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

  // ★ ここが変更点：モーダルをやめて detail へのリンクにする
  const renderCard = (p) => {
    const card = document.createElement("article");
    card.className = "card work-card reveal is-visible";

    const tags = (p.tags || []).slice(0, 6).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

    const demoBtn = p.demo
      ? `<a class="btn btn-primary" href="${escapeHtml(p.demo)}" target="_blank" rel="noreferrer">デモ ↗</a>`
      : "";

    const repoBtn = p.repo
      ? `<a class="btn btn-ghost" href="${escapeHtml(p.repo)}" target="_blank" rel="noreferrer">Repo ↗</a>`
      : "";

    // detail がある作品だけ「詳細」ボタンを表示（同一タブ遷移）
    const detailBtn = p.detail
      ? `<a class="btn btn-ghost" href="${escapeHtml(p.detail)}">詳細 →</a>`
      : "";

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
        ${detailBtn}
      </div>
    `;

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
