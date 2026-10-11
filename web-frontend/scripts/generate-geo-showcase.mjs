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

const LUCIDE_ICONS = {
  monitor: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`,
  dashboard: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  smartphone: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
  component: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/><path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z"/><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"/></svg>`,
  clapperboard: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`,
  helpCircle: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
  arrowUpRight: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>`,
};

function buildShowcaseCss() {
  return `
  <style id="geo-showcase-styles">
    body {
      background-color: #000000 !important;
      margin: 0;
      padding: 0;
      color: #ededed;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .ownai-geo-root {
      background-color: #000000;
      color: #ededed;
      min-height: 100vh;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 80px;
    }
    .ownai-geo-root *, .ownai-geo-root *::before, .ownai-geo-root *::after {
      box-sizing: border-box;
    }
    .geo-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .geo-top-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.09);
      margin-bottom: 36px;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
    }
    .geo-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .geo-brand-logo {
      width: 28px;
      height: 28px;
      object-fit: contain;
      display: block;
    }
    .geo-brand-name {
      font-size: 16px;
      font-weight: 700;
      color: #ededed;
      letter-spacing: -0.02em;
    }
    .geo-brand-sep {
      color: #3f3f46;
      font-size: 13px;
    }
    .geo-brand-section {
      font-size: 13px;
      color: #a0a0a0;
      font-weight: 500;
    }
    .geo-nav-links {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .geo-nav-link {
      color: #a0a0a0;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: color 0.15s;
    }
    .geo-nav-link:hover {
      color: #ffffff;
    }
    .geo-nav-cta {
      background: #ededed;
      color: #000000;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 13px;
      transition: all 0.15s;
    }
    .geo-nav-cta:hover {
      background: #ffffff;
    }
    .geo-hero {
      margin-bottom: 36px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.09);
      padding-bottom: 32px;
    }
    .geo-breadcrumb {
      font-size: 12px;
      color: #71717a;
      margin-bottom: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .geo-breadcrumb a {
      color: #71717a;
      text-decoration: none;
    }
    .geo-breadcrumb a:hover {
      color: #ededed;
    }
    .geo-title {
      font-size: 30px;
      font-weight: 700;
      color: #fafafa;
      letter-spacing: -0.025em;
      margin: 0 0 12px;
      line-height: 1.3;
    }
    .geo-desc {
      font-size: 15px;
      color: #a0a0a0;
      line-height: 1.65;
      margin: 0 0 24px;
      max-width: 820px;
    }
    .geo-spec-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    @media (max-width: 768px) {
      .geo-spec-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .geo-spec-item {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
    }
    .geo-spec-label {
      font-size: 11px;
      color: #71717a;
      margin-bottom: 4px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 500;
    }
    .geo-spec-val {
      font-size: 15px;
      font-weight: 700;
      color: #ededed;
    }
    .geo-tab-nav {
      position: sticky;
      top: 12px;
      z-index: 30;
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding: 6px;
      background: rgba(17, 17, 17, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 8px;
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      margin-bottom: 44px;
    }
    .geo-tab-item {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 13px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #a0a0a0;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s;
      border: 1px solid transparent;
    }
    .geo-tab-item:hover {
      color: #ededed;
      background: #242424;
      border-color: rgba(255, 255, 255, 0.08);
    }
    .geo-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: currentColor;
    }
    .geo-section {
      margin-bottom: 56px;
      scroll-margin-top: 80px;
    }
    .geo-section-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.09);
      gap: 16px;
    }
    .geo-section-title {
      font-size: 20px;
      font-weight: 700;
      color: #fafafa;
      margin: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .geo-section-desc {
      font-size: 13px;
      color: #8b8b94;
      margin: 4px 0 0;
    }
    .geo-section-count {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 11px;
      color: #a0a0a0;
      white-space: nowrap;
      background: #1a1a1a;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .geo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    @media (max-width: 1024px) {
      .geo-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .geo-grid { grid-template-columns: 1fr; }
    }
    .geo-card {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 16px 40px rgba(0, 0, 0, 0.18);
      transition: all 0.2s ease;
    }
    .geo-card:hover {
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 20px 48px rgba(0, 0, 0, 0.28);
    }
    .geo-card-media {
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border-radius: 8px;
      background: #1a1a1a;
      position: relative;
      margin-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .geo-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .geo-tag-free {
      position: absolute;
      top: 8px;
      left: 8px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.15);
      color: #6ee7b7;
      border: 1px solid rgba(52, 211, 153, 0.25);
      backdrop-filter: blur(4px);
    }
    .geo-tag-pro {
      position: absolute;
      top: 8px;
      left: 8px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(139, 92, 246, 0.15);
      color: #c084fc;
      border: 1px solid rgba(139, 92, 246, 0.25);
      backdrop-filter: blur(4px);
    }
    .geo-tag-cat {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 10px;
      color: #a0a0a0;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.09);
      backdrop-filter: blur(4px);
      font-weight: 500;
    }
    .geo-card-title {
      font-size: 15px;
      font-weight: 600;
      color: #ededed;
      margin: 0 0 6px;
      line-height: 1.4;
    }
    .geo-card-title a {
      color: inherit;
      text-decoration: none;
    }
    .geo-card-title a:hover {
      color: #ffffff;
    }
    .geo-card-desc {
      font-size: 12px;
      color: #8b8b94;
      line-height: 1.55;
      margin: 0 0 12px;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .geo-tags {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .geo-tag {
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: #1a1a1a;
      color: #a0a0a0;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .geo-card-foot {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .geo-link {
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #ededed;
      transition: color 0.15s;
    }
    .geo-link:hover {
      color: #ffffff;
    }
    .geo-faq {
      margin-top: 56px;
      scroll-margin-top: 80px;
    }
    .geo-faq-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 16px;
    }
    @media (max-width: 768px) {
      .geo-faq-grid { grid-template-columns: 1fr; }
    }
    .geo-faq-box {
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 8px;
      padding: 18px;
    }
    .geo-faq-q {
      font-size: 14px;
      font-weight: 600;
      color: #fafafa;
      margin: 0 0 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .geo-faq-a {
      font-size: 13px;
      color: #a0a0a0;
      line-height: 1.6;
      margin: 0;
    }
    .geo-footer-cta {
      margin-top: 56px;
      padding: 32px 28px;
      background: #111111;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .geo-cta-title {
      font-size: 18px;
      font-weight: 700;
      color: #fafafa;
      margin: 0 0 6px;
    }
    .geo-cta-sub {
      font-size: 13px;
      color: #8b8b94;
      margin: 0;
    }
    .geo-cta-actions {
      display: flex;
      gap: 10px;
    }
    .geo-btn-primary {
      background: #ededed;
      color: #000000;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      text-decoration: none;
      transition: background 0.15s;
    }
    .geo-btn-primary:hover {
      background: #ffffff;
    }
    .geo-btn-sub {
      background: #1a1a1a;
      color: #ededed;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-weight: 500;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      text-decoration: none;
      transition: all 0.15s;
    }
    .geo-btn-sub:hover {
      background: #242424;
      border-color: rgba(255, 255, 255, 0.18);
    }
  </style>`;
}

