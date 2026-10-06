import { useEffect, useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { contactContent, contactPageCopy } from "@/data/contact";
import { compactButtonBase, compactButtonPrimary } from "@/lib/buttonStyles";
import { usePreferredLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

export function ContactPage() {
  const { locale } = usePreferredLocale();
  const copy = contactPageCopy[locale];
  const [wechatCopied, setWechatCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const handleCopyWechat = async () => {
    try {
      await navigator.clipboard.writeText(contactContent.wechat);
      setWechatCopied(true);
      window.setTimeout(() => setWechatCopied(false), 1800);
    } catch {
      window.prompt(copy.copyLabel, contactContent.wechat);
    }
  };

  return (
    <div className="page-surface relative min-h-screen bg-[var(--hero-bg)] text-[var(--hero-ink)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6%] top-[-2%] h-[220px] w-[220px] rounded-full bg-[var(--hero-surface)]/85 blur-3xl" />
        <div className="absolute right-[-4%] top-[8%] h-[280px] w-[280px] rounded-full bg-[var(--hero-panel)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(24,28,36,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(24,28,36,0.016)_1px,transparent_1px)] bg-[size:92px_92px] opacity-20" />
      </div>

      <Navbar />
      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-[520px] text-center">
          <h1 className="font-display text-[2rem] font-medium tracking-[-0.045em] sm:text-[2.35rem]">
            {copy.title}
          </h1>
          <p className="mt-2 text-[13px] leading-6 text-[var(--hero-muted)]">{copy.subtitle}</p>

          <div className="mt-7 rounded-[20px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-6 text-left shadow-sm sm:p-8">
            <p className="text-[12px] text-[var(--hero-muted)]">{copy.wechatLabel}</p>
            <p className="mt-2 break-all text-[24px] font-semibold tracking-[0.02em]">{contactContent.wechat}</p>
            <button
              type="button"
              onClick={() => void handleCopyWechat()}
              className={cn(compactButtonBase, compactButtonPrimary, "mt-6 w-full")}
            >
              {wechatCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {wechatCopied ? copy.copiedLabel : copy.copyLabel}
            </button>
            <p className="mt-4 text-[12px] leading-6 text-[var(--hero-muted)]">{contactContent.supportNotice[locale]}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
