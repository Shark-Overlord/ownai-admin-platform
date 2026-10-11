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

function buildShowcaseHtml(groups, totalCount) {
  let html = `
<div data-ssr-fallback="" style="max-width:1100px;margin:0 auto;padding:40px 20px 80px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;line-height:1.6;">
  <nav aria-label="面包屑" style="font-size:13px;color:#71717a;margin-bottom:24px;">
    <a href="/" style="color:#71717a;text-decoration:none;">首页</a> / 
    <span aria-current="page" style="color:#18181b;font-weight:600;">前端提示词库</span>
  </nav>

  <header style="margin-bottom:40px;border-bottom:1px solid #e4e4e7;padding-bottom:32px;">
    <h1 style="font-size:32px;font-weight:800;letter-spacing:-0.02em;margin:0 0 12px;color:#09090b;">
      OwnAI 精品前端提示词与网页设计库
    </h1>
    <p style="font-size:16px;color:#52525b;max-width:820px;margin:0 0 16px;">
      OwnAI 为设计师与前端开发者精选 700+ 可直接复用的现代化网页、UI 界面与组件提示词（Prompts）。每款作品均提供高保真渲染效果预览、结构设计说明与完整提示词，涵盖深色科技落地页、SaaS 管理看板、移动端 App 界面及高频前端交互组件。
    </p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px;">
      <span style="background:#f4f4f5;padding:4px 10px;rounded:6px;color:#3f3f46;border-radius:6px;">已收录精品网页: ${totalCount} 款</span>
      <span style="background:#ecfdf5;color:#059669;padding:4px 10px;border-radius:6px;font-weight:500;">免费提示词支持全文复制</span>
      <span style="background:#eff6ff;color:#2563eb;padding:4px 10px;border-radius:6px;font-weight:500;">适配 Cursor / Claude / Codex / v0</span>
    </div>
  </header>

  <nav aria-label="类型导航" style="margin-bottom:36px;padding:16px 20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
    <span style="font-size:13px;font-weight:600;color:#475569;margin-right:12px;">快速跳转至类型：</span>
    <span style="display:inline-flex;gap:16px;flex-wrap:wrap;font-size:14px;">
      <a href="#landing" style="color:#2563eb;text-decoration:none;">🚀 科技落地页</a>
      <a href="#dashboard" style="color:#2563eb;text-decoration:none;">📊 SaaS看板</a>
      <a href="#mobile" style="color:#2563eb;text-decoration:none;">📱 移动端App</a>
      <a href="#component" style="color:#2563eb;text-decoration:none;">🧩 交互组件</a>
      <a href="#motion" style="color:#2563eb;text-decoration:none;">✨ 动效与视觉</a>
    </span>
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
  <section id="${id}" style="margin-bottom:48px;">
    <div style="margin-bottom:20px;">
      <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 6px;">${esc(group.title)}</h2>
      <p style="font-size:14px;color:#64748b;margin:0;">${esc(group.desc)}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:20px;">
`;

    for (const item of group.items.slice(0, 12)) {
      const isFree = Number(item.memberOnly) === 0;
      const tags = (item.tagList || []).map((t) => t.name).filter(Boolean);
      const tagBadges = tags
        .slice(0, 3)
        .map(
          (t) =>
            `<span style="background:#f1f5f9;color:#475569;font-size:11px;padding:2px 6px;border-radius:4px;margin-right:6px;">${esc(t)}</span>`
        )
        .join("");

      html += `
      <article style="border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;flex-direction:column;">
        ${
          item.coverUrl
            ? `<div style="aspect-ratio:16/10;overflow:hidden;border-radius:8px;background:#f8fafc;margin-bottom:12px;">
                 <img src="${esc(item.coverUrl)}" alt="${esc(item.title)} 真实设计效果" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />
               </div>`
            : ""
        }
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;${
            isFree ? "background:#dcfce7;color:#15803d;" : "background:#ede9fe;color:#6d28d9;"
          }">${isFree ? "免费公开" : "会员专享"}</span>
          <span style="font-size:11px;color:#94a3b8;">${esc(item.category?.name || "网页设计")}</span>
        </div>
        <h3 style="font-size:16px;font-weight:700;margin:0 0 6px;color:#0f172a;line-height:1.4;">
          <a href="/prompts/${esc(item.id)}" style="color:inherit;text-decoration:none;">${esc(item.title)}</a>
        </h3>
        <p style="font-size:13px;color:#64748b;margin:0 0 12px;flex:1;line-height:1.5;">
          ${esc(item.summary || item.title + " 的现代化前端设计界面与提示词实现。")}
        </p>
        <div style="margin-top:auto;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div>${tagBadges}</div>
          <a href="/prompts/${esc(item.id)}" style="font-size:12px;color:#2563eb;font-weight:600;text-decoration:none;">
            ${isFree ? "查看完整提示词 →" : "查看设计效果 →"}
          </a>
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
  <section id="faq" style="margin-top:60px;margin-bottom:40px;background:#f8fafc;padding:32px;border-radius:16px;border:1px solid #e2e8f0;">
    <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 20px;">前端提示词常见问题（FAQ）</h2>
    <div style="display:flex;flex-direction:column;gap:18px;">
      <div>
        <h3 style="font-size:16px;font-weight:600;color:#1e293b;margin:0 0 6px;">1. 什么是 OwnAI 前端提示词库？</h3>
        <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">OwnAI 提示词库精选 700+ 款现代前端设计与交互范式，覆盖深色科技落地页、SaaS 管理看板、移动端 App、组件及动效设计。每个作品均提供结构化设计说明与可运行的 Prompt，帮助开发者快速生成生产级页面。</p>
      </div>
      <div>
        <h3 style="font-size:16px;font-weight:600;color:#1e293b;margin:0 0 6px;">2. 这些提示词支持哪些 AI 工具？</h3>
        <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">完全适配 Cursor、Claude 3.5 Sonnet、OpenAI Codex、v0.dev、Lovable、Windsurf 等主流代码生成工具与 AI IDE，提示词已针对 Tailwind CSS、React 与现代化前端工程优化。</p>
      </div>
      <div>
        <h3 style="font-size:16px;font-weight:600;color:#1e293b;margin:0 0 6px;">3. 如何使用这些提示词快速构建页面？</h3>
        <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">点击任意作品进入详情页，复制提示词并粘贴到 Cursor Composer 或 Claude 对话框中，即可让 AI 依据明确的布局规范、设计色彩与交互状态直接生成高保真代码。</p>
      </div>
      <div>
        <h3 style="font-size:16px;font-weight:600;color:#1e293b;margin:0 0 6px;">4. 免费用户可以直接获取提示词吗？</h3>
        <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6;">可以。平台提供了大量免费公开的高质量作品，支持免登录直接查看和复制完整提示词；进阶的深度解构与全套交互动效可通过开通会员获取。</p>
      </div>
    </div>
  </section>

  <footer style="margin-top:40px;padding:24px;background:#fafafa;border-radius:12px;text-align:center;border:1px solid #f4f4f5;">
    <h3 style="font-size:16px;font-weight:700;color:#18181b;margin:0 0 8px;">寻找更多定制前端页面或源码？</h3>
    <p style="font-size:14px;color:#71717a;margin:0 0 16px;">
      OwnAI 持续更新前沿 UI 界面、交互动效、组件与 Vibe Coding 提示词。开通会员即可获取全量源码与深度解构教程。
    </p>
    <a href="/pricing" style="display:inline-block;background:#18181b;color:#ffffff;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">
      浏览会员方案与权益
    </a>
  </footer>
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

  // 3. Structured Data
  const jsonLdScript = `\n  <script type="application/ld+json" id="ssr-structured-data">${JSON.stringify(
    structuredData
  )}</script>\n`;
  outputHtml = outputHtml.replace("</head>", `${jsonLdScript}</head>`);

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
