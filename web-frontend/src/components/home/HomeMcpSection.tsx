import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  FolderArchive,
  Laptop,
  Layers,
  Lock,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 解构页同款真实 SVG 图标
function ToolIcon({ name, className = "h-4 w-4" }: { name: "Cursor" | "Claude" | "Antigravity" | "Codex"; className?: string }) {
  if (name === "Cursor") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M20.632 5.679 11.026.134a1 1 0 0 0-.998 0L.419 5.679A.84.84 0 0 0 0 6.405V17.59c0 .3.16.577.42.727l9.607 5.547a1 1 0 0 0 .998 0l9.608-5.547a.84.84 0 0 0 .42-.727V6.406a.84.84 0 0 0-.42-.726zm-.603 1.176-9.275 16.064c-.063.108-.228.064-.228-.061v-10.52a.59.59 0 0 0-.295-.51l-9.11-5.26c-.107-.061-.063-.227.062-.227h18.55c.264 0 .428.286.296.514"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (name === "Claude") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#d97757" aria-hidden="true">
        <path d="m4.715 15.956 4.717-2.648.079-.23-.079-.128h-.23l-.79-.048-2.696-.073-2.337-.097-2.265-.122-.57-.121-.535-.705.055-.352.48-.322.686.061 1.517.104 2.277.157 1.652.098 2.446.255h.389l.055-.158-.134-.098-.103-.097-2.356-1.596-2.55-1.688-1.335-.972-.723-.492-.364-.46-.158-1.009.656-.722.88.06.225.061.892.686 1.906 1.476 2.49 1.833.364.304.146-.104.018-.072-.164-.274-1.354-2.446-1.445-2.49-.643-1.032-.17-.619a3 3 0 0 1-.104-.728L6.287.133 6.7 0l.996.134.419.364.619 1.415L9.736 4.14l1.554 3.03.455.898.243.832.091.255h.158V9.01l.127-1.706.237-2.095.231-2.695.079-.76.376-.91.747-.492.583.28.48.685-.067.444-.285 1.851-.56 2.903-.363 1.942h.212l.243-.243.984-1.305 1.65-2.064.73-.82.85-.904.546-.431h1.032l.759 1.129-.34 1.166-1.062 1.347-.88 1.142-1.264 1.7-.789 1.36.073.11.188-.02 2.854-.606 1.542-.28 1.84-.315.831.388.091.395-.328.807-1.967.486-2.307.461-3.436.814-.043.03.049.061 1.548.146.662.036h1.62l3.018.225.79.522.473.638-.079.485-1.214.62-1.64-.389-3.824-.91-1.312-.329h-.182v.11l1.093 1.068 2.004 1.81 2.507 2.33.127.578-.321.455-.34-.049-2.204-1.657-.85-.747-1.925-1.62h-.127v.17l.443.649 2.344 3.521.12 1.08-.17.353-.606.212-.668-.12-1.372-1.925-1.415-2.168-1.141-1.943-.14.08-.674 7.254-.316.37-.728.28-.607-.461-.322-.747.322-1.476.388-1.924.316-1.53.285-1.9.17-.632-.012-.042-.14.018-1.432 1.967-2.18 2.945-1.724 1.845-.413.164-.716-.37.066-.662.401-.589L8.17 17.57l1.44-1.882.928-1.086-.006-.158h-.055L4.138 18.56l-1.13.146-.485-.456.06-.746.231-.243 1.907-1.312z" />
      </svg>
    );
  }
  if (name === "Antigravity") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.751 22.607c1.34 1.005 3.35.335 1.508-1.508C17.73 15.74 18.904 1 12.037 1S6.342 15.74.815 21.1c-2.01 2.009.167 2.511 1.507 1.506 5.192-3.517 4.857-9.714 9.715-9.714s4.522 6.197 9.714 9.715Z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.085 0.459c.964-.396 2.012-.54 3.047-.416 1.333.153 2.521.72 3.564 1.7.013.013.032.023.049.028a.4.4 0 0 0 .057 0c1.356-.35 2.79-.22 4.062.367l.062.029.155.076c1.33.674 2.368 1.812 2.917 3.199.279.68.417 1.388.42 2.126.02.55-.04 1.099-.179 1.631a.4.4 0 0 0 .04.154c.792.81 1.317 1.773 1.577 2.893.386 1.9-.009 3.613-1.183 5.138l-.181.222a5.84 5.84 0 0 1-2.935 1.85.4.4 0 0 0-.108.102c-.255.735-.511 1.364-.987 1.992-1.2 1.583-2.963 2.461-4.948 2.451-1.583-.008-2.985-.587-4.21-1.736a.4.4 0 0 0-.14-.033c-.517.167-1.04.191-1.605.184a7.3 7.3 0 0 1-2.593-.621 6.6 6.6 0 0 1-2.147-1.78 8 8 0 0 1-.552-1.105 8.6 8.6 0 0 1-.493-1.281c-.267-1.003-.273-2.058-.019-3.064a.4.4 0 0 0-.036-.139A5.9 5.9 0 0 1 .35 12.507C.156 12 .043 11.462.016 10.918a5.9 5.9 0 0 1 .188-2.133C.653 7.302 1.513 6.138 2.781 5.294c.283-.188.551-.335.801-.44.287-.119.574-.219.862-.303a.4.4 0 0 0 .086-.088C4.75 3.678 5.125 2.945 5.636 2.31A7.1 7.1 0 0 1 8.085.459ZM12.728 14.546a.72.72 0 0 0-.57.264.72.72 0 0 0 .57.847h4.848a.72.72 0 0 0 .897-.848.72.72 0 0 0-.897-.263h-4.848ZM7.282 8.307a.72.72 0 0 0-1.475.841L7.504 12.114 5.816 14.961a.72.72 0 0 0 1.46.865L9.214 12.553a.72.72 0 0 0 .007-.853L7.282 8.307Z"
        fill="url(#dc-codex-mcp-home)"
      />
      <defs>
        <linearGradient id="dc-codex-mcp-home" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7A9DFF" />
          <stop offset="1" stopColor="#3941FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface DemoScenario {
  id: string;
  tag: string;
  prompt: string;
  toolCall: string;
  responseFile: string;
  responseSnippet: string;
  badge: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "ecommerce",
    tag: "电商促销弹窗",
    prompt: "帮我找一个极简深色风格的电商促销弹窗，需要弹簧阻尼动效与关闭倒计时，直接输出 TSX 切片。",
    toolCall: `ownai_design_tools.find_design_components({\n  scenario: "ecommerce",\n  carrier: "website",\n  visualStyle: "dark",\n  motionPreset: "spring"\n})`,
    responseFile: "PromoModalDark.tsx",
    responseSnippet: `// 构件切片: PromoModalDark.tsx (Framer Motion + Tailwind)
export function PromoModal({ isOpen, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      className="rounded-2xl border border-white/10 bg-[#09090b] p-6 shadow-2xl"
    >
      <CountdownTimer duration={300} onEnd={onClose} />
      {/* 包含 600+ 顶尖设计作品规范与完整工程 ZIP 直链 */}
    </motion.div>
  );
}`,
    badge: "Framer Motion · Spring 360/26",
  },
  {
    id: "saas",
    tag: "SaaS 定价卡片",
    prompt: "找一个企业级 SaaS 的深色定价表切片，包含月年切换与推荐套餐高亮交互。",
    toolCall: `ownai_design_tools.find_design_components({\n  scenario: "saas",\n  carrier: "website",\n  componentType: "pricing_card"\n})`,
    responseFile: "PricingTableDark.tsx",
    responseSnippet: `// 构件切片: PricingTableDark.tsx
export function PricingCard({ plan, isYearly }: PricingProps) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-md">
      {plan.isPopular && <Badge className="absolute -top-3 right-6">POPULAR</Badge>}
      <PriceDisplay amount={isYearly ? plan.yearlyPrice : plan.monthlyPrice} />
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full rounded-xl bg-white py-2.5 text-black font-medium">
        立即升级
      </motion.button>
    </div>
  );
}`,
    badge: "Tailwind · Backdrop Blur",
  },
  {
    id: "social",
    tag: "移动端 TabBar",
    prompt: "找一套移动端 App 底部沉浸式 TabBar 切片，包含触觉弹性微动效与状态栏。",
    toolCall: `ownai_design_tools.find_design_components({\n  scenario: "social",\n  carrier: "app",\n  componentType: "tab_bar"\n})`,
    responseFile: "MobileTabBar.tsx",
    responseSnippet: `// 构件切片: MobileTabBar.tsx (iOS 触觉微交互)
export function MobileTabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 h-16 border-t border-white/10 bg-black/80 backdrop-blur-xl flex items-center justify-around pb-safe">
      {tabs.map((tab) => (
        <motion.button key={tab.id} whileTap={{ scale: 0.88 }} onClick={() => onChange(tab.id)} className="flex flex-col items-center gap-1">
          <tab.icon className={activeTab === tab.id ? "text-white" : "text-white/40"} />
          <span className="text-[10px] font-medium">{tab.label}</span>
        </motion.button>
      ))}
    </nav>
  );
}`,
    badge: "iOS Safe Area · Haptic Tap",
  },
];

