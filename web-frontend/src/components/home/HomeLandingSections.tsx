import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronRight, Database, FileText, GraduationCap, ImageOff } from "lucide-react";
import { Link } from "react-router-dom";
import type { HomeContentVO, HomeVideoItem } from "@/lib/home-content";
import { getArtworkHomeOverview, getArtworkPromptContent, getPromptAssetPromptContent, listHomeArtworks } from "@/lib/artwork";
import { getArtworkAccessState } from "@/lib/artwork-display-rules";
import { subscribeArtworkFavoriteChange } from "@/lib/favorite";
import { subscribePromptAccess } from "@/lib/prompt-unlock";
import { RequestError } from "@/lib/request";
import { trackResource, useResourceView } from "@/lib/resource-analytics";
import { usePromptUnlock } from "@/components/prompt/PromptUnlockProvider";
import { PromptMasonry } from "@/components/frontend-prompts/PromptMasonry";
import { RequestErrorToast } from "@/components/ui/RequestErrorToast";
import {
  PromptCard,
  PromptCardSkeleton,
  PromptDetailDialog,
  getPromptCardEstimatedHeight,
  isVerticalCategoryPromptCard,
  type PromptDetailState,
} from "@/pages/FrontendPromptLibraryPage";
import type { SiteItem } from "@/lib/types";
import { HomeMcpSection } from "@/components/home/HomeMcpSection";

function SmartNavLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const trimmed = (href || "").trim() || "/";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return (
      <Link to={trimmed} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <a href={trimmed} className={className} style={style}>
      {children}
    </a>
  );
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function createCoverLanes(videos: HomeVideoItem[]): HomeVideoItem[][] {
  const count = videos.length;
  if (count === 0) {
    return Array.from({ length: 4 }, () => []);
  }

  // 4 条独立轨道：采用 Round-Robin 正交分发，杜绝列内与列间重复
  const lanes: HomeVideoItem[][] = [[], [], [], []];
  videos.forEach((video, index) => {
    lanes[index % 4].push(video);
  });

  // 确保每列至少有 4 张互不相同的卡片用于构建流畅无限循环
  lanes.forEach((lane, laneIdx) => {
    if (lane.length < 4) {
      for (let offset = 1; offset <= 3 && lane.length < 4; offset++) {
        const neighbor = lanes[(laneIdx + offset) % 4];
        for (const item of neighbor) {
          if (!lane.some((l) => l.id === item.id)) {
            lane.push(item);
            if (lane.length >= 4) break;
          }
        }
      }
    }
  });

  return lanes;
}

