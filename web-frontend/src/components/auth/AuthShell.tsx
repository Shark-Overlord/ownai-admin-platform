import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface AuthShellProps {
  switchLabel: string;
  switchCta: string;
  switchTo: string;
  children: ReactNode;
}

export function AuthShell({
  switchLabel,
  switchCta,
  switchTo,
  children,
}: AuthShellProps) {
  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[var(--hero-bg)] text-[var(--hero-ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-[-12%] top-[-10%] h-[260px] w-[260px] rounded-full bg-[var(--hero-surface)]/70 blur-3xl" />
        <div className="absolute right-[-10%] top-[16%] h-[300px] w-[300px] rounded-full bg-[var(--hero-panel)]/70 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(24,28,36,0.014)_1px,transparent_1px),linear-gradient(90deg,rgba(24,28,36,0.014)_1px,transparent_1px)] bg-[size:88px_88px] opacity-22" />
      </div>

      <header className="relative z-10 px-4 pb-2 pt-4 sm:px-6 sm:pt-5 lg:px-8">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 rounded-full border border-[var(--hero-border)] bg-[var(--hero-surface)]/82 px-3 py-2 text-[0.78rem] font-medium text-[var(--hero-ink)] shadow-[0_8px_24px_rgba(17,17,17,0.035)] backdrop-blur-md transition-transform duration-150 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-surface)] text-[0.86rem] font-medium">
              DE
            </span>
            <span className="hidden leading-none sm:block">
              <span className="block text-[0.64rem] tracking-[0.17em] text-[var(--hero-muted)] uppercase">
                DESIGN EVERYTHING
              </span>
              <span className="mt-1 block text-[0.8rem] tracking-[0.05em] text-[var(--hero-ink)]/74">
                Prompt 会员库
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 rounded-full border border-[var(--hero-border)] bg-[var(--hero-surface)]/82 px-1.5 py-1.5 shadow-[0_8px_24px_rgba(17,17,17,0.035)] backdrop-blur-md">
            <span className="hidden px-2 text-[13px] text-[var(--hero-muted)] sm:inline">
              {switchLabel}
            </span>
            <Link
              to={switchTo}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--hero-border)] bg-[var(--hero-panel)] px-3 text-[13px] font-medium text-[var(--hero-ink)] transition-transform duration-150 hover:-translate-y-[1px] hover:bg-[var(--auth-link-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
            >
              {switchCta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100svh-4.75rem)] items-center justify-center px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-center">
          <section className="w-full">{children}</section>
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--hero-border)] bg-[var(--hero-surface)]/76 px-3 py-2 text-[0.72rem] font-medium tracking-[0.18em] text-[var(--hero-muted)] uppercase shadow-[0_8px_24px_rgba(17,17,17,0.025)] backdrop-blur-md md:inline-flex">
        <Sparkles className="h-3.5 w-3.5 text-[var(--hero-ink)]" />
        账号入口
      </div>
    </div>
  );
}
