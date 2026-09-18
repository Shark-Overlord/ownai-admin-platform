import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Copy,
  Laptop,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";

export function HomeMcpSection() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const installCmd = "npx -y @ownai/mcp-bridge";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoProfile = () => {
    navigate("/profile?tab=mcp");
  };

  return (
    <section className="relative border-t border-[var(--hero-border)] bg-[var(--hero-bg)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      {/* 背景微光 */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-30"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-500/10 via-purple-500/5 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1200px]">
        {/* 顶部标题区 */}
        <div className="mx-auto max-w-[840px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-[12px] font-semibold text-amber-600 dark:text-amber-400">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>全新重磅功能 · Spring AI MCP Server</span>
            <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-1.5 py-0.2 text-[9px] font-black text-white uppercase">
              NEW
            </span>
          </div>

          <h2 className="mt-4 text-[32px] font-bold tracking-tight text-[var(--hero-ink)] sm:text-[44px]">
            在 Cursor 中，将 OwnAI 万套设计切片直接呼之即来
          </h2>

          <p className="mx-auto mt-4 max-w-[680px] text-[15px] leading-7 text-[var(--hero-muted)] sm:text-[16px]">
            告别在网页和代码间反复切换。通过标准 Model Context Protocol (MCP) 协议，让 Cursor、Claude Desktop 或 Windsurf 原生具备 OwnAI 全量设计语义检索与老作品解构动效能力。
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleGoProfile}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--hero-ink)] px-5 text-[13px] font-semibold text-[var(--hero-bg)] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/20"
            >
              <Zap className="h-4 w-4 text-amber-400" />
              立即接入 MCP 助手
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--hero-border)] bg-[var(--hero-surface)] px-4 text-[13px] font-medium text-[var(--hero-ink)] transition-all duration-200 hover:bg-[var(--hero-ink)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/20"
            >
              <Terminal className="h-3.5 w-3.5 text-[var(--hero-muted)]" />
              <code className="font-mono text-[12px]">{installCmd}</code>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-[var(--hero-muted)]" />
              )}
            </button>
          </div>
        </div>

        {/* 核心展示区：IDE 模拟器与特性并排 */}
        <div className="mt-14 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          {/* 左侧：Cursor AI Agent 交互模拟 */}
          <div className="overflow-hidden rounded-[20px] border border-[var(--hero-border)] bg-[#0d1117] text-[#c9d1d9] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.45)]">
            {/* 窗口控制条 */}
            <div className="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                <span className="ml-2 font-mono text-[12px] font-medium text-[#8b949e]">
                  Cursor AI · OwnAI MCP Tool Server
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Connected SSE
                </span>
              </div>
            </div>

            {/* 终端内容区 */}
            <div className="p-5 font-mono text-[13px] leading-relaxed space-y-4">
              {/* 用户提问 */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold">
                  U
                </div>
                <div className="flex-1 rounded-xl bg-[#21262d] p-3 text-[#f0f6fc]">
                  <p>帮我找一个极简深色风格的电商促销弹窗，需要弹簧动效和关闭倒计时，直接给我 TSX 切片代码。</p>
                </div>
              </div>

              {/* MCP 调用状态 */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-black text-[11px] font-bold">
                  ⚡
                </div>
                <div className="flex-1 space-y-2">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-amber-300 text-[12px]">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      Calling: ownai_design_tools.find_design_components
                    </div>
                    <div className="mt-1 text-[#8b949e] text-[11px]">
                      scenario: "ecommerce" · carrier: "website" · visualStyle: "dark" · motion: "spring"
                    </div>
                  </div>

                  {/* 返回切片预览 */}
                  <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
                      <span className="font-semibold text-[#58a6ff]">✓ 匹配到 OwnAI 构件切片与 140+ 经典作品库</span>
                      <span>Spring AI 1.0.0</span>
                    </div>

                    <div className="overflow-x-auto text-[12px] text-[#7ee787]">
                      <pre>
{`// 构件切片: PromoModalDark.tsx (Framer Motion + Tailwind)
<motion.div
  initial={{ opacity: 0, scale: 0.92, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 380, damping: 28 }}
  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
>
  <CountdownTimer initialSeconds={300} onExpire={handleClose} />
  ...
</motion.div>`}
                      </pre>
                    </div>

                    <div className="pt-2 border-t border-[#30363d] flex items-center justify-between text-[11px]">
                      <span className="text-[#8b949e]">包含完整源工程 ZIP 与 Lucide 规范</span>
                      <span className="text-amber-400 font-medium">即时嵌入当前工作区 ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：四大核心特性卡片 */}
          <div className="space-y-4">
            <div className="rounded-[16px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 transition-all duration-200 hover:border-amber-500/40 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--hero-ink)]">
                    五维设计语义检索
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--hero-muted)]">
                    不凭冷冰冰的数字 ID，支持按「业务场景 + 终端载体 + 视觉风格 + 构件切片 + 动效预设」在本地自然语言精准召回。
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 transition-all duration-200 hover:border-amber-500/40 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--hero-ink)]">
                    浏览器一键免密授权
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--hero-muted)]">
                    终端运行自动调起系统浏览器 `/mcp/auth`，点击确认授权即刻安全打通，无需手动复制黏贴冗长 API Key。
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 transition-all duration-200 hover:border-amber-500/40 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--hero-ink)]">
                    140+ 经典作品全量适配
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--hero-muted)]">
                    自动解构老作品的提示词与动效规范，支持获取完整 ZIP 源码包下载直链，让每一份历史资产都在 IDE 中重获新生。
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 transition-all duration-200 hover:border-amber-500/40 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--hero-ink)]">
                    主流 AI IDE 即插即用
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--hero-muted)]">
                    原生适配 Cursor、Claude Desktop、Windsurf，标准 Stdio/SSE 双通道，极速接入属于你的 Vibe Coding 工作流。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部引导横幅 */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-[18px] border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-purple-500/5 to-transparent p-6 sm:flex-row sm:p-8">
          <div>
            <h4 className="text-[16px] font-semibold text-[var(--hero-ink)]">
              OwnAI 会员特权已就绪
            </h4>
            <p className="mt-1 text-[13px] text-[var(--hero-muted)]">
              所有月度、年度与永久会员均可享受无限制 MCP 查询配额，随时管理已授权客户端。
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoProfile}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--hero-ink)] px-5 py-2.5 text-[13px] font-semibold text-[var(--hero-bg)] transition-all hover:-translate-y-0.5 hover:opacity-90"
          >
            进入个人中心设置 MCP
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