export function DiagonalVideoGallery({
  hero = false,
  videos,
  disableVideo = true,
}: {
  hero?: boolean;
  videos: HomeVideoItem[];
  /** 禁用视频播放，只渲染封面图（避免产生大量 COS 视频下行流量） */
  disableVideo?: boolean;
}) {
  // 1. 每次进入随机洗牌封面顺序，打破固定死板的排布
  const [shuffledVideos, setShuffledVideos] = useState<HomeVideoItem[]>(() =>
    shuffleArray(videos),
  );

  useEffect(() => {
    setShuffledVideos(shuffleArray(videos));
  }, [videos]);

  const coverLanes = createCoverLanes(shuffledVideos);

  // 2. 4 条轨道各自独立、随机指定当前播放的视频卡片位置
  const [activeVideoPerLane, setActiveVideoPerLane] = useState<number[]>(() =>
    Array.from({ length: 4 }, () => Math.floor(Math.random() * 4)),
  );

  const rotateLaneVideo = (laneIndex: number, laneLength = 4) => {
    setActiveVideoPerLane((prev) => {
      const next = [...prev];
      const current = next[laneIndex] ?? 0;
      const step = 1 + Math.floor(Math.random() * (Math.max(2, laneLength) - 1));
      next[laneIndex] = (current + step) % Math.max(1, laneLength);
      return next;
    });
  };

  // 3. 多轨道错峰节奏心跳轮换：每 18~27 秒随机接力下一个视频（降低 COS 切换频率）
  //    disableVideo=true 时跳过，避免徒增 timer 开销
  useEffect(() => {
    if (disableVideo) return;

    const timers = [0, 1, 2, 3].map((laneIndex) => {
      const interval = 18000 + laneIndex * 3000 + Math.floor(Math.random() * 2000);
      return setInterval(() => {
        const laneLength = coverLanes[laneIndex]?.length || 4;
        rotateLaneVideo(laneIndex, laneLength);
      }, interval);
    });

    return () => {
      timers.forEach(clearInterval);
    };
  }, [coverLanes, disableVideo]);

  return (
    <div
      className={
        hero
          ? "absolute inset-0 h-full overflow-hidden bg-[#050505]"
          : "relative h-[440px] overflow-hidden rounded-[18px] border border-[var(--hero-border)] bg-[#050505] shadow-[0_26px_70px_-58px_rgba(0,0,0,0.72)] sm:h-[520px] lg:h-[600px]"
      }
    >
      <style>{`
        @keyframes ownaiLaneScrollUp {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(0, -50%, 0);
          }
        }
        @keyframes ownaiLaneScrollDown {
          0% {
            transform: translate3d(0, -50%, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
      <div className="absolute left-1/2 top-1/2 grid h-[180%] w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] grid-cols-3 sm:grid-cols-4">
        {coverLanes.map((laneCovers, laneIndex) => {
          const movesUp = laneIndex % 2 === 0;
          const duration = 28 + laneIndex * 4;
          const laneLength = laneCovers.length;

          return (
            <div
              key={laneIndex}
              className={`relative h-full overflow-hidden border-l border-white/[0.07] ${laneIndex === 3 ? "hidden border-r sm:block" : ""}`}
            >
              <div
                className="flex flex-col gap-3 px-2.5 will-change-transform sm:gap-4 sm:px-3"
                style={{
                  animationName: movesUp ? "ownaiLaneScrollUp" : "ownaiLaneScrollDown",
                  animationDuration: `${duration}s`,
                  animationTimingFunction: "linear",
                  animationIterationCount: "infinite",
                }}
              >
                {[0, 1].map((group) => (
                  <div key={group} className="flex flex-col gap-3 pb-3 sm:gap-4 sm:pb-4" aria-hidden={group === 1}>
                    {laneCovers.length === 0
                      ? [0, 1, 2, 3].map((placeholderIdx) => (
                          <div
                            key={`placeholder-${group}-${laneIndex}-${placeholderIdx}`}
                            className="h-[150px] w-full shrink-0 rounded-[12px] border border-white/[0.06] bg-[linear-gradient(145deg,#10131c,#07090e)] sm:h-[190px] lg:h-[220px]"
                          />
                        ))
                      : laneCovers.map((cover, itemIndex) => {
                          // 动态随机点亮：每条轨道当前随机位置激活视频，播放完或定时接力给下一张
                          // disableVideo=true（认证页）时强制不播放视频，只展示封面
                          const shouldPlayVideo =
                            !disableVideo &&
                            group === 0 &&
                            Boolean(cover.videoUrl) &&
                            itemIndex === activeVideoPerLane[laneIndex] % Math.max(1, laneLength);

                          return (
                            <LoopMediaCard
                              key={`${group}-${laneIndex}-${cover.id}-${itemIndex}`}
                              videoUrl={shouldPlayVideo ? cover.videoUrl : undefined}
                              poster={cover.posterUrl}
                              label={cover.alt}
                              priority={hero && group === 0 && laneIndex < 2 && itemIndex === 0}
                              onVideoEnded={() => rotateLaneVideo(laneIndex, laneLength)}
                            />
                          );
                        })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoopMediaCard({
  videoUrl,
  poster,
  label,
  priority,
  onVideoEnded,
}: {
  videoUrl?: string;
  poster: string;
  label: string;
  priority: boolean;
  onVideoEnded?: () => void;
}) {
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsUnavailable(false);
    setHasVideoError(false);
  }, [poster, videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || hasVideoError) return;

    video.muted = true;
    video.defaultMuted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // 忽略受限策略
      });
    }
  }, [videoUrl, hasVideoError]);

  return (
    <div className="relative h-[150px] w-full shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-black shadow-[0_18px_42px_-28px_rgba(0,0,0,0.9)] sm:h-[190px] lg:h-[220px]">
      {videoUrl && !hasVideoError ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={poster}
          aria-label={label}
          autoPlay
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          onEnded={onVideoEnded}
          className="h-full w-full object-cover transition-opacity duration-300"
          onError={() => setHasVideoError(true)}
        />
      ) : poster && !isUnavailable ? (
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

const HOME_SHOWCASE_COUNT = 10;

function HomePromptShowcaseSection() {
  const requestUnlock = usePromptUnlock();
  const [items, setItems] = useState<SiteItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [promptDetail, setPromptDetail] = useState<PromptDetailState | null>(null);

  useResourceView(
    promptDetail?.item.sourceType === "artwork" ? "artwork" : "image_prompt",
    promptDetail?.item.id,
  );

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    async function loadShowcase() {
      try {
        const overview = await getArtworkHomeOverview({ signal: controller.signal });
        let latestItems: SiteItem[] = overview.items;
        if (latestItems.length === 0) {
          const fallback = await listHomeArtworks({
            current: 1,
            pageSize: HOME_SHOWCASE_COUNT,
            hotDays: 0,
            signal: controller.signal,
          });
          latestItems = fallback.items;
        }
        if (controller.signal.aborted) {
          return;
        }
        setItems(latestItems.slice(0, HOME_SHOWCASE_COUNT));
        setTotalCount(overview.totalCount ?? latestItems.length);
      } catch {
        // Ignore showcase fetch error on landing page
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadShowcase();

    return () => controller.abort();
  }, []);

  useEffect(
    () =>
      subscribeArtworkFavoriteChange((change) => {
        setItems((current) =>
          current.map((item) =>
            item.sourceType === "artwork" && String(item.id) === String(change.artworkId)
              ? {
                  ...item,
                  favorited: change.isFavorited,
                  favoriteCount: change.favoriteCount ?? item.favoriteCount,
                }
              : item,
          ),
        );
      }),
    [],
  );

  useEffect(
    () =>
      subscribePromptAccess((unlocked) => {
        const update = (item: SiteItem): SiteItem =>
          item.sourceType === "artwork" && item.id === String(unlocked.id)
            ? {
                ...item,
                canAccess: unlocked.canAccessPrompt,
                permanentlyUnlocked: unlocked.permanentlyUnlocked,
                pointsPrice: unlocked.pointsPrice,
              }
            : item;
        setItems((current) => current.map(update));
        setPromptDetail((current) =>
          current && current.item.sourceType === "artwork" && current.item.id === String(unlocked.id)
            ? {
                ...current,
                item: update(current.item),
                promptContent: unlocked.promptContent ?? "",
              }
            : current,
        );
      }),
    [],
  );

  const loadPromptContent = async (item: SiteItem) =>
    item.sourceType === "artwork"
      ? getArtworkPromptContent(item.id)
      : getPromptAssetPromptContent(item.id);

  const handlePromptOpen = async (item: SiteItem, imageAspectRatio: number) => {
    const isVertical = imageAspectRatio < 1;

    if (getArtworkAccessState(item) === "locked") {
      setPromptDetail({ imageAspectRatio, isVertical, item, promptContent: "" });
      return true;
    }

    try {
      const promptContent = await loadPromptContent(item);
      setPromptDetail({ imageAspectRatio, isVertical, item, promptContent });
      return true;
    } catch (error) {
      if (
        item.sourceType === "artwork" &&
        error instanceof RequestError &&
        [40101, 40300].includes(error.code ?? 0)
      ) {
        setPromptDetail({
          imageAspectRatio,
          isVertical,
          item: { ...item, canAccess: false },
          promptContent: "",
        });
        return true;
      }
      setMessage(error instanceof RequestError ? error.message : "提示词加载失败");
      return false;
    }
  };

  const handlePromptCopy = async (item: SiteItem) => {
    if (item.sourceType === "artwork" && getArtworkAccessState(item) === "locked") {
      await requestUnlock(item.id);
      return false;
    }
    try {
      const promptContent = await loadPromptContent(item);
      await navigator.clipboard.writeText(promptContent);
      void trackResource(
        item.sourceType === "artwork" ? "artwork" : "image_prompt",
        item.id,
        "copy",
      );
      return true;
    } catch (error) {
      if (
        item.sourceType === "artwork" &&
        error instanceof RequestError &&
        [40101, 40300].includes(error.code ?? 0)
      ) {
        await requestUnlock(item.id);
      } else {
        setMessage(error instanceof RequestError ? error.message : "提示词复制失败");
      }
      return false;
    }
  };

  return (
    <section className="border-t border-[var(--hero-border)] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="frontend-prompt-page mx-auto w-full max-w-[1720px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--chat-ink)] sm:text-[22px]">
              最新上架组件
            </h2>
            <p className="mt-1 text-[13px] text-[var(--chat-muted)]">
              最新发布的组件和对应提示词会优先展示在这里
            </p>
          </div>

          <Link
            to="/frontend-prompts"
            className="inline-flex h-8 shrink-0 items-center gap-1 self-start rounded-[8px] border border-[var(--chat-control-border)] bg-[var(--chat-control-soft)] px-3 text-[12px] font-semibold text-[var(--chat-ink)] transition-colors hover:border-[var(--chat-control-border-strong)] hover:bg-[var(--chat-control-hover)] sm:self-auto"
          >
            <span>浏览全部资源</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <PromptMasonry
              maxColumnCount={5}
              preferredColumnWidth={280}
              getItemHeight={(index) => (isVerticalCategoryPromptCard(index) ? 2 : 1)}
            >
              {Array.from({ length: HOME_SHOWCASE_COUNT }).map((_, index) => (
                <PromptCardSkeleton key={index} index={index} />
              ))}
            </PromptMasonry>
          ) : items.length ? (
            <>
              <PromptMasonry
                maxColumnCount={5}
                preferredColumnWidth={280}
                getItemHeight={(index) => getPromptCardEstimatedHeight(items[index], index)}
              >
                {items.map((item, index) => (
                  <PromptCard
                    key={item.id}
                    item={item}
                    index={index}
                    onCopy={handlePromptCopy}
                    onMessage={setMessage}
                    onOpen={handlePromptOpen}
                  />
                ))}
              </PromptMasonry>

              <div className="mt-7 flex justify-center">
                <Link
                  to="/frontend-prompts"
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--chat-control-border)] bg-[var(--chat-control-soft)] px-5 text-[13px] font-semibold text-[var(--chat-ink)] transition-colors hover:border-[var(--chat-control-border-strong)] hover:bg-[var(--chat-control-hover)]"
                >
                  <span>
                    浏览全部 {totalCount > 0 ? `${totalCount.toLocaleString("zh-CN")} 个` : ""}组件资源
                  </span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {message ? (
        <RequestErrorToast
          message={message}
          onClose={() => setMessage(null)}
          variant="chat"
        />
      ) : null}

      {promptDetail ? (
        <PromptDetailDialog
          detail={promptDetail}
          onClose={() => setPromptDetail(null)}
          onMessage={setMessage}
        />
      ) : null}
    </section>
  );
}

export function HomeLandingSections({ content }: { content: HomeContentVO }) {
  const { design, course } = content;

  return (
    <>
      <HomePromptShowcaseSection />

      <section className="border-y border-[var(--hero-border)] px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className="text-[30px] font-semibold tracking-[-0.045em] sm:text-[40px]">{design.title}</h2>
            <p className="mx-auto mt-4 text-[14px] leading-7 text-[var(--hero-muted)]">
              {design.description}
            </p>
            <SmartNavLink
              href={design.ctaPath}
              className="mt-5 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-medium text-[#171717] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              style={{ color: "#111111" }}
            >
              {design.ctaText}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </SmartNavLink>
          </div>

          <div className="mx-auto mt-10 max-w-[1040px] overflow-hidden rounded-[18px] border border-[var(--hero-border)] bg-[var(--hero-surface)] shadow-[0_30px_80px_-64px_rgba(0,0,0,0.78)]">
            <div className="relative aspect-video overflow-hidden bg-black">
              {design.demoVideoUrl ? (
                <video
                  key={design.demoVideoUrl}
                  src={design.demoVideoUrl}
                  poster={design.demoVideoPosterUrl}
                  aria-label="OwnAI Design 产品演示视频"
                  controls
                  playsInline
                  preload="none"
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

      <HomeMcpSection />

      <section className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
            <div>
              <p className="text-[11px] font-medium tracking-[0.16em] text-[var(--hero-muted)]">{course.eyebrow}</p>
              <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.045em] sm:text-[40px]">{course.title}</h2>
              <p className="mt-4 max-w-[440px] text-[14px] leading-7 text-[var(--hero-muted)]">
                {course.description}
              </p>
              <SmartNavLink
                href={course.ctaPath}
                className="mt-6 inline-flex h-9 items-center gap-2 rounded-[9px] bg-[var(--hero-ink)] px-3.5 text-[12px] font-medium text-[var(--hero-bg)] transition-opacity hover:opacity-86 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/20"
              >
                {course.ctaText}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </SmartNavLink>
            </div>

            <div className="border-t border-[var(--hero-border)]">
              {course.itemList.map((item, index) => (
                <SmartNavLink
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
                </SmartNavLink>
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
