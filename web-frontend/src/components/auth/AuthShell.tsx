import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Code2, Layers, ShieldCheck, Sparkles, Terminal } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  switchLabel: string;
  switchCta: string;
  switchTo: string;
  children: ReactNode;
}

export function AuthShell({
  switchLabel,
  switchCta,
  switchTo,
  children,
}: AuthShellProps) {
  return (
    <div className="relative min-h-[100svh] bg-[var(--hero-bg)] text-[var(--hero-ink)]">
      {/* 全屏左右分栏网格：左侧宣传沉浸区 (>= 1024px) | 右侧表单操作区 */}
      <div className="min-h-[100svh] flex flex-col lg:grid lg:grid-cols-12">
        {/* 左侧：高转化品牌与平台价值宣传面板（仅在桌面端显示，在移动端转为极简 Header） */}
        <aside className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between border-r border-[var(--hero-border)] bg-[var(--hero-surface)] p-8 xl:p-12 overflow-hidden select-none">
          {/* 背景微光与几何网格 */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[-15%] top-[-10%] h-[380px] w-[380px] rounded-full bg-[var(--hero-ink)]/[0.03] blur-3xl" />
            <div className="absolute right-[-10%] bottom-[-10%] h-[420px] w-[420px] rounded-full bg-[var(--hero-ink)]/[0.025] blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />
          </div>

          {/* 顶部：品牌 Logo 与平台定位 */}
          <div className="relative z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-1.5 shadow-xs">
                <img
                  src="/images/ownai-logo.webp"
                  alt="OwnAI"
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </div>
              <div>
                <span className="text-[15px] font-semibold tracking-tight text-[var(--hero-ink)]">
                  OwnAI
                </span>
                <span className="block text-[11px] font-mono tracking-wider uppercase text-[var(--hero-muted)]">
                  DESIGN & ENGINEERING ASSETS
                </span>
              </div>
            </Link>
          </div>

          {/* 中间核心：高转化文案与动效代码切片演示 */}
          <div className="relative z-10 my-auto py-8 max-w-[580px] space-y-6">
            {/* 顶标 */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--hero-border)] bg-[var(--hero-bg)] px-3 py-1 text-[11px] font-medium text-[var(--hero-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--hero-ink)]" />
              <span>600+ 顶尖解构工程 · 本地 IDE 深度直连</span>
            </div>

            {/* 大标题 */}
            <div className="space-y-2.5">
              <h1 className="text-[28px] xl:text-[34px] font-semibold tracking-[-0.04em] leading-[1.22] text-[var(--hero-ink)]">
                告别千人一面的粗糙“AI味”<br />
                把 600+ 顶尖设计工程装进你的 IDE
              </h1>
              <p className="text-[13px] xl:text-[14px] leading-relaxed text-[var(--hero-muted)]">
                无需在网页与编辑器之间反复横跳。在终端一句自然语言，秒级直出工业级 TSX 切片、物理弹簧动效与商业级完整项目源码。
              </p>
            </div>

            {/* 仿 macOS / IDE 高冷切片代码窗口预览 */}
            <div className="overflow-hidden rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-bg)] shadow-[0_16px_50px_-16px_rgba(0,0,0,0.4)]">
              <div className="flex h-9 items-center justify-between border-b border-[var(--hero-border)] bg-[var(--hero-surface)]/70 px-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                  <span className="ml-2 font-mono text-[10px] text-[var(--hero-muted)]">PromoModalDark.tsx</span>
                </div>
                <span className="rounded bg-[var(--hero-bg)] border border-[var(--hero-border)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--hero-muted)]">
                  Framer Motion Spring
                </span>
              </div>
              <pre className="p-3.5 font-mono text-[11px] leading-5 text-[var(--hero-ink)]/85 overflow-x-auto">
                <code>{`// 构件切片: PromoModalDark.tsx (开箱即交付)
export function PromoModal({ isOpen, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      className="rounded-2xl border border-white/10 bg-[#09090b] p-6"
    >
      <CountdownTimer duration={300} onEnd={onClose} />
      {/* 600+ 工业级设计工程全量直通，零报错交付 */}
    </motion.div>
  );
}`}</code>
              </pre>
              <div className="flex items-center justify-between border-t border-[var(--hero-border)] bg-[var(--hero-surface)]/40 px-3.5 py-2 text-[11px] text-[var(--hero-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>支持 Cursor · Claude · Codex · Antigravity</span>
                </span>
                <span className="font-mono text-[10px] text-[var(--hero-ink)]/70">100% TSX + Tailwind</span>
              </div>
            </div>

            {/* 4 项核心价值徽章 */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="flex items-center gap-2 rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-bg)] px-3 py-2 text-[12px]">
                <Layers className="h-3.5 w-3.5 text-[var(--hero-muted)] shrink-0" />
                <span className="font-medium text-[var(--hero-ink)]">600+ 工业级解构资产</span>
              </div>
              <div className="flex items-center gap-2 rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-bg)] px-3 py-2 text-[12px]">
                <Terminal className="h-3.5 w-3.5 text-[var(--hero-muted)] shrink-0" />
                <span className="font-medium text-[var(--hero-ink)]">本地 IDE MCP 助手直调</span>
              </div>
              <div className="flex items-center gap-2 rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-bg)] px-3 py-2 text-[12px]">
                <Code2 className="h-3.5 w-3.5 text-[var(--hero-muted)] shrink-0" />
                <span className="font-medium text-[var(--hero-ink)]">真实弹簧物理微动效</span>
              </div>
              <div className="flex items-center gap-2 rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-bg)] px-3 py-2 text-[12px]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--hero-muted)] shrink-0" />
                <span className="font-medium text-[var(--hero-ink)]">自包含零报错直接交付</span>
              </div>
            </div>
          </div>

          {/* 底部口碑引用 */}
          <div className="relative z-10 pt-4 border-t border-[var(--hero-border)]">
            <p className="text-[12px] italic leading-relaxed text-[var(--hero-muted)]">
              “真正让前端交互告别了 AI 的廉价感与拼接地狱，从设计解构到代码落盘一气呵成。”
            </p>
          </div>
        </aside>

        {/* 右侧：表单操作区 */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between min-h-[100svh] p-4 sm:p-6 lg:p-10">
          {/* 右侧顶栏：移动端 Logo + 返回首页 + 登录/注册快速切换 */}
          <header className="flex items-center justify-between gap-3 w-full max-w-[480px] mx-auto pb-4">
            {/* 移动端 Logo (桌面端隐藏) */}
            <div className="lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-1">
                  <img
                    src="/images/ownai-logo.webp"
                    alt="OwnAI"
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                </div>
                <span className="text-[13px] font-semibold text-[var(--hero-ink)]">
                  OwnAI
                </span>
              </Link>
            </div>

            {/* 桌面端返回首页快捷按钮 */}
            <div className="hidden lg:block">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--hero-muted)] hover:text-[var(--hero-ink)] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>返回首页</span>
              </Link>
            </div>

            {/* 切换登录/注册胶囊按钮 */}
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--hero-border)] bg-[var(--hero-surface)] px-1.5 py-1 text-xs shadow-xs">
              <span className="hidden px-2 text-[var(--hero-muted)] sm:inline">
                {switchLabel}
              </span>
              <Link
                to={switchTo}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--hero-ink)] px-2.5 py-1 font-medium text-[var(--hero-bg)] transition-opacity hover:opacity-90"
              >
                <span>{switchCta}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </header>

          {/* 表单主体（居中对齐） */}
          <main className="my-auto w-full max-w-[440px] mx-auto py-6">
            {children}
          </main>

          {/* 底部极简声明 */}
          <footer className="w-full max-w-[480px] mx-auto pt-4 text-center text-[11px] text-[var(--hero-muted)]">
            <span>© OwnAI · 工业级前端工程与设计解构平台</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
