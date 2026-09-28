import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, LockKeyhole, LoaderCircle, RefreshCw, X, Zap } from "lucide-react";
import "./PromptUnlockProvider.css";
import { openAlipayCheckoutWindow, submitAlipayPaymentForm } from "@/lib/alipay-checkout";
import { getArtworkDetail } from "@/lib/artwork";
import { getAuthSessionEventName, getPersistedLoginUser, updatePersistedLoginUser } from "@/lib/auth-session";
import {
  createMemberAlipayPayment,
  getMemberAlipayPaymentStatus,
  getPointRechargeConfig,
  resumeMemberAlipayPayment,
  type PointRechargeConfig,
} from "@/lib/member";
import { notifyPromptAccess, redeemPrompt, refreshPointBalance } from "@/lib/prompt-unlock";
import { CheckInButton } from "@/components/home/CheckInButton";
import { RequestErrorToast } from "@/components/ui/RequestErrorToast";
import type { ArtworkDetailVO } from "@/lib/types";

const Context = createContext<(id: string) => Promise<boolean>>(async () => false);
export const usePromptUnlock = () => useContext(Context);

export function PromptUnlockProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [id, setId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ArtworkDetailVO | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rechargeConfig, setRechargeConfig] = useState<PointRechargeConfig | null>(null);
  const [paying, setPaying] = useState(false);
  const activeOrderNo = useRef<string | null>(null);
  const pollTimer = useRef<number | null>(null);
  const resolveRef = useRef<((unlocked: boolean) => void) | null>(null);
  const ownerRef = useRef<string | null>(null);
  const submitting = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const generationRef = useRef(0);

  const stopPolling = () => {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setPaying(false);
    activeOrderNo.current = null;
  };

  const finish = (unlocked: boolean) => {
    stopPolling();
    generationRef.current += 1;
    resolveRef.current?.(unlocked);
    resolveRef.current = null;
    setId(null);
  };

  useEffect(() => {
    return () => {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
      }
    };
  }, []);

  const load = async (nextId: string) => {
    setLoading(true);
    const owner = ownerRef.current;
    const generation = generationRef.current;
    try {
      const next = await getArtworkDetail(nextId, { signal: AbortSignal.timeout(15_000) });
      if (generation !== generationRef.current || owner !== ownerRef.current || !resolveRef.current) return;
      if (!next) throw new Error("作品详情加载失败");
      setDetail(next);
      if (next.canAccessPrompt === true) {
        notifyPromptAccess(next);
        finish(true);
        return;
      }
      const nextBalance = await refreshPointBalance();
      if (generation === generationRef.current) setBalance(nextBalance);
      if (!rechargeConfig) {
        getPointRechargeConfig().then((cfg) => {
          if (generation === generationRef.current) setRechargeConfig(cfg);
        }).catch(() => undefined);
      }
    } catch (error) {
      if (generation !== generationRef.current) return;
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : "解锁信息加载失败");
    } finally {
      if (generation === generationRef.current) setLoading(false);
    }
  };

  const requestUnlock = (nextId: string): Promise<boolean> => {
    if (resolveRef.current || submitting.current) return Promise.resolve(false);
    const user = getPersistedLoginUser();
    if (!user) {
      const query = new URLSearchParams(location.search);
      query.set("unlockArtwork", nextId);
      navigate("/auth/login", { state: { redirectTo: `${location.pathname}?${query}` } });
      return Promise.resolve(false);
    }
    ownerRef.current = String(user.id);
    generationRef.current += 1;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setId(nextId);
    setDetail(null);
    setBalance(null);
    const pending = new Promise<boolean>((resolve) => { resolveRef.current = resolve; });
    void load(nextId);
    return pending;
  };

  useEffect(() => {
    const checkOwner = () => {
      if (ownerRef.current && String(getPersistedLoginUser()?.id ?? "") !== ownerRef.current) {
        ownerRef.current = null;
        finish(false);
      }
    };
    window.addEventListener(getAuthSessionEventName(), checkOwner);
    window.addEventListener("storage", checkOwner);
    return () => {
      window.removeEventListener(getAuthSessionEventName(), checkOwner);
      window.removeEventListener("storage", checkOwner);
      resolveRef.current?.(false);
    };
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const requested = query.get("unlockArtwork");
    if (requested && getPersistedLoginUser() && !resolveRef.current) {
      query.delete("unlockArtwork");
      navigate(`${location.pathname}${query.size ? `?${query}` : ""}`, { replace: true });
      void requestUnlock(requested);
    }
  }, [location.pathname, location.search]);

  const confirm = async () => {
    if (!id || !detail || submitting.current) return;
    const owner = ownerRef.current;
    submitting.current = true;
    setBusy(true);
    try {
      const current = await getArtworkDetail(id, { signal: AbortSignal.timeout(15_000) });
      if (owner !== ownerRef.current) return;
      if (!current) throw new Error("作品详情加载失败");
      let unlocked = current;
      if (current.canAccessPrompt !== true) {
        if (current.pointsPrice !== detail.pointsPrice) {
          setDetail(current);
          throw new Error("积分价格已变化，请重新确认");
        }
        unlocked = await redeemPrompt(id, detail.pointsPrice!);
      }
      if (owner !== ownerRef.current) return;
      notifyPromptAccess(unlocked);
      finish(true);
      setSuccess(true);
      setMessage(unlocked.permanentlyUnlocked ? "已永久解锁，可复制提示词和下载源码" : "已获得访问权限");
      try { await refreshPointBalance(); } catch { setMessage("已解锁，积分余额暂未刷新"); }
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : "暂未确认兑换结果，请重试查询");
      try { setBalance(await refreshPointBalance()); } catch { /* Keep the last confirmed balance. */ }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const verifyOrder = async (orderNo: string) => {
    try {
      const status = await getMemberAlipayPaymentStatus(orderNo);
      if (status.orderStatus === "completed") {
        stopPolling();
        if (typeof status.pointBalance === "number") {
          setBalance(status.pointBalance);
          updatePersistedLoginUser({ pointBalance: status.pointBalance });
        } else {
          try {
            const nextBal = await refreshPointBalance();
            setBalance(nextBal);
          } catch { /* ignore */ }
        }
        await confirm();
      } else if (status.orderStatus === "cancelled" || status.orderStatus === "expired" || status.orderStatus === "failed") {
        stopPolling();
        setMessage(status.failureReason || "支付未完成或已关闭");
      }
    } catch {
      // transient network failure during polling, keep polling
    }
  };

  const startPolling = (orderNo: string) => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = window.setInterval(() => {
      void verifyOrder(orderNo);
    }, 2500);
  };

  const handleQuickPay = async () => {
    if (paying || busy || submitting.current || !id || !detail) return;
    const checkoutWindow = openAlipayCheckoutWindow();
    if (!checkoutWindow) {
      setMessage("支付窗口被浏览器拦截，请允许本站弹出窗口后重试");
      return;
    }
    setPaying(true);
    try {
      let config = rechargeConfig;
      if (!config) {
        config = await getPointRechargeConfig();
        setRechargeConfig(config);
      }
      if (!config || config.status !== 1) {
        throw new Error("积分充值暂未开放");
      }
      const count = Math.max(1, Math.ceil(shortage / config.pointsPerUnit));
      const quote = {
        quantity: count,
        expectedUnitPrice: config.unitPrice,
        expectedPointsPerUnit: config.pointsPerUnit,
      };
      const requestId = globalThis.crypto?.randomUUID?.()
        ?? `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      let checkout: Awaited<ReturnType<typeof createMemberAlipayPayment>>;
      try {
        checkout = await createMemberAlipayPayment("points", requestId, quote);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (/unfinished membership order exists/i.test(msg)) {
          const matchedOrderNo = msg.match(/MEM\d+/)?.[0];
          if (matchedOrderNo) {
            checkout = await resumeMemberAlipayPayment(matchedOrderNo);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      submitAlipayPaymentForm(checkout.paymentFormHtml, checkoutWindow.name);
      activeOrderNo.current = checkout.orderNo;
      startPolling(checkout.orderNo);
    } catch (err: unknown) {
      checkoutWindow.window.close();
      setPaying(false);
      setMessage(err instanceof Error ? err.message : "创建支付失败，请重试");
    }
  };

  const price = detail?.pointsPrice ?? 0;
  const shortage = balance === null ? 0 : Math.max(price - balance, 0);
  const pointsPerUnit = rechargeConfig?.pointsPerUnit || 100;
  const unitPrice = rechargeConfig?.unitPrice || 1.0;
  const neededUnits = Math.max(1, Math.ceil(shortage / pointsPerUnit));
  const rechargeCost = (neededUnits * unitPrice).toFixed(2);
  const rechargePoints = neededUnits * pointsPerUnit;
  const buttonClass = "prompt-unlock-button";

  return (
    <Context.Provider value={requestUnlock}>
      {children}
      <Dialog.Root
        open={id !== null}
        onOpenChange={(open) => {
          if (!open && !submitting.current) finish(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="prompt-unlock-backdrop" />
          <Dialog.Content
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              triggerRef.current?.focus();
            }}
            className="prompt-unlock-dialog"
          >
            <header className="prompt-unlock-header">
              <span className="prompt-unlock-icon">
                <LockKeyhole size={18} aria-hidden="true" />
              </span>
              <div>
                <Dialog.Title className="text-[18px] font-semibold">永久解锁作品</Dialog.Title>
                <Dialog.Description className="mt-1 text-[13px] text-[var(--hero-muted)]">
                  一次兑换，持续使用与获取更新
                </Dialog.Description>
              </div>
            </header>
            <Dialog.Close
              disabled={busy || paying}
              aria-label="关闭解锁弹窗"
              className="prompt-unlock-close"
            >
              <X size={16} />
            </Dialog.Close>
            <div className="prompt-unlock-body" aria-busy={loading}>
              <p className="text-[12px] text-[var(--hero-muted)]">即将解锁</p>
              <p className="mt-2 break-words text-[15px] font-medium">
                {detail?.title || "正在读取作品"}
              </p>
              <div className="prompt-unlock-benefits">
                {["完整提示词", "代码与源码包", "后续更新"].map((label) => (
                  <span key={label}>
                    <Check size={13} aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>
              <div className="prompt-unlock-summary" aria-live="polite">
                <div>
                  <span>兑换所需</span>
                  <strong>
                    {detail ? (price > 0 ? `${price} 积分` : "暂不支持兑换") : "查询中"}
                  </strong>
                </div>
                <div>
                  <span>当前余额</span>
                  <span>{loading ? "查询中" : `${balance ?? "待刷新"} 积分`}</span>
                </div>
                {!loading && balance !== null && price > 0 && (
                  <div className="prompt-unlock-total">
                    <span>{shortage > 0 ? "还需积累" : "兑换后剩余"}</span>
                    <strong>{shortage > 0 ? shortage : balance - price} 积分</strong>
                  </div>
                )}
              </div>

              {shortage > 0 && !loading && !busy && !paying && (
                <div className="prompt-unlock-quickpay">
                  <div className="prompt-unlock-quickpay-header">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-400">
                      <Zap size={14} className="fill-emerald-400 text-emerald-400" />
                      <span>快捷直充解锁</span>
                    </div>
                    <span className="text-[12px] font-semibold text-emerald-400">
                      ¥{rechargeCost} / +{rechargePoints} 积分
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-5 text-[var(--hero-muted)]">
                    当前积分不足（还差 {shortage} 积分），可直接快捷支付，到账后自动为你解锁源码与提示词。
                  </p>
                  <div className="prompt-unlock-checkin-line">
                    <span>不想付费？可通过签到免费获取：</span>
                    <CheckInButton
                      variant="menu"
                      onPointBalanceChange={(value) => {
                        setBalance(value);
                        updatePersistedLoginUser({ pointBalance: value });
                      }}
                    />
                  </div>
                </div>
              )}

              {paying && (
                <div className="prompt-unlock-paying">
                  <div className="flex items-center gap-2 text-[14px] font-medium text-amber-300">
                    <LoaderCircle size={16} className="animate-spin text-amber-400" />
                    <span>已调起支付宝收银台，等待支付...</span>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-[var(--hero-muted)]">
                    请在打开的页面完成扫码支付。支付成功后系统将自动完成核验并展示源码。
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      className="prompt-unlock-verify-link"
                      onClick={() => {
                        if (activeOrderNo.current) void verifyOrder(activeOrderNo.current);
                      }}
                    >
                      <RefreshCw size={12} className="inline mr-1" />
                      已完成支付？点击立即核验
                    </button>
                    <button
                      type="button"
                      className="text-[12px] text-[var(--hero-muted)] hover:underline"
                      onClick={stopPolling}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <p className="prompt-unlock-note">解锁包含后续更新，作品下线期间暂停访问</p>
            </div>
            <div className="prompt-unlock-footer">
              <button
                type="button"
                className={buttonClass}
                disabled={busy || paying}
                onClick={() => {
                  finish(false);
                  navigate("/pricing");
                }}
              >
                查看会员方案
              </button>
              {!loading && !busy && (balance === null || !detail) ? (
                <button
                  type="button"
                  className={`${buttonClass} prompt-unlock-primary`}
                  onClick={() => id && void load(id)}
                >
                  重新查询
                </button>
              ) : shortage > 0 ? (
                <button
                  type="button"
                  className={`${buttonClass} prompt-unlock-pay-action`}
                  disabled={busy || paying || loading}
                  onClick={() => void handleQuickPay()}
                >
                  {paying ? (
                    <>
                      <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                      <span>等待支付确认...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="mr-1.5 fill-current" />
                      <span>支付宝 ¥{rechargeCost} 立即补齐并解锁</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className={`${buttonClass} prompt-unlock-primary`}
                  disabled={loading || busy || balance === null || price <= 0}
                  onClick={() => void confirm()}
                >
                  {busy ? "正在确认解锁" : loading ? "正在查询" : `确认扣除 ${price} 积分`}
                </button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {message && (
        <RequestErrorToast
          message={message}
          tone={success ? "success" : "error"}
          onClose={() => setMessage(null)}
        />
      )}
    </Context.Provider>
  );
}

