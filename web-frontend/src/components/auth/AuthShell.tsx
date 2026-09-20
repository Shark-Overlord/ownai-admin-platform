import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { DiagonalVideoGallery } from "@/components/home/HomeLandingSections";
import {
  getHomeContent,
  DEFAULT_HOME_CONTENT,
  type HomeVideoItem,
} from "@/lib/home-content";

interface AuthShellProps {
  switchLabel: string;
  switchCta: string;
  switchTo: string;
  children: ReactNode;
}

const STATIC_AUTH_COVERS: HomeVideoItem[] = [
  {
    id: "hero-video-1",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/zJgmZZw4-ownai-ecovolta-v2-hero.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/L3mHf2tM-ownai-ecovolta-v2-hero.png",
    alt: "前端界面演示 1",
    sort: 1,
  },
  {
    id: "hero-video-2",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/hEMk8maf-ownai-lumina-bloom.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/nxN8xBVQ-cover.png",
    alt: "前端界面演示 2",
    sort: 2,
  },
  {
    id: "hero-video-3",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/t3r8Whg4-ownai-commerce-pulse.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/FTVqI28w-cover.png",
    alt: "前端界面演示 3",
    sort: 3,
  },
  {
    id: "hero-video-4",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/3GDV3VYs-sea-serenade.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/Zb0Nzz2h-sea-serenade.jpg",
    alt: "前端界面演示 4",
    sort: 4,
  },
  {
    id: "hero-video-5",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/ZM8BhgQo-prompt-hero.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/j6yfwlCz-prompt-hero.jpg",
    alt: "前端界面演示 5",
    sort: 5,
  },
  {
    id: "hero-video-6",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/GWpxBRBO-mythic-vpn.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/tSV0snaj-mythic-vpn.jpg",
    alt: "前端界面演示 6",
    sort: 6,
  },
  {
    id: "hero-video-7",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/6a6UBNqi-ownai-qixi-romance-static.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/zaOsgkeD-ownai-qixi-romance-static.png",
    alt: "前端界面演示 7",
    sort: 7,
  },
  {
    id: "hero-video-8",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/9tRjOg39-PixPin_2026-08-07_19-35-53.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/R9EsuRSb-PixPin_2026-08-07_20-05-37.png",
    alt: "前端界面演示 8",
    sort: 8,
  },
  {
    id: "hero-video-9",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/w2pKJsKU-fun-404-page.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/vbWMSO2r-fun-404-page.jpg",
    alt: "前端界面演示 9",
    sort: 9,
  },
  {
    id: "hero-video-10",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/OSnIuGG6-performance-run.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/8loYy4o7-performance-run.jpg",
    alt: "前端界面演示 10",
    sort: 10,
  },
  {
    id: "hero-video-11",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/5tERukoI-pixel-muse.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/j9TUBvuJ-pixel-muse.jpg",
    alt: "前端界面演示 11",
    sort: 11,
  },
  {
    id: "hero-video-12",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_video/1/GrCxqMq3-oyla.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/artwork_cover/1/hKtw95OO-oyla.jpg",
    alt: "前端界面演示 12",
    sort: 12,
  },
  {
    id: "bg-video-13",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/HHOS4qB4-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820622196858881-cover.jpg",
    alt: "Bio Age Dashboard",
    sort: 13,
  },
  {
    id: "bg-video-14",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/ZKASz6A4-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820600797519873-cover.jpg",
    alt: "Aurora Onboard",
    sort: 14,
  },
  {
    id: "bg-video-15",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/5uZux1k5-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820584586534914-cover.jpg",
    alt: "AI Automation",
    sort: 15,
  },
  {
    id: "bg-video-16",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/4gwROcbt-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820567394082817-cover.jpg",
    alt: "Aerocore Tech",
    sort: 16,
  },
  {
    id: "bg-video-17",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/YnZpzcsg-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820550616866818-cover.jpg",
    alt: "Cobalt Hero",
    sort: 17,
  },
  {
    id: "bg-video-18",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/jmO4h1yu-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820509034536961-cover.jpg",
    alt: "Print Archive",
    sort: 18,
  },
  {
    id: "bg-video-19",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/s4RqdL6V-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820345616064514-cover.jpg",
    alt: "3D Studio Pricing",
    sort: 19,
  },
  {
    id: "bg-video-20",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/XsYJ4CPJ-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820330730479618-cover.jpg",
    alt: "3D Story Space",
    sort: 20,
  },
  {
    id: "bg-video-21",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/Nx1edQft-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820317098991618-cover.jpg",
    alt: "Cargo Logistics",
    sort: 21,
  },
  {
    id: "bg-video-22",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/oNHj60D4-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820305048756226-cover.jpg",
    alt: "Build With Us",
    sort: 22,
  },
  {
    id: "bg-video-23",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/V3Vzq5aG-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820281053143042-cover.jpg",
    alt: "Bionova Dark",
    sort: 23,
  },
  {
    id: "bg-video-24",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/0vrR6SKO-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820267904000001-cover.jpg",
    alt: "Bionova Light",
    sort: 24,
  },
  {
    id: "bg-video-25",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/vKxPL5Dg-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820258072551425-cover.jpg",
    alt: "Bionova Motion",
    sort: 25,
  },
  {
    id: "bg-video-26",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/Y4apB9su-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820244793384962-cover.jpg",
    alt: "Bio Active",
    sort: 26,
  },
  {
    id: "bg-video-27",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/f9Ta5X1R-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820215353565186-cover.jpg",
    alt: "Benefits Features",
    sort: 27,
  },
  {
    id: "bg-video-28",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/dd97efCW-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820201344589826-cover.jpg",
    alt: "Beauty Categories",
    sort: 28,
  },
  {
    id: "bg-video-29",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/O3M7kUir-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820183057424386-cover.jpg",
    alt: "Auramail UI",
    sort: 29,
  },
  {
    id: "bg-video-30",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/Rkn4NViV-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820135967973378-cover.jpg",
    alt: "ASME Hero",
    sort: 30,
  },
  {
    id: "bg-video-31",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/JEdcKcHY-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820113469726721-cover.jpg",
    alt: "AI Workflow",
    sort: 31,
  },
  {
    id: "bg-video-32",
    videoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_preview/1/OEZVQuO5-preview.mp4",
    posterUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_cover/1/2086820092871499778-cover.jpg",
    alt: "AI Designer Agency",
    sort: 32,
  },
];

