import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(projectRoot, "dist");
const templatePath = path.join(distDir, "index.html");
const targetHtmlDir = path.join(distDir, "frontend-prompts");
const targetHtmlPath = path.join(targetHtmlDir, "index.html");
const targetLlmsPath = path.join(distDir, "llms.txt");

const apiBaseUrl = (process.env.GEO_API_BASE_URL || process.env.SITEMAP_API_BASE_URL || "https://ownai.icu/api").replace(/\/$/, "");
const siteUrl = "https://ownai.icu";

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function request(pathname, init) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${pathname} returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.code !== 0 || !payload.data) {
    throw new Error(payload.message || `${pathname} returned an invalid response`);
  }
  return payload.data;
}

async function fetchArtworks(maxPages = 8) {
  const records = [];
  let total = 729;
  for (let current = 1; current <= maxPages; current++) {
    try {
      const page = await request("/artwork/list/page/vo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, pageSize: 20 }),
      });
      if (page.total) {
        total = Number(page.total);
      }
      const list = page.records || [];
      if (!list.length) break;
      records.push(...list);
      if (current >= (Number(page.pages) || 1)) break;
    } catch (e) {
      console.warn(`[GEO] Warning: failed to fetch page ${current}: ${e.message}`);
      break;
    }
  }
  return { records, total };
}

function categorizeArtworks(records) {
  const groups = {
    landing: {
      title: "科技风与品牌落地页（Landing Pages）",
      desc: "涵盖深色科技、沉浸式视频首屏、品牌官网、三章节策略叙事与服务流转页面，适用于企业官网、产品发布页与 AI 创新项目。",
      items: [],
    },
    dashboard: {
      title: "SaaS 业务系统与数据看板（Dashboards）",
      desc: "涵盖复杂指标看板、SaaS 新手引导流、多租户控制台与管理后台界面，兼具高信息密度与现代化交互质感。",
      items: [],
    },
    mobile: {
      title: "移动端与高保真交互界面（Mobile & App UI）",
      desc: "高保真复刻 iOS 与现代移动端界面，包含卡片流、灵动岛交互、弹性菜单、AI 对话流与个性化信息架构。",
      items: [],
    },
    component: {
      title: "常用 UI 模块与高频组件（Components）",
      desc: "价格方案卡片、折叠面板、导航菜单、登录注册表单与 3D 悬浮卡片等现代化前端原子组件与微交互。",
      items: [],
    },
    motion: {
      title: "动效设计与视觉背景（Motion & Visuals）",
      desc: "呼吸光效、粒子网格、3D 视觉循环与沉浸式视频背景，为网页提供强烈的科技感与现代视觉冲击力。",
      items: [],
    },
  };

  for (const item of records) {
    const cat = item.category?.name || "";
    const tags = (item.tagList || []).map((t) => t.name || "").join(" ");
    const text = `${item.title || ""} ${item.summary || ""} ${cat} ${tags}`;

    if (cat === "落地页" || /落地页|官网|品牌|Studio|叙事/i.test(text)) {
      groups.landing.items.push(item);
    } else if (cat === "App界面" || /移动端|iOS|手机|对话界面/i.test(text)) {
      groups.mobile.items.push(item);
    } else if (/看板|数据|SaaS|向导|后台|管理/i.test(text)) {
      groups.dashboard.items.push(item);
    } else if (cat === "动效" || /动效|粒子|呼吸|3D/i.test(text)) {
      groups.motion.items.push(item);
    } else {
      groups.component.items.push(item);
    }
  }

  return groups;
}

