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

let portfolioItems = [];
let activeCategory = "全部";

function formatUpdatedAt(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, "0")}`;
}

function updateCounters(payload) {
  const categories = new Set();
  (payload.items || []).forEach((item) => {
    (item.categories || []).forEach((category) => categories.add(category));
  });

  const counters = {
    items: String(payload._count || payload.items?.length || 0),
    categories: String(categories.size),
    updated: formatUpdatedAt(payload._refreshed_at),
  };

  document.querySelectorAll("[data-counter]").forEach((node) => {
    const key = node.dataset.counter;
    node.textContent = counters[key] ?? "--";
  });
}

function openModal(item) {
  modalTitle.textContent = item.title;
  modalCategory.textContent = (item.categories || []).join(" / ") || "未分类";
  modalMeta.textContent = [item.trigger_words ? `触发词：${item.trigger_words}` : "", item.tools]
    .filter(Boolean)
    .join(" · ");
  modalDetail.innerHTML = `
    <p><strong>功能：</strong>${item.tools || "未填写"}</p>
    <p><strong>触发词：</strong>${item.trigger_words || "未填写"}</p>
    <p><strong>分类：</strong>${(item.categories || []).join(" / ") || "未分类"}</p>
    <p><strong>序号：</strong>${item.order || "--"}</p>
  `;
  modal.showModal();
}

function buildCard(item) {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".card");
  const button = fragment.querySelector(".card-media");
  const image = fragment.querySelector("img");

  fragment.querySelector(".card-category").textContent =
    (item.categories || []).join(" / ") || "未分类";
  fragment.querySelector(".card-duration").textContent = item.trigger_words || "--";
  fragment.querySelector(".card-title").textContent = item.title;
  fragment.querySelector(".card-tools").textContent = item.tools || "功能说明待补充";

  image.src =
    item.cover_url ||
    "https://images.unsplash.com/photo-1526378800651-c9b484d0ea04?auto=format&fit=crop&w=1200&q=80";
  image.alt = item.title;

  button.addEventListener("click", () => openModal(item));
  card.dataset.category = (item.categories || []).join(",");
  return fragment;
}

function renderGrid() {
  const filtered =
    activeCategory === "全部"
      ? portfolioItems
      : portfolioItems.filter((item) => (item.categories || []).includes(activeCategory));

  grid.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("article");
    empty.className = "empty-state";
    empty.textContent = "当前分类下还没有可展示的技能。";
    grid.appendChild(empty);
    return;
  }

  filtered.forEach((item) => grid.appendChild(buildCard(item)));
}

function renderFilters() {
  const categories = new Set(["全部"]);
  portfolioItems.forEach((item) => (item.categories || []).forEach((category) => categories.add(category)));
  filters.innerHTML = "";

  [...categories].forEach((category) => {
    const button = document.createElement("button");
    button.className = `filter-button${category === activeCategory ? " is-active" : ""}`;
    button.type = "button";
    button.textContent = category;
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
    topbar.classList.toggle("is-scrolled", window.scrollY > 16);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function setupModal() {
  closeModalButton.addEventListener("click", () => {
    modal.close();
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.close();
    }
  });
}

function setupAurora() {
  const canvas = document.querySelector(".aurora");
  const context = canvas.getContext("2d");
  const dots = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    dots.length = 0;
    for (let index = 0; index < 18; index += 1) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 60 + Math.random() * 160,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        color: index % 2 === 0 ? "122,247,255" : "86,129,255",
      });
    }
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach((dot) => {
      dot.x += dot.vx;
      dot.y += dot.vy;
      if (dot.x < -dot.r) dot.x = canvas.width + dot.r;
      if (dot.x > canvas.width + dot.r) dot.x = -dot.r;
      if (dot.y < -dot.r) dot.y = canvas.height + dot.r;
      if (dot.y > canvas.height + dot.r) dot.y = -dot.r;

      const gradient = context.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.r);
      gradient.addColorStop(0, `rgba(${dot.color},0.16)`);
      gradient.addColorStop(1, `rgba(${dot.color},0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      context.fill();
    });
    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
}

setupReveals();
setupTopbar();
setupModal();
setupAurora();
loadPortfolio();
