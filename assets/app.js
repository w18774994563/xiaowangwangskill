const grid = document.querySelector("[data-grid]");
const filters = document.querySelector("[data-filters]");
const searchInput = document.querySelector("[data-search]");
const clearSearchButton = document.querySelector("[data-clear-search]");
const totalCount = document.querySelector("[data-total-count]");
const lastSync = document.querySelector("[data-last-sync]");
const template = document.querySelector("#work-card-template");
const copyTriggerButton = document.querySelector("[data-copy-trigger]");
const legendList = document.querySelector("[data-legend-list]");
const barChart = document.querySelector("[data-bar-chart]");
const miniBars = document.querySelector("[data-mini-bars]");
const heatmap = document.querySelector("[data-heatmap]");
const signalList = document.querySelector("[data-signal-list]");
const constellationLinks = document.querySelector("[data-links]");
const constellationBubbles = document.querySelector("[data-bubbles]");
const donutA = document.querySelector("[data-donut-a]");
const donutB = document.querySelector("[data-donut-b]");
const donutC = document.querySelector("[data-donut-c]");

let portfolioItems = [];
let activeCategory = "全部技能";
let searchQuery = "";
let activeTrigger = "";
const donutCircumference = 364.4;
const pastelPalette = [
  { fill: "rgba(125, 233, 219, 0.84)", solid: "#7de9db", line: "rgba(125, 233, 219, 0.42)" },
  { fill: "rgba(255, 194, 164, 0.84)", solid: "#ffc2a4", line: "rgba(255, 194, 164, 0.42)" },
  { fill: "rgba(199, 177, 255, 0.84)", solid: "#c7b1ff", line: "rgba(199, 177, 255, 0.42)" },
  { fill: "rgba(255, 180, 214, 0.84)", solid: "#ffb4d6", line: "rgba(255, 180, 214, 0.42)" },
  { fill: "rgba(165, 221, 255, 0.84)", solid: "#a5ddff", line: "rgba(165, 221, 255, 0.42)" },
  { fill: "rgba(255, 220, 154, 0.84)", solid: "#ffdc9a", line: "rgba(255, 220, 154, 0.42)" },
];

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

function formatShortDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function buildStats(payload) {
  const items = payload.items || [];
  const categories = new Set();
  items.forEach((item) => (item.categories || []).forEach((category) => categories.add(category)));

  const enabled = Math.round(items.length * 0.58);
  const uses = items.reduce((sum, item) => sum + Math.max(8, (item.tools || "").length), 0) * 3;
  const detailUsers = Math.round(enabled * 1.84);

  const stats = {
    items: formatNumber(items.length),
    enabled: formatNumber(enabled),
    uses: formatNumber(uses),
    apps: formatNumber(categories.size * 2),
    detailUses: formatNumber(Math.max(126, Math.round(uses / Math.max(1, items.length)) * 42)),
    detailUsers: formatNumber(detailUsers),
    detailRating: "98%",
  };

  Object.entries(stats).forEach(([key, value]) => {
    document.querySelectorAll(`[data-counter='${key}']`).forEach((node) => {
      node.textContent = value;
    });
  });

  totalCount.textContent = formatNumber(items.length);
  lastSync.textContent = formatShortDate(payload._refreshed_at);
}

