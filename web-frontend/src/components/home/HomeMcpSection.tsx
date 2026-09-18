import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Copy,
  FolderArchive,
  Laptop,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function HomeMcpSection() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"cursor" | "windsurf" | "claude">("cursor");

  const installCmd = "npx -y @ownai/mcp-bridge";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoProfile = () => {
    navigate("/profile?tab=mcp");
  };

  const features = [
    {
      index: "01",
      title: "五维设计语义智能检索",
      desc: "无需生硬数字 ID。在 IDE 内输入「电商 + 极简深色 + 弹簧微动效 + 促销卡片」，模型自动精准召回全套 TSX 切片与动效配置。",
      icon: Search,
    },
    {
      index: "02",
      title: "系统浏览器一键免密授权",
      desc: "桥接器启动时自动唤起系统浏览器完成身份验证，Token 本地哈希安全持久化，告别繁复的 API Key 复制黏贴。",
      icon: ShieldCheck,
    },
    {
      index: "03",
      title: "140+ 经典老作品全量激活",
      desc: "智能提取作品内置的 Lucide 图标规范与动效物理参数，直通完整源工程 ZIP 下载链接，让历史资产在本地重获新生。",
      icon: FolderArchive,
    },
    {
      index: "04",
      title: "Cursor · Claude · Windsurf 原生支持",
      desc: "遵循标准 MCP 协议，支持 Stdio 与 SSE 双向传输。开箱即用的桥接命令，5 秒即可无缝融入你的 Vibe Coding 工作流。",
      icon: Laptop,
    },
  ];

  return (
    <section className="border-t border-[var(--hero-border)] bg-[var(--hero-bg)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 text-[var(--hero-ink)]">
      <div className="mx-auto max-w-[1120px]">
        {/* 顶部标题区 - 纯正 OwnAI 克制排版 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[var(--hero-border)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-medium tracking-[0.16em] uppercase text-[var(--hero-muted)]">
                DEVELOPER ECOSYSTEM · MCP SERVER
              </span>
              <span className="rounded-full border border-[var(--hero-border)] bg-[var(--hero-surface)] px-2 py-0.5 font-mono text-[9px] font-medium uppercase text-[var(--hero-muted)]">
                SPRING AI 1.0.0
              </span>
            </div>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.045em] sm:text-[38px] text-[var(--hero-ink)]">
              本地 IDE 直连 · 设计资产呼之即来
            </h2>
            <p className="mt-3 max-w-[620px] text-[14px] leading-7 text-[var(--hero-muted)]">
              告别在浏览器与编辑器之间反复横跳。让 Cursor、Claude Desktop 与 Windsurf 原生具备 OwnAI 全量设计切片与动效解构检索能力。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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

        {/* 核心展示区：左侧 IDE 终端模拟器，右侧极简特性矩阵 */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.18fr_0.82fr] lg:gap-14 items-start">
          {/* 左侧：极简高冷 IDE 交互窗口 */}
          <div className="overflow-hidden rounded-[16px] border border-[var(--hero-border)] bg-[#050507] text-[#e1e4e8] shadow-[0_24px_64px_-24px_rgba(0,0,0,0.85)]">
            {/* 顶栏 */}
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0c0d12] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="ml-2 font-mono text-[11px] text-white/50">
                  Cursor · Composer Agent (MCP Protocol)
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-80" />
                <span>SSE 8011</span>
              </div>
            </div>

            {/* 终端会话流 */}
            <div className="p-5 font-mono text-[12px] leading-relaxed space-y-4">
              {/* 用户输入 */}
              <div className="rounded-[10px] border border-white/[0.08] bg-white/[0.03] p-3 text-white/90">
                <span className="text-white/40 select-none mr-2">➜</span>
                <span>帮我找一个极简深色风格的电商促销弹窗，需要弹簧交互动效与关闭倒计时，直接给我 TSX 切片。</span>
              </div>

              {/* MCP 调度状态 */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] text-white/50">
                  <Sparkles className="h-3 w-3 text-white/70" />
                  <span>Invoking tool:</span>
                  <span className="text-white/80 font-semibold">ownai_design_tools.find_design_components</span>
                </div>
                <div className="rounded-[8px] bg-black/50 border border-white/[0.06] p-2 text-[11px] text-white/50">
                  {`{ "scenario": "ecommerce", "carrier": "website", "visualStyle": "dark", "motionPreset": "spring" }`}
                </div>
              </div>

              {/* 返回结果切片 */}
              <div className="rounded-[10px] border border-white/[0.08] bg-[#090a0f] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] border-b border-white/[0.06] pb-2 text-white/50">
                  <span className="text-white/80 font-medium">✓ PromoModalDark.tsx (切片提取完毕)</span>
                  <span className="text-[10px]">Framer Motion + Tailwind</span>
                </div>

                <pre className="overflow-x-auto text-[11px] text-white/75 leading-5 font-mono py-1">
{`export function PromoModal({ isOpen, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      className="rounded-2xl border border-white/10 bg-[#09090b] p-6 shadow-2xl"
    >
      <CountdownTimer duration={300} onEnd={onClose} />
      {/* 包含 140+ 作品提示词规范与整包 ZIP 下载直链 */}
    </motion.div>
  );
}`}
                </pre>

                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/[0.06] text-white/40">
                  <span>Source: OwnAI Verified Component Library</span>
                  <span className="text-white/70">Ready to insert</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：纯正极简的特性列表（风格呼应 Course 教程） */}
          <div className="border-t border-[var(--hero-border)]">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.index}
                  className="group flex flex-col gap-1.5 border-b border-[var(--hero-border)] py-4 transition-colors hover:bg-[var(--hero-ink)]/[0.02]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[14px] font-medium text-[var(--hero-ink)]">
                      <Icon className="h-3.5 w-3.5 text-[var(--hero-muted)] opacity-70 group-hover:opacity-100 transition-opacity" />
                      <span>{item.title}</span>
                    </span>
                    <span className="font-mono text-[11px] text-[var(--hero-muted)] tracking-wider">
                      {item.index}
                    </span>
                  </div>
                  <p className="text-[13px] leading-6 text-[var(--hero-muted)]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部紧凑提示条 */}
        <div className="mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--hero-border)] bg-[var(--hero-bg)] text-[var(--hero-ink)]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[13px] font-medium text-[var(--hero-ink)]">
                会员权益：月度 / 年度 / 永久会员无限制使用
              </p>
              <p className="text-[12px] text-[var(--hero-muted)]">
                客户端单次启动自动唤起授权，随时可在个人中心管理已授权设备。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoProfile}
            className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[var(--hero-ink)] transition-opacity hover:opacity-75 sm:ml-auto"
          >
            <span>前往个人中心</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