function buildShowcaseCss() {
  return `
  <style id="geo-showcase-styles">
    body {
      background-color: #09090b !important;
      margin: 0;
      padding: 0;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .ownai-geo-root {
      background-color: #09090b;
      color: #f4f4f5;
      min-height: 100vh;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      position: relative;
      overflow-x: hidden;
      padding-bottom: 96px;
    }
    .ownai-geo-root *, .ownai-geo-root *::before, .ownai-geo-root *::after {
      box-sizing: border-box;
    }
    .geo-aurora-glow {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 1200px;
      height: 520px;
      background: radial-gradient(circle at 50% -10%, rgba(99, 102, 241, 0.22) 0%, rgba(168, 85, 247, 0.08) 42%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
    .geo-wrapper {
      max-width: 1240px;
      margin: 0 auto;
      padding: 0 24px;
      position: relative;
      z-index: 1;
    }
    .geo-top-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 48px;
    }
    .geo-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }
    .geo-brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 15px;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);
    }
    .geo-brand-name {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .geo-brand-pill {
      background: rgba(255, 255, 255, 0.06);
      color: #a1a1aa;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      letter-spacing: 0.04em;
    }
    .geo-nav-menu {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .geo-nav-item {
      color: #a1a1aa;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .geo-nav-item:hover {
      color: #ffffff;
    }
    .geo-nav-button {
      background: #ffffff;
      color: #09090b;
      font-weight: 600;
      padding: 7px 16px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 13px;
      transition: all 0.2s;
    }
    .geo-nav-button:hover {
      background: #e4e4e7;
      transform: translateY(-1px);
    }
    .geo-hero-header {
      text-align: center;
      max-width: 860px;
      margin: 0 auto 48px;
    }
    .geo-shimmer-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(129, 140, 248, 0.3);
      color: #c7d2fe;
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 22px;
      box-shadow: 0 0 24px rgba(99, 102, 241, 0.15);
    }
    .geo-shimmer-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #818cf8;
      box-shadow: 0 0 8px #818cf8;
    }
    .geo-main-title {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      margin: 0 0 18px;
      background: linear-gradient(180deg, #ffffff 45%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    @media (max-width: 640px) {
      .geo-main-title { font-size: 30px; }
    }
    .geo-subtitle {
      font-size: 16px;
      color: #a1a1aa;
      line-height: 1.7;
      margin: 0 auto 36px;
      max-width: 720px;
    }
    .geo-stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 48px;
    }
    @media (max-width: 768px) {
      .geo-stats-row { grid-template-columns: repeat(2, 1fr); }
    }
    .geo-stat-card {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 20px 16px;
      text-align: center;
      transition: all 0.2s;
    }
    .geo-stat-card:hover {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.04);
    }
    .geo-stat-num {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .geo-stat-label {
      font-size: 13px;
      color: #71717a;
    }
    .geo-tabs-bar {
      position: sticky;
      top: 16px;
      z-index: 30;
      display: flex;
      align-items: center;
      gap: 10px;
      overflow-x: auto;
      padding: 10px 14px;
      background: rgba(18, 19, 25, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      backdrop-filter: blur(20px);
      margin-bottom: 56px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
    }
    .geo-tab-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      color: #a1a1aa;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.2s;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid transparent;
    }
    .geo-tab-pill:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .geo-section {
      margin-bottom: 68px;
      scroll-margin-top: 100px;
    }
    .geo-section-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: 16px;
    }
    .geo-section-title {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 6px;
      letter-spacing: -0.01em;
    }
    .geo-section-desc {
      font-size: 14px;
      color: #a1a1aa;
      margin: 0;
    }
    .geo-section-badge {
      background: rgba(99, 102, 241, 0.1);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.25);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .geo-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .geo-cards-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .geo-cards-grid { grid-template-columns: 1fr; }
    }
    .geo-card {
      background: #121319;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .geo-card:hover {
      transform: translateY(-5px);
      border-color: rgba(129, 140, 248, 0.35);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.12);
      background: #171821;
    }
    .geo-card-media {
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border-radius: 10px;
      background: #000000;
      position: relative;
      margin-bottom: 14px;
    }
    .geo-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.35s ease;
      display: block;
    }
    .geo-card:hover .geo-card-img {
      transform: scale(1.05);
    }
    .geo-card-overlay {
      position: absolute;
      top: 10px;
      left: 10px;
      display: flex;
      gap: 6px;
      z-index: 2;
    }
    .geo-badge-free {
      background: rgba(16, 185, 129, 0.9);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .geo-badge-pro {
      background: rgba(139, 92, 246, 0.9);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .geo-badge-cat {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.65);
      color: #e4e4e7;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .geo-card-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 8px;
      line-height: 1.4;
    }
    .geo-card-title a {
      color: inherit;
      text-decoration: none;
      transition: color 0.2s;
    }
    .geo-card-title a:hover {
      color: #818cf8;
    }
    .geo-card-desc {
      font-size: 13px;
      color: #a1a1aa;
      line-height: 1.6;
      margin: 0 0 16px;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .geo-card-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .geo-tag-pill {
      background: rgba(255, 255, 255, 0.05);
      color: #a1a1aa;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .geo-card-footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .geo-link-free {
      font-size: 12px;
      font-weight: 600;
      color: #34d399;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }
    .geo-link-free:hover {
      color: #6ee7b7;
      transform: translateX(2px);
    }
    .geo-link-pro {
      font-size: 12px;
      font-weight: 600;
      color: #a78bfa;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;
    }
    .geo-link-pro:hover {
      color: #c4b5fd;
      transform: translateX(2px);
    }
    .geo-faq-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 24px;
    }
    @media (max-width: 768px) {
      .geo-faq-grid { grid-template-columns: 1fr; }
    }
    .geo-faq-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 24px;
      transition: border-color 0.2s;
    }
    .geo-faq-card:hover {
      border-color: rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.035);
    }
    .geo-faq-q {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .geo-faq-num {
      color: #818cf8;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      font-weight: 700;
      background: rgba(99, 102, 241, 0.12);
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid rgba(99, 102, 241, 0.25);
    }
    .geo-faq-a {
      font-size: 14px;
      color: #a1a1aa;
      line-height: 1.65;
      margin: 0;
    }
    .geo-cta-box {
      margin-top: 80px;
      padding: 48px 32px;
      border-radius: 20px;
      text-align: center;
      background: linear-gradient(180deg, rgba(30, 27, 75, 0.45) 0%, rgba(15, 23, 42, 0.7) 100%);
      border: 1px solid rgba(129, 140, 248, 0.25);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 0 40px rgba(99, 102, 241, 0.1);
      position: relative;
    }
    .geo-cta-title {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 12px;
      letter-spacing: -0.02em;
    }
    .geo-cta-desc {
      font-size: 15px;
      color: #c7d2fe;
      max-width: 680px;
      margin: 0 auto 28px;
      line-height: 1.6;
    }
    .geo-cta-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .geo-btn-primary {
      background: #ffffff;
      color: #09090b;
      padding: 10px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(255, 255, 255, 0.2);
    }
    .geo-btn-primary:hover {
      background: #f4f4f5;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
    }
    .geo-btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 10px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .geo-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }
  </style>`;
}

