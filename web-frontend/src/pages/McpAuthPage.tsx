import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  KeyRound,
  Laptop,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Terminal,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { getPersistedLoginUser } from "@/lib/auth";
import {
  checkMcpAuthStatus,
  authorizeMcp,
  type McpAuthCheckVO,
} from "@/lib/mcp";
import { cn } from "@/lib/utils";

// 对应 IDE 官方高保真 SVG 图标
function ClientIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const lower = name.toLowerCase();

  if (lower.includes("cursor")) {
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

  if (lower.includes("claude")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#d97757" aria-hidden="true">
        <path d="m4.715 15.956 4.717-2.648.079-.23-.079-.128h-.23l-.79-.048-2.696-.073-2.337-.097-2.265-.122-.57-.121-.535-.705.055-.352.48-.322.686.061 1.517.104 2.277.157 1.652.098 2.446.255h.389l.055-.158-.134-.098-.103-.097-2.356-1.596-2.55-1.688-1.335-.972-.723-.492-.364-.46-.158-1.009.656-.722.88.06.225.061.892.686 1.906 1.476 2.49 1.833.364.304.146-.104.018-.072-.164-.274-1.354-2.446-1.445-2.49-.643-1.032-.17-.619a3 3 0 0 1-.104-.728L6.287.133 6.7 0l.996.134.419.364.619 1.415L9.736 4.14l1.554 3.03.455.898.243.832.091.255h.158V9.01l.127-1.706.237-2.095.231-2.695.079-.76.376-.91.747-.492.583.28.48.685-.067.444-.285 1.851-.56 2.903-.363 1.942h.212l.243-.243.984-1.305 1.65-2.064.73-.82.85-.904.546-.431h1.032l.759 1.129-.34 1.166-1.062 1.347-.88 1.142-1.264 1.7-.789 1.36.073.11.188-.02 2.854-.606 1.542-.28 1.84-.315.831.388.091.395-.328.807-1.967.486-2.307.461-3.436.814-.043.03.049.061 1.548.146.662.036h1.62l3.018.225.79.522.473.638-.079.485-1.214.62-1.64-.389-3.824-.91-1.312-.329h-.182v.11l1.093 1.068 2.004 1.81 2.507 2.33.127.578-.321.455-.34-.049-2.204-1.657-.85-.747-1.925-1.62h-.127v.17l.443.649 2.344 3.521.12 1.08-.17.353-.606.212-.668-.12-1.372-1.925-1.415-2.168-1.141-1.943-.14.08-.674 7.254-.316.37-.728.28-.607-.461-.322-.747.322-1.476.388-1.924.316-1.53.285-1.9.17-.632-.012-.042-.14.018-1.432 1.967-2.18 2.945-1.724 1.845-.413.164-.716-.37.066-.662.401-.589L8.17 17.57l1.44-1.882.928-1.086-.006-.158h-.055L4.138 18.56l-1.13.146-.485-.456.06-.746.231-.243 1.907-1.312z" />
      </svg>
    );
  }

  if (lower.includes("codex")) {
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

  if (lower.includes("antigravity")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.751 22.607c1.34 1.005 3.35.335 1.508-1.508C17.73 15.74 18.904 1 12.037 1S6.342 15.74.815 21.1c-2.01 2.009.167 2.511 1.507 1.506 5.192-3.517 4.857-9.714 9.715-9.714s4.522 6.197 9.714 9.715Z" />
      </svg>
    );
  }

  return <Terminal className={className} />;
}

// 容错用户头像组件（避免破图）
function UserAvatarDisplay({
  src,
  name,
}: {
  src?: string | null;
  name?: string | null;
}) {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={name || "用户头像"}
        onError={() => setHasError(true)}
        className="h-9 w-9 rounded-full object-cover border border-white/20 bg-white/5"
      />
    );
  }

  // 默认使用官方 OwnAI Logo 图标，不使用手写字母占位
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/15 bg-white/[0.05] p-1.5 shadow-inner shrink-0">
      <img
        src="/images/ownai-logo.webp"
        alt="OwnAI"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

