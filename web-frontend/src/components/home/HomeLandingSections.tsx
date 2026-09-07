import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRight, Database, GraduationCap, ImageOff } from "lucide-react";
import type { HomeContentVO, HomeVideoItem } from "@/lib/home-content";

function createCoverLanes(videos: HomeVideoItem[]) {
  const covers =
    videos.length > 0
      ? videos
      : Array.from({ length: 12 }, (_, index) => ({
          id: `hero-cover-placeholder-${index + 1}`,
          posterUrl: "",
          alt: "静态封面待配置",
          sort: index + 1,
        }));

  return Array.from({ length: 4 }, (_, laneIndex) =>
    Array.from(
      { length: 4 },
      (_, itemIndex) => covers[(laneIndex + itemIndex * 4) % covers.length],
    ),
  );
}

export function DiagonalVideoGallery({
  hero = false,
  videos,
}: {
  hero?: boolean;
  videos: HomeVideoItem[];
}) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const laneRefs = useRef<Array<HTMLDivElement | null>>([]);
  const coverLanes = createCoverLanes(videos);

  useEffect(() => {
    const gallery = galleryRef.current;
    const lanes = laneRefs.current.filter((lane): lane is HTMLDivElement => Boolean(lane));
    if (!gallery || lanes.length === 0) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      let isVisible = false;
      const tweens = lanes.map((lane, index) => {
        const movesUp = index % 2 === 0;
        return gsap.fromTo(
          lane,
          { yPercent: movesUp ? 0 : -50 },
          {
            yPercent: movesUp ? -50 : 0,
            duration: 34 + index * 4,
            ease: "none",
            repeat: -1,
            paused: true,
          },
        );
      });

      const syncPlayback = () => {
        const shouldPlay = isVisible && document.visibilityState === "visible";
        tweens.forEach((tween) => (shouldPlay ? tween.play() : tween.pause()));
      };

      const observer = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          syncPlayback();
        },
        { threshold: 0.05 },
      );

      observer.observe(gallery);
      document.addEventListener("visibilitychange", syncPlayback);

      return () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", syncPlayback);
        tweens.forEach((tween) => tween.kill());
      };
    });

    return () => media.revert();
  }, []);

  return (
    <div
      ref={galleryRef}
      className={
        hero
          ? "absolute inset-0 h-full overflow-hidden bg-[#050505]"
          : "relative h-[440px] overflow-hidden rounded-[18px] border border-[var(--hero-border)] bg-[#050505] shadow-[0_26px_70px_-58px_rgba(0,0,0,0.72)] sm:h-[520px] lg:h-[600px]"
      }
    >
      <div className="absolute left-1/2 top-1/2 grid h-[180%] w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] grid-cols-3 sm:grid-cols-4">
        {coverLanes.map((laneCovers, laneIndex) => (
          <div
            key={laneIndex}
            className={`relative h-full overflow-hidden border-l border-white/[0.07] ${laneIndex === 3 ? "hidden border-r sm:block" : ""}`}
          >
            <div
              ref={(node) => {
                laneRefs.current[laneIndex] = node;
              }}
              className="flex flex-col gap-3 px-2.5 will-change-transform sm:gap-4 sm:px-3"
            >
              {[0, 1].map((group) => (
                <div key={group} className="flex flex-col gap-3 pb-3 sm:gap-4 sm:pb-4" aria-hidden={group === 1}>
                  {[...laneCovers, ...laneCovers].map((cover, itemIndex) => (
                    <LoopCoverCard
                      key={`${group}-${laneIndex}-${cover.id}-${itemIndex}`}
                      poster={cover.posterUrl}
                      label={cover.alt}
                      priority={hero && group === 0 && laneIndex < 3 && itemIndex < 2}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoopCoverCard({
  poster,
  label,
  priority,
}: {
  poster: string;
  label: string;
  priority: boolean;
}) {
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => setIsUnavailable(false), [poster]);

  return (
    <div className="h-[150px] w-full shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-black shadow-[0_18px_42px_-28px_rgba(0,0,0,0.9)] sm:h-[190px] lg:h-[220px]">
      {poster && !isUnavailable ? (
        <img
          src={poster}
          alt={label}
          className="h-full w-full object-cover"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setIsUnavailable(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#10131b,#07080c)] text-white/25">
          <ImageOff className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export function HomeLandingSections({ content }: { content: HomeContentVO }) {
  const { design, course } = content;

  return (
    <>
      <section className="border-y border-[var(--hero-border)] px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className="text-[30px] font-semibold tracking-[-0.045em] sm:text-[40px]">{design.title}</h2>
            <p className="mx-auto mt-4 text-[14px] leading-7 text-[var(--hero-muted)] md:whitespace-nowrap">
              {design.description}
            </p>
            <a
              href={design.ctaPath}
              className="mt-5 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-medium text-[#171717] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              style={{ color: "#111111" }}
            >
              {design.ctaText}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="mx-auto mt-10 max-w-[1040px] overflow-hidden rounded-[18px] border border-[var(--hero-border)] bg-[var(--hero-surface)] shadow-[0_30px_80px_-64px_rgba(0,0,0,0.78)]">
            <div className="relative aspect-video overflow-hidden bg-black">
              {design.demoVideoUrl ? (
                <video
                  key={design.demoVideoUrl}
                  src={design.demoVideoUrl}
                  aria-label="OwnAI Design 产品演示视频"
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full bg-black object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(145deg,#0b1020,#02040a)]">
                  <ImageOff className="h-6 w-6 text-white/30" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
            <div>
              <p className="text-[11px] font-medium tracking-[0.16em] text-[var(--hero-muted)]">{course.eyebrow}</p>
              <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.045em] sm:text-[40px]">{course.title}</h2>
              <p className="mt-4 max-w-[440px] text-[14px] leading-7 text-[var(--hero-muted)]">
                {course.description}
              </p>
              <a
                href={course.ctaPath}
                className="mt-6 inline-flex h-9 items-center gap-2 rounded-[9px] bg-[var(--hero-ink)] px-3.5 text-[12px] font-medium text-[var(--hero-bg)] transition-opacity hover:opacity-86 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/20"
              >
                {course.ctaText}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <div className="border-t border-[var(--hero-border)]">
              {course.itemList.map((item, index) => (
                <a
                  key={item.id}
                  href={item.targetPath}
                  className="group grid w-full cursor-pointer grid-cols-[112px_minmax(0,1fr)] items-center gap-4 border-b border-[var(--hero-border)] py-5 text-left transition-colors hover:bg-[var(--hero-ink)]/[0.025] sm:grid-cols-[240px_minmax(0,1fr)_auto] sm:gap-6"
                >
                  <span className="relative aspect-[4/3] w-full overflow-hidden rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-surface)]">
                    <img
                      src={item.coverUrl}
                      alt={item.coverAlt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[16px] font-medium tracking-[-0.02em] text-[var(--hero-ink)]">{item.title}</span>
                      {item.statusText ? (
                        <span className="rounded-[6px] bg-[var(--hero-ink)] px-2 py-1 text-[10px] font-medium text-[var(--hero-bg)]">{item.statusText}</span>
                      ) : null}
                    </span>
                    <span className="mt-1.5 block max-w-[560px] text-[13px] leading-6 text-[var(--hero-muted)]">{item.description}</span>
                  </span>
                  <span className="hidden items-center gap-3 sm:flex">
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--hero-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    <span className="text-[11px] font-medium tracking-[0.12em] text-[var(--hero-muted)]">0{index + 1}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-5 border-t border-[var(--hero-border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--hero-border)]">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[14px] font-medium">{course.footerTitle}</p>
                <p className="mt-1 text-[12px] text-[var(--hero-muted)]">{course.footerDescription}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-[11px] text-[var(--hero-muted)]">
              <span className="inline-flex items-center gap-1.5"><Database className="h-3.5 w-3.5" aria-hidden="true" />项目实践</span>
              <span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />系统学习</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