function buildShowcaseHtml(groups, totalCount) {
  let html = `
<div class="ownai-geo-root" data-ssr-fallback="">
  <div class="geo-aurora-glow"></div>
  <div class="geo-wrapper">
    <nav class="geo-top-nav" aria-label="顶部导航">
      <a href="/" class="geo-brand" title="OwnAI 首页">
        <div class="geo-brand-icon">O</div>
        <span class="geo-brand-name">ownai</span>
        <span class="geo-brand-pill">PROMPTS LIBRARY</span>
      </a>
      <div class="geo-nav-menu">
        <a href="/" class="geo-nav-item">首页</a>
        <a href="/tutorials" class="geo-nav-item">系统教程</a>
        <a href="/pricing" class="geo-nav-item">会员方案</a>
        <a href="/sitemap.xml" class="geo-nav-item">站点地图</a>
        <a href="/pricing" class="geo-nav-button">开通会员 ➔</a>
      </div>
    </nav>

    <header class="geo-hero-header">
      <div class="geo-shimmer-badge">
        <span class="geo-shimmer-dot"></span>
        <span>已收录 ${totalCount} 款精品前端网页与组件 · 全量适配 Cursor / Claude / v0 / Codex</span>
      </div>
      <h1 class="geo-main-title">
        OwnAI 精品前端提示词与网页设计库
      </h1>
      <p class="geo-subtitle">
        为前端开发者、独立创作者与 UI 设计师打造。涵盖现代深色科技落地页、SaaS 业务看板、移动端 App 界面及高频交互原子组件。每款作品均提供真实渲染预览与结构化 Prompt，支持一键复刻生产级前端代码。
      </p>

      <div class="geo-stats-row">
        <div class="geo-stat-card">
          <div class="geo-stat-num">${totalCount}+</div>
          <div class="geo-stat-label">收录精品网页</div>
        </div>
        <div class="geo-stat-card">
          <div class="geo-stat-num">5 大</div>
          <div class="geo-stat-label">核心场景全覆盖</div>
        </div>
        <div class="geo-stat-card">
          <div class="geo-stat-num">100%</div>
          <div class="geo-stat-label">真实渲染与结构</div>
        </div>
        <div class="geo-stat-card">
          <div class="geo-stat-num" style="color: #34d399;">免费开放</div>
          <div class="geo-stat-label">支持全文直接复制</div>
        </div>
      </div>
    </header>

    <nav class="geo-tabs-bar" aria-label="类型导航">
      <a href="#landing" class="geo-tab-pill">🚀 科技落地页</a>
      <a href="#dashboard" class="geo-tab-pill">📊 SaaS 数据看板</a>
      <a href="#mobile" class="geo-tab-pill">📱 移动端 App</a>
      <a href="#component" class="geo-tab-pill">🧩 常用 UI 组件</a>
      <a href="#motion" class="geo-tab-pill">✨ 动效与视觉背景</a>
      <a href="#faq" class="geo-tab-pill">💬 常见问答 (FAQ)</a>
    </nav>
`;

  const groupKeys = [
    { key: "landing", id: "landing" },
    { key: "dashboard", id: "dashboard" },
    { key: "mobile", id: "mobile" },
    { key: "component", id: "component" },
    { key: "motion", id: "motion" },
  ];

  for (const { key, id } of groupKeys) {
    const group = groups[key];
    if (!group || !group.items.length) continue;

    html += `
    <section id="${id}" class="geo-section">
      <div class="geo-section-header">
        <div class="geo-section-title-wrap">
          <h2 class="geo-section-title">${esc(group.title)}</h2>
          <p class="geo-section-desc">${esc(group.desc)}</p>
        </div>
        <span class="geo-section-badge">精选收录 ${group.items.length} 款</span>
      </div>

      <div class="geo-cards-grid">
`;

    for (const item of group.items.slice(0, 12)) {
      const isFree = Number(item.memberOnly) === 0;
      const tags = (item.tagList || []).map((t) => t.name).filter(Boolean);
      const tagBadges = tags
        .slice(0, 3)
        .map((t) => `<span class="geo-tag-pill">${esc(t)}</span>`)
        .join("");

      html += `
        <article class="geo-card">
          ${
            item.coverUrl
              ? `<div class="geo-card-media">
                   <img class="geo-card-img" src="${esc(item.coverUrl)}" alt="${esc(item.title)} 真实设计效果" loading="lazy" />
                   <div class="geo-card-overlay">
                     <span class="${isFree ? "geo-badge-free" : "geo-badge-pro"}">${
                  isFree ? "● 免费公开全文" : "✦ PRO 会员"
                }</span>
                   </div>
                   <span class="geo-badge-cat">${esc(item.category?.name || "网页设计")}</span>
                 </div>`
              : ""
          }
          <h3 class="geo-card-title">
            <a href="/prompts/${esc(item.id)}">${esc(item.title)}</a>
          </h3>
          <p class="geo-card-desc">
            ${esc(item.summary || item.title + " 的现代化前端设计界面与提示词实现。")}
          </p>
          <div class="geo-card-tags">${tagBadges}</div>
          <div class="geo-card-footer">
            <a href="/prompts/${esc(item.id)}" class="${isFree ? "geo-link-free" : "geo-link-pro"}">
              ${isFree ? "查看完整提示词 ➔" : "查看设计效果 ➔"}
            </a>
            <span style="font-size: 11px; color: #71717a;">OwnAI 验证</span>
          </div>
        </article>
`;
    }

    html += `
      </div>
    </section>
`;
  }

  html += `
    <section id="faq" class="geo-faq-section">
      <div class="geo-section-header">
        <div class="geo-section-title-wrap">
          <h2 class="geo-section-title">前端提示词常见问题（FAQ）</h2>
          <p class="geo-section-desc">关于 OwnAI 提示词的使用方式、工具支持与代码复刻解答</p>
        </div>
        <span class="geo-section-badge">权威解答</span>
      </div>

      <div class="geo-faq-grid">
        <div class="geo-faq-card">
          <h3 class="geo-faq-q">
            <span class="geo-faq-num">01</span>
            <span>什么是 OwnAI 前端提示词库？</span>
          </h3>
          <p class="geo-faq-a">OwnAI 提示词库精选 700+ 款现代前端设计与交互范式，覆盖深色科技落地页、SaaS 管理看板、移动端 App、组件及动效设计。每个作品均提供结构化设计说明与可运行的 Prompt，帮助开发者快速生成生产级页面。</p>
        </div>
        <div class="geo-faq-card">
          <h3 class="geo-faq-q">
            <span class="geo-faq-num">02</span>
            <span>这些提示词支持哪些 AI 工具？</span>
          </h3>
          <p class="geo-faq-a">完全适配 Cursor、Claude 3.5 Sonnet、OpenAI Codex、v0.dev、Lovable、Windsurf 等主流代码生成工具与 AI IDE，提示词已针对 Tailwind CSS、React 与现代化前端工程规范深度优化。</p>
        </div>
        <div class="geo-faq-card">
          <h3 class="geo-faq-q">
            <span class="geo-faq-num">03</span>
            <span>如何使用这些提示词快速构建页面？</span>
          </h3>
          <p class="geo-faq-a">点击任意作品进入详情页，复制提示词并粘贴到 Cursor Composer 或 Claude 对话框中，即可让 AI 依据明确的布局规范、设计色彩与交互状态直接生成高保真代码。</p>
        </div>
        <div class="geo-faq-card">
          <h3 class="geo-faq-q">
            <span class="geo-faq-num">04</span>
            <span>免费用户可以直接获取提示词吗？</span>
          </h3>
          <p class="geo-faq-a">可以。平台提供了大量免费公开的高质量作品，支持免登录直接查看和复制完整提示词；进阶的深度解构与全套交互动效可通过开通会员获取。</p>
        </div>
      </div>
    </section>

    <div class="geo-cta-box">
      <h3 class="geo-cta-title">寻找更多定制前端页面与生产级源码？</h3>
      <p class="geo-cta-desc">
        OwnAI 持续更新前沿 UI 界面、交互动效、组件与 Vibe Coding 提示词。开通会员即可获取全量源码、深度解构与专属前端物料。
      </p>
      <div class="geo-cta-buttons">
        <a href="/pricing" class="geo-btn-primary">开通 OwnAI 会员</a>
        <a href="/tutorials" class="geo-btn-secondary">浏览实战教程</a>
      </div>
    </div>
  </div>
</div>
`;

  return html;
}

