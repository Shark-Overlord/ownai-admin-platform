import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Copy, LoaderCircle, MessageCircle, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/home/Navbar";
import { openAlipayCheckoutWindow, submitAlipayPaymentForm } from "@/lib/alipay-checkout";
import {
  getAuthSessionEventName,
  getPersistedAuthToken,
  getPersistedLoginUser,
} from "@/lib/auth-session";
import { createMemberAlipayPayment, listMemberPricePlans, getPointRechargeConfig, type PointRechargeConfig } from "@/lib/member";
import { PointRechargeCard } from "@/components/prompt/PointRechargeCard";
import { clearMemberReturnPath, normalizeMemberReturnPath, persistMemberReturnPath } from "@/lib/member-return";
import { easeOutExpo, revealVariants, staggerContainer } from "@/lib/motion";
import { getCurrentLoginUser } from "@/lib/profile";
import type { MemberPriceConfigPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLAN_COPY = {
  month: {
    name: "月费会员",
    billing: "一次性开通，30 天有效，不自动续费",
    description: "30 天解锁 1,000+ 提示词、会员作品与源码。",
    tone: "standard",
  },
  year: {
    name: "年费会员",
    billing: "一次性开通，365 天有效，不自动续费",
    description: "365 天解锁未来 1,000+ 提示词及持续更新的会员素材。",
    tone: "recommended",
  },
  lifetime: {
    name: "永久会员",
    billing: "一次性开通，永久有效",
    description: "永久解锁未来 1,000+ 提示词，并享 1v1 制作课程。",
    tone: "professional",
  },
} as const;

const COMMON_FEATURES = [
  "解锁全部会员专享 Prompt",
  "解锁会员专属作品和源码",
  "访问持续更新的前端设计资产",
  "会员有效期内不限内容浏览",
];

function formatPrice(value?: number | null) {
  return Number(value || 0).toFixed(2).replace(/\.00$/, "");
}

function createPaymentRequestId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const PLAN_RANK = { month: 1, year: 2, lifetime: 3 } as const;

function PricingCard({ plan, activePlanType, creatingPlanType, onPurchase }: {
  plan: MemberPriceConfigPlan;
  activePlanType: MemberPriceConfigPlan["planType"] | null;
  creatingPlanType: MemberPriceConfigPlan["planType"] | "points" | null;
  onPurchase: (planType: MemberPriceConfigPlan["planType"]) => void;
}) {
  const copy = PLAN_COPY[plan.planType];
  const isGradientPlan = copy.tone === "professional";
  const creating = creatingPlanType === plan.planType;
  const isCurrentPlan = activePlanType === plan.planType;
  const isDowngrade = activePlanType !== null && PLAN_RANK[plan.planType] < PLAN_RANK[activePlanType];
  const isLifetimeActive = activePlanType === "lifetime";
  const disabled = creatingPlanType !== null || isDowngrade || isLifetimeActive;
  const features = plan.planType === "month"
    ? COMMON_FEATURES
    : [...COMMON_FEATURES, "解锁 OwnAI Design 插件，无限使用、不限时间"];
  const buttonLabel = isCurrentPlan
    ? plan.planType === "lifetime" ? "永久会员已生效" : "续费当前套餐"
    : isDowngrade ? "有效期内不可降级"
      : activePlanType ? "升级套餐" : "支付宝购买";
  return (
    <motion.article
      data-tone={copy.tone}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.48, ease: easeOutExpo }}
      className="pricing-plan-card relative flex h-full flex-col rounded-[20px] px-6 py-7"
    >
      <div className="min-h-[92px]">
        <div className="flex items-center gap-2.5">
          <h3 className="font-display text-[1.45rem] font-semibold text-[var(--plan-text)]">{copy.name}</h3>
          {plan.planType === "year" ? (
            <span className="pricing-plan-badge inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold">
              推荐
            </span>
          ) : null}
          {isCurrentPlan ? (
            <span className="inline-flex h-6 items-center rounded-full border border-[var(--plan-divider)] px-2.5 text-[12px] font-semibold">
              当前套餐
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-[14px] leading-6 text-[var(--plan-muted)]">{copy.description}</p>
      </div>
      <div className="my-6 border-t border-dashed border-[var(--plan-divider)]" />
      <div className="flex items-end gap-2">
        <span className="pricing-plan-price font-display text-[3.3rem] font-semibold leading-none text-[var(--plan-text)]">
          {formatPrice(plan.cashPrice)}
        </span>
        <span className="pb-1 text-[18px] font-semibold text-[var(--plan-text)]">元</span>
      </div>
      <p className="mt-2 text-[13px] leading-6 text-[var(--plan-muted)]">{copy.billing}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPurchase(plan.planType)}
        className={cn(
          "pricing-plan-button mt-6 inline-flex h-10 w-full items-center justify-center rounded-[8px] px-4 text-[14px] font-semibold disabled:cursor-wait disabled:opacity-60",
          isGradientPlan && "pricing-plan-button-gradient",
        )}
      >
        {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : buttonLabel}
      </button>
      <ul className="mt-7 flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-[14px] leading-6 text-[var(--plan-muted)]">
            <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--plan-text)]" strokeWidth={2.2} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export function PricingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberReturnPath = normalizeMemberReturnPath(searchParams.get("returnTo"));
  const [plans, setPlans] = useState<MemberPriceConfigPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingPlanType, setCreatingPlanType] = useState<MemberPriceConfigPlan["planType"] | "points" | null>(null);
  const [rechargeConfig, setRechargeConfig] = useState<PointRechargeConfig | null>(null);
  const [rechargeError, setRechargeError] = useState("");
  const [quantity, setQuantity] = useState("1");
  const paymentInFlight = useRef(false);
  const loadRechargeConfig = async () => {
    try { setRechargeConfig(await getPointRechargeConfig()); setRechargeError(""); }
    catch { setRechargeError("积分充值配置加载失败，请重试"); }
  };
  useEffect(() => { void loadRechargeConfig(); }, []);
  const [loginUser, setLoginUser] = useState(() => getPersistedLoginUser());
  const [supportOpen, setSupportOpen] = useState(false);
  const [wechatCopied, setWechatCopied] = useState(false);

  useEffect(() => {
    if (memberReturnPath) persistMemberReturnPath(memberReturnPath);
    else clearMemberReturnPath();
  }, [memberReturnPath]);

  const handleCopyWechat = async () => {
    await navigator.clipboard.writeText("xh1092968780");
    setWechatCopied(true);
    window.setTimeout(() => setWechatCopied(false), 1800);
  };

  useEffect(() => {
    const controller = new AbortController();
    listMemberPricePlans({ signal: controller.signal })
      .then((nextPlans) => {
        if (!controller.signal.aborted) {
          setPlans(nextPlans);
        }
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "套餐加载失败");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!getPersistedAuthToken()) {
      return;
    }
    const controller = new AbortController();
    getCurrentLoginUser({ signal: controller.signal })
      .then(setLoginUser)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const syncLoginUser = () => setLoginUser(getPersistedLoginUser());
    window.addEventListener("storage", syncLoginUser);
    window.addEventListener(getAuthSessionEventName(), syncLoginUser);
    return () => {
      window.removeEventListener("storage", syncLoginUser);
      window.removeEventListener(getAuthSessionEventName(), syncLoginUser);
    };
  }, []);

  const orderedPlans = useMemo(() => {
    const order = { month: 1, year: 2, lifetime: 3 };
    return [...plans].sort((a, b) => order[a.planType] - order[b.planType]);
  }, [plans]);

  const activePlanType = useMemo<MemberPriceConfigPlan["planType"] | null>(() => {
    if (loginUser?.memberLevel?.toLowerCase() !== "member") {
      return null;
    }
    const planType = loginUser.memberPlanType;
    if (planType !== "month" && planType !== "year" && planType !== "lifetime") {
      return null;
    }
    if (planType === "lifetime") {
      return planType;
    }
    const expiresAt = loginUser.memberExpireTime ? new Date(loginUser.memberExpireTime).getTime() : 0;
    return expiresAt > Date.now() ? planType : null;
  }, [loginUser]);

  const handlePurchase = async (planType: MemberPriceConfigPlan["planType"] | "points") => {
    if (paymentInFlight.current) return;
    const count = Number(quantity);
    const quote = planType === "points" && rechargeConfig ? { quantity: count, expectedUnitPrice: rechargeConfig.unitPrice, expectedPointsPerUnit: rechargeConfig.pointsPerUnit } : undefined;
    if (planType === "points" && (!quote || rechargeConfig?.status !== 1 || !Number.isInteger(count) || count < 1 || count > rechargeConfig.maxQuantity)) return;
    if (!getPersistedAuthToken()) {
      const redirectTo = memberReturnPath
        ? `/pricing?returnTo=${encodeURIComponent(memberReturnPath)}`
        : "/pricing";
      navigate("/auth/login", { state: { redirectTo } });
      return;
    }
    const checkoutWindow = openAlipayCheckoutWindow();
    if (!checkoutWindow) {
      setError("支付窗口被浏览器拦截，请允许本站打开新窗口后重试");
      return;
    }
    setError("");
    paymentInFlight.current = true;
    setCreatingPlanType(planType);
    const requestKey = `ownai:alipay:checkout:${planType}${quote ? `:${quote.quantity}:${quote.expectedUnitPrice}:${quote.expectedPointsPerUnit}` : ''}`;
    try {
      let requestId = sessionStorage.getItem(requestKey) ?? createPaymentRequestId();
      sessionStorage.setItem(requestKey, requestId);
      let checkout: Awaited<ReturnType<typeof createMemberAlipayPayment>>;
      try {
        checkout = await createMemberAlipayPayment(planType, requestId, quote);
      } catch (paymentError) {
        const message = paymentError instanceof Error ? paymentError.message : "";
        if (!/payment request has (?:already finished|expired)/i.test(message)) {
          throw paymentError;
        }

        // Keep the completed attempt immutable, then retry once with a new idempotency key.
        requestId = createPaymentRequestId();
        sessionStorage.setItem(requestKey, requestId);
        checkout = await createMemberAlipayPayment(planType, requestId, quote);
      }
      sessionStorage.setItem(`ownai:alipay:order:${checkout.orderNo}`, requestKey);
      submitAlipayPaymentForm(checkout.paymentFormHtml, checkoutWindow.name);
    } catch (paymentError) {
      checkoutWindow.window.close();
      const message = paymentError instanceof Error ? paymentError.message : "";
      if (planType === "points") void loadRechargeConfig();
      if (/unfinished membership order exists/i.test(message)) {
        const orderNo = message.match(/MEM\d+/)?.[0];
        setError(`当前存在待支付订单${orderNo ? ` ${orderNo}` : ""}，请先在我的社区的订单页继续支付或取消`);
      } else {
        setError(message || "创建支付宝订单失败，请稍后重试");
      }
    } finally {
      paymentInFlight.current = false;
      setCreatingPlanType(null);
    }
  };

  return (
    <div className="pricing-page page-shell relative min-h-screen text-[var(--hero-ink)]">
      <Navbar />
      <main className="relative z-10 px-4 pb-14 pt-12 sm:px-6 lg:px-8">
        <motion.section className="mx-auto w-full max-w-[1180px]" initial="hidden" animate="visible" variants={staggerContainer}>
          <PointRechargeCard config={rechargeConfig} error={rechargeError} quantity={quantity} onQuantityChange={setQuantity}
            busy={creatingPlanType !== null} creating={creatingPlanType === 'points'} onRetry={() => void loadRechargeConfig()} onPurchase={() => void handlePurchase('points')} />
          <motion.div variants={revealVariants} className="mx-auto max-w-[720px] text-center">
            <h1 className="font-display text-[clamp(1.9rem,3.6vw,3.1rem)] font-semibold leading-tight">选择会员有效期</h1>
            <p className="mx-auto mt-4 max-w-[620px] text-[14px] leading-7 text-[var(--hero-muted)]">
              月费、年费和永久会员均为一次性开通，不自动续费。支付由支付宝安全收银台处理。
            </p>
          </motion.div>
          {error ? <p role="alert" className="mx-auto mt-6 max-w-[720px] text-center text-[14px] text-red-500">{error}</p> : null}
          {loading ? <div className="mt-14 flex justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-[var(--hero-muted)]" /></div> : null}
          {!loading ? (
            <motion.div variants={revealVariants} className="mx-auto mt-10 grid w-full gap-5 md:grid-cols-3">
              {orderedPlans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  activePlanType={activePlanType}
                  creatingPlanType={creatingPlanType}
                  onPurchase={handlePurchase}
                />
              ))}
            </motion.div>
          ) : null}
        </motion.section>
      </main>

      <DialogPrimitive.Root open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="联系客服"
            title="联系客服"
            className="fixed bottom-6 right-5 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white text-black shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition-[transform,background-color,color] hover:scale-[1.04] hover:bg-[#202124] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:bottom-8 sm:right-8"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-[3px]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[100] w-[calc(100%-32px)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-white/10 bg-[#171717] p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.48)] focus:outline-none">
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="关闭客服窗口"
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
              <MessageCircle className="h-5 w-5" />
            </div>
            <DialogPrimitive.Title className="mt-5 text-[20px] font-semibold">
              联系客服
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-[13px] leading-6 text-white/58">
              套餐购买或使用过程中遇到问题，可以添加微信联系解决。
            </DialogPrimitive.Description>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-[10px] border border-white/10 bg-white/[0.045] px-4 py-3">
              <div>
                <p className="text-[11px] text-white/45">微信号</p>
                <p className="mt-1 text-[15px] font-medium text-white">xh1092968780</p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyWechat()}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-white px-3 text-[12px] font-semibold text-black transition-colors hover:bg-white/88"
              >
                {wechatCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {wechatCopied ? "已复制" : "复制"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
