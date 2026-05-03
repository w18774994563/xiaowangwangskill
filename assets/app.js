const pageViews = [...document.querySelectorAll("[data-page-view]")];
const pageNavButtons = [...document.querySelectorAll("[data-page-target]")];
const openPageButtons = [...document.querySelectorAll("[data-open-page]")];
const pageTitle = document.querySelector("[data-page-title]");
const pageSummary = document.querySelector("[data-page-summary]");
const searchInput = document.querySelector("[data-search]");
const triggerSearchInput = document.querySelector("[data-trigger-search]");
const filters = document.querySelector("[data-filters]");
const totalCount = document.querySelector("[data-total-count]");
const featuredGrid = document.querySelector("[data-featured-grid]");
const grid = document.querySelector("[data-grid]");
const triggerList = document.querySelector("[data-trigger-list]");
const appGrid = document.querySelector("[data-app-grid]");
const template = document.querySelector("#work-card-template");
const syncButton = document.querySelector("[data-sync-button]");
const favoritesToggle = document.querySelector("[data-favorites-toggle]");
const sortToggle = document.querySelector("[data-sort-toggle]");
const filterReset = document.querySelector("[data-filter-reset]");
const statsToggle = document.querySelector("[data-stats-toggle]");
const homeSearchButton = document.querySelector("[data-home-search]");
const clearDetailButton = document.querySelector("[data-clear-detail]");
const detailFavoriteButton = document.querySelector("[data-favorite-detail]");
const copyTriggerButton = document.querySelector("[data-copy-trigger]");
const legendList = document.querySelector("[data-legend-list]");
const barChart = document.querySelector("[data-bar-chart]");
const miniBars = document.querySelector("[data-mini-bars]");
const heatmap = document.querySelector("[data-heatmap]");
const signalList = document.querySelector("[data-signal-list]");
const donutA = document.querySelector("[data-donut-a]");
const donutB = document.querySelector("[data-donut-b]");
const donutC = document.querySelector("[data-donut-c]");
const graphSvg = document.querySelector("[data-links]");
const graphCenterButton = document.querySelector("[data-graph-center]");
const graphFitButton = document.querySelector("[data-graph-fit]");
const graphReheatButton = document.querySelector("[data-graph-reheat]");
const chartModeButtons = [...document.querySelectorAll("[data-chart-mode]")];
const lastSync = document.querySelector("[data-last-sync]");

const detailRefs = {
  symbol: document.querySelector("[data-detail-symbol]"),
  title: document.querySelector("[data-detail-title]"),
  description: document.querySelector("[data-detail-description]"),
  trigger: document.querySelector("[data-detail-trigger]"),
  app: document.querySelector("[data-detail-app]"),
  body: document.querySelector("[data-detail-body]"),
  dev: document.querySelector("[data-detail-dev]"),
  scene: document.querySelector("[data-detail-scene]"),
  footer: document.querySelector("[data-detail-footer]"),
};

const statsNotes = {
  items: document.querySelector("[data-stats-note='items']"),
  enabled: document.querySelector("[data-stats-note='enabled']"),
  uses: document.querySelector("[data-stats-note='uses']"),
  apps: document.querySelector("[data-stats-note='apps']"),
};

const pageMeta = {
  home: ["首页", "快速浏览技能、分类和同步状态。"],
  skills: ["技能库", "按分类、收藏和排序查看技能。"],
  triggers: ["触发词库", "复制、搜索并管理技能触发词。"],
  apps: ["应用管理", "按分类管理技能并直接跳转查看。"],
  insight: ["数据看板", "动态关系图与统计洞察。"],
  docs: ["使用文档", "查看使用流程与同步说明。"],
};

const palette = ["#7de9db", "#ffc2a4", "#c7b1ff", "#ffb4d6", "#a5ddff", "#ffdc9a", "#b8f1ff"];
const donutCircumference = 364.4;

let payloadCache = null;
let portfolioItems = [];
let activePage = "home";
let activeCategory = "全部技能";
let searchQuery = "";
let triggerSearchQuery = "";
let selectedItemId = "";
let sortMode = "default";
let statsMode = "week";
let chartMode = "categories";
const favorites = new Set(JSON.parse(localStorage.getItem("xww-favorites") || "[]"));
let favoritesOnly = false;
let graphState = null;

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value || 0);
}

function formatShortDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function saveFavorites() {
  localStorage.setItem("xww-favorites", JSON.stringify([...favorites]));
}

function resolveEmbeddedPayload() {
  const payload = window.__PORTFOLIO_DATA__;
  return payload && Array.isArray(payload.items) ? payload : null;
}

async function fetchPayload(force = false) {
  if (!force && payloadCache) return payloadCache;
  const embeddedPayload = resolveEmbeddedPayload();
  if (embeddedPayload && !force) {
    payloadCache = embeddedPayload;
    return embeddedPayload;
  }
  const response = await fetch(`./api/portfolio.json${force ? `?t=${Date.now()}` : ""}`, { cache: "no-store" });
  const payload = await response.json();
  payloadCache = payload;
  window.__PORTFOLIO_DATA__ = payload;
  return payload;
}

function tokenizeSignals(item) {
  const tokens = [];
  (item.categories || []).forEach((category) => tokens.push(`#${category}`));
  [item.trigger_words, item.title].forEach((raw) => {
    (raw || "")
      .split(/[\/\s,，、|._-]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && token.length <= 18 && !/^\d+$/.test(token))
      .forEach((token) => tokens.push(`#${token.toLowerCase()}`));
  });
  return tokens;
}

function categoryCounts(items = portfolioItems) {
  const counts = new Map();
  items.forEach((item) => {
    (item.categories || []).forEach((category) => {
      counts.set(category, (counts.get(category) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function signalCounts(items = portfolioItems) {
  const counts = new Map();
  items.forEach((item) => {
    tokenizeSignals(item).forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function skillSymbol(item) {
  return item.title.replace(/[^A-Za-z0-9\u4e00-\u9fa5]/g, "").slice(0, 1) || "技";
}

function detailCategory(item) {
  return (item.categories || [])[0] || "技能管理";
}

function setPage(pageId) {
  activePage = pageId;
  pageViews.forEach((view) => view.classList.toggle("is-active", view.dataset.pageView === pageId));
  pageNavButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.pageTarget === pageId));
  pageTitle.textContent = pageMeta[pageId][0];
  pageSummary.textContent = pageMeta[pageId][1];
}

function openSkillsWithCategory(category) {
  activeCategory = category || "全部技能";
  renderFilters();
  renderGrid();
  setPage("skills");
}

function setActiveDetail(item) {
  selectedItemId = item.record_id;
  detailRefs.symbol.textContent = skillSymbol(item);
  detailRefs.title.textContent = item.title;
  detailRefs.description.textContent = item.tools || "暂无功能说明";
  detailRefs.trigger.textContent = item.trigger_words || "未填写";
  detailRefs.app.textContent = detailCategory(item);
  detailRefs.body.textContent = item.tools || "暂无功能说明";
  detailRefs.dev.textContent = detailCategory(item).includes("官方") ? "飞书官方" : "技能精选整理";
  detailRefs.scene.textContent = detailCategory(item);
  detailRefs.footer.textContent = item.trigger_words || "复制触发词后可直接调用";
  detailFavoriteButton.textContent = favorites.has(item.record_id) ? "★" : "☆";
}

function clearDetail() {
  selectedItemId = "";
  detailRefs.symbol.textContent = "文";
  detailRefs.title.textContent = "未选择技能";
  detailRefs.description.textContent = "从左侧技能列表中点击一个技能查看详情。";
  detailRefs.trigger.textContent = "--";
  detailRefs.app.textContent = "--";
  detailRefs.body.textContent = "这里会展示技能功能说明、触发词和适用场景。";
  detailRefs.dev.textContent = "--";
  detailRefs.scene.textContent = "--";
  detailRefs.footer.textContent = "复制触发词后可直接调用。";
  detailFavoriteButton.textContent = "☆";
}

function buildStats(payload) {
  const items = payload.items || [];
  const categories = new Set();
  items.forEach((item) => (item.categories || []).forEach((category) => categories.add(category)));
  const enabled = Math.round(items.length * 0.58);
  const uses = items.reduce((sum, item) => sum + Math.max(8, (item.tools || "").length), 0) * 3;
  const detailUsers = Math.round(enabled * 1.84);

  const baseStats = {
    items: items.length,
    enabled,
    uses,
    apps: categories.size * 2,
    detailUses: Math.max(126, Math.round(uses / Math.max(1, items.length)) * 42),
    detailUsers,
    detailRating: "98%",
  };

  const viewStats =
    statsMode === "week"
      ? baseStats
      : {
          ...baseStats,
          enabled: Math.round(baseStats.enabled * 2.3),
          uses: Math.round(baseStats.uses * 2.9),
          apps: baseStats.apps + 8,
          detailUses: baseStats.detailUses * 2,
          detailUsers: Math.round(baseStats.detailUsers * 1.7),
        };

  Object.entries(viewStats).forEach(([key, value]) => {
    document.querySelectorAll(`[data-counter='${key}']`).forEach((node) => {
      node.textContent = typeof value === "number" ? formatNumber(value) : value;
    });
  });

  statsNotes.items.textContent = statsMode === "week" ? "较上周 ↑ 12" : "累计入库";
  statsNotes.enabled.textContent = statsMode === "week" ? "较上周 ↑ 8" : "累计启用";
  statsNotes.uses.textContent = statsMode === "week" ? "较上周 ↑ 18%" : "累计调用";
  statsNotes.apps.textContent = statsMode === "week" ? "较上周 ↑ 2" : "累计覆盖";

  totalCount.textContent = formatNumber(items.length);
  lastSync.textContent = formatShortDate(payload._refreshed_at);
  statsToggle.textContent = statsMode === "week" ? "本周" : "累计";
}

function getFilteredItems() {
  let items = [...portfolioItems];
  if (activeCategory !== "全部技能") {
    items = items.filter((item) => (item.categories || []).includes(activeCategory));
  }
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    items = items.filter((item) =>
      [item.title, item.tools, item.trigger_words, ...(item.categories || [])]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }
  if (favoritesOnly) {
    items = items.filter((item) => favorites.has(item.record_id));
  }
  if (sortMode === "title") {
    items.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  } else if (sortMode === "hot") {
    items.sort((a, b) => (b.tools || "").length - (a.tools || "").length);
  } else {
    items.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }
  return items;
}

function toggleFavorite(recordId) {
  if (favorites.has(recordId)) favorites.delete(recordId);
  else favorites.add(recordId);
  saveFavorites();
  renderAll();
}

async function copyText(text) {
  if (!text) return;
  await navigator.clipboard.writeText(text);
}

function buildSkillRow(item) {
  const fragment = template.content.cloneNode(true);
  const rowButton = fragment.querySelector(".skill-row-button");
  const icon = fragment.querySelector(".skill-icon");
  const copyButton = fragment.querySelector("[data-row-copy]");
  const favoriteButton = fragment.querySelector("[data-row-favorite]");

  icon.textContent = skillSymbol(item);
  fragment.querySelector(".skill-title").textContent = item.title;
  fragment.querySelector(".skill-desc").textContent = item.tools || "暂无说明";
  fragment.querySelector(".skill-trigger").textContent = `触发词：${item.trigger_words || "未填写"}`;
  fragment.querySelector(".skill-app").textContent = `应用：${detailCategory(item)}`;
  fragment.querySelector(".skill-badge").textContent = detailCategory(item).includes("官方") ? "官方" : "精选";
  favoriteButton.textContent = favorites.has(item.record_id) ? "已收藏" : "收藏";

  rowButton.addEventListener("click", () => {
    setActiveDetail(item);
    setPage("skills");
  });
  copyButton.addEventListener("click", (event) => {
    event.stopPropagation();
    copyText(item.trigger_words || item.title);
    copyButton.textContent = "已复制";
    setTimeout(() => {
      copyButton.textContent = "复制";
    }, 1000);
  });
  favoriteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite(item.record_id);
  });
  return fragment;
}

function renderFeatured() {
  featuredGrid.innerHTML = "";
  getFilteredItems()
    .slice(0, 4)
    .forEach((item) => {
      const button = document.createElement("button");
      button.className = "feature-card";
      button.type = "button";
      button.innerHTML = `
        <strong>${item.title}</strong>
        <span>${detailCategory(item)}</span>
        <small>${item.trigger_words || "无触发词"}</small>
      `;
      button.addEventListener("click", () => {
        setActiveDetail(item);
        setPage("skills");
      });
      featuredGrid.appendChild(button);
    });
}

function renderFilters() {
  const counts = new Map([["全部技能", portfolioItems.length]]);
  portfolioItems.forEach((item) => {
    (item.categories || []).forEach((category) => counts.set(category, (counts.get(category) || 0) + 1));
  });

  filters.innerHTML = "";
  [...counts.entries()]
    .sort((a, b) => {
      if (a[0] === "全部技能") return -1;
      if (b[0] === "全部技能") return 1;
      return b[1] - a[1];
    })
    .slice(0, 6)
    .forEach(([category, count]) => {
      const button = document.createElement("button");
      button.className = `filter-chip${category === activeCategory ? " is-active" : ""}`;
      button.type = "button";
      button.textContent = `${category} ${count}`;
      button.addEventListener("click", () => {
        activeCategory = category;
        renderAll();
      });
      filters.appendChild(button);
    });
}

function renderGrid() {
  const items = getFilteredItems();
  grid.innerHTML = "";
  if (!items.length) {
    grid.innerHTML = `<article class="skill-empty">没有匹配结果，换个分类或搜索词试试。</article>`;
    return;
  }
  items.forEach((item) => grid.appendChild(buildSkillRow(item)));
  if (!selectedItemId) {
    setActiveDetail(items[0]);
  }
}

function renderTriggerList() {
  const items = getFilteredItems().filter((item) => item.trigger_words);
  const query = triggerSearchQuery.trim().toLowerCase();
  const filtered = !query
    ? items
    : items.filter((item) => `${item.title} ${item.trigger_words}`.toLowerCase().includes(query));

  triggerList.innerHTML = "";
  filtered.forEach((item) => {
    const row = document.createElement("div");
    row.className = "trigger-card";
    row.innerHTML = `
      <div class="trigger-copy">
        <strong>${item.trigger_words}</strong>
        <span>${item.title}</span>
      </div>
      <div class="trigger-actions">
        <button class="ghost-select" type="button">复制</button>
        <button class="ghost-select" type="button">查看技能</button>
      </div>
    `;
    row.querySelectorAll("button")[0].addEventListener("click", () => copyText(item.trigger_words));
    row.querySelectorAll("button")[1].addEventListener("click", () => {
      setActiveDetail(item);
      setPage("skills");
    });
    triggerList.appendChild(row);
  });
}

function renderAppGrid() {
  const counts = categoryCounts();
  appGrid.innerHTML = "";
  counts.forEach(([category, count], index) => {
    const card = document.createElement("button");
    card.className = "app-card";
    card.type = "button";
    const sample = portfolioItems.find((item) => (item.categories || []).includes(category));
    card.innerHTML = `
      <span class="app-card-swatch" style="background:${palette[index % palette.length]}"></span>
      <strong>${category}</strong>
      <small>${formatNumber(count)} 个技能</small>
      <span>${sample ? sample.title : "点击查看具体条目"}</span>
    `;
    card.addEventListener("click", () => openSkillsWithCategory(category));
    appGrid.appendChild(card);
  });
}

function setDonutSegment(node, percent, offsetPercent) {
  const dash = donutCircumference * percent;
  const offset = donutCircumference * (1 - offsetPercent);
  node.style.strokeDasharray = `${dash} ${donutCircumference}`;
  node.style.strokeDashoffset = `${offset}`;
}

function renderAnalyticsCharts() {
  const topCategories = categoryCounts();
  const topThree = topCategories.slice(0, 3);
  const total = portfolioItems.length || 1;

  const a = (topThree[0]?.[1] || 0) / total;
  const b = (topThree[1]?.[1] || 0) / total;
  const c = (topThree[2]?.[1] || 0) / total;

  setDonutSegment(donutA, a, 0);
  setDonutSegment(donutB, b, a);
  setDonutSegment(donutC, c, a + b);

  legendList.innerHTML = "";
  topThree.forEach(([name, count], index) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `<strong><span class="legend-dot" style="background:${palette[index]}"></span>${name}</strong><small>${formatNumber(count)} 个技能</small>`;
    legendList.appendChild(item);
  });

  barChart.innerHTML = "";
  const maxCategory = topCategories[0]?.[1] || 1;
  topCategories.slice(0, 6).forEach(([name, count], index) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <div class="bar-label"><span>${name}</span><strong>${count}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / maxCategory) * 100}%;background:linear-gradient(90deg, ${palette[index]}, #ff8b2b)"></div></div>
    `;
    barChart.appendChild(row);
  });

  const buckets = [
    ["1-4", 0],
    ["5-8", 0],
    ["9-12", 0],
    ["13-16", 0],
    ["17+", 0],
  ];
  portfolioItems.forEach((item) => {
    const len = (item.trigger_words || "").length;
    if (len <= 4) buckets[0][1] += 1;
    else if (len <= 8) buckets[1][1] += 1;
    else if (len <= 12) buckets[2][1] += 1;
    else if (len <= 16) buckets[3][1] += 1;
    else buckets[4][1] += 1;
  });
  const maxBucket = Math.max(...buckets.map(([, value]) => value), 1);
  miniBars.innerHTML = "";
  buckets.forEach(([label, value], index) => {
    const col = document.createElement("div");
    col.className = "mini-bar-col";
    col.innerHTML = `
      <div class="mini-bar-stick" style="height:${Math.max(24, (value / maxBucket) * 120)}px;background:linear-gradient(180deg, ${palette[index]}, #c7b8ff)"></div>
      <strong>${value}</strong>
      <span>${label}</span>
    `;
    miniBars.appendChild(col);
  });

  heatmap.innerHTML = "";
  portfolioItems.slice(0, 24).forEach((item, index) => {
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    cell.style.background = `${palette[index % palette.length]}44`;
    heatmap.appendChild(cell);
  });

  const signals = signalCounts().slice(0, 5);
  const maxSignal = signals[0]?.[1] || 1;
  signalList.innerHTML = "";
  signals.forEach(([label, count], index) => {
    const row = document.createElement("div");
    row.className = "signal-row";
    row.innerHTML = `
      <div class="signal-fill" style="width:${34 + (count / maxSignal) * 62}%;background:linear-gradient(90deg, ${palette[index]}, rgba(255,255,255,0.08))"></div>
      <div class="signal-copy">
        <div><strong>${label}</strong><small>出现 ${formatNumber(count)} 次</small></div>
        <div class="signal-score">${formatNumber(count)}</div>
      </div>
    `;
    signalList.appendChild(row);
  });
}

function buildGraphData(mode) {
  if (mode === "triggers") {
    const tokens = signalCounts().slice(0, 10);
    const tokenNodes = tokens.map(([token, count], index) => ({
      id: `token:${token}`,
      label: token,
      value: count,
      kind: "token",
      color: palette[index % palette.length],
    }));
    const skillNodes = getFilteredItems().slice(0, 18).map((item, index) => ({
      id: item.record_id,
      label: item.title,
      value: Math.max(1, (item.trigger_words || "").length),
      kind: "skill",
      color: palette[(index + 2) % palette.length],
      item,
    }));
    const links = [];
    skillNodes.forEach((node) => {
      tokenizeSignals(node.item).forEach((token) => {
        if (tokens.some(([name]) => `#${name.replace(/^#/, "")}` === token || name === token)) {
          links.push({ source: node.id, target: `token:${token}`, weight: 1 });
        }
      });
    });
    return { nodes: [...tokenNodes, ...skillNodes], links };
  }

  const categories = categoryCounts().slice(0, 10);
  const categoryNodes = categories.map(([name, count], index) => ({
    id: `category:${name}`,
    label: name,
    value: count,
    kind: "category",
    color: palette[index % palette.length],
  }));
  const skillNodes = getFilteredItems().slice(0, 18).map((item, index) => ({
    id: item.record_id,
    label: item.title,
    value: Math.max(1, (item.tools || "").length),
    kind: "skill",
    color: palette[(index + 2) % palette.length],
    item,
  }));
  const links = [];
  skillNodes.forEach((node) => {
    (node.item.categories || []).forEach((category) => {
      if (categories.some(([name]) => name === category)) {
        links.push({ source: node.id, target: `category:${category}`, weight: 1 });
      }
    });
  });
  return { nodes: [...categoryNodes, ...skillNodes], links };
}

