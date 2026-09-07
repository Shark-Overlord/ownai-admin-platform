import { useEffect } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const MAX_AUTO_CLOSE_MS = 5000;
const DEFAULT_AUTO_CLOSE_MS = 3000;
const MIN_AUTO_CLOSE_MS = 1000;

export type RequestToastTone = "error" | "success";

export function RequestErrorToast({
  message,
  onClose,
  autoCloseMs = DEFAULT_AUTO_CLOSE_MS,
  tone = "error",
  variant = "hero",
}: {
  message: string;
  onClose: () => void;
  autoCloseMs?: number;
  tone?: RequestToastTone;
  variant?: "hero" | "chat";
}) {
  const isChat = variant === "chat";
  const Icon = tone === "success" ? CheckCircle2 : CircleAlert;
  const normalizedAutoCloseMs = Number.isFinite(autoCloseMs)
    ? Math.min(Math.max(autoCloseMs, MIN_AUTO_CLOSE_MS), MAX_AUTO_CLOSE_MS)
    : DEFAULT_AUTO_CLOSE_MS;

  useEffect(() => {
    const timer = window.setTimeout(onClose, normalizedAutoCloseMs);

    return () => window.clearTimeout(timer);
  }, [message, normalizedAutoCloseMs, onClose]);

  const toast = (
    <div
      className={cn(
        "fixed left-1/2 z-[2147483647] flex w-fit max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-[12px] border px-3 py-2.5 text-[13px] sm:max-w-[400px]",
        isChat
          ? "request-error-toast--chat top-[calc(env(safe-area-inset-top)+12px)]"
          : "top-[calc(env(safe-area-inset-top)+68px)] border-white/55 bg-[var(--hero-surface)]/88 text-[var(--hero-ink)] shadow-[0_12px_36px_rgba(17,17,17,0.12)] backdrop-blur-xl backdrop-saturate-150 sm:top-[76px] dark:border-white/10",
      )}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]",
          tone === "success"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-red-500/10 text-red-500",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span
        className="min-w-0 flex-1 truncate whitespace-nowrap text-[13px] font-medium leading-5"
        title={message}
      >
        {message}
      </span>
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] transition-colors",
          isChat
            ? "request-error-toast__close--chat"
            : "text-[var(--hero-muted)] hover:bg-[var(--hero-ink)]/5 hover:text-[var(--hero-ink)]",
        )}
        aria-label="关闭提示"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  if (typeof document === "undefined") {
    return toast;
  }

  return createPortal(toast, document.body);
}
