import { Link } from "react-router-dom";
import { legalFooterContent } from "@/data/contact";

export function Footer() {
  return (
    <footer
      id="about"
      className="home-footer bg-[var(--hero-bg)] px-4 pb-10 pt-14 text-[var(--hero-ink)] sm:px-6 sm:pb-12 sm:pt-16 lg:px-8"
    >
      <div className="mx-auto flex max-w-[1120px] flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <img src="/images/ownai-logo.webp" alt="" className="h-7 w-7 object-contain" />
            <span className="text-[14px] font-semibold tracking-[-0.02em]">Design Everything</span>
          </div>
          <p className="max-w-[360px] text-[12px] leading-5 text-[var(--hero-muted)]">
            精选前端与图像提示词资产，帮助创作者更快建立自己的参考库。
          </p>
        </div>

        <div className="space-y-4 sm:max-w-[620px] sm:text-right">
          <nav aria-label="页脚导航" className="flex flex-wrap gap-x-5 gap-y-3 text-[12px] text-[var(--hero-muted)] sm:justify-end">
            <Link className="transition-colors hover:text-[var(--hero-ink)]" to="/contact">联系我们</Link>
            <Link className="transition-colors hover:text-[var(--hero-ink)]" to="/legal/privacy">隐私政策</Link>
            <Link className="transition-colors hover:text-[var(--hero-ink)]" to="/legal/terms">用户协议</Link>
            <Link className="transition-colors hover:text-[var(--hero-ink)]" to="/legal/service-rules">服务规则</Link>
            <Link className="transition-colors hover:text-[var(--hero-ink)]" to="/legal/consumer">会员与积分规则</Link>
          </nav>
          <div className="text-[11px] leading-5 text-[var(--hero-muted)]">
            <a
              className="inline-block transition-colors hover:text-[var(--hero-ink)]"
              href={legalFooterContent.icpUrl}
              target="_blank"
              rel="noreferrer"
            >
              {legalFooterContent.icpNumber["zh-CN"]}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
