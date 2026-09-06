import { useEffect, useState } from "react";
import { Footer } from "@/components/home/Footer";
import { Hero } from "@/components/home/Hero";
import { HomeLandingSections } from "@/components/home/HomeLandingSections";
import { Navbar } from "@/components/home/Navbar";
import { Reveal } from "@/components/home/Reveal";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import {
  DEFAULT_HOME_CONTENT,
  getHomeContent,
  type HomeContentVO,
} from "@/lib/home-content";

export function HomePage() {
  useDocumentMeta(
    "OwnAI｜500+ 前端设计提示词、UI 源码与 Vibe Coding 资源",
    "OwnAI 为设计师和开发者提供500+前端页面、组件与交互提示词，包含真实效果封面、会员源码和 Vibe Coding 创作资源。",
    {
      canonical: "https://ownai.icu/",
      image: "https://ownai.icu/images/design-everything-dark-bg.png",
      robots: "index, follow",
      structuredData: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": "https://ownai.icu/#website",
            url: "https://ownai.icu/",
            name: "OwnAI",
            inLanguage: "zh-CN",
            publisher: { "@id": "https://ownai.icu/#organization" },
          },
          {
            "@type": "Organization",
            "@id": "https://ownai.icu/#organization",
            name: "OwnAI",
            url: "https://ownai.icu/",
            logo: "https://ownai.icu/images/ownai-logo.png",
          },
        ],
      },
    },
  );
  const [content, setContent] = useState<HomeContentVO>(DEFAULT_HOME_CONTENT);

  useEffect(() => {
    const controller = new AbortController();

    void getHomeContent(controller.signal)
      .then(setContent)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (import.meta.env.DEV) {
          console.debug("Home content API is unavailable; using local fallback", error);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="site-aurora-surface page-surface min-h-screen bg-[var(--hero-bg)] text-[var(--hero-ink)]">
      <div className="home-hero-surface hero-surface relative overflow-hidden text-[var(--hero-ink)]">
        <Navbar />
        <main className="relative z-10">
          <Hero content={content.hero} />
        </main>
      </div>

      <main className="relative z-10">
        <HomeLandingSections content={content} />
      </main>

      <Reveal>
        <Footer />
      </Reveal>
    </div>
  );
}
