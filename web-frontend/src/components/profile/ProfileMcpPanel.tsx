import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Check,
  Code2,
  Copy,
  Crown,
  ExternalLink,
  FolderArchive,
  KeyRound,
  Laptop,
  Layers,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";
import { listMyMcpKeys, revokeMcpKey, type McpKeyVO } from "@/lib/mcp";
import type { UserProfileDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

// 解构页同款真实 SVG 图标
function ToolIcon({
  name,
  className = "h-4 w-4",
}: {
  name: "Cursor" | "Claude" | "Antigravity" | "Codex";
  className?: string;
}) {
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
        fill="url(#dc-codex-mcp-profile)"
      />
      <defs>
        <linearGradient id="dc-codex-mcp-profile" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7A9DFF" />
          <stop offset="1" stopColor="#3941FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface ProfileMcpPanelProps {
  profile: UserProfileDetail | null;
}

export function ProfileMcpPanel({ profile }: ProfileMcpPanelProps) {
  const navigate = useNavigate();
  // 配置模式切换：ai（AI 智能配置，发给自己的 AI） | manual（手动安装与配置）
  const [configMode, setConfigMode] = useState<"ai" | "manual">("ai");
  // 手动配置时的客户端选择
  const [manualClient, setManualClient] = useState<"cursor" | "claude" | "codex" | "antigravity">("cursor");
  const [keys, setKeys] = useState<McpKeyVO[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isMember = profile?.memberLevel?.toLowerCase() === "member";
  const isLifetime = profile?.memberPlanType?.toLowerCase() === "lifetime" || !profile?.memberExpireTime;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadKeys = async () => {
    if (!isMember) return;
    setLoadingKeys(true);
    try {
      const data = await listMyMcpKeys();
      setKeys(data);
    } catch (e) {
      console.warn("加载 MCP 密钥列表失败:", e);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [isMember]);

  const handleRevokeKey = async (id: number) => {
    if (!confirm("确定要吊销该客户端设备的 MCP 凭证吗？吊销后该客户端将无法继续访问。")) return;
    try {
      await revokeMcpKey(id);
      await loadKeys();
    } catch (e: any) {
      alert(e?.message || "吊销失败");
    }
  };

  // AI 配置专用提示词（用户直接复制发给自己的 AI）
  const aiConfigPrompt = `请帮我配置 OwnAI 的 MCP Server (Model Context Protocol)。

1. 如果是 Cursor：
   请在你的全局或工作区 MCP 配置文件（如 ~/.cursor/mcp.json 或 settings 中的 mcpServers）中添加如下配置：
   {
     "mcpServers": {
       "ownai-design": {
         "command": "npx",
         "args": ["-y", "@ownai/mcp-bridge"]
       }
     }
   }

2. 如果是 Claude Desktop：
   请在配置文件（Windows: %APPDATA%\\Claude\\claude_desktop_config.json 或 macOS: ~/Library/Application Support/Claude/claude_desktop_config.json）中添加上述同一个 ownai-design 服务配置。

3. 如果是其他 IDE（如 Codex / Windsurf / Antigravity）：
   同样添加名为 ownai-design 的 stdio 服务，启动命令为 npx，参数为 ["-y", "@ownai/mcp-bridge"]。

配置保存后，首次调用该服务会自动在默认浏览器调起 OwnAI 授权页面，确认授权即可在 IDE 中直接召回 600+ 顶尖设计切片与动效工程。`;

  // 手动配置 JSON 代码片段
  const standardConfigJson = JSON.stringify(
    {
      mcpServers: {
        "ownai-design": {
          command: "npx",
          args: ["-y", "@ownai/mcp-bridge"],
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-6 text-[var(--hero-ink)]">
      {/* 头部状态与特权卡片（高冷暗黑极简 Apple 风格） */}
      <div className="rounded-[18px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hero-border)] bg-[var(--hero-bg)] px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider text-[var(--hero-muted)]">
                <Sparkles className="h-3 w-3" />
                <span>Model Context Protocol</span>
              </span>

              {isMember ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{isLifetime ? "永久会员 · MCP 权限已激活" : "年度会员 · MCP 权限已激活"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hero-border)] bg-[var(--hero-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--hero-muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>未开通会员（MCP 助手仅限会员尊享）</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--hero-ink)]">
              本地 IDE 直连 · 把 600+ 顶尖设计资产装进你的编辑器
            </h2>

            <p className="text-xs sm:text-[13px] leading-relaxed text-[var(--hero-muted)] max-w-2xl">
              告别千篇一律的廉价“AI味”。在 Cursor、Claude 或 Codex 对话框中输入一句自然语言，秒级直出全站商业级 TSX 切片、物理动效与完整工程源码。
            </p>
          </div>

          {!isMember && (
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--hero-ink)] px-5 py-2.5 text-xs sm:text-sm font-medium text-[var(--hero-bg)] transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              <Crown className="h-4 w-4" />
              <span>开通会员解锁权限</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 核心配置方式选择区：第一种 AI 配置（发给自己的 AI） vs 第二种 手动安装 */}
      <div className="rounded-[18px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-6 space-y-6">
        {/* 顶部两项方式切换控制器 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--hero-border)] pb-5">
          <div>
            <h3 className="text-[15px] font-medium text-[var(--hero-ink)]">
              配置接入方式
            </h3>
            <p className="text-xs text-[var(--hero-muted)] mt-0.5">
              推荐使用 AI 一键配置，复制指令发给你的 AI 助手即可全自动完成。
            </p>
          </div>

          <div className="inline-flex rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-1 text-xs">
            <button
              type="button"
              onClick={() => setConfigMode("ai")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 font-medium transition-colors",
                configMode === "ai"
                  ? "bg-[var(--hero-ink)] text-[var(--hero-bg)] shadow-xs"
                  : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]"
              )}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>第一种：AI 智能配置（推荐）</span>
            </button>
            <button
              type="button"
              onClick={() => setConfigMode("manual")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 font-medium transition-colors",
                configMode === "manual"
                  ? "bg-[var(--hero-ink)] text-[var(--hero-bg)] shadow-xs"
                  : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]"
              )}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>第二种：手动安装与配置</span>
            </button>
          </div>
        </div>

        {/* 方式一：AI 智能配置 */}
        {configMode === "ai" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start gap-3 rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-4 text-xs leading-relaxed text-[var(--hero-muted)]">
              <Bot className="h-4 w-4 shrink-0 text-[var(--hero-ink)] mt-0.5" />
              <div>
                <strong className="text-[var(--hero-ink)] font-medium">原理说明：</strong>
                只需将下方调优好的提示词复制并发送给你的 AI 编程助手（如 Cursor Composer、Claude Desktop 等），AI 将自动查找你系统中的 MCP 配置文件并写入，无需手动查找复杂目录。
              </div>
            </div>

            {/* AI 提示词复制卡片 */}
            <div className="relative rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-bg)] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--hero-border)] bg-[var(--hero-surface)]/50 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-[var(--hero-muted)] font-mono">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>AI 配置提示词 (Prompt)</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(aiConfigPrompt, "ai-prompt")}
                  className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--hero-ink)] px-3 py-1 text-[11px] font-medium text-[var(--hero-bg)] transition-opacity hover:opacity-90"
                >
                  {copiedId === "ai-prompt" ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span>已复制提示词</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>一键复制指令</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 text-[12px] leading-6 font-mono text-[var(--hero-ink)]/90 whitespace-pre-wrap select-all overflow-x-auto">
                {aiConfigPrompt}
              </pre>
            </div>

            {/* 操作三部曲 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-3.5 text-xs">
                <div className="flex items-center gap-2 font-medium text-[var(--hero-ink)] mb-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--hero-bg)] border border-[var(--hero-border)] font-mono text-[10px]">1</span>
                  <span>复制配置指令</span>
                </div>
                <p className="text-[var(--hero-muted)] leading-relaxed pl-7">
                  点击上方【一键复制指令】按钮，将包含多端规范的提示词置入剪贴板。
                </p>
              </div>

              <div className="rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-3.5 text-xs">
                <div className="flex items-center gap-2 font-medium text-[var(--hero-ink)] mb-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--hero-bg)] border border-[var(--hero-border)] font-mono text-[10px]">2</span>
                  <span>直接发送给 AI</span>
                </div>
                <p className="text-[var(--hero-muted)] leading-relaxed pl-7">
                  在 Cursor 对话框（Ctrl/Cmd + I）或 Claude 中直接粘贴并回车。
                </p>
              </div>

              <div className="rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-3.5 text-xs">
                <div className="flex items-center gap-2 font-medium text-[var(--hero-ink)] mb-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--hero-bg)] border border-[var(--hero-border)] font-mono text-[10px]">3</span>
                  <span>浏览器自动授权</span>
                </div>
                <p className="text-[var(--hero-muted)] leading-relaxed pl-7">
                  初次启动会自动调起浏览器弹出授权确认页，点击允许后绿灯常亮接入。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 方式二：手动安装与配置 */}
        {configMode === "manual" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* 终端一行启动命令 */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-[var(--hero-ink)]">
                1. 终端环境快速测试 / 全局安装
              </span>
              <div className="flex items-center gap-2 rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-2 pl-3">
                <Terminal className="h-3.5 w-3.5 text-[var(--hero-muted)] shrink-0" />
                <code className="flex-1 font-mono text-xs text-[var(--hero-ink)] select-all truncate">
                  npx -y @ownai/mcp-bridge
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard("npx -y @ownai/mcp-bridge", "manual-cmd")}
                  className="inline-flex items-center gap-1 rounded-[7px] border border-[var(--hero-border)] bg-[var(--hero-surface)] px-2.5 py-1 text-xs text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.04]"
                >
                  {copiedId === "manual-cmd" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedId === "manual-cmd" ? "已复制" : "复制"}</span>
                </button>
              </div>
            </div>

            {/* 客户端配置文件切换 */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--hero-ink)]">
                  2. 选择 IDE 客户端配置文件
                </span>
                <div className="inline-flex rounded-[8px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-0.5 text-xs">
                  {(
                    [
                      { id: "cursor" as const, label: "Cursor" },
                      { id: "claude" as const, label: "Claude Desktop" },
                      { id: "codex" as const, label: "Codex" },
                      { id: "antigravity" as const, label: "Antigravity" },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setManualClient(c.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors",
                        manualClient === c.id
                          ? "bg-[var(--hero-surface)] text-[var(--hero-ink)] shadow-xs"
                          : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]"
                      )}
                    >
                      <ToolIcon
                        name={
                          c.id === "cursor"
                            ? "Cursor"
                            : c.id === "claude"
                            ? "Claude"
                            : c.id === "codex"
                            ? "Codex"
                            : "Antigravity"
                        }
                        className="h-3 w-3"
                      />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {manualClient === "cursor" && (
                <div className="rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-4 space-y-3 text-xs">
                  <p className="text-[var(--hero-muted)] leading-relaxed">
                    在 Cursor 中按快捷键 <kbd className="font-mono rounded border border-[var(--hero-border)] bg-[var(--hero-surface)] px-1.5 py-0.5 text-[11px]">Ctrl/Cmd + ,</kbd> 打开 Settings $\to$ 点击 <strong>Features</strong> $\to$ 选择 <strong>MCP</strong> $\to$ 点击 <strong>+ Add New MCP Server</strong>：
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr] gap-2 font-mono text-[11px]">
                    <span className="text-[var(--hero-muted)]">Name:</span>
                    <span className="text-[var(--hero-ink)] font-semibold">ownai-design</span>
                    <span className="text-[var(--hero-muted)]">Type:</span>
                    <span className="text-[var(--hero-ink)]">command</span>
                    <span className="text-[var(--hero-muted)]">Command:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-[var(--hero-ink)] bg-[var(--hero-surface)] px-2 py-0.5 rounded border border-[var(--hero-border)] select-all">
                        npx -y @ownai/mcp-bridge
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("npx -y @ownai/mcp-bridge", "cursor-cmd-field")}
                        className="inline-flex items-center gap-1 rounded bg-[var(--hero-surface)] border border-[var(--hero-border)] px-2 py-0.5 text-[10px] text-[var(--hero-ink)] hover:opacity-80"
                      >
                        {copiedId === "cursor-cmd-field" ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                        <span>{copiedId === "cursor-cmd-field" ? "已复制" : "复制"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(manualClient === "claude" || manualClient === "codex" || manualClient === "antigravity") && (
                <div className="rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-4 space-y-3 text-xs">
                  <p className="text-[var(--hero-muted)] leading-relaxed">
                    {manualClient === "claude"
                      ? "打开 Claude Desktop 配置文件（Windows: %APPDATA%\\Claude\\claude_desktop_config.json / macOS: ~/Library/Application Support/Claude/claude_desktop_config.json），并在 mcpServers 节点内粘贴："
                      : "在所用 IDE 的 MCP 配置文件中添加如下标准 stdio 配置："}
                  </p>

                  <div className="relative">
                    <pre className="font-mono text-xs bg-[var(--hero-surface)] p-3.5 rounded-[10px] border border-[var(--hero-border)] text-[var(--hero-ink)] overflow-x-auto select-all">
                      {standardConfigJson}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(standardConfigJson, "manual-json")}
                      className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[var(--hero-ink)] text-[var(--hero-bg)] text-xs font-medium transition-opacity hover:opacity-90"
                    >
                      {copiedId === "manual-json" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedId === "manual-json" ? "已复制" : "复制 JSON"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 常用交互提问示例（直接复制进 IDE 体验） */}
      <div className="rounded-[18px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-6 space-y-4">
        <div>
          <h3 className="text-[15px] font-medium text-[var(--hero-ink)] flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--hero-ink)]" />
            <span>IDE 自然语言提问用例</span>
          </h3>
          <p className="text-xs text-[var(--hero-muted)] mt-0.5">
            配置完成后，在 Cursor Composer 或 Claude 对话框直接粘贴以下指令体验召回
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: "电商促销弹窗切片",
              prompt: "帮我找一个极简深色风格的电商促销弹窗，需要弹簧阻尼动效与关闭倒计时，直接输出 TSX 切片。",
            },
            {
              title: "企业级 SaaS 定价卡片",
              prompt: "找一个企业级 SaaS 的深色定价表切片，包含月年切换与推荐套餐高亮交互。",
            },
            {
              title: "移动端触觉弹性 TabBar",
              prompt: "找一套移动端 App 底部沉浸式 TabBar 切片，包含触觉弹性微动效与状态栏。",
            },
            {
              title: "检索 600+ 解构作品全包",
              prompt: "检索 OwnAI 平台已解构的高质感移动端社交类作品案例，提供切片概览与完整工程 ZIP 直链。",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-3 p-3.5 rounded-[12px] bg-[var(--hero-bg)] border border-[var(--hero-border)] hover:border-[var(--hero-ink)]/20 transition group"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-[11px] font-medium text-[var(--hero-muted)]">{item.title}</span>
                <p className="text-xs font-mono text-[var(--hero-ink)] line-clamp-2 leading-relaxed">
                  "{item.prompt}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(item.prompt, `prompt-${idx}`)}
                className="shrink-0 mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-medium border border-[var(--hero-border)] bg-[var(--hero-surface)] text-[var(--hero-muted)] hover:text-[var(--hero-ink)] hover:bg-[var(--hero-ink)]/[0.04] transition"
              >
                {copiedId === `prompt-${idx}` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedId === `prompt-${idx}` ? "已复制" : "复制"}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 已连接客户端设备管理 */}
      {isMember && (
        <div className="rounded-[18px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-medium text-[var(--hero-ink)] flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[var(--hero-ink)]" />
                <span>已授权连接的 IDE 客户端设备</span>
              </h3>
              <p className="text-xs text-[var(--hero-muted)] mt-0.5">
                管理已通过浏览器 OAuth 授权的 IDE 实例。更换设备或泄露时可随时吊销。
              </p>
            </div>
            <button
              type="button"
              onClick={loadKeys}
              disabled={loadingKeys}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--hero-muted)] hover:text-[var(--hero-ink)] transition"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loadingKeys && "animate-spin")} />
              <span>刷新列表</span>
            </button>
          </div>

          {loadingKeys ? (
            <div className="py-8 flex justify-center text-xs text-[var(--hero-muted)]">
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--hero-ink)] mr-2" />
              <span>正在拉取已授权设备…</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="py-8 text-center rounded-[12px] bg-[var(--hero-bg)] border border-[var(--hero-border)] text-xs text-[var(--hero-muted)]">
              <Laptop className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <span>暂无已连接的设备。启动 Cursor 或 Claude Desktop 自动完成授权后即在此显示。</span>
            </div>
          ) : (
            <div className="divide-y divide-[var(--hero-border)] border border-[var(--hero-border)] rounded-[12px] overflow-hidden bg-[var(--hero-bg)]">
              {keys.map((k) => (
                <div key={k.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--hero-ink)] truncate">{k.keyName}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {k.keyPrefix}...
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--hero-muted)] mt-0.5">
                      授权时间: {k.createTime} {k.lastUsedTime ? `· 最近使用: ${k.lastUsedTime}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeKey(k.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded-[6px] border border-rose-500/20 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>吊销凭证</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