const SUPPORTED_TOOLS = [
  { name: "Cursor" as const, label: "Cursor" },
  { name: "Claude" as const, label: "Claude" },
  { name: "Codex" as const, label: "Codex" },
  { name: "Antigravity" as const, label: "Antigravity" },
];

export function HomeMcpSection() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activeTool, setActiveTool] = useState<"Cursor" | "Claude" | "Codex" | "Antigravity">("Cursor");
  const [scenarioIndex, setScenarioIndex] = useState(0);

  // 打字机状态
  const [typedPrompt, setTypedPrompt] = useState("");
  const [showToolCall, setShowToolCall] = useState(false);
  const [typedSnippet, setTypedSnippet] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const installCmd = "npx -y @ownai/mcp-bridge";
  const scenario = DEMO_SCENARIOS[scenarioIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoProfile = () => {
    navigate("/profile?tab=mcp");
  };

  // 打字机动画调度循环
  useEffect(() => {
    let cancelled = false;
    setTypedPrompt("");
    setShowToolCall(false);
    setTypedSnippet("");
    setIsTyping(true);

    const fullPrompt = scenario.prompt;
    const fullSnippet = scenario.responseSnippet;

    let pIndex = 0;
    // 第一阶段：逐字打入提问
    const promptTimer = setInterval(() => {
      if (cancelled) return;
      pIndex += 1;
      setTypedPrompt(fullPrompt.slice(0, pIndex));
      if (pIndex >= fullPrompt.length) {
        clearInterval(promptTimer);

        // 提问完成后稍作停顿，直接流式返回结果代码切片
        setTimeout(() => {
          if (cancelled) return;
          setShowToolCall(true);

          let sIndex = 0;
          const snippetTimer = setInterval(() => {
            if (cancelled) return;
            sIndex += 4;
            setTypedSnippet(fullSnippet.slice(0, sIndex));
            if (sIndex >= fullSnippet.length) {
              clearInterval(snippetTimer);
              setIsTyping(false);
            }
          }, 16);
        }, 280);
      }
    }, 36);

    return () => {
      cancelled = true;
      clearInterval(promptTimer);
    };
  }, [scenarioIndex]);

  const handleReplay = () => {
    setScenarioIndex((prev) => (prev + 1) % DEMO_SCENARIOS.length);
  };

  return (
    <section className="border-t border-[var(--hero-border)] bg-[var(--hero-bg)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 text-[var(--hero-ink)]">
      <div className="mx-auto max-w-[1120px]">
        {/* 顶部标题区 - 优雅大居中对齐 */}
        <div className="mx-auto max-w-[760px] text-center pb-10 border-b border-[var(--hero-border)]">
          <h2 className="text-[28px] font-semibold tracking-[-0.045em] sm:text-[38px] text-[var(--hero-ink)]">
            本地 IDE 直连 · 设计资产呼之即来
          </h2>

          <p className="mx-auto mt-3 max-w-[660px] text-[14px] leading-7 text-[var(--hero-muted)]">
            还在忍受 AI 写的代码充满千篇一律的廉价感？直接把 600+ 顶尖设计工程装进 IDE，一句自然语言告别“AI味”，秒级直出工业级质感与高保真动效。
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleGoProfile}
              className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-[var(--hero-ink)] px-4 text-[12px] font-medium text-[var(--hero-bg)] transition-opacity hover:opacity-88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/20"
            >
              <span>配置 MCP 助手</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[var(--hero-border)] bg-[var(--hero-surface)] px-3 text-[12px] font-mono text-[var(--hero-muted)] transition-colors hover:bg-[var(--hero-ink)]/[0.04] hover:text-[var(--hero-ink)] focus-visible:outline-none"
            >
              <Terminal className="h-3 w-3" />
              <span>{installCmd}</span>
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3 opacity-60" />
              )}
            </button>
          </div>
        </div>

        {/* 支持的 AI 工具展示行（使用解构页真实 SVG 图标） */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-[12px] text-[var(--hero-muted)]">
            <span className="font-mono text-[11px] uppercase tracking-wider">SUPPORTED CLIENTS:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SUPPORTED_TOOLS.map((tool) => {
              const isSelected = activeTool === tool.name;
              return (
                <button
                  key={tool.name}
                  type="button"
                  onClick={() => setActiveTool(tool.name)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-180",
                    isSelected
                      ? "border border-[var(--hero-ink)]/20 bg-[var(--hero-surface)] text-[var(--hero-ink)] shadow-xs"
                      : "border border-[var(--hero-border)] bg-[var(--hero-bg)] text-[var(--hero-muted)] hover:border-[var(--hero-ink)]/20 hover:text-[var(--hero-ink)]",
                  )}
                >
                  <ToolIcon name={tool.name} className="h-3.5 w-3.5 shrink-0" />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 核心展示区：仿 iOS Safari 浏览器大窗口 */}
        <div className="mt-6 overflow-hidden rounded-[20px] sm:rounded-[24px] border border-[var(--hero-border)] bg-[var(--hero-surface)] shadow-[0_26px_70px_-20px_rgba(0,0,0,0.55)]">
          {/* iOS / Safari 浏览器顶栏（1:1 复刻用户设计参考） */}
          <div className="relative flex h-11 items-center justify-between border-b border-[var(--hero-border)] bg-[var(--hero-bg)]/80 px-4 backdrop-blur-md">
            {/* 左侧三色小圆点 */}
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
            </div>

            {/* 中间 Safari 居中椭圆胶囊地址栏 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-6 w-[180px] sm:w-[240px] items-center justify-center rounded-full border border-[var(--hero-border)] bg-[var(--hero-surface)] px-3 text-[11px] font-mono shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <span className="tracking-wide text-[var(--hero-ink)]/70 text-[11px]">ownai.icu</span>
              </div>
            </div>

            {/* 右侧：客户端与状态指示 */}
            <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--hero-muted)]">
              <div className="hidden sm:flex items-center gap-1.5">
                <ToolIcon name={activeTool} className="h-3.5 w-3.5 opacity-80" />
                <span className="text-[10px] font-medium text-[var(--hero-muted)]">{activeTool}</span>
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>

          {/* 场景快速切换 Tab 栏 */}
          <div className="flex items-center justify-between border-b border-[var(--hero-border)] bg-[var(--hero-surface)]/50 px-4 py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] text-[var(--hero-muted)] mr-1 hidden sm:inline">用例示范:</span>
              {DEMO_SCENARIOS.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScenarioIndex(idx)}
                  className={cn(
                    "whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                    scenarioIndex === idx
                      ? "bg-[var(--hero-ink)] text-[var(--hero-bg)]"
                      : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)] hover:bg-[var(--hero-ink)]/[0.04]",
                  )}
                >
                  {item.tag}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleReplay}
              title="重新播放或切换用例"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[var(--hero-muted)] hover:text-[var(--hero-ink)] hover:bg-[var(--hero-ink)]/[0.04]"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">切换演示</span>
            </button>
          </div>

          {/* 对话式动态逐字终端交互区 */}
          <div className="p-5 sm:p-7 font-mono text-[12px] leading-relaxed space-y-4 bg-[var(--hero-surface)]/30">
            {/* 开发者提问气泡（带打字机效果） */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--hero-border)] bg-[var(--hero-bg)] text-[var(--hero-ink)] shadow-xs">
                <ToolIcon name={activeTool} className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-3.5 sm:p-4 text-[var(--hero-ink)] shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-[var(--hero-muted)] mb-1.5 font-sans">
                  <span className="font-semibold">{activeTool} Composer User</span>
                  <span className="text-[10px]">Natural Language Query</span>
                </div>
                <p className="text-[13px] leading-relaxed">
                  {typedPrompt}
                  {isTyping && !showToolCall ? (
                    <span className="inline-block w-2 h-3.5 ml-0.5 bg-[var(--hero-ink)] animate-pulse align-middle" />
                  ) : null}
                </p>
              </div>
            </div>

            {/* AI 响应切片结果直接展示（跳过冗余 json 搜索块） */}
            {showToolCall && (
              <div className="flex items-start gap-3 animate-in fade-in duration-300">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--hero-border)] bg-[var(--hero-surface)] p-1 shadow-xs overflow-hidden">
                  <img
                    src="/images/ownai-logo.webp"
                    alt="OwnAI"
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-3.5 sm:p-4 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between text-[11px] border-b border-[var(--hero-border)] pb-2 text-[var(--hero-muted)]">
                      <div className="flex items-center gap-1.5 font-medium text-[var(--hero-ink)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>✓ {scenario.responseFile}</span>
                      </div>
                      <span className="text-[10px] rounded bg-[var(--hero-surface)] border border-[var(--hero-border)] px-1.5 py-0.5">
                        {scenario.badge}
                      </span>
                    </div>

                    <pre className="overflow-x-auto text-[11px] leading-5 font-mono py-1 text-[var(--hero-ink)]/90">
                      <code>{typedSnippet}</code>
                      {isTyping ? (
                        <span className="inline-block w-2 h-3.5 ml-0.5 bg-[var(--hero-ink)] animate-pulse align-middle" />
                      ) : null}
                    </pre>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--hero-border)] text-[11px] text-[var(--hero-muted)]">
                      <span>✓ 600+ 顶尖设计作品规范与工程 ZIP 直链提取完毕</span>
                      <span className="font-sans font-medium text-[var(--hero-ink)]">
                        直接粘贴即可交付使用
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部四项特性简介（直击痛点） */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4">
            <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--hero-ink)]">
              <Sparkles className="h-4 w-4 text-[var(--hero-muted)]" />
              <span>彻底告别廉价“AI味”</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--hero-muted)]">
              厌倦了模型生成的粗糙布局与千篇一律？直连 600+ 顶尖解构源码，自带 Apple / Linear 级工业审美。
            </p>
          </div>

          <div className="rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4">
            <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--hero-ink)]">
              <Layers className="h-4 w-4 text-[var(--hero-muted)]" />
              <span>拒绝僵死生硬的动效</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--hero-muted)]">
              AI 只会写死板的线性 CSS？原生携带打磨成熟的 Framer Motion 弹簧阻尼与物理微交互，帧帧丝滑。
            </p>
          </div>

          <div className="rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4">
            <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--hero-ink)]">
              <ShieldCheck className="h-4 w-4 text-[var(--hero-muted)]" />
              <span>告别报错与拼接地狱</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--hero-muted)]">
              还在反复调试 AI 幻觉缺失的类名与依赖？所有构件经 TS + Tailwind 严格验证，直接落盘即可交付。
            </p>
          </div>

          <div className="rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4">
            <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--hero-ink)]">
              <Terminal className="h-4 w-4 text-[var(--hero-muted)]" />
              <span>免除繁琐 Prompt 调教</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--hero-muted)]">
              无需撰写数百字复杂设计规范提示词。在终端一句自然语言，600+ 完整工程 ZIP 与 TSX 秒级直达。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


