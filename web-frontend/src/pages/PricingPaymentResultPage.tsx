import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/home/Navbar";
import { getPersistedAuthToken, updatePersistedLoginUser } from "@/lib/auth-session";
import { getAlipayPaymentResultStatus, getMemberAlipayPaymentStatus } from "@/lib/member";
import { clearMemberReturnPath, getMemberReturnPath } from "@/lib/member-return";
import type { MemberPaymentStatus } from "@/lib/types";

const STATUS_LABEL: Record<MemberPaymentStatus["orderStatus"], string> = {
  pending: "正在确认支付结果",
  completed: "会员已开通",
  cancelled: "订单已取消",
  expired: "订单已超时关闭",
  failed: "订单处理失败",
};

export function PricingPaymentResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderNo = searchParams.get("orderNo") ?? "";
  const resultToken = searchParams.get("resultToken") ?? "";
  const returnError = searchParams.get("paymentError") ?? "";
  const [status, setStatus] = useState<MemberPaymentStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!orderNo) {
      setError("缺少订单号，无法确认支付结果");
      setLoading(false);
      return;
    }
    const authToken = getPersistedAuthToken();
    if (!authToken && !resultToken) {
      navigate("/auth/login", {
        replace: true,
        state: { redirectTo: `${location.pathname}${location.search}` },
      });
      return;
    }
    try {
      const nextStatus = authToken
        ? await getMemberAlipayPaymentStatus(orderNo)
        : await getAlipayPaymentResultStatus(orderNo, resultToken);
      setStatus(nextStatus);
      setError("");
      if (nextStatus.orderStatus === "completed" && authToken) {
        if (nextStatus.orderType === "point_recharge") {
          if (typeof nextStatus.pointBalance === 'number') updatePersistedLoginUser({ pointBalance: nextStatus.pointBalance });
        } else updatePersistedLoginUser({
          memberExpireTime: nextStatus.memberExpireTime ?? undefined,
          memberLevel: "member",
          memberPlanType: nextStatus.memberPlanType ?? undefined,
        });
      }
    } catch (statusError) {
      setError(
        returnError === "return_verification_failed"
          ? "支付宝回跳验证失败，请登录后从个人中心查看订单状态"
          : statusError instanceof Error
            ? statusError.message
            : "支付状态查询失败",
      );
    } finally {
      setLoading(false);
    }
  }, [location.pathname, location.search, navigate, orderNo, resultToken, returnError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (status?.orderStatus !== "pending") {
      return undefined;
    }
    const intervalId = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(intervalId);
  }, [refresh, status?.orderStatus]);

  useEffect(() => {
    if (status?.orderStatus === "completed" || status?.orderStatus === "cancelled" || status?.orderStatus === "expired") {
      const orderKey = `ownai:alipay:order:${status.orderNo}`;
      const requestKey = sessionStorage.getItem(orderKey);
      if (requestKey) {
        sessionStorage.removeItem(requestKey);
      }
      sessionStorage.removeItem(orderKey);
    }
  }, [status]);

  const isComplete = status?.orderStatus === "completed";
  const isRecharge = status?.orderType === "point_recharge";
  const isTerminal = status && status.orderStatus !== "pending";
  const isLoggedIn = Boolean(getPersistedAuthToken());
  const memberReturnPath = isComplete && isLoggedIn && !isRecharge ? getMemberReturnPath() : null;

  return (
    <div className="pricing-page page-shell min-h-screen text-[var(--hero-ink)]">
      <Navbar />
      <main className="mx-auto flex min-h-[72vh] w-full max-w-[720px] items-center justify-center px-5 py-16">
        <section className="w-full rounded-[16px] bg-[var(--plan-card-bg)] p-8 text-center">
          {loading ? <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[var(--hero-muted)]" /> : null}
          {!loading && isComplete ? <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" /> : null}
          {!loading && !isComplete ? <CircleAlert className="mx-auto h-9 w-9 text-amber-500" /> : null}
          <h1 className="mt-4 text-2xl font-semibold">
            {loading ? "正在确认支付宝支付" : isComplete && isRecharge ? "积分充值成功" : status ? STATUS_LABEL[status.orderStatus] : "无法确认订单"}
          </h1>
          {isComplete && isRecharge && <p className="mt-3 text-sm">已到账 {status?.pointsAmount?.toLocaleString()} 积分</p>}
          <p className="mt-3 text-sm leading-6 text-[var(--hero-muted)]">
            {orderNo ? `订单号：${orderNo}` : "缺少订单号，请从会员套餐页重新发起支付。"}
          </p>
          {status?.orderStatus === "pending" ? (
            <p className="mt-2 text-sm text-[var(--hero-muted)]">支付完成后会自动更新，请勿重复创建订单。</p>
          ) : null}
          {status?.failureReason ? <p className="mt-2 text-sm text-red-500">{status.failureReason}</p> : null}
          {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
          <div className="mt-7 flex justify-center gap-3">
            {!isTerminal || error ? (
              <button type="button" onClick={() => void refresh()} className="pricing-success-primary-action rounded-[8px] px-4 py-2 text-sm font-semibold">
                刷新状态
              </button>
            ) : null}
            {memberReturnPath ? (
              <a
                href={memberReturnPath}
                onClick={clearMemberReturnPath}
                className="rounded-[8px] bg-white px-4 py-2 text-sm font-semibold !text-black transition-colors hover:bg-white/90 hover:!text-black"
              >
                返回会员文章
              </a>
            ) : (
              <Link
                to={isComplete && isLoggedIn ? "/profile" : isComplete ? "/auth/login" : "/pricing"}
                state={isComplete && !isLoggedIn ? { redirectTo: "/profile" } : undefined}
                className={isComplete
                  ? "rounded-[8px] bg-white px-4 py-2 text-sm font-semibold !text-black transition-colors hover:bg-white/90 hover:!text-black"
                  : "rounded-[8px] border border-[var(--plan-border)] px-4 py-2 text-sm font-semibold"}
              >
                {isComplete ? (isLoggedIn ? "进入我的社区" : "登录并查看账户") : "返回项目套餐"}
              </Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
