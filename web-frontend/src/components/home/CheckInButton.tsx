import { useEffect, useState } from "react";
import { Check, LoaderCircle, Sparkles } from "lucide-react";
import { checkInToday, getCheckInStatus } from "@/lib/check-in";
import { usePreferredLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type { CheckInStatusResponse } from "@/lib/types";

const CHECK_IN_COPY = {
  "en-US": {
    checked: "Checked in today",
    failed: "Check-in failed",
    loading: "Loading",
    points: "pts",
    profileReward: "Check in now",
    reward: "Check in",
    success: "Checked in",
  },
  "zh-CN": {
    checked: "今日已签到",
    failed: "签到失败",
    loading: "加载中",
    points: "积分",
    profileReward: "立即签到",
    reward: "签到",
    success: "签到成功",
  },
} as const;

interface CheckInButtonProps {
  className?: string;
  onPointBalanceChange: (pointBalance: number) => void;
  variant?: "desktop" | "menu" | "mobile" | "profile";
}

export function CheckInButton({
  className,
  onPointBalanceChange,
  variant = "desktop",
}: CheckInButtonProps) {
  const { locale } = usePreferredLocale();
  const copy = CHECK_IN_COPY[locale];
  const [status, setStatus] = useState<CheckInStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const syncStatus = async () => {
    const nextStatus = await getCheckInStatus();
    setStatus(nextStatus);

    if (typeof nextStatus.pointBalance === "number") {
      onPointBalanceChange(nextStatus.pointBalance);
    }

    return nextStatus;
  };

  useEffect(() => {
    let isCurrent = true;

    setIsLoading(true);
    syncStatus()
      .catch(() => {
        if (isCurrent) {
          setFeedback(copy.failed);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [locale]);

  const handleCheckIn = async () => {
    if (status?.checkedInToday || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      await checkInToday();
      const nextStatus = await syncStatus();
      setFeedback(copy.success);

      if (typeof nextStatus.pointBalance === "number") {
        onPointBalanceChange(nextStatus.pointBalance);
      }
    } catch {
      setFeedback(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isChecked = Boolean(status?.checkedInToday);
  const rewardPoints = status?.rewardPoints ?? 0;
  const defaultLabel = isLoading
    ? copy.loading
    : isChecked
      ? copy.checked
      : `${copy.reward}${rewardPoints ? ` +${rewardPoints}` : ""}`;
  const label = variant === "profile" && !isChecked && !isLoading
    ? copy.profileReward
    : defaultLabel;

  return (
    <div className={cn("space-y-1", className)}>
      <button
        type="button"
        onClick={() => void handleCheckIn()}
        disabled={isLoading || isSubmitting || isChecked}
        className={cn(
          "group inline-flex h-8 w-full items-center rounded-[8px] border px-2.5 text-[12px] font-medium transition-[border-color,box-shadow,transform,color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 disabled:cursor-not-allowed",
          "justify-between",
          isChecked
            ? "border-[var(--hero-ink)]/8 bg-[var(--hero-ink)]/[0.035] text-[var(--hero-muted)]"
            : "border-[var(--hero-ink)]/10 bg-[var(--hero-bg)] text-[var(--hero-ink)] hover:bg-[var(--hero-ink)]/[0.045]",
          variant === "desktop" && "shadow-sm",
          variant === "menu" && "border-[var(--hero-ink)]/8 bg-[var(--hero-surface)] px-3 text-[13px] shadow-sm hover:border-[var(--hero-ink)]/12 hover:bg-[var(--hero-surface)] hover:shadow-[0_8px_18px_rgba(17,17,17,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]",
          variant === "profile" && "h-9 justify-center rounded-[10px] border-[var(--hero-ink)] bg-[var(--hero-ink)] px-4 text-[14px] font-semibold text-[var(--hero-bg)] shadow-[0_10px_22px_rgba(17,17,17,0.16)] hover:border-[var(--hero-ink)] hover:bg-[#202124] hover:text-white hover:shadow-[0_12px_26px_rgba(17,17,17,0.2)]",
          variant === "profile" && isChecked && "border-transparent bg-[var(--hero-ink)]/[0.055] text-[var(--hero-ink)] shadow-none hover:border-transparent hover:bg-[var(--hero-ink)]/[0.065] hover:text-[var(--hero-ink)] hover:shadow-none",
        )}
      >
        <span
          className={cn(
            "inline-flex min-w-0 items-center justify-center gap-2.5",
            variant === "menu" && "grid flex-1 grid-cols-[20px_auto] justify-center gap-2",
          )}
        >
          {isLoading || isSubmitting ? (
            <LoaderCircle
              className={cn(
                "h-3.5 w-3.5 shrink-0 animate-spin",
                variant === "profile" ? "text-current" : "text-[var(--hero-muted)]",
              )}
            />
          ) : isChecked ? (
            <Check
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                variant === "profile" ? "text-current" : "text-[var(--hero-muted)]",
              )}
            />
          ) : (
            <Sparkles
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                variant === "profile" ? "hidden" : "text-[var(--hero-muted)]",
                variant === "menu" && "mx-auto text-[var(--hero-ink)] group-hover:text-[var(--hero-ink)]",
              )}
            />
          )}
          <span
            className={cn(
              "truncate leading-none",
              variant === "profile" ? "text-[14px] font-semibold" : variant === "menu" ? "text-[13px]" : "text-[12px]",
            )}
          >
            {label}
          </span>
        </span>
        {variant !== "profile" && variant !== "menu" && typeof status?.pointBalance === "number" ? (
          <span className="shrink-0 text-[12px] leading-none text-[var(--hero-muted)]">
            {status.pointBalance}
          </span>
        ) : null}
      </button>
      {feedback ? (
        <p
          className={cn(
            "px-1 text-[11px] leading-4",
            feedback === copy.failed ? "text-[#c7383d]" : "text-[var(--hero-muted)]",
          )}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
