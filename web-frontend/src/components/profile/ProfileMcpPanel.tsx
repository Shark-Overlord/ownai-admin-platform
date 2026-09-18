import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Code2,
  Copy,
  Crown,
  ExternalLink,
  KeyRound,
  Laptop,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { listMyMcpKeys, revokeMcpKey, type McpKeyVO } from "@/lib/mcp";
import type { UserProfileDetail } from "@/lib/types";

interface ProfileMcpPanelProps {
  profile: UserProfileDetail | null;
}

export function ProfileMcpPanel({ profile }: ProfileMcpPanelProps) {
  const navigate = useNavigate();
  const [activeClientTab, setActiveClientTab] = useState<"cursor" | "claude" | "windsurf">("cursor");
  const [keys, setKeys] = useState<McpKeyVO[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const isMember = profile?.memberLevel?.toLowerCase() === "member";
  const isLifetime = profile?.memberPlanType?.toLowerCase() === "lifetime" || !profile?.memberExpireTime;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const loadKeys = async () => {
    if (!isMember) return;
    setLoadingKeys(true);
    try {
      const data = await listMyMcpKeys();
      setKeys(data);
    } catch (e) {
      console.warn("加载 MCP Keys 失败:", e);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [isMember]);

  const handleRevokeKey = async (id: number) => {
    if (!confirm("确定要吊销该客户端的 MCP 访问凭证吗？吊销后该客户端将无法继续访问。")) return;
    try {
      await revokeMcpKey(id);
      await loadKeys();
    } catch (e: any) {
      alert(e?.message || "吊销失败");
    }
  };

  const bridgeCommand = `node E:/JAVA_project/springboot-init-master/mcp-bridge/bin/index.js`;
  const claudeConfigJson = JSON.stringify(
    {
      mcpServers: {
        "ownai-design": {
          command: "node",
          args: ["E:/JAVA_project/springboot-init-master/mcp-bridge/bin/index.js"],
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* 头部状态与权益卡片 */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--hero-border,#282a30)] bg-gradient-to-br from-amber-500/10 via-[var(--hero-card-bg,#121316)] to-orange-500/5 p-6 sm:p-7 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Model Context Protocol (MCP) 深度桥接</span>
              </span>
              {isMember ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  <span>{isLifetime ? "永久特权已生效" : "会员特权已生效"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400">
                  <ShieldAlert className="h-3 w-3" />
                  <span>未开通付费会员</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--hero-ink)]">
              让 Cursor / Claude 直接成为你的私有设计与切片助手
            </h2>
            <p className="text-xs sm:text-sm text-[var(--hero-muted,#8a8f98)] max-w-2xl leading-relaxed">
              无需在网页与本地编辑器之间反复复制。通过标准 MCP 协议，让 IDE 直接检索您的云端收藏切片、设计规范与动效参数。
            </p>
          </div>

          {!isMember && (
            <button
              onClick={() => navigate("/pricing")}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-black shadow-lg shadow-amber-500/20 hover:opacity-90 active:scale-[0.98] transition"
            >
              <Crown className="h-4 w-4" />
              <span>开通会员解锁 MCP</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 快速配置教程（3 种客户端切换） */}
      <div className="rounded-2xl border border-[var(--hero-border,#282a30)] bg-[var(--hero-card-bg,#121316)] p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--hero-border,#282a30)] pb-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--hero-ink)] flex items-center gap-2">
              <Terminal className="h-4 w-4 text-amber-400" />
              <span>快速配置指南（3 步完成接入）</span>
            </h3>
            <p className="text-xs text-[var(--hero-muted,#8a8f98)] mt-0.5">
              选择你正在使用的 AI 编程客户端，复制一行配置即可开始
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-black/30 p-1 border border-[var(--hero-border,#282a30)] text-xs font-medium">
            <button
              onClick={() => setActiveClientTab("cursor")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeClientTab === "cursor" ? "bg-amber-500 text-black shadow font-semibold" : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]"
              }`}
            >
              Cursor
            </button>
            <button
              onClick={() => setActiveClientTab("claude")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeClientTab === "claude" ? "bg-amber-500 text-black shadow font-semibold" : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]"
              }`}
            >
              Claude Desktop
            </button>
            <button
              onClick={() => setActiveClientTab("windsurf")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeClientTab === "windsurf" ? "bg-amber-500 text-black shadow font-semibold" : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]"
              }`}
            >
              Windsurf
            </button>
          </div>
        </div>

        {/* Tab 1: Cursor */}
        {activeClientTab === "cursor" && (
          <div className="space-y-4 text-xs sm:text-sm text-[var(--hero-text)]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-amber-400">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[11px]">1</span>
                <span>在 Cursor 中打开 MCP 设置面板</span>
              </div>
              <p className="text-xs text-[var(--hero-muted,#8a8f98)] pl-7">
                快捷键 <kbd className="px-1.5 py-0.5 bg-black/40 rounded border border-white/10 font-mono text-[11px]">Ctrl + ,</kbd> 打开 Settings $\to$ 点击左侧 <strong>Features</strong> $\to$ 选择 <strong>MCP</strong> $\to$ 点击 <strong>+ Add New MCP Server</strong>。
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-amber-400">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[11px]">2</span>
                <span>填写以下参数</span>
              </div>
              <div className="pl-7 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] items-center gap-1 sm:gap-2 text-xs">
                  <span className="text-[var(--hero-muted,#8a8f98)]">Name:</span>
                  <code className="font-mono bg-black/40 px-2 py-1 rounded border border-white/10 text-amber-300 w-fit">ownai-design</code>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] items-center gap-1 sm:gap-2 text-xs">
                  <span className="text-[var(--hero-muted,#8a8f98)]">Type:</span>
                  <code className="font-mono bg-black/40 px-2 py-1 rounded border border-white/10 text-amber-300 w-fit">command</code>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] items-center gap-1 sm:gap-2 text-xs">
                  <span className="text-[var(--hero-muted,#8a8f98)]">Command:</span>
                  <div className="flex items-center gap-2 max-w-full">
                    <code className="font-mono bg-black/40 px-2.5 py-1.5 rounded border border-white/10 text-amber-300 text-[11px] truncate flex-1 select-all">
                      {bridgeCommand}
                    </code>
                    <button
                      onClick={() => copyToClipboard(bridgeCommand, "cursor-cmd")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition text-xs font-medium shrink-0"
                    >
                      {copiedIndex === "cursor-cmd" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedIndex === "cursor-cmd" ? "已复制" : "复制"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-amber-400">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[11px]">3</span>
                <span>保存并一键授权</span>
              </div>
              <p className="text-xs text-[var(--hero-muted,#8a8f98)] pl-7">
                点击保存后，Cursor 会自动调起默认浏览器打开授权页，点击<strong>【确认授权】</strong>，随后返回 Cursor，看到绿灯亮起即代表 5 大设计工具加载完成！
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Claude Desktop */}
        {activeClientTab === "claude" && (
          <div className="space-y-4 text-xs sm:text-sm text-[var(--hero-text)]">
            <p className="text-xs text-[var(--hero-muted,#8a8f98)]">
              打开 Claude Desktop 配置文件（Windows: <code className="font-mono bg-black/30 px-1 py-0.5 rounded">%APPDATA%\Claude\claude_desktop_config.json</code>），在 <code className="font-mono">mcpServers</code> 下粘贴：
            </p>
            <div className="relative">
              <pre className="font-mono text-xs bg-black/50 p-3.5 rounded-xl border border-white/10 text-emerald-300 overflow-x-auto select-all">
                {claudeConfigJson}
              </pre>
              <button
                onClick={() => copyToClipboard(claudeConfigJson, "claude-json")}
                className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition text-xs font-medium"
              >
                {copiedIndex === "claude-json" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedIndex === "claude-json" ? "已复制" : "复制 JSON"}</span>
              </button>
            </div>
            <p className="text-xs text-[var(--hero-muted,#8a8f98)]">
              保存后重启 Claude Desktop，会自动唤起浏览器完成一次性授权。
            </p>
          </div>
        )}

        {/* Tab 3: Windsurf */}
        {activeClientTab === "windsurf" && (
          <div className="space-y-4 text-xs sm:text-sm text-[var(--hero-text)]">
            <p className="text-xs text-[var(--hero-muted,#8a8f98)]">
              Windsurf 原生支持 MCP 配置。打开 Settings $\to$ MCP Servers $\to$ 配置如下：
            </p>
            <div className="relative">
              <pre className="font-mono text-xs bg-black/50 p-3.5 rounded-xl border border-white/10 text-amber-300 overflow-x-auto select-all">
                {claudeConfigJson}
              </pre>
              <button
                onClick={() => copyToClipboard(claudeConfigJson, "windsurf-json")}
                className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition text-xs font-medium"
              >
                {copiedIndex === "windsurf-json" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedIndex === "windsurf-json" ? "已复制" : "复制配置"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 常用指令模板示例 */}
      <div className="rounded-2xl border border-[var(--hero-border,#282a30)] bg-[var(--hero-card-bg,#121316)] p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-[var(--hero-ink)] flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>在 AI 对话中尝试以下指令</span>
          </h3>
          <p className="text-xs text-[var(--hero-muted,#8a8f98)] mt-0.5">
            直接复制丢给 Cursor Composer 或 Claude，AI 会自动调用 OwnAI 平台资产
          </p>
        </div>

        <div className="grid gap-2.5">
          {[
            {
              title: "查找切片组件与动效",
              prompt: "帮我找一个移动端 iOS 风格的聊天气泡切片组件，带有弹簧微动效，直接给我 TSX 代码",
            },
            {
              title: "获取设计规范与系统色盘",
              prompt: "我想仿照 Claude 的设计风格做一个电商落地页，给我它的设计系统规范、色盘与字体层级",
            },
            {
              title: "提取开箱即用动效参数",
              prompt: "给我一个灵动岛弹性展开的 Framer Motion 动效配置与 Tailwind 交互类名",
            },
            {
              title: "检索已解构的完整案例",
              prompt: "检索 OwnAI 平台上已解构的移动端高质感社交类作品案例，提供切片概览",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--hero-surface,#18191c)] border border-[var(--hero-border,#282a30)] hover:border-amber-500/30 transition group"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-medium text-amber-400/90 block">{item.title}</span>
                <p className="text-xs text-[var(--hero-ink)] truncate font-mono mt-0.5">
                  "{item.prompt}"
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(item.prompt, `prompt-${idx}`)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--hero-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition border border-transparent hover:border-amber-500/30"
              >
                {copiedIndex === `prompt-${idx}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedIndex === `prompt-${idx}` ? "已复制" : "复制"}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 已授权客户端 Key 管理 */}
      {isMember && (
        <div className="rounded-2xl border border-[var(--hero-border,#282a30)] bg-[var(--hero-card-bg,#121316)] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[var(--hero-ink)] flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>已连接的客户端设备</span>
              </h3>
              <p className="text-xs text-[var(--hero-muted,#8a8f98)] mt-0.5">
                管理您已授权的 IDE 实例。如更换设备或怀疑泄露，可随时在此吊销。
              </p>
            </div>
            <button
              onClick={loadKeys}
              disabled={loadingKeys}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--hero-muted)] hover:text-amber-400 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingKeys ? "animate-spin" : ""}`} />
              <span>刷新列表</span>
            </button>
          </div>

          {loadingKeys ? (
            <div className="py-8 flex justify-center text-xs text-[var(--hero-muted)]">
              <LoaderCircle className="h-4 w-4 animate-spin text-amber-500 mr-2" />
              <span>正在获取已授权设备…</span>
            </div>
          ) : keys.length === 0 ? (
            <div className="py-8 text-center rounded-xl bg-black/20 border border-white/5 text-xs text-[var(--hero-muted)]">
              <Laptop className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <span>暂无已连接的客户端设备。启动 Cursor 或 Claude Desktop 即可自动生成并连接。</span>
            </div>
          ) : (
            <div className="divide-y divide-[var(--hero-border,#282a30)] border border-[var(--hero-border,#282a30)] rounded-xl overflow-hidden">
              {keys.map((k) => (
                <div key={k.id} className="p-3.5 flex items-center justify-between gap-3 bg-[var(--hero-surface,#18191c)]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--hero-ink)] truncate">{k.keyName}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        {k.keyPrefix}...
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--hero-muted)] mt-0.5">
                      创建时间: {k.createTime} {k.lastUsedTime ? `· 最近活跃: ${k.lastUsedTime}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeKey(k.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded border border-rose-500/20 transition"
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
  );
}