function buildStructuredData(groups) {
  const items = [];
  let position = 1;

  for (const key of Object.keys(groups)) {
    for (const item of groups[key].items.slice(0, 8)) {
      items.push({
        "@type": "ListItem",
        position: position++,
        name: item.title,
        url: `${siteUrl}/prompts/${item.id}`,
        image: item.coverUrl || undefined,
      });
    }
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}/frontend-prompts`,
        url: `${siteUrl}/frontend-prompts`,
        name: "OwnAI 精品前端提示词与网页设计库",
        description:
          "涵盖深色科技落地页、SaaS后台看板、移动端界面、创意作品集与高频UI组件的前端提示词库。",
        inLanguage: "zh-CN",
        mainEntity: {
          "@type": "ItemList",
          itemListElement: items,
        },
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "什么是 OwnAI 前端提示词库？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "OwnAI 提示词库精选 700+ 款现代前端设计与交互范式，覆盖深色科技落地页、SaaS 管理看板、移动端 App、组件及动效设计。每个作品均提供结构化设计说明与可运行的 Prompt，帮助开发者快速生成生产级页面。"
            }
          },
          {
            "@type": "Question",
            "name": "这些提示词支持哪些 AI 工具？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "完全适配 Cursor、Claude 3.5 Sonnet、OpenAI Codex、v0.dev、Lovable、Windsurf 等主流代码生成工具与 AI IDE，提示词已针对 Tailwind CSS、React 与现代化前端工程优化。"
            }
          },
          {
            "@type": "Question",
            "name": "如何使用这些提示词快速构建页面？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "点击任意作品进入详情页，复制提示词并粘贴到 Cursor Composer 或 Claude 对话框中，即可让 AI 依据明确的布局规范、设计色彩与交互状态直接生成高保真代码。"
            }
          },
          {
            "@type": "Question",
            "name": "免费用户可以直接获取提示词吗？",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "可以。平台提供了大量免费公开的高质量作品，支持免登录直接查看和复制完整提示词；进阶的深度解构与全套交互动效可通过开通会员获取。"
            }
          }
        ]
      }
    ],
  };
}

function buildLlmsTxt(groups, totalCount) {
  let md = `# OwnAI 精品前端提示词库 (OwnAI Prompt Library)

> OwnAI (https://ownai.icu) 为设计师、工程师与独立创作者提供专业可复用的前端 UI 界面与交互提示词（Prompts）。适配 Cursor、Claude 3.5 Sonnet、Codex、v0 与 Lovable。已收录精品网页与组件 ${totalCount} 款。

## 页面类型导航

- [科技落地页](#科技风与品牌落地页): 深色科技、沉浸式视频首屏、三章节叙事落地页
- [SaaS数据看板](#saas-业务系统与数据看板): 业务控制台、数据分析、引导流程
- [移动端App界面](#移动端与高保真交互界面): iOS 风格、卡片流、高保真交互
- [高频UI组件](#常用-ui-模块与高频组件): 价格卡片、折叠面板、登录注册表单
- [视觉动效库](#动效设计与视觉背景): 呼吸光效、粒子网格、3D视觉与视频背景

`;

  const sections = [
    { key: "landing", heading: "科技风与品牌落地页" },
    { key: "dashboard", heading: "SaaS 业务系统与数据看板" },
    { key: "mobile", heading: "移动端与高保真交互界面" },
    { key: "component", heading: "常用 UI 模块与高频组件" },
    { key: "motion", heading: "动效设计与视觉背景" },
  ];

  for (const { key, heading } of sections) {
    const group = groups[key];
    if (!group || !group.items.length) continue;

    md += `### ${heading}\n\n`;
    for (const item of group.items.slice(0, 15)) {
      const summary = (item.summary || item.title).replace(/\n/g, " ").trim();
      const freeTag = Number(item.memberOnly) === 0 ? " [免费全文]" : "";
      md += `- [${item.title}](${siteUrl}/prompts/${item.id})${freeTag}: ${summary}\n`;
    }
    md += `\n`;
  }

  md += `## 快速链接

- 提示词库大地图: ${siteUrl}/frontend-prompts
- 系统实战教程: ${siteUrl}/tutorials
- 会员方案与权益: ${siteUrl}/pricing
- 全站站点地图: ${siteUrl}/sitemap.xml
`;

  return md;
}

async function main() {
  console.log("[GEO] Starting showcase generation...");

  let templateHtml;
  try {
    templateHtml = await readFile(templatePath, "utf8");
  } catch (e) {
    console.error(`[GEO] Error: Cannot read template at ${templatePath}. Run vite build first.`);
    return;
  }

  const { records: artworks, total: totalCount } = await fetchArtworks(6);
  console.log(`[GEO] Fetched ${artworks.length} artworks from API (total: ${totalCount}).`);

  const groups = categorizeArtworks(artworks);

  const showcaseBody = buildShowcaseHtml(groups, totalCount);
  const structuredData = buildStructuredData(groups);

  let outputHtml = templateHtml;

  // 1. Title & Description
  const title = "OwnAI 精品前端提示词库｜网页设计、SaaS看板、落地页与组件提示词";
  const desc =
    "OwnAI 聚合 700+ 前端界面与交互提示词，涵盖深色科技落地页、SaaS后台看板、移动端界面、创意作品集与高频UI组件。附真实渲染效果与提示词，支持一键复刻。";

  outputHtml = outputHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  outputHtml = outputHtml.replace(
    /<meta\s+name=["']description["'][\s\S]*?>/i,
    `<meta name="description" content="${esc(desc)}" />`
  );

  // 2. Canonical
  const canonicalTag = `<link rel="canonical" href="${siteUrl}/frontend-prompts" />`;
  if (/<link\s+rel=["']canonical["']/i.test(outputHtml)) {
    outputHtml = outputHtml.replace(/<link\s+rel=["']canonical["'][\s\S]*?>/i, canonicalTag);
  } else {
    outputHtml = outputHtml.replace("</head>", `  ${canonicalTag}\n</head>`);
  }

  // 3. Structured Data & Showcase Styles
  const jsonLdScript = `\n  <script type="application/ld+json" id="ssr-structured-data">${JSON.stringify(
    structuredData
  )}</script>\n`;
  outputHtml = outputHtml.replace("</head>", `${buildShowcaseCss()}\n${jsonLdScript}</head>`);

  // 4. Inject fallback body into #root
  outputHtml = outputHtml.replace('<div id="root"></div>', `<div id="root">${showcaseBody}</div>`);

  // Write frontend-prompts/index.html (with SPA scripts for regular users, and SSR fallback for crawlers)
  await mkdir(targetHtmlDir, { recursive: true });
  await writeFile(targetHtmlPath, outputHtml, "utf8");
  console.log(`[GEO] Successfully generated ${targetHtmlPath} (${outputHtml.length} bytes)`);

  // Write frontend-prompts/static.html (pure static, no React bundle, for direct human preview)
  const targetStaticHtmlPath = path.join(targetHtmlDir, "static.html");
  const staticOnlyHtml = outputHtml
    .replace(/<script\s+type=["']module["'][\s\S]*?<\/script>/gi, "")
    .replace(/<link\s+rel=["']modulepreload["'][\s\S]*?>/gi, "");
  await writeFile(targetStaticHtmlPath, staticOnlyHtml, "utf8");
  console.log(`[GEO] Successfully generated ${targetStaticHtmlPath} (${staticOnlyHtml.length} bytes)`);

  // Write llms.txt
  const llmsContent = buildLlmsTxt(groups, totalCount);
  await writeFile(targetLlmsPath, llmsContent, "utf8");
  console.log(`[GEO] Successfully generated ${targetLlmsPath} (${llmsContent.length} bytes)`);
}

main().catch((err) => {
  console.error("[GEO] Showcase generation failed:", err);
});
