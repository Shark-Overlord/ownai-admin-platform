import { useState } from "react";
import { Icon } from "@iconify/react";
import { ArrowRight, Check, MousePointer2 } from "lucide-react";
import { OwnAIDesignInlineTrial } from "@/components/ownai-design/OwnAIDesignInlineTrial";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const demoVideo =
  "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_source/1/pRbkiu98-8%E6%9C%8822%E6%97%A5%20(2)(1).mp4";

const supportedEditors = ["Codex", "Claude", "Cursor", "Gemini", "Lovable"] as const;

const featureItems = [
  "识别网页组件的结构层级与视觉边界",
  "提取颜色、排版、间距和响应式布局信息",
  "记录悬停、点击等关键交互线索",
  "整理成可交给 AI 编程工具的 UI 复刻提示词",
] as const;

const audienceItems = ["产品设计师", "前端开发者", "独立开发者", "Vibe Coding 创作者"] as const;

const usageSteps = [
  ["安装插件", "将 OwnAI Design 安装到 Chrome 浏览器。"],
  ["选择界面", "打开目标网页并选择需要参考的页面或组件。"],
  ["复制信息", "提取结构、样式与交互信息并生成提示词。"],
  ["交给编程工具", "粘贴到 Codex、Claude、Cursor 等工具中继续开发。"],
] as const;

const faqItems = [
  ["OwnAI Design 会复制网站源码吗？", "插件整理可见界面的结构、样式和交互线索，用于生成复刻提示词，不会替代对目标网站版权和使用条款的判断。"],
  ["支持哪些 AI 编程工具？", "生成的提示词可用于 Codex、Claude、Cursor、Gemini、Lovable 等常见 AI 编程工具。"],
  ["没有前端基础可以使用吗？", "可以。插件会把网页信息整理成更适合 AI 编程工具理解的描述，有前端经验时仍能进一步调整生成结果。"],
] as const;