export function McpAuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const port = searchParams.get("port");
  const rawClient = searchParams.get("client") || searchParams.get("clientName") || "";
  const clientName = rawClient ? rawClient.trim() : "Cursor / Claude Desktop";
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
        setErrorMsg(err?.message || "获取授权状态异常，请刷新重试");
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
    <AuthShell
      switchLabel="管理已连接设备"
      switchCta="个人中心"
      switchTo="/profile"
    >
      <div className="w-full">
        {/* 顶部双端微联动视觉连接器 (Connecting Visual) */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {/* 左端：客户端芯片 */}
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/12 bg-white/[0.05] text-white shadow-inner">
            <ClientIcon name={clientName} className="h-5 w-5" />
          </div>

          {/* 中间：发光数据连接线 */}
          <div className="flex items-center gap-1 px-1 text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-white/30 animate-pulse" />
            <span className="h-[1px] w-6 bg-gradient-to-r from-white/20 via-white/40 to-white/20" />
            <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
          </div>

          {/* 右端：OwnAI Logo 芯片 */}
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/12 bg-white/[0.05] p-2 shadow-inner">
            <img
              src="/images/ownai-logo.webp"
              alt="OwnAI"
              className="h-full w-full object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* 标题与描述 */}
        <div className="text-center mb-6">
          <p className="text-[12px] font-medium tracking-wider text-zinc-400 uppercase">
            Model Context Protocol
          </p>
          <h1 className="mt-1 text-[22px] sm:text-[24px] font-bold tracking-tight text-white">
            授权接入 OwnAI MCP 服务
          </h1>
          <p className="mt-1 text-[13px] text-zinc-400 leading-normal">
            连接本地 Agent，实时调用 600+ 顶尖设计切片与 Prompt 规范
          </p>
        </div>

        {/* 状态 1: 加载中 */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-[13px] text-zinc-400">
            <LoaderCircle className="w-5 h-5 animate-spin text-white" />
            <span>正在校验账号与会员资格…</span>
          </div>
        ) : errorMsg && !authStatus ? (
          /* 状态 2: 接口严重异常 */
          <div className="space-y-4">
            <div className="p-3.5 rounded-[10px] bg-rose-500/10 border border-rose-500/20 text-left flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-[13px]">
                <p className="font-medium text-rose-300">获取授权信息失败</p>
                <p className="text-zinc-400 text-[12px] mt-0.5">{errorMsg}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 w-full rounded-[10px] border border-white/12 bg-white/[0.04] text-[13px] font-medium text-white transition-colors hover:border-white/30 hover:bg-white/[0.08]"
            >
              刷新重试
            </button>
          </div>
        ) : !localUser ? (
          /* 状态 3: 未登录状态 */
          <div className="space-y-4">
            <div className="p-4 rounded-[12px] border border-white/10 bg-white/[0.03] space-y-2 text-left">
              <div className="flex items-center gap-2 text-amber-400 text-[13px] font-medium">
                <UserIcon className="w-4 h-4" />
                <span>需要登录 OwnAI 账号</span>
              </div>
              <p className="text-[12px] text-zinc-400 leading-relaxed">
                请先登录已开通会员的 OwnAI 账号，登录完成后将自动返回当前页面完成一键授权。
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoLogin}
              className="h-11 w-full rounded-[10px] bg-white text-black text-[14px] font-semibold tracking-tight transition-all hover:opacity-90 active:scale-[0.99] shadow-md"
            >
              立即登录账号
            </button>
          </div>
        ) : authorizedToken ? (
          /* 状态 4: 授权成功 */
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-inner">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-[16px] font-semibold text-emerald-400">授权连接成功！</h2>
              <p className="mt-1 text-[12px] text-zinc-400 leading-relaxed">
                {callbackSent || port
                  ? `访问凭证已自动同步至 ${clientName}，您可以直接返回客户端开始调用。`
                  : `已生成专属 MCP 凭证，可在支持的 AI 客户端中长期调用。`}
              </p>
            </div>

            {/* 兜底凭证复制框 */}
            <div className="rounded-[10px] border border-white/10 bg-black/40 p-3 text-left space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-zinc-400" />
                  <span>访问凭证 Token (备用)</span>
                </span>
                <button
                  type="button"
                  onClick={copyToken}
                  className="flex items-center gap-1 text-white hover:text-zinc-300 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "已复制" : "复制"}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-zinc-300 break-all bg-white/[0.04] p-2 rounded-[6px] border border-white/5 select-all">
                {authorizedToken}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>与当前付费会员绑定 · 可在个人中心随时吊销</span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="h-10 w-full rounded-[8px] border border-white/12 bg-white/[0.04] text-[12px] font-medium text-zinc-300 hover:border-white/30 hover:text-white transition-colors"
              >
                查看已连接设备
              </button>
            </div>
          </div>
        ) : !authStatus?.isEligibleMember ? (
          /* 状态 5: 已登录，但不是有效付费会员 */
          <div className="space-y-4">
            {/* 用户身份简报 */}
            <div className="flex items-center gap-3 p-3 rounded-[10px] border border-white/10 bg-white/[0.03]">
              <UserAvatarDisplay
                src={authStatus?.userAvatar}
                name={authStatus?.userName || authStatus?.userAccount}
              />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-medium text-white truncate">
                  {authStatus?.userName || authStatus?.userAccount}
                </div>
                <div className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                  <XCircle className="w-3 h-3" />
                  <span>普通用户（未开通付费会员）</span>
                </div>
              </div>
            </div>

            {/* 会员专属特权说明 */}
            <div className="p-3.5 rounded-[12px] border border-white/10 bg-white/[0.02] space-y-2.5 text-left">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-300">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>MCP 设计助手专属特权</span>
              </div>
              <ul className="text-[11px] text-zinc-400 space-y-1.5 pl-1 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-zinc-600 mt-0.5">•</span>
                  <span><strong>组件代码直出：</strong>在 Cursor / Claude 中直接生成解构切片 TSX/JSX 与交互微动效。</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-zinc-600 mt-0.5">•</span>
                  <span><strong>私有收藏同步：</strong>随时检索您在工作台解构收藏的灵感资产。</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-zinc-600 mt-0.5">•</span>
                  <span>月度、年度与永久会员享有无限制连接调用权。</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="h-11 w-full rounded-[10px] bg-white text-black text-[14px] font-semibold tracking-tight transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-md"
            >
              <Crown className="w-4 h-4 text-amber-600" />
              <span>开通会员立即连接</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
            </button>
          </div>
        ) : (
          /* 状态 6: 正常授权确认 (已登录且为会员) */
          <div className="space-y-4">
            {/* 用户账号与会员状态卡片 */}
            <div className="flex items-center gap-3 p-3 rounded-[10px] border border-white/10 bg-white/[0.03]">
              <UserAvatarDisplay
                src={authStatus.userAvatar}
                name={authStatus.userName || authStatus.userAccount}
              />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-white truncate">
                    {authStatus.userName || authStatus.userAccount}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white">
                    <Crown className="w-2.5 h-2.5 text-white/90" />
                    {authStatus.isLifetime
                      ? "永久尊享会员"
                      : authStatus.remainingDays != null
                      ? `会员 · 剩余 ${authStatus.remainingDays} 天`
                      : "付费会员"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  已验证有效权益 · 享有全功能 MCP 数据桥接授权
                </p>
              </div>
            </div>

            {/* 权限清单 */}
            <div className="space-y-2 text-left">
              <p className="text-[11px] font-medium text-zinc-400 tracking-wide uppercase">
                授权申请访问以下权限：
              </p>
              <div className="space-y-1.5 text-[12px] text-zinc-300">
                <div className="flex items-start gap-2 p-2.5 rounded-[8px] border border-white/5 bg-white/[0.02]">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>检索解构组件资产：</strong>包含组件切片源码、设计系统规范与微动效参数。</span>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-[8px] border border-white/5 bg-white/[0.02]">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>全库 Prompt 规范检索：</strong>获取企业级页面构建标准，辅助大模型准确出码。</span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <p className="rounded-[10px] border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300 text-left">
                {errorMsg}
              </p>
            )}

            {/* 操作授权按钮 */}
            <div className="pt-2">
              <button
                type="button"
                disabled={authorizing}
                onClick={handleAuthorize}
                className="h-11 w-full rounded-[10px] bg-white text-black text-[14px] font-semibold tracking-tight transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                {authorizing ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin text-black" />
                    <span>正在授权连接…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-black" />
                    <span>确认授权并连接</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
