import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Crown,
  ExternalLink,
  KeyRound,
  Laptop,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Terminal,
  Trash2,
  Wand2,
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
        fill="url(#dc-codex-mcp-stepper)"
      />
      <defs>
        <linearGradient id="dc-codex-mcp-stepper" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse">
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
  // 安装配置模式：ai（AI 智能配置，发给自己的 AI） | manual（手动配置）
  const [configMode, setConfigMode] = useState<"ai" | "manual">("ai");
  const [manualClient, setManualClient] = useState<"cursor" | "claude" | "codex" | "antigravity">("cursor");
  const [keys, setKeys] = useState<McpKeyVO[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDevices, setShowDevices] = useState(false);

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
    if (!confirm("确定要吊销该客户端设备的 MCP 凭证吗？吊销后该设备将无法继续访问。")) return;
    try {
      await revokeMcpKey(id);
      await loadKeys();
    } catch (e: any) {
      alert(e?.message || "吊销失败");
    }
  };

  // AI 配置专用提示词（复制直接发给自己的 AI）
  const aiConfigPrompt = `请帮我配置 OwnAI 的 MCP Server (Model Context Protocol)。

1. 如果是 Cursor：
   请在全局或工作区 MCP 配置文件（如 ~/.cursor/mcp.json 或 Settings -> MCP）中添加：
   {
     "mcpServers": {
       "ownai-design": {
         "command": "npx",
         "args": ["-y", "@ownai/mcp-bridge"]
       }
     }
   }

2. 如果是 Claude Desktop：
   请在配置文件（Windows: %APPDATA%\\Claude\\claude_desktop_config.json / macOS: ~/Library/Application Support/Claude/claude_desktop_config.json）中的 mcpServers 下添加上述同名 ownai-design 配置。

3. 如果是其他客户端（如 Codex / Antigravity / Windsurf）：
   同样添加 command 为 "npx"，args 为 ["-y", "@ownai/mcp-bridge"] 的 stdio 服务。

配置完成后，初次启动或调用时会自动在默认浏览器打开授权确认页，点击允许即可在 IDE 中直接召回 600+ 顶尖设计切片。`;

  // 手动配置 JSON 片段
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

  // 测试用例列表：仅展示标题 + 复制按钮
  const TEST_CASES = [
    {
      id: "case-promo",
      title: "电商促销弹窗切片",
      prompt: "帮我找一个极简深色风格的电商促销弹窗，需要弹簧阻尼动效与关闭倒计时，直接输出 TSX 切片。",
    },
    {
      id: "case-pricing",
      title: "企业级 SaaS 定价卡片",
      prompt: "找一个企业级 SaaS 的深色定价表切片，包含月年切换与推荐套餐高亮交互。",
    },
    {
      id: "case-tabbar",
      title: "移动端触觉弹性 TabBar",
      prompt: "找一套移动端 App 底部沉浸式 TabBar 切片，包含触觉弹性微动效与状态栏。",
    },
    {
      id: "case-600",
      title: "检索 600+ 案例与完整源包",
      prompt: "检索 OwnAI 平台已解构的高质感移动端社交类作品案例，提供切片概览与完整工程 ZIP 直链。",
    },
  ];

  return (
    <div className="max-w-[860px] mx-auto space-y-6 text-[var(--hero-ink)]">
      {/* 顶部极简状态栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--hero-border)] bg-[var(--hero-bg)]">
            <Sparkles className="h-4 w-4 text-[var(--hero-ink)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-[var(--hero-ink)]">
                MCP 本地 IDE 助手
              </h2>
              {isMember ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{isLifetime ? "永久特权已生效" : "会员特权已生效"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--hero-border)] bg-[var(--hero-bg)] px-2 py-0.5 text-[10px] text-[var(--hero-muted)]">
                  未开通会员
                </span>
              )}
            </div>
            <p className="text-[12px] text-[var(--hero-muted)] mt-0.5">
              3 步完成配置，在 Cursor / Claude 中自然语言直调 600+ 顶尖设计切片
            </p>
          </div>
        </div>

        {!isMember && (
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-[8px] bg-[var(--hero-ink)] px-3.5 py-1.5 text-xs font-medium text-[var(--hero-bg)] transition-opacity hover:opacity-88"
          >
            <Crown className="h-3.5 w-3.5" />
            <span>开通会员解锁</span>
          </button>
        )}
      </div>

      {/* 核心纵向步骤条 (从上到下的流程) */}
      <div className="relative rounded-[16px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 sm:p-7 space-y-8">
        {/* 连接步骤的垂直线条 */}
        <div className="absolute left-[33px] sm:left-[41px] top-10 bottom-12 w-[1px] bg-[var(--hero-border)]" />

        {/* 步骤 01：选择安装配置方式 */}
        <div className="relative flex items-start gap-4">
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--hero-border)] bg-[var(--hero-bg)] font-mono text-[11px] font-semibold text-[var(--hero-ink)] shadow-xs">
            01
          </div>

          <div className="flex-1 space-y-3 pt-0.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 className="text-[14px] font-medium text-[var(--hero-ink)]">
                选择安装配置方式
              </h3>

              {/* 两种方式分段控制器 */}
              <div className="inline-flex rounded-[8px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-0.5 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setConfigMode("ai")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-[6px] px-3 py-1 text-[11px] font-medium transition-colors",
                    configMode === "ai"
                      ? "bg-[var(--hero-surface)] text-[var(--hero-ink)] shadow-xs"
                      : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]"
                  )}
                >
                  <Wand2 className="h-3 w-3" />
                  <span>方式一：AI 自动配置（推荐）</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfigMode("manual")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-[6px] px-3 py-1 text-[11px] font-medium transition-colors",
                    configMode === "manual"
                      ? "bg-[var(--hero-surface)] text-[var(--hero-ink)] shadow-xs"
                      : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]"
                  )}
                >
                  <Terminal className="h-3 w-3" />
                  <span>方式二：手动配置</span>
                </button>
              </div>
            </div>

            {/* 方式一内容：AI 自动配置 */}
            {configMode === "ai" && (
              <div className="space-y-2.5 pt-1">
                <div className="rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--hero-muted)] flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-[var(--hero-ink)]" />
                      <span>复制此提示词，直接发送给你 IDE 里的 AI 对话框（如 Cursor Composer）：</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(aiConfigPrompt, "ai-prompt")}
                      className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--hero-ink)] px-2.5 py-1 text-[11px] font-medium text-[var(--hero-bg)] transition-opacity hover:opacity-90"
                    >
                      {copiedId === "ai-prompt" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>已复制指令</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>一键复制 AI 配置指令</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="rounded-[8px] border border-[var(--hero-border)] bg-[var(--hero-surface)]/60 p-2.5 font-mono text-[11px] text-[var(--hero-ink)]/80 max-h-[96px] overflow-y-auto leading-relaxed select-all">
                    {aiConfigPrompt}
                  </div>
                </div>
              </div>
            )}

            {/* 方式二内容：手动配置 */}
            {configMode === "manual" && (
              <div className="space-y-3 pt-1">
                <div className="rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--hero-muted)]">
                      命令行极速启动 / 测试：
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("npx -y @ownai/mcp-bridge", "cmd-only")}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--hero-border)] bg-[var(--hero-surface)] px-2.5 py-1 text-[11px] text-[var(--hero-ink)] hover:bg-[var(--hero-ink)]/[0.04]"
                    >
                      {copiedId === "cmd-only" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedId === "cmd-only" ? "已复制" : "复制命令"}</span>
                    </button>
                  </div>
                  <code className="block font-mono text-[12px] text-[var(--hero-ink)] bg-[var(--hero-surface)] p-2 rounded-[6px] border border-[var(--hero-border)] select-all">
                    npx -y @ownai/mcp-bridge
                  </code>

                  <div className="pt-1 border-t border-[var(--hero-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-[var(--hero-muted)]">客户端配置文件片段：</span>
                      <div className="flex items-center gap-1">
                        {(["cursor", "claude", "codex", "antigravity"] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setManualClient(c)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[10px] font-medium transition-colors",
                              manualClient === c
                                ? "bg-[var(--hero-ink)] text-[var(--hero-bg)]"
                                : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]"
                            )}
                          >
                            <ToolIcon
                              name={c === "cursor" ? "Cursor" : c === "claude" ? "Claude" : c === "codex" ? "Codex" : "Antigravity"}
                              className="h-2.5 w-2.5"
                            />
                            <span className="capitalize">{c}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {manualClient === "cursor" ? (
                      <div className="text-[11px] font-mono text-[var(--hero-muted)] bg-[var(--hero-surface)] p-2.5 rounded-[6px] border border-[var(--hero-border)] space-y-1">
                        <div>Name: <span className="text-[var(--hero-ink)]">ownai-design</span></div>
                        <div>Type: <span className="text-[var(--hero-ink)]">command</span></div>
                        <div>Command: <span className="text-[var(--hero-ink)]">npx -y @ownai/mcp-bridge</span></div>
                      </div>
                    ) : (
                      <div className="relative">
                        <pre className="font-mono text-[11px] text-[var(--hero-ink)] bg-[var(--hero-surface)] p-2.5 rounded-[6px] border border-[var(--hero-border)] overflow-x-auto select-all">
                          {standardConfigJson}
                        </pre>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(standardConfigJson, "manual-json")}
                          className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--hero-ink)] text-[var(--hero-bg)] text-[10px] font-medium"
                        >
                          {copiedId === "manual-json" ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                          <span>{copiedId === "manual-json" ? "已复制" : "复制 JSON"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 步骤 02：唤起浏览器授权 */}
        <div className="relative flex items-start gap-4">
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--hero-border)] bg-[var(--hero-bg)] font-mono text-[11px] font-semibold text-[var(--hero-ink)] shadow-xs">
            02
          </div>

          <div className="flex-1 space-y-1 pt-0.5">
            <h3 className="text-[14px] font-medium text-[var(--hero-ink)]">
              浏览器一键授权
            </h3>
            <p className="text-[12px] leading-relaxed text-[var(--hero-muted)]">
              首次启动或在 IDE 中触发设计调用时，终端会自动调起默认浏览器打开授权页。点击<strong>【确认授权】</strong>后返回 IDE，连接指示灯常亮即代表 5 大检索工具就绪。
            </p>
          </div>
        </div>

        {/* 步骤 03：安装后测试验证（仅展示标题 + 复制按钮） */}
        <div className="relative flex items-start gap-4">
          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--hero-border)] bg-[var(--hero-bg)] font-mono text-[11px] font-semibold text-[var(--hero-ink)] shadow-xs">
            03
          </div>

          <div className="flex-1 space-y-3 pt-0.5">
            <div>
              <h3 className="text-[14px] font-medium text-[var(--hero-ink)]">
                安装后测试用例
              </h3>
              <p className="text-[12px] text-[var(--hero-muted)]">
                在 Cursor Composer 或 Claude 对话框直接粘贴以下任意用例，验证资产召回：
              </p>
            </div>

            {/* 紧凑测试用例列表：仅标题 + 复制按钮 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TEST_CASES.map((tc) => (
                <div
                  key={tc.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-bg)] px-3.5 py-2.5 transition-colors hover:border-[var(--hero-ink)]/20"
                >
                  <span className="text-[13px] font-medium text-[var(--hero-ink)] truncate">
                    {tc.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tc.prompt, tc.id)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-[6px] border border-[var(--hero-border)] bg-[var(--hero-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--hero-muted)] transition-colors hover:bg-[var(--hero-ink)]/[0.04] hover:text-[var(--hero-ink)]"
                  >
                    {copiedId === tc.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>复制指令</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 已连接客户端设备（折叠式极简管理） */}
      {isMember && (
        <div className="rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4 sm:px-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDevices(!showDevices)}
              className="flex items-center gap-2 text-left"
            >
              <KeyRound className="h-4 w-4 text-[var(--hero-muted)]" />
              <span className="text-[13px] font-medium text-[var(--hero-ink)]">
                已授权的 IDE 客户端设备 ({keys.length})
              </span>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 text-[var(--hero-muted)] transition-transform duration-200",
                  showDevices && "rotate-90"
                )}
              />
            </button>

            <button
              type="button"
              onClick={loadKeys}
              disabled={loadingKeys}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--hero-muted)] hover:text-[var(--hero-ink)] transition"
            >
              <RefreshCw className={cn("h-3 w-3", loadingKeys && "animate-spin")} />
              <span>刷新</span>
            </button>
          </div>

          {showDevices && (
            <div className="mt-4 pt-3 border-t border-[var(--hero-border)] space-y-2">
              {loadingKeys ? (
                <div className="py-4 flex justify-center text-xs text-[var(--hero-muted)]">
                  <LoaderCircle className="h-4 w-4 animate-spin text-[var(--hero-ink)] mr-2" />
                  <span>正在拉取设备…</span>
                </div>
              ) : keys.length === 0 ? (
                <p className="text-xs text-[var(--hero-muted)] py-2 text-center">
                  暂无连接设备，首次在 IDE 使用时完成授权将自动显示。
                </p>
              ) : (
                <div className="divide-y divide-[var(--hero-border)] rounded-[8px] border border-[var(--hero-border)] bg-[var(--hero-bg)] overflow-hidden">
                  {keys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--hero-ink)]">{k.keyName}</span>
                          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            {k.keyPrefix}...
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--hero-muted)]">
                          授权于: {k.createTime}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevokeKey(k.id)}
                        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>吊销</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