export function OwnAIDesignPage() {
  const [trialActive, setTrialActive] = useState(false);
  useDocumentMeta(
    "OwnAI Design｜复制网页 UI 并生成 Vibe Coding 提示词",
    "OwnAI Design 是一款面向设计师和前端开发者的浏览器插件，可复制网页组件结构、样式与交互信息，生成适用于 Codex、Claude 和 Cursor 的 UI 复刻提示词。",
    {
      canonical: "https://ownai.icu/ownai-design",
      image: "https://ownai.icu/images/luminous-dark-hero-ribbons.png",
      robots: "index, follow",
      structuredData: {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "OwnAI Design",
        applicationCategory: "DeveloperApplication",
        applicationSubCategory: "BrowserExtension",
        operatingSystem: "Chrome",
        url: "https://ownai.icu/ownai-design",
        description: "复制网页组件结构、样式与交互信息，并生成适用于 AI 编程工具的 UI 复刻提示词。",
        offers: {
          "@type": "Offer",
          url: "https://ownai.icu/pricing",
          availability: "https://schema.org/InStock",
        },
      },
    },
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      <div className="relative flex h-8 items-center justify-center overflow-hidden border-b border-white/20 bg-[linear-gradient(100deg,#7047eb_0%,#4d5ff0_38%,#2479e8_70%,#169ed8_100%)] px-10 text-center text-[11px] font-semibold tracking-[0.02em] text-white shadow-[0_8px_30px_-14px_rgba(70,105,240,0.95)] sm:text-[12px]">
        <span className="relative z-10">OwnAI Design 早期体验 · 一次购买，持续更新</span>
        <span
          className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent_8%,rgba(255,255,255,0.18)_50%,transparent_92%)]"
          aria-hidden="true"
        />
      </div>

      <main className="px-2 pb-3 pt-2 sm:px-3 sm:pb-4">
        <section className="relative min-h-[calc(100vh-48px)] overflow-hidden rounded-[24px] border border-white/10 bg-[#080808] sm:rounded-[30px]">
          <video
            src={demoVideo}
            aria-hidden="true"
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-35 blur-[1px]"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,8,0.96)_0%,rgba(8,7,16,0.64)_35%,rgba(32,15,54,0.36)_72%,rgba(5,5,7,0.74)_100%)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.08)_56%,rgba(0,0,0,0.9)_100%)]"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-48px)] max-w-[1440px] flex-col px-4 pb-4 pt-5 sm:px-8 sm:pb-6 sm:pt-7 lg:px-12">
            <header data-ownai-trial-selectable data-ownai-trial-name="Brand navigation" className="flex items-center justify-between gap-4">
              <a
                href="/"
                className="inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="返回 OwnAI 首页"
              >
                <img
                  src="/images/ownai-logo.webp"
                  alt="OwnAI"
                  className="h-8 w-auto object-contain sm:h-9"
                  draggable={false}
                  decoding="async"
                />
                <span className="home-ownai-wordmark text-[23px] leading-none text-white sm:text-[26px]">ownai design</span>
              </a>

            </header>

            <div data-ownai-trial-selectable data-ownai-trial-name="Product hero" className="mx-auto flex w-full max-w-[980px] flex-col items-center pb-10 pt-4 text-center sm:pb-16 sm:pt-2">
              <p className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-semibold tracking-[0.12em] text-white/72 sm:text-[12px]">
                <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>为 VIBE CODING 而生</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 tracking-[0.08em]">
                  <Icon icon="logos:chrome" className="h-4 w-4 shrink-0" aria-hidden="true" />
                  支持安装至谷歌浏览器
                </span>
              </p>
              <h1 className="mt-5 text-balance text-[34px] font-black uppercase leading-[0.98] tracking-[-0.055em] sm:text-[50px] lg:text-[64px]">
                一键复制任意网站中你喜欢的UI设计
              </h1>
              <p className="mt-5 max-w-[720px] text-pretty text-[14px] leading-6 text-white/72 sm:text-[16px] sm:leading-7">
                一款让 Vibe Coding 更快的浏览器扩展。将鼠标悬停在任意元素上，复制它，并直接交给 Codex、Claude、Gemini、deepseek等编程工具。
              </p>
              <div data-ownai-trial-selectable data-ownai-trial-name="Hero actions" className="relative z-20 mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/pricing"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-[#111111] shadow-[0_16px_48px_-20px_rgba(255,255,255,0.72)] transition-transform hover:scale-[1.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
                  style={{ color: "#111111" }}
                >
                  立即获取
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => setTrialActive(true)}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-[#5ea5ff]/60 bg-[linear-gradient(110deg,#1f5fb8_0%,#2d7bd0_100%)] px-6 text-[14px] font-semibold text-white shadow-[0_16px_42px_-20px_rgba(45,123,208,0.95),inset_0_1px_0_rgba(255,255,255,0.18)] transition-[transform,background-color,border-color] hover:scale-[1.025] hover:border-[#8dc2ff] hover:bg-[#317fd4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8dc2ff]/55"
                >
                  试用一下
                  <MousePointer2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div data-ownai-trial-selectable data-ownai-trial-name="Product demo" className="-mt-8 scroll-mt-4 sm:-mt-12">
              <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[20px] border border-white/16 bg-[#111111] shadow-[0_-24px_90px_-38px_rgba(92,67,255,0.82)]">
                <div className="relative aspect-video bg-black">
                  <video
                    src={demoVideo}
                    aria-label="OwnAI Design 浏览器扩展演示视频"
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full bg-black object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1120px] border-b border-white/10 px-5 py-12 sm:px-0 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">核心功能</p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] sm:text-[36px]">把喜欢的网页界面变成可执行的开发说明</h2>
              <p className="mt-4 max-w-[460px] text-[14px] leading-7 text-white/58">从选择组件到生成提示词，保留设计层级和关键视觉信息，减少在 AI 编程工具中反复描述界面的时间。</p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {featureItems.map((item) => <li key={item} className="flex min-h-20 items-start gap-3 rounded-[12px] border border-white/10 bg-white/[0.035] p-4 text-[13px] leading-6 text-white/76"><Check className="mt-1 h-4 w-4 shrink-0 text-[#72a8ff]" />{item}</li>)}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-[1120px] border-b border-white/10 px-5 py-12 sm:px-0 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">适用人群</p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">面向设计与开发工作流</h2>
              <div className="mt-5 flex flex-wrap gap-2">{audienceItems.map((item) => <span key={item} className="rounded-[8px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/72">{item}</span>)}</div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">使用步骤</p>
              <ol className="mt-4 divide-y divide-white/10 border-y border-white/10">{usageSteps.map(([title, description], index) => <li key={title} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-4"><span className="text-[11px] font-semibold text-white/36">0{index + 1}</span><div><h3 className="text-[14px] font-semibold text-white">{title}</h3><p className="mt-1 text-[12px] leading-6 text-white/54">{description}</p></div></li>)}</ol>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1120px] border-b border-white/10 px-5 py-12 sm:px-0 sm:py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/42">常见问题</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">关于 OwnAI Design</h2>
          <div className="mt-7 divide-y divide-white/10 border-y border-white/10">{faqItems.map(([question, answer]) => <details key={question} className="group py-5"><summary className="cursor-pointer list-none pr-8 text-[14px] font-semibold text-white marker:content-none">{question}</summary><p className="mt-3 max-w-[820px] text-[13px] leading-7 text-white/58">{answer}</p></details>)}</div>
        </section>

        <section data-ownai-trial-selectable data-ownai-trial-name="Editor support footer" className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-5 px-5 py-8 text-center sm:flex-row sm:px-0 sm:text-left">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.15em] text-white/38">Paste the real design into</p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[14px] font-semibold text-white/76 sm:justify-start">
              {supportedEditors.map((editor) => (
                <span key={editor}>{editor}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-5 text-[12px] text-white/42">
            <a href="/" className="transition-colors hover:text-white">返回主站</a>
            <a href="/contact" className="transition-colors hover:text-white">联系我们</a>
            <span>© 2026 OwnAI</span>
          </div>
        </section>
      </main>
      <OwnAIDesignInlineTrial
        active={trialActive}
        onActiveChange={setTrialActive}
      />
    </div>
  );
}