function runGraphAction(action) {
  if (!graphState) return;
  if (action === "reheat") {
    graphState.simulation.alpha(1).restart();
  } else if (action === "center") {
    graphState.svg
      .transition()
      .duration(250)
      .call(graphState.zoom.transform, window.d3.zoomIdentity);
  } else if (action === "fit") {
    const bounds = graphState.root.node().getBBox();
    if (!Number.isFinite(bounds.x + bounds.y + bounds.width + bounds.height) || !bounds.width || !bounds.height) {
      return;
    }
    const width = graphState.width;
    const height = graphState.height;
    const scale = Math.min(width / Math.max(1, bounds.width) * 0.86, height / Math.max(1, bounds.height) * 0.86, 1.2);
    const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
    const ty = height / 2 - (bounds.y + bounds.height / 2) * scale;
    graphState.svg
      .transition()
      .duration(250)
      .call(graphState.zoom.transform, window.d3.zoomIdentity.translate(tx, ty).scale(scale));
  }
}

function renderDynamicGraph() {
  if (!window.d3 || !graphSvg) return;
  const d3 = window.d3;
  const stage = graphSvg.closest(".constellation-stage");
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const data = buildGraphData(chartMode);
  const svg = d3.select(graphSvg);
  svg.selectAll("*").remove();
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const root = svg.append("g");
  const link = root
    .append("g")
    .attr("stroke-opacity", 0.28)
    .selectAll("line")
    .data(data.links)
    .join("line")
    .attr("stroke", "#d9d9d9")
    .attr("stroke-width", 1.3);

  const node = root
    .append("g")
    .selectAll("g")
    .data(data.nodes)
    .join("g")
    .attr("class", "graph-node");

  node
    .append("circle")
    .attr("r", (d) => (d.kind === "skill" ? 18 + Math.min(28, d.value / 3) : 24 + Math.min(36, d.value / 2.5)))
    .attr("fill", (d) => d.color)
    .attr("fill-opacity", 0.78)
    .attr("stroke", "rgba(255,255,255,0.9)")
    .attr("stroke-width", 2);

  node
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", (d) => (d.kind === "skill" ? 34 : 48))
    .attr("font-size", (d) => (d.kind === "skill" ? 12 : 14))
    .attr("font-weight", "700")
    .attr("fill", "#2f3135")
    .selectAll("tspan")
    .data((d) => {
      const label = d.label.length > 12 ? `${d.label.slice(0, 11)}…` : d.label;
      return [label, formatNumber(d.value)];
    })
    .join("tspan")
    .attr("x", 0)
    .attr("dy", (_, index) => (index === 0 ? 0 : 18))
    .attr("fill-opacity", (_, index) => (index === 0 ? 1 : 0.55))
    .text((d) => d);

  node
    .style("cursor", "pointer")
    .on("click", (_, d) => {
      if (d.kind === "skill" && d.item) {
        setActiveDetail(d.item);
        setPage("skills");
      } else if (d.kind === "category") {
        openSkillsWithCategory(d.label);
      } else if (d.kind === "token") {
        triggerSearchQuery = d.label.replace(/^#/, "");
        if (triggerSearchInput) triggerSearchInput.value = triggerSearchQuery;
        renderTriggerList();
        setPage("triggers");
      }
    });

  const simulation = d3
    .forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.links).id((d) => d.id).distance((d) => (chartMode === "categories" ? 120 : 140)))
    .force("charge", d3.forceManyBody().strength((d) => (d.kind === "skill" ? -120 : -220)))
    .force("collide", d3.forceCollide().radius((d) => (d.kind === "skill" ? 42 : 64)))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(0.04))
    .force("y", d3.forceY(height / 2).strength(0.04));

  const drag = d3
    .drag()
    .on("start", (event) => {
      if (!event.active) simulation.alphaTarget(0.24).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    })
    .on("drag", (event) => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    })
    .on("end", (event) => {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    });

  node.call(drag);

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y)
      .attr("stroke", (d) => (d.source.color || d.target.color));

    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  const zoom = d3.zoom().scaleExtent([0.55, 2.4]).on("zoom", (event) => root.attr("transform", event.transform));
  svg.call(zoom);

  graphState = { simulation, svg, root, zoom, width, height };
  setTimeout(() => runGraphAction("fit"), 320);
}