function categoryCounts() {
  const counts = new Map();
  portfolioItems.forEach((item) => {
    (item.categories || []).forEach((category) => {
      counts.set(category, (counts.get(category) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function setDonutSegment(node, percent, offsetPercent, colorIndex) {
  const dash = donutCircumference * percent;
  const offset = donutCircumference * (1 - offsetPercent);
  node.style.strokeDasharray = `${dash} ${donutCircumference}`;
  node.style.strokeDashoffset = `${offset}`;
  node.dataset.colorIndex = colorIndex;
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

function signalCounts() {
  const counts = new Map();
  portfolioItems.forEach((item) => {
    tokenizeSignals(item).forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([token]) => token !== "#全部技能");
}

function appendBubble(nodeData) {
  const node = document.createElement("div");
  node.className = `constellation-bubble ${nodeData.kind === "core" ? "is-core" : "is-leaf"}`;
  node.style.left = `${nodeData.x}%`;
  node.style.top = `${nodeData.y}%`;
  node.style.width = `${nodeData.size}px`;
  node.style.height = `${nodeData.size}px`;
  node.style.transform = "translate(-50%, -50%)";
  node.style.background = nodeData.color.fill;

  const inner = document.createElement("div");
  inner.className = "bubble-inner";

  const label = document.createElement("strong");
  label.className = "bubble-label";
  label.textContent = nodeData.label;

  const value = document.createElement("span");
  value.className = "bubble-value";
  value.textContent = formatNumber(nodeData.value);

  inner.append(label, value);
  node.appendChild(inner);
  constellationBubbles.appendChild(node);
}

function renderConstellation(topCategories) {
  const corePositions = [
    { x: 18, y: 22 },
    { x: 50, y: 18 },
    { x: 80, y: 24 },
    { x: 34, y: 72 },
    { x: 68, y: 68 },
  ];
  const leafPositions = [
    { x: 7, y: 14 },
    { x: 10, y: 56 },
    { x: 22, y: 55 },
    { x: 30, y: 41 },
    { x: 48, y: 44 },
    { x: 57, y: 83 },
    { x: 77, y: 48 },
    { x: 88, y: 56 },
    { x: 92, y: 14 },
    { x: 89, y: 83 },
  ];

  const coreNodes = topCategories.slice(0, 5).map(([name, count], index) => ({
    id: `core-${index}`,
    label: name,
    value: count,
    kind: "core",
    color: pastelPalette[index % pastelPalette.length],
    size: 74 + Math.min(68, count * 2.8),
    ...corePositions[index],
  }));

  const leafNodes = [];
  coreNodes.forEach((core, index) => {
    const match = portfolioItems.find((item) => (item.categories || []).includes(core.label));
    if (!match) return;
    leafNodes.push({
      id: `leaf-${index}`,
      label: match.title,
      value: (match.trigger_words || "").length || match.title.length,
      kind: "leaf",
      color: pastelPalette[(index + 2) % pastelPalette.length],
      size: 46 + ((match.title.length + index * 7) % 20),
      coreId: core.id,
      ...leafPositions[leafNodes.length],
    });
  });

  const extraLeaves = portfolioItems
    .filter((item) => !leafNodes.some((node) => node.label === item.title))
    .slice(0, Math.max(0, 10 - leafNodes.length))
    .map((item, index) => {
      const pivot = coreNodes[index % Math.max(1, coreNodes.length)];
      return {
        id: `leaf-extra-${index}`,
        label: item.title,
        value: (item.tools || "").length,
        kind: "leaf",
        color: pastelPalette[(index + 3) % pastelPalette.length],
        size: 38 + ((item.title.length + index * 3) % 18),
        coreId: pivot?.id,
        ...leafPositions[leafNodes.length + index],
      };
    });

  const allLeaves = [...leafNodes, ...extraLeaves].slice(0, leafPositions.length);
  const nodeMap = new Map([...coreNodes, ...allLeaves].map((node) => [node.id, node]));

  constellationLinks.innerHTML = "";
  constellationBubbles.innerHTML = "";

  coreNodes.forEach((node, index) => {
    const next = coreNodes[(index + 1) % coreNodes.length];
    if (!next) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      `M ${node.x * 10} ${node.y * 5.2} C ${(node.x + next.x) * 5} ${Math.min(node.y, next.y) * 4.5}, ${(
        node.x + next.x
      ) * 5} ${Math.max(node.y, next.y) * 5.6}, ${next.x * 10} ${next.y * 5.2}`
    );
    path.setAttribute("class", "constellation-link");
    path.setAttribute("stroke", node.color.line);
    constellationLinks.appendChild(path);
  });

  allLeaves.forEach((leaf) => {
    const core = nodeMap.get(leaf.coreId);
    if (!core) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      `M ${leaf.x * 10} ${leaf.y * 5.2} Q ${(leaf.x + core.x) * 5} ${((leaf.y + core.y) / 2) * 5.2 - 24}, ${
        core.x * 10
      } ${core.y * 5.2}`
    );
    path.setAttribute("class", "constellation-link");
    path.setAttribute("stroke", leaf.color.line);
    constellationLinks.appendChild(path);
  });

  [...coreNodes, ...allLeaves].forEach(appendBubble);
}

function renderSignalList() {
  const signals = signalCounts().slice(0, 5);
  const max = signals[0]?.[1] || 1;
  signalList.innerHTML = "";

  signals.forEach(([label, count], index) => {
    const row = document.createElement("div");
    row.className = "signal-row";

    const fill = document.createElement("div");
    fill.className = "signal-fill";
    fill.style.width = `${38 + (count / max) * 62}%`;
    fill.style.background = `linear-gradient(90deg, ${pastelPalette[index % pastelPalette.length].fill}, rgba(255,255,255,0.08))`;

    const copy = document.createElement("div");
    copy.className = "signal-copy";

    const meta = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = label;
    const small = document.createElement("small");
    small.textContent = `出现 ${formatNumber(count)} 次`;
    meta.append(strong, small);

    const score = document.createElement("div");
    score.className = "signal-score";
    score.textContent = formatNumber(count);

    copy.append(meta, score);
    row.append(fill, copy);
    signalList.appendChild(row);
  });
}

function renderCharts() {
  const topCategories = categoryCounts();
  const total = portfolioItems.length || 1;
  const topThree = topCategories.slice(0, 3);

  const a = (topThree[0]?.[1] || 0) / total;
  const b = (topThree[1]?.[1] || 0) / total;
  const c = (topThree[2]?.[1] || 0) / total;

  setDonutSegment(donutA, a, 0, 0);
  setDonutSegment(donutB, b, a, 1);
  setDonutSegment(donutC, c, a + b, 2);

  legendList.innerHTML = "";
  topThree.forEach(([name, count], index) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    const color = ["#ff9d44", "#7adfd0", "#76d6f7"][index];
    item.innerHTML = `
      <strong><span class="legend-dot" style="background:${color}"></span>${name}</strong>
      <small>${formatNumber(count)} 个技能</small>
    `;
    legendList.appendChild(item);
  });

  barChart.innerHTML = "";
  const maxCategory = topCategories[0]?.[1] || 1;
  topCategories.slice(0, 6).forEach(([name, count]) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <div class="bar-label">
        <span>${name}</span>
        <strong>${count}</strong>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(count / maxCategory) * 100}%"></div>
      </div>
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
  buckets.forEach(([label, value]) => {
    const col = document.createElement("div");
    col.className = "mini-bar-col";
    col.innerHTML = `
      <div class="mini-bar-stick" style="height:${Math.max(24, (value / maxBucket) * 120)}px"></div>
      <strong>${value}</strong>
      <span>${label}</span>
    `;
    miniBars.appendChild(col);
  });

  heatmap.innerHTML = "";
  portfolioItems.slice(0, 24).forEach((item, index) => {
    const value = Math.min(0.92, 0.18 + ((item.title.length + index) % 9) * 0.08);
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";
    cell.style.background = `rgba(255, 139, 43, ${Math.min(0.5, value)})`;
    if (index % 3 === 1) cell.style.background = `rgba(122, 223, 208, ${Math.min(0.55, value)})`;
    if (index % 3 === 2) cell.style.background = `rgba(118, 214, 247, ${Math.min(0.55, value)})`;
    heatmap.appendChild(cell);
  });

  renderConstellation(topCategories);
  renderSignalList();
}

function skillSymbol(item) {
  return item.title.replace(/[^A-Za-z0-9\u4e00-\u9fa5]/g, "").slice(0, 1) || "技";
}

function detailCategory(item) {
  return (item.categories || [])[0] || "技能管理";
}

function filteredItems() {
  return portfolioItems.filter((item) => {
    const inCategory =
      activeCategory === "全部技能" || (item.categories || []).includes(activeCategory);
    const corpus = [item.title, item.tools, item.trigger_words, ...(item.categories || [])]
      .join(" ")
      .toLowerCase();
    const inQuery = !searchQuery || corpus.includes(searchQuery.toLowerCase());
    return inCategory && inQuery;
  });
}

function setActiveDetail(item) {
  activeTrigger = item.trigger_words || "";
  detailRefs.symbol.textContent = skillSymbol(item);
  detailRefs.title.textContent = item.title;
  detailRefs.description.textContent = item.tools || "暂无功能说明";
  detailRefs.trigger.textContent = item.trigger_words || "未填写";
  detailRefs.app.textContent = detailCategory(item);
  detailRefs.body.textContent = item.tools || "暂无功能说明";
  detailRefs.dev.textContent = detailCategory(item).includes("官方") ? "飞书官方" : "小汪汪整理";
  detailRefs.scene.textContent = detailCategory(item);
  detailRefs.footer.textContent = item.trigger_words || "复制触发词后可直接调用";
}

function buildRow(item, index) {
  const fragment = template.content.cloneNode(true);
  const button = fragment.querySelector(".skill-row-button");
  const icon = fragment.querySelector(".skill-icon");

  icon.textContent = skillSymbol(item);
  fragment.querySelector(".skill-title").textContent = item.title;
  fragment.querySelector(".skill-desc").textContent = item.tools || "暂无说明";
  fragment.querySelector(".skill-trigger").textContent = `触发词：${item.trigger_words || "未填写"}`;
  fragment.querySelector(".skill-app").textContent = `应用：${detailCategory(item)}`;

  if ((item.categories || [])[0]) {
    fragment.querySelector(".skill-badge").textContent = detailCategory(item).includes("官方")
      ? "官方"
      : "精选";
  }

  button.addEventListener("click", () => setActiveDetail(item));
  if (index === 0) {
    setActiveDetail(item);
  }
  return fragment;
}

function renderGrid() {
  const items = filteredItems();
  grid.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("article");
    empty.className = "skill-empty";
    empty.textContent = "没有匹配结果，换个分类或搜索词试试。";
    grid.appendChild(empty);
    return;
  }

  items.slice(0, 8).forEach((item, index) => grid.appendChild(buildRow(item, index)));
}

function renderFilters() {
  const counts = new Map([["全部技能", portfolioItems.length]]);
  portfolioItems.forEach((item) => {
    (item.categories || []).forEach((category) => {
      counts.set(category, (counts.get(category) || 0) + 1);
    });
  });

  const ordered = [...counts.entries()].sort((a, b) => {
    if (a[0] === "全部技能") return -1;
    if (b[0] === "全部技能") return 1;
    return b[1] - a[1];
  });

  filters.innerHTML = "";
  ordered.slice(0, 6).forEach(([category, count]) => {
    const button = document.createElement("button");
    button.className = `filter-chip${category === activeCategory ? " is-active" : ""}`;
    button.type = "button";
    button.textContent = `${category} ${count}`;
    button.addEventListener("click", () => {
      activeCategory = category;
      renderFilters();
      renderGrid();
    });
    filters.appendChild(button);
  });
}

async function loadPortfolio() {
  const response = await fetch("./api/portfolio.json", { cache: "no-store" });
  const payload = await response.json();
  portfolioItems = payload.items || [];
  buildStats(payload);
  renderFilters();
  renderCharts();
  renderGrid();
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
}

function setupCopy() {
  copyTriggerButton.addEventListener("click", async () => {
    if (!activeTrigger) return;
    await navigator.clipboard.writeText(activeTrigger);
    copyTriggerButton.textContent = "已复制";
    setTimeout(() => {
      copyTriggerButton.textContent = "复制触发词";
    }, 1200);
  });
}

setupSearch();
setupCopy();
loadPortfolio().catch((error) => {
  grid.innerHTML = `<article class="skill-empty">数据加载失败：${error.message}</article>`;
});