export function AuthShell({
  switchLabel,
  switchCta,
  switchTo,
  children,
}: AuthShellProps) {
  // 丰富视频库池：默认 32 个真实高清视频与封面，4 轨正交轮播，永不相邻重复
  const [videos, setVideos] = useState<HomeVideoItem[]>(STATIC_AUTH_COVERS);

  useEffect(() => {
    const controller = new AbortController();

    void getHomeContent(controller.signal)
      .then((res) => {
        if (res?.hero?.videoList && res.hero.videoList.length > 0) {
          // 安全合并最新数据，避免池子缩水
          setVideos((current) => {
            const map = new Map<string, HomeVideoItem>();
            current.forEach((item) => map.set(item.id, item));
            res.hero.videoList.forEach((item) => map.set(item.id, item));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {
        // 网络异常时稳定保持内置 32 个作品列表
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="relative min-h-[100svh] bg-[var(--hero-bg)] text-[var(--hero-ink)] overflow-x-hidden">
      {/* 全屏左右分栏网格：左侧极简纯粹动态作品画廊 (>= 1024px) | 右侧表单操作区 */}
      <div className="min-h-[100svh] flex flex-col lg:grid lg:grid-cols-12">
        {/* 左侧：首页同款倾斜 24° 动态交错无限滚动画廊 + 经典居中文案 */}
        <aside className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col items-center justify-center border-r border-[var(--hero-border)] bg-[#050505] p-8 xl:p-12 overflow-hidden select-none">
          {/* 首页同款倾斜动态网格画廊 */}
          <DiagonalVideoGallery hero videos={videos} disableVideo />

          {/* 轻透暗夜遮罩：通透明亮，让精美封面清晰生动 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] bg-black/35"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]"
          />

          {/* 左上角品牌 Logo 与 OwnAI 标识（无磨砂底色，32*32 大图标，首页同款连笔字） */}
          <div className="absolute top-8 xl:top-10 left-8 xl:left-10 z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:outline-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
              aria-label="返回首页"
            >
              <img
                src="/images/ownai-logo.webp"
                alt="OwnAI"
                className="h-8 w-8 object-contain shrink-0"
                style={{ width: "32px", height: "32px" }}
                draggable={false}
              />
              <span className="home-ownai-wordmark text-[28px] text-white leading-none">
                ownai
              </span>
            </Link>
          </div>

          {/* 居中文案（大幅加大字号，气势磅礴，立体投影确保对比度） */}
          <div className="relative z-[2] mx-auto flex w-full max-w-[800px] flex-col items-center text-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] px-6">
            <p className="font-semibold tracking-[0.2em] uppercase text-white/90 text-[16px] xl:text-[19px]">
              制作 · 收集 · 整理
            </p>

            <h1 className="mt-5 text-center text-[44px] xl:text-[58px] 2xl:text-[68px] font-extrabold leading-[1.08] tracking-[-0.03em] text-white">
              500+ 精美前端提示词
            </h1>

            <p className="mt-5 max-w-[660px] text-center text-[17px] xl:text-[21px] leading-relaxed font-normal tracking-[0.02em] text-white/90">
              覆盖页面、组件与动效交互，为界面复刻与产品开发提供创作起点
            </p>
          </div>
        </aside>

        {/* 右侧：表单操作区（纯粹嵌入式排版，使用指定的 #171717 背景色） */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between min-h-[100svh] bg-[#171717] text-white p-6 sm:p-8 lg:p-12">
          {/* 右侧顶栏：移动端 Logo + 返回首页 + 极简登录/注册切换 */}
          <header className="flex items-center justify-between gap-4 w-full max-w-[400px] mx-auto pb-4">
            {/* 移动端 Logo (桌面端隐藏) */}
            <div className="lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-1">
                  <img
                    src="/images/ownai-logo.webp"
                    alt="OwnAI"
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                </div>
                <span className="text-[13px] font-semibold text-[var(--hero-ink)]">
                  OwnAI
                </span>
              </Link>
            </div>

            {/* 桌面端返回首页快捷按钮 */}
            <div className="hidden lg:block">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>返回首页</span>
              </Link>
            </div>

            {/* 极简切换链接：自然融入排版，不单独用突兀高亮色块 */}
            <div className="flex items-center gap-1.5 text-[13px]">
              <span className="hidden sm:inline text-zinc-400">
                {switchLabel}
              </span>
              <Link
                to={switchTo}
                className="font-medium text-white underline underline-offset-4 transition-opacity hover:opacity-80"
              >
                {switchCta}
              </Link>
            </div>
          </header>

          {/* 表单主体（垂直居中，完全嵌入） */}
          <main className="my-auto w-full max-w-[400px] mx-auto py-8">
            {children}
          </main>

          {/* 底部极简声明 */}
          <footer className="w-full max-w-[400px] mx-auto pt-4 text-center text-[11px] text-zinc-500">
            <span>© OwnAI · 工业级前端工程与设计解构平台</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
