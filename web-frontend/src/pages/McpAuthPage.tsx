import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { Navbar } from "@/components/home/Navbar";
import { getPersistedLoginUser } from "@/lib/auth";
import {
  checkMcpAuthStatus,
  authorizeMcp,
  type McpAuthCheckVO,
} from "@/lib/mcp";

export function McpAuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const port = searchParams.get("port");
  const clientName = searchParams.get("client") || searchParams.get("clientName") || "Cursor / Claude Desktop";
  const state = searchParams.get("state") || "";
  const callbackUrl = searchParams.get("callback");

  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<McpAuthCheckVO | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [authorizing, setAuthorizing] = useState(false);
  const [authorizedToken, setAuthorizedToken] = useState<string | null>(null);
  const [callbackSent, setCallbackSent] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. 初始化检查登录与会员状态
  useEffect(() => {
    async function loadStatus() {
      const localUser = getPersistedLoginUser();
      if (!localUser) {
        setLoading(false);
        return;
      }
      try {
        const res = await checkMcpAuthStatus();
        setAuthStatus(res);
      } catch (err: any) {
        setErrorMsg(err?.message || "获取授权信息失败，请刷新重试");
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  // 2. 点击【确认授权】
  const handleAuthorize = async () => {
    if (!authStatus?.isEligibleMember) return;
    setAuthorizing(true);
    setErrorMsg(null);

    try {
      const res = await authorizeMcp({ clientName, state });
      const token = res.token;
      setAuthorizedToken(token);

      // 回调本地客户端
      const targetCallback = callbackUrl || (port ? `http://127.0.0.1:${port}/callback` : null);
      if (targetCallback) {
        try {
          const cbUrl = new URL(targetCallback);
          cbUrl.searchParams.set("token", token);
          if (state) cbUrl.searchParams.set("state", state);

          // 向本地 HTTP 服务打 GET 请求告知完成
          await fetch(cbUrl.toString(), { mode: "no-cors" });
          setCallbackSent(true);
        } catch (cbErr) {
          console.warn("回调本地服务失败，用户可手动复制凭证:", cbErr);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "授权失败，请稍后重试");
    } finally {
      setAuthorizing(false);
    }
  };

  const copyToken = () => {
    if (!authorizedToken) return;
    navigator.clipboard.writeText(authorizedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoLogin = () => {
    const currentUrl = window.location.pathname + window.location.search;
    navigate(`/auth/login?redirectTo=${encodeURIComponent(currentUrl)}`);
  };

  const localUser = getPersistedLoginUser();

  return (
    <div className="min-h-screen bg-[var(--hero-surface)] text-[var(--hero-text)] flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-lg bg-[var(--hero-card-bg,#121316)] border border-[var(--hero-border,#26282d)] rounded-2xl shadow-2xl p-6 sm:p-8 transition-all">
          {/* Header 徽标与标题 */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-4 shadow-inner">
              <Sparkles className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              OwnAI MCP 智能助手授权
            </h1>
            <p className="text-sm text-[var(--hero-muted,#8a8f98)] mt-1">
              连接本地 AI 工具（{clientName}），实时调用您的云端设计资产
            </p>
          </div>

          {/* Loading 状态 */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-sm text-[var(--hero-muted,#8a8f98)]">
              <LoaderCircle className="w-6 h-6 animate-spin text-amber-500" />
              <span>正在检查会员与账号信息…</span>
            </div>
          ) : errorMsg && !authStatus ? (
            /* 接口异常状态 */
            <div className="text-center py-6 space-y-6">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-left flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-rose-300">获取授权信息失败</p>
                  <p className="text-[var(--hero-muted,#8a8f98)] text-xs mt-1">
                    {errorMsg}
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-white transition"
              >
                刷新重试
              </button>
            </div>
          ) : !localUser ? (
            /* 未登录状态 */
            <div className="text-center py-6 space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-3">
                <UserIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-300">需要登录 OwnAI 账号</p>
                  <p className="text-[var(--hero-muted,#8a8f98)] text-xs mt-1">
                    请先登录已开通会员的账号，登录后将自动返回本页面完成一键授权。
                  </p>
                </div>
              </div>
              <button
                onClick={handleGoLogin}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-90 active:scale-[0.99] transition shadow-lg shadow-amber-500/20"
              >
                立即登录账号
              </button>
            </div>
          ) : authorizedToken ? (
            /* 授权成功状态 */
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-medium text-emerald-400">授权成功！</h3>
                <p className="text-xs text-[var(--hero-muted,#8a8f98)] mt-1.5">
                  {callbackSent || port
                    ? `凭证已自动注入到 ${clientName}，您可以返回 AI 客户端直接使用。`
                    : `您已成功生成 MCP 访问凭证，可在支持的 AI 客户端中使用。`}
                </p>
              </div>

              {/* 兜底手动复制框 */}
              <div className="p-3.5 rounded-xl bg-[var(--hero-surface,#18191c)] border border-[var(--hero-border,#26282d)] text-left">
                <div className="flex items-center justify-between text-xs text-[var(--hero-muted,#8a8f98)] mb-2">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> 访问凭证 Token (备用)
                  </span>
                  <button
                    onClick={copyToken}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
                <div className="font-mono text-xs text-[var(--hero-text)] break-all bg-black/30 p-2.5 rounded-lg select-all">
                  {authorizedToken}
                </div>
              </div>

              <div className="text-xs text-[var(--hero-muted,#8a8f98)] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>与您的付费会员状态绑定 · 可随时在个人中心吊销</span>
              </div>
            </div>
          ) : !authStatus?.isEligibleMember ? (
            /* 已登录，但不是有效付费会员 */
            <div className="py-4 space-y-6">
              {/* 用户信息卡 */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--hero-surface,#18191c)] border border-[var(--hero-border,#26282d)]">
                {authStatus?.userAvatar ? (
                  <img
                    src={authStatus.userAvatar}
                    alt={authStatus.userName || ""}
                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm">
                    {authStatus?.userName?.[0] || "U"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {authStatus?.userName || authStatus?.userAccount}
                  </div>
                  <div className="text-xs text-rose-400 flex items-center gap-1 mt-0.5">
                    <XCircle className="w-3.5 h-3.5" /> 普通用户（未开通付费会员）
                  </div>
                </div>
              </div>

              {/* 会员专属特权说明 */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>MCP 设计助手为付费会员专属特权</span>
                </div>
                <ul className="text-xs text-[var(--hero-muted,#8a8f98)] space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span><strong>实时调用切片与组件：</strong>在 Cursor / Claude 中一键拉取您在工作台解构收藏的代码块与图标。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span><strong>全库 Prompt 规范检索：</strong>辅助大模型精准生成符合企业级设计系统的前端界面。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span><strong>月度、年度、永久会员均可无限次连接调用。</strong></span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate("/pricing")}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-90 active:scale-[0.99] transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                <span>开通会员即可使用 MCP 助手</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* 已登录且是有效会员：正常授权确认界面 */
            <div className="py-2 space-y-6">
              {/* 用户信息卡 */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[var(--hero-surface,#18191c)] border border-[var(--hero-border,#26282d)]">
                {authStatus.userAvatar ? (
                  <img
                    src={authStatus.userAvatar}
                    alt={authStatus.userName || ""}
                    className="w-11 h-11 rounded-full object-cover border border-amber-500/30"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-semibold">
                    {authStatus.userName?.[0] || "U"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {authStatus.userName || authStatus.userAccount}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Crown className="w-3 h-3" />
                      {authStatus.isLifetime
                        ? "永久尊享会员"
                        : authStatus.remainingDays != null
                        ? `会员 · 剩余 ${authStatus.remainingDays} 天`
                        : "付费会员"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--hero-muted,#8a8f98)] mt-0.5">
                    已验证付费权益 · 享有全功能 MCP 数据桥接授权
                  </p>
                </div>
              </div>

              {/* 权限清单 */}
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-[var(--hero-muted,#8a8f98)] uppercase tracking-wider">
                  授权申请访问以下权限：
                </p>
                <div className="space-y-2 text-xs text-[var(--hero-text)]">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--hero-surface,#18191c)] border border-[var(--hero-border,#26282d)]/50">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>检索您的解构资产：</strong>包含已收藏的组件切片代码、设计规范提示词、SVG 矢量图标与多媒体。</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--hero-surface,#18191c)] border border-[var(--hero-border,#26282d)]/50">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>检索平台作品与 Prompt 库：</strong>获取公开设计灵感与系统预设规范，辅助大模型编写界面。</span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  disabled={authorizing}
                  onClick={handleAuthorize}
                  className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {authorizing ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      <span>正在授权…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>确认授权给 {clientName}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