function buildShowcaseHtml(groups, totalCount) {
  let html = `
<div class="ownai-geo-root" data-ssr-fallback="">
  <div class="geo-wrapper">
    <header class="geo-top-nav" aria-label="顶部导航">
      <a href="/" class="geo-brand" title="OwnAI 首页">
        <img src="/images/ownai-logo.webp" alt="OwnAI" class="geo-brand-logo" width="28" height="28" />
        <span class="geo-brand-name">ownai</span>
        <span class="geo-brand-sep">/</span>
        <span class="geo-brand-section">前端提示词库</span>
      </a>
      <nav class="geo-nav-links">
        <a href="/" class="geo-nav-link">首页</a>
        <a href="/tutorials" class="geo-nav-link">教程</a>
        <a href="/pricing" class="geo-nav-link">会员</a>
        <a href="/sitemap.xml" class="geo-nav-link">Sitemap</a>
        <a href="/pricing" class="geo-nav-cta">开通会员</a>
      </nav>
    </header>

    <div class="geo-hero">
      <div class="geo-breadcrumb">
        <a href="/">首页</a> / <span>前端提示词库</span>
      </div>
      <h1 class="geo-title">前端精选设计与交互提示词库</h1>
      <p class="geo-desc">
        面向前端工程师与 UI 设计师的高保真 Prompt 索引库。收录 700+ 款科技落地页、SaaS 管理看板、移动端 App 界面及高频交互原子组件，附带生产级提示词与设计规范，适配 Cursor、Claude、v0 与现代化前端工程。
      </p>

      <div class="geo-spec-grid">
        <div class="geo-spec-item">
          <div class="geo-spec-label">INDEXED ITEMS</div>
          <div class="geo-spec-val">${totalCount}+ 款作品</div>
        </div>
        <div class="geo-spec-item">
          <div class="geo-spec-label">SCENARIOS</div>
          <div class="geo-spec-val">5 大应用场景</div>
        </div>
        <div class="geo-spec-item">
          <div class="geo-spec-label">STRUCTURE</div>
          <div class="geo-spec-val">100% 真实渲染结构</div>
        </div>
        <div class="geo-spec-item">
          <div class="geo-spec-label">ACCESS</div>
          <div class="geo-spec-val">免费公开核心全文</div>
        </div>
      </div>
    </div>

    <nav class="geo-tab-nav" aria-label="类型导航">
      <a href="#landing" class="geo-tab-item">
        <span class="geo-icon">${LUCIDE_ICONS.monitor}</span>
        <span>科技落地页</span>
      </a>
      <a href="#dashboard" class="geo-tab-item">
        <span class="geo-icon">${LUCIDE_ICONS.dashboard}</span>
        <span>SaaS 数据看板</span>
      </a>
      <a href="#mobile" class="geo-tab-item">
        <span class="geo-icon">${LUCIDE_ICONS.smartphone}</span>
        <span>移动端 App</span>
      </a>
      <a href="#component" class="geo-tab-item">
        <span class="geo-icon">${LUCIDE_ICONS.component}</span>
        <span>高频 UI 组件</span>
      </a>
      <a href="#motion" class="geo-tab-item">
        <span class="geo-icon">${LUCIDE_ICONS.clapperboard}</span>
        <span>动效与视觉</span>
      </a>
      <a href="#faq" class="geo-tab-item">
        <span class="geo-icon">${LUCIDE_ICONS.helpCircle}</span>
        <span>常见问题</span>
      </a>
    </nav>
`;

  const groupKeys = [
    { key: "landing", id: "landing", icon: LUCIDE_ICONS.monitor },
    { key: "dashboard", id: "dashboard", icon: LUCIDE_ICONS.dashboard },
    { key: "mobile", id: "mobile", icon: LUCIDE_ICONS.smartphone },
    { key: "component", id: "component", icon: LUCIDE_ICONS.component },
    { key: "motion", id: "motion", icon: LUCIDE_ICONS.clapperboard },
  ];

  for (const { key, id, icon } of groupKeys) {
    const group = groups[key];
    if (!group || !group.items.length) continue;

    html += `
    <section id="${id}" class="geo-section">
      <div class="geo-section-head">
        <div>
          <h2 class="geo-section-title">
            <span class="geo-icon">${icon}</span>
            <span>${esc(group.title)}</span>
          </h2>
          <p class="geo-section-desc">${esc(group.desc)}</p>
        </div>
        <span class="geo-section-count">${group.items.length} ITEMS</span>
      </div>

      <div class="geo-grid">
`;

    for (const item of group.items.slice(0, 12)) {
      const isFree = Number(item.memberOnly) === 0;
      const tags = (item.tagList || []).map((t) => t.name).filter(Boolean);
      const tagBadges = tags
        .slice(0, 3)
        .map((t) => `<span class="geo-tag">${esc(t)}</span>`)
        .join("");

      html += `
        <article class="geo-card">
          ${
            item.coverUrl
              ? `<div class="geo-card-media">
                   <img class="geo-card-img" src="${esc(item.coverUrl)}" alt="${esc(item.title)} 真实设计效果" loading="lazy" />
                   <span class="${isFree ? "geo-tag-free" : "geo-tag-pro"}">${isFree ? "FREE" : "PRO"}</span>
                   <span class="geo-tag-cat">${esc(item.category?.name || "UI 设计")}</span>
                 </div>`
              : ""
          }
          <h3 class="geo-card-title">
            <a href="/prompts/${esc(item.id)}">${esc(item.title)}</a>
          </h3>
          <p class="geo-card-desc">
            ${esc(item.summary || item.title + " 的现代化前端设计界面与提示词实现。")}
          </p>
          <div class="geo-tags">${tagBadges}</div>
          <div class="geo-card-foot">
            <a href="/prompts/${esc(item.id)}" class="geo-link">
              <span>${isFree ? "获取提示词" : "查看设计效果"}</span>
              ${LUCIDE_ICONS.arrowUpRight}
            </a>
            <span style="font-size: 11px; color: #52525b; font-family: ui-monospace, monospace;">${
              isFree ? "免登录复制" : "会员解锁"
            }</span>
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
    <section id="faq" class="geo-faq">
      <div class="geo-section-head">
        <div>
          <h2 class="geo-section-title">
            <span class="geo-icon">${LUCIDE_ICONS.helpCircle}</span>
            <span>常见问题与使用说明</span>
          </h2>
          <p class="geo-section-desc">关于 OwnAI 提示词库的工具集成、代码生成与使用规则</p>
        </div>
      </div>

      <div class="geo-faq-grid">
        <div class="geo-faq-box">
          <h3 class="geo-faq-q">
            <span class="geo-icon" style="color: #60a5fa;">${LUCIDE_ICONS.helpCircle}</span>
            <span>什么是 OwnAI 前端提示词库？</span>
          </h3>
          <p class="geo-faq-a">OwnAI 提示词库精选 700+ 款现代前端设计与交互范式，覆盖深色科技落地页、SaaS 管理看板、移动端 App、组件及动效设计。每个作品均提供结构化设计说明与可运行的 Prompt，帮助开发者快速生成生产级页面。</p>
        </div>
        <div class="geo-faq-box">
          <h3 class="geo-faq-q">
            <span class="geo-icon" style="color: #60a5fa;">${LUCIDE_ICONS.helpCircle}</span>
            <span>这些提示词支持哪些 AI 工具？</span>
          </h3>
          <p class="geo-faq-a">完全适配 Cursor、Claude 3.5 Sonnet、OpenAI Codex、v0.dev、Lovable、Windsurf 等主流代码生成工具与 AI IDE，提示词已针对 Tailwind CSS、React 与现代化前端工程规范深度优化。</p>
        </div>
        <div class="geo-faq-box">
          <h3 class="geo-faq-q">
            <span class="geo-icon" style="color: #60a5fa;">${LUCIDE_ICONS.helpCircle}</span>
            <span>如何使用这些提示词快速构建页面？</span>
          </h3>
          <p class="geo-faq-a">点击任意作品进入详情页，复制提示词并粘贴到 Cursor Composer 或 Claude 对话框中，即可让 AI 依据明确的布局规范、设计色彩与交互状态直接生成高保真代码。</p>
        </div>
        <div class="geo-faq-box">
          <h3 class="geo-faq-q">
            <span class="geo-icon" style="color: #60a5fa;">${LUCIDE_ICONS.helpCircle}</span>
            <span>免费用户可以直接获取提示词吗？</span>
          </h3>
          <p class="geo-faq-a">可以。平台提供了大量免费公开的高质量作品，支持免登录直接查看和复制完整提示词；进阶的深度解构与全套交互动效可通过开通会员获取。</p>
        </div>
      </div>
    </section>

    <div class="geo-footer-cta">
      <div>
        <h3 class="geo-cta-title">获取更多生产级前端源码与深度解构教程</h3>
        <p class="geo-cta-sub">开通 OwnAI 会员获取全量组件源码、设计工程资产与交互解构教程。</p>
      </div>
      <div class="geo-cta-actions">
        <a href="/pricing" class="geo-btn-primary">开通会员</a>
        <a href="/tutorials" class="geo-btn-sub">浏览教程</a>
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
