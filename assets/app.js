const grid = document.querySelector("[data-grid]");
const filters = document.querySelector("[data-filters]");
const modal = document.querySelector("[data-modal]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalMeta = document.querySelector("[data-modal-meta]");
const modalCategory = document.querySelector("[data-modal-category]");
const modalDetail = document.querySelector("[data-modal-detail]");
const closeModalButton = document.querySelector("[data-close-modal]");
const topbar = document.querySelector("[data-topbar]");
const template = document.querySelector("#work-card-template");
const searchInput = document.querySelector("[data-search]");
const clearSearchButton = document.querySelector("[data-clear-search]");
const activeCategoryText = document.querySelector("[data-active-category]");
const activeQueryText = document.querySelector("[data-active-query]");
const resultCountText = document.querySelector("[data-result-count]");
const copyTriggerButton = document.querySelector("[data-copy-trigger]");

let portfolioItems = [];
let activeCategory = "全部";
let searchQuery = "";
let activeTriggerWords = "";

function formatUpdatedAt(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, "0")}`;
}

function formatCount(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function categorySymbol(item) {
  const title = item.title || "?";
  return title.replace(/[^A-Za-z0-9\u4e00-\u9fa5]/g, "").slice(0, 2).toUpperCase() || "SK";
}

function updateCounters(payload) {
  const categories = new Set();
  (payload.items || []).forEach((item) => {
    (item.categories || []).forEach((category) => categories.add(category));
  });

  const counters = {
    items: formatCount(payload._count || payload.items?.length || 0),
    categories: formatCount(categories.size),
    updated: formatUpdatedAt(payload._refreshed_at),
  };

  document.querySelectorAll("[data-counter]").forEach((node) => {
    node.textContent = counters[node.dataset.counter] ?? "--";
  });
}

function openModal(item, triggerButton) {
  activeTriggerWords = item.trigger_words || "";
  modalTitle.textContent = item.title;
  modalCategory.textContent = (item.categories || []).join(" / ") || "未分类";
  modalMeta.textContent = [
    item.trigger_words ? `触发词：${item.trigger_words}` : "触发词未填写",
    item.order ? `序号 ${item.order}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  modalDetail.innerHTML = `
    <p><strong>功能说明</strong><br />${item.tools || "未填写"}</p>
    <p><strong>触发词</strong><br />${item.trigger_words || "未填写"}</p>
    <p><strong>分类</strong><br />${(item.categories || []).join(" / ") || "未分类"}</p>
  `;

  modal.showModal();
  closeModalButton.dataset.returnFocusId = triggerButton.dataset.focusId;
}

function buildCard(item, index) {
  const fragment = template.content.cloneNode(true);
  const button = fragment.querySelector(".result-card-hitbox");
  const symbol = fragment.querySelector(".result-card-symbol");

  button.dataset.focusId = `result-${index}`;
  symbol.textContent = categorySymbol(item);
  fragment.querySelector(".result-card-category").textContent =
    (item.categories || []).join(" / ") || "未分类";
  fragment.querySelector(".result-card-title").textContent = item.title;
  fragment.querySelector(".result-card-tools").textContent = item.tools || "功能说明待补充";
  fragment.querySelector(".result-card-trigger").textContent = item.trigger_words || "未填写触发词";
  fragment.querySelector(".result-card-order").textContent = item.order ? `#${item.order}` : "#--";

  button.addEventListener("click", () => openModal(item, button));
  return fragment;
}

function filterItems() {
  return portfolioItems.filter((item) => {
    const categoryMatch =
      activeCategory === "全部" || (item.categories || []).includes(activeCategory);

    const searchableText = [item.title, item.tools, item.trigger_words, ...(item.categories || [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const queryMatch = !searchQuery || searchableText.includes(searchQuery.toLowerCase());

    return categoryMatch && queryMatch;
  });
}

function updateStateLabels(results) {
  activeCategoryText.textContent = activeCategory;
  activeQueryText.textContent = searchQuery || "无";
  resultCountText.textContent = formatCount(results.length);
}

function renderGrid() {
  const filtered = filterItems();
  updateStateLabels(filtered);
  grid.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("article");
    empty.className = "empty-state";
    empty.textContent = "没有匹配结果，换个分类或关键词试试。";
    grid.appendChild(empty);
    return;
  }

  filtered.forEach((item, index) => grid.appendChild(buildCard(item, index)));
}

function renderFilters() {
  const counts = new Map([["全部", portfolioItems.length]]);
  portfolioItems.forEach((item) => {
    (item.categories || []).forEach((category) => {
      counts.set(category, (counts.get(category) || 0) + 1);
    });
  });

  filters.innerHTML = "";
  [...counts.entries()].forEach(([category, count]) => {
    const button = document.createElement("button");
    button.className = `filter-button${category === activeCategory ? " is-active" : ""}`;
    button.type = "button";
    button.textContent = `${category} · ${count}`;
    button.addEventListener("click", () => {
      activeCategory = category;
      renderFilters();
      renderGrid();
    });
    filters.appendChild(button);
  });
}

async function loadPortfolio() {
  try {
    const response = await fetch("./api/portfolio.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    portfolioItems = payload.items || [];
    updateCounters(payload);
    renderFilters();
    renderGrid();
  } catch (error) {
    grid.innerHTML = "";
    const empty = document.createElement("article");
    empty.className = "empty-state";
    empty.textContent = "技能数据加载失败。请先生成 api/portfolio.json，或运行 refresh.py。";
    grid.appendChild(empty);
    console.error(error);
  }
}

function setupReveals() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
}

function setupTopbar() {
  const onScroll = () => {
    topbar.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function setupModal() {
  closeModalButton.addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
  modal.addEventListener("close", () => {
    const focusId = closeModalButton.dataset.returnFocusId;
    if (!focusId) return;
    const target = document.querySelector(`[data-focus-id="${focusId}"]`);
    target?.focus();
  });
}

function setupSearch() {
  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim();
    renderGrid();
  });

  clearSearchButton.addEventListener("click", () => {
    searchQuery = "";
    searchInput.value = "";
    renderGrid();
    searchInput.focus();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
  });
}

function setupCopy() {
  copyTriggerButton.addEventListener("click", async () => {
    if (!activeTriggerWords) return;
    try {
      await navigator.clipboard.writeText(activeTriggerWords);
      copyTriggerButton.textContent = "已复制";
      setTimeout(() => {
        copyTriggerButton.textContent = "复制触发词";
      }, 1200);
    } catch (error) {
      copyTriggerButton.textContent = "复制失败";
      console.error(error);
    }
  });
}

setupReveals();
setupTopbar();
setupModal();
setupSearch();
setupCopy();
loadPortfolio();