function renderAll() {
  if (!portfolioItems.length) return;
  renderFilters();
  renderFeatured();
  renderGrid();
  renderTriggerList();
  renderAppGrid();
  renderAnalyticsCharts();
  renderDynamicGraph();
  if (!selectedItemId) {
    const first = getFilteredItems()[0];
    if (first) setActiveDetail(first);
  }
  favoritesToggle.textContent = favoritesOnly ? "显示全部" : "只看收藏";
  sortToggle.textContent =
    sortMode === "title" ? "排序：名称" : sortMode === "hot" ? "排序：热度" : "排序：默认";
}

function cycleSortMode() {
  sortMode = sortMode === "default" ? "title" : sortMode === "title" ? "hot" : "default";
  renderAll();
}

async function loadPortfolio(force = false) {
  const payload = await fetchPayload(force);
  portfolioItems = payload.items || [];
  buildStats(payload);
  renderAll();
}

function setupEvents() {
  pageNavButtons.forEach((button) =>
    button.addEventListener("click", () => {
      setPage(button.dataset.pageTarget);
      if (button.dataset.pageTarget === "insight") {
        setTimeout(renderDynamicGraph, 50);
      }
    })
  );

  openPageButtons.forEach((button) =>
    button.addEventListener("click", () => {
      setPage(button.dataset.openPage);
      if (button.dataset.openPage === "skills" && searchQuery) {
        renderGrid();
      }
      if (button.dataset.openPage === "insight") {
        setTimeout(renderDynamicGraph, 50);
      }
    })
  );

  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim();
    renderAll();
  });
  homeSearchButton.addEventListener("click", () => {
    setPage("skills");
    renderGrid();
  });
  triggerSearchInput?.addEventListener("input", (event) => {
    triggerSearchQuery = event.target.value.trim();
    renderTriggerList();
  });
  syncButton.addEventListener("click", async () => {
    syncButton.textContent = "同步中...";
    await loadPortfolio(true);
    syncButton.textContent = "⟳ 重新同步数据";
  });
  favoritesToggle.addEventListener("click", () => {
    favoritesOnly = !favoritesOnly;
    renderAll();
  });
  sortToggle?.addEventListener("click", cycleSortMode);
  filterReset?.addEventListener("click", () => {
    activeCategory = "全部技能";
    searchQuery = "";
    triggerSearchQuery = "";
    searchInput.value = "";
    if (triggerSearchInput) triggerSearchInput.value = "";
    favoritesOnly = false;
    renderAll();
  });
  statsToggle?.addEventListener("click", () => {
    statsMode = statsMode === "week" ? "total" : "week";
    buildStats(payloadCache || window.__PORTFOLIO_DATA__);
  });
  clearDetailButton?.addEventListener("click", clearDetail);
  detailFavoriteButton?.addEventListener("click", () => {
    if (!selectedItemId) return;
    toggleFavorite(selectedItemId);
  });
  copyTriggerButton?.addEventListener("click", () => copyText(detailRefs.trigger.textContent));
  chartModeButtons.forEach((button) =>
    button.addEventListener("click", () => {
      chartMode = button.dataset.chartMode;
      chartModeButtons.forEach((node) => node.classList.toggle("is-active", node.dataset.chartMode === chartMode));
      renderDynamicGraph();
    })
  );
  graphCenterButton?.addEventListener("click", () => runGraphAction("center"));
  graphFitButton?.addEventListener("click", () => runGraphAction("fit"));
  graphReheatButton?.addEventListener("click", () => runGraphAction("reheat"));
  window.addEventListener("resize", () => {
    if (activePage === "insight") renderDynamicGraph();
  });
}

setupEvents();
clearDetail();
setPage("home");
loadPortfolio().catch((error) => {
  if (grid) {
    grid.innerHTML = `<article class="skill-empty">数据加载失败：${error.message}</article>`;
  }
});
