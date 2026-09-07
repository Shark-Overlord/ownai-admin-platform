import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DiagonalVideoGallery } from "@/components/home/HomeLandingSections";
import type { HomeHeroContent } from "@/lib/home-content";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export function Hero({ content }: { content: HomeHeroContent }) {
  const containerRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const container = containerRef.current;
      const copy = copyRef.current;

      if (!container || !copy) return;

      const intro = gsap.timeline();
      intro.fromTo(
        copy.children,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.05, stagger: 0.1, ease: "power4.out" },
      );

      gsap.to(copy, {
        y: -64,
        scale: 0.965,
        opacity: 0.16,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "bottom 22%",
          scrub: 0.75,
        },
      });
    });

    return () => media.revert();
  }, []);

  return (
    <section
      id="home"
      ref={containerRef}
      className="hero-scroll-surface relative flex items-center justify-center overflow-hidden bg-black px-4 pb-8 pt-8 text-white sm:px-6 sm:pb-10 sm:pt-10 lg:px-8 lg:pb-12 lg:pt-12"
    >
      <DiagonalVideoGallery hero videos={content.videoList} />
      <div className="absolute inset-0 z-[1] bg-black/[0.58]" aria-hidden="true" />

      <div className="relative z-[2] mx-auto flex w-full max-w-[1200px] justify-center">
        <div ref={copyRef} className="flex w-full max-w-[1120px] flex-col items-center">
          <div className="hero-title-copy-lockup mt-7 flex w-full flex-col items-center sm:mt-8">
            <p
              className="hero-eyebrow-copy font-medium uppercase text-white/80"
            >
              {content.eyebrow}
            </p>

            <h1 className="mt-4 max-w-[1040px] text-center text-[clamp(38px,4.6vw,64px)] font-semibold leading-[1.1] tracking-[-0.05em] text-white">
              {content.title}
            </h1>

            <p
              className="hero-bottom-copy max-w-[760px] text-center font-normal tracking-[0.04em] text-white/80 sm:tracking-[0.08em]"
            >
              {content.description}
            </p>
            <Link to="/frontend-prompts" className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-[14px] font-medium text-black transition-colors hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">浏览前端资源<ArrowRight size={15} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
