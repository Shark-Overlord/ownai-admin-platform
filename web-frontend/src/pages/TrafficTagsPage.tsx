import { useCallback, useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  ExternalLink,
  Flame,
  Info,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Footer } from "@/components/home/Footer";
import { Navbar } from "@/components/home/Navbar";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import {
  compactButtonBase,
  compactButtonPrimary,
  compactButtonSecondary,
} from "@/lib/buttonStyles";
import {
  getTrafficTagOverview,
  type TrafficTagItem,
  type TrafficTagOverview,
  type TrafficTagSort,
} from "@/lib/traffic-tags";
import { cn } from "@/lib/utils";

const INITIAL_COUNT = 8;
const platforms = [
  { value: "all", label: "全部平台" },
  { value: "douyin", label: "抖音" },
  { value: "xiaohongshu", label: "小红书" },
];
const sorts: Array<{ value: TrafficTagSort; label: string }> = [
  { value: "default", label: "默认排序" },
  { value: "hot", label: "最热" },
  { value: "latest", label: "最新" },
];
const platformLabels: Record<string, string> = {
  all: "全部平台",
  douyin: "抖音",
  xiaohongshu: "小红书",
};
const statusConfig = {
  active: {
    label: "进行中",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  long_term: {
    label: "长期有效",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  upcoming: {
    label: "即将开始",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  expired: {
    label: "已失效",
    className: "bg-[var(--hero-ink)]/[0.06] text-[var(--hero-muted)] border-transparent",
  },
};

/** 抖音官方真实立体图标 */
export function DouyinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <rect width="32" height="32" rx="8" fill="#000000" />
      <g transform="translate(1.5, 0.5)">
        <path
          d="M19 8.2a4.4 4.4 0 0 1-3.2-2.8V4.3h-2.8v11a2.3 2.3 0 1 1-2.3-2.3c.3 0 .6.1.8.2V10.4a5.1 5.1 0 0 0-.8-.1 5.1 5.1 0 1 0 5.1 5.1V10.3a7.3 7.3 0 0 0 3.8 1.1V8.6a4.4 4.4 0 0 1-.6-.4z"
          fill="#FE2C55"
        />
        <path
          d="M18.2 7.4a4.4 4.4 0 0 1-3.2-2.8V3.5h-2.8v11a2.3 2.3 0 1 1-2.3-2.3c.3 0 .6.1.8.2V9.6a5.1 5.1 0 0 0-.8-.1 5.1 5.1 0 1 0 5.1 5.1V9.5a7.3 7.3 0 0 0 3.8 1.1V7.8a4.4 4.4 0 0 1-.6-.4z"
          fill="#25F4EE"
        />
        <path
          d="M18.6 7.8a4.4 4.4 0 0 1-3.2-2.8V3.9h-2.8v11a2.3 2.3 0 1 1-2.3-2.3c.3 0 .6.1.8.2V10a5.1 5.1 0 0 0-.8-.1 5.1 5.1 0 1 0 5.1 5.1V9.9a7.3 7.3 0 0 0 3.8 1.1V8.2a4.4 4.4 0 0 1-.6-.4z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}

/** 小红书官方真实品牌图标 */
export function XiaohongshuIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <rect width="32" height="32" rx="8" fill="#FF2442" />
      <text
        x="16"
        y="20.5"
        fill="#FFFFFF"
        fontSize="10.5"
        fontWeight="800"
        textAnchor="middle"
        letterSpacing="-0.3px"
        fontFamily="-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif"
      >
        小红书
      </text>
    </svg>
  );
}

function formatTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function extractIncentive(requirements: string[], description: string): string | null {
  const combined = [...requirements, description].join(" ");
  if (!combined) return null;
  const keywords = ["播放量激励", "流量激励", "播放激励", "播放量扶持", "流量扶持", "现金激励", "创作激励"];
  for (const kw of keywords) {
    const idx = combined.indexOf(kw);
    if (idx !== -1) {
      const start = Math.max(0, idx - 8);
      const snippet = combined.slice(start, idx + kw.length).trim();
      const numMatch = snippet.match(/(\d+[\d~至\-万\+]*\s*[\u4e00-\u9fa5]+)/);
      return numMatch ? numMatch[1] : kw;
    }
  }
  return null;
}

function TrafficTagCard({ item }: { item: TrafficTagItem }) {
  const [copied, setCopied] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[item.status] || statusConfig.expired;

  const incentive = useMemo(
    () => extractIncentive(item.requirements, item.description),
    [item.requirements, item.description],
  );

  const ruleText = [...item.requirements, item.description].filter(Boolean).join(" ");
  const hasLongContent = ruleText.length > 50 || item.requirements.length > 1;

  const copyTags = async () => {
    const textToCopy = item.tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const copySingleTag = async (tag: string) => {
    const formatted = tag.startsWith("#") ? tag : `#${tag}`;
    await navigator.clipboard.writeText(formatted);
    setCopiedTag(tag);
    window.setTimeout(() => setCopiedTag(null), 1400);
  };

  return (
    <article className="group flex h-full flex-col justify-between rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 shadow-xs transition-all hover:border-[var(--hero-border-strong)] sm:p-5">
      <div>
        {/* 顶栏：左侧平台/分类/状态，右侧紧凑一键复制 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {item.platform === "douyin" ? (
              <DouyinIcon className="h-4 w-4 shrink-0 rounded-[4px]" />
            ) : item.platform === "xiaohongshu" ? (
              <XiaohongshuIcon className="h-4 w-4 shrink-0 rounded-[4px]" />
            ) : null}
            <span className="truncate text-xs font-mono text-[var(--hero-muted)]">
              {platformLabels[item.platform] || item.platform} / {item.category}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-[6px] border px-2 py-0.5 text-[11px] font-medium",
                status.className,
              )}
            >
              {status.label}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void copyTags()}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer",
              copied
                ? "border-[var(--hero-border)] bg-white/10 text-white font-medium"
                : "border-[var(--hero-border)] bg-[var(--hero-bg)]/80 text-[var(--hero-ink)] hover:border-[var(--hero-border-strong)] hover:bg-[var(--hero-bg)]",
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-white" />
                <span className="text-white">已复制</span>
              </>
            ) : (
              <>
                <Clipboard className="h-3 w-3 text-[var(--hero-muted)]" />
                <span>一键复制 ({item.tags.length})</span>
              </>
            )}
          </button>
        </div>

        {/* 标题 */}
        <h2 className="mt-3 text-[16px] font-bold leading-snug tracking-tight text-[var(--hero-ink)]">
          {item.title}
        </h2>

        {/* 核心激励提炼与元数据行 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {incentive && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
              🎁 {incentive}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--hero-muted)]">
            🗓️ {item.dateLabel || status.label}
          </span>
          <span className="text-[var(--hero-border-strong)]">·</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#EF7B43]">
            <Flame className="h-3 w-3 fill-current" />
            热度 {item.heat >= 999 ? "999+" : item.heat}
          </span>
        </div>

        {/* 扁平轻量标签流（解套化：直接平铺展示，点击单独复制） */}
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => {
            const displayTag = tag.startsWith("#") ? tag : `#${tag}`;
            const isTagCopied = copiedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                title="点击单独复制此标签"
                onClick={() => void copySingleTag(tag)}
                className={cn(
                  "group flex items-center gap-1.5 cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-mono transition-all select-none",
                  isTagCopied
                    ? "border-[var(--hero-border)] bg-white/10 text-white font-medium"
                    : "border-[var(--hero-border)] bg-[var(--hero-bg)]/60 text-[var(--hero-ink)] hover:border-[var(--hero-border-strong)] hover:bg-[var(--hero-bg)]",
                )}
              >
                <span>{isTagCopied ? "已复制" : displayTag}</span>
                {!isTagCopied && (
                  <Copy className="h-3 w-3 text-[var(--hero-muted)] opacity-50 group-hover:opacity-100 group-hover:text-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* 规则与要求说明（限高 2 行，左右卡片高度规整统一，长内容可展开） */}
        {(item.requirements.length > 0 || item.description) && (
          <div className="mt-3.5 rounded-xl border border-[var(--hero-border)]/50 bg-[var(--hero-bg)]/40 p-3 text-xs leading-relaxed text-[var(--hero-muted)]">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--hero-ink)]/90">
                参与要求与说明
              </span>
              {hasLongContent && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="cursor-pointer text-[11px] font-mono text-[var(--hero-muted)] transition-colors hover:text-[var(--hero-ink)]"
                >
                  {expanded ? "收起 ▴" : "展开详情 ▾"}
                </button>
              )}
            </div>
            <div className={cn(!expanded && "line-clamp-2")}>
              {item.requirements.length > 0 && (
                <span className="text-[var(--hero-ink)]/80">
                  {item.requirements.join(" · ")}
                  {item.description ? "；" : ""}
                </span>
              )}
              {item.description && <span>{item.description}</span>}
            </div>
          </div>
        )}
      </div>

      {/* 底部信息栏 */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--hero-border)] pt-3 text-[11px] text-[var(--hero-muted)] font-mono">
        <span>更新于 {formatTime(item.sourceUpdatedTime)}</span>
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex shrink-0 items-center gap-1 text-[var(--hero-muted)] hover:text-[var(--hero-ink)] hover:underline"
          >
            去{platformLabels[item.platform] || item.platform}查看 <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}

export function TrafficTagsPage() {
  const [data, setData] = useState<TrafficTagOverview | null>(null);
  const [platform, setPlatform] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<TrafficTagSort>("default");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // 客服弹窗状态
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [wechatCopied, setWechatCopied] = useState(false);

  const handleCopyWechat = async () => {
    await navigator.clipboard.writeText("xh1092968780");
    setWechatCopied(true);
    window.setTimeout(() => setWechatCopied(false), 1800);
  };

  useDocumentMeta(
    "自媒体流量标签｜OwnAI",
    "整理抖音、小红书、公众号和即刻的 AI 内容流量标签、活动要求与有效期。",
    { canonical: "https://ownai.icu/traffic-tags" },
  );

  // 保持上方主推展台固定（不受下方筛选器/排序器的切换影响）
  const [pinnedOverview, setPinnedOverview] = useState<TrafficTagOverview | null>(null);

  const loadData = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getTrafficTagOverview(
      {
        platform: platform === "all" ? undefined : platform,
        category: category === "all" ? undefined : category,
        sort,
      },
      controller.signal,
    )
      .then((res) => {
        setData(res);
        setPinnedOverview((prev) => {
          if (!prev || (platform === "all" && category === "all" && sort === "default")) {
            return res;
          }
          return prev;
        });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "流量标签加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [platform, category, sort]);

  useEffect(() => {
    const abort = loadData();
    return () => abort?.();
  }, [loadData]);

  const baseOverview = pinnedOverview || data;

  const categories = useMemo(() => {
    const counts = baseOverview?.categoryCounts || {};
    const entries = Object.entries(counts).filter(([key]) => key !== "all");
    return [
      { value: "all", label: "全部分类", count: counts.all || baseOverview?.items.length || 0 },
      ...entries.map(([value, count]) => ({ value, label: value, count })),
    ];
  }, [baseOverview]);

  const visibleItems = showAll ? data?.items || [] : (data?.items || []).slice(0, INITIAL_COUNT);

  // 双平台固定主推热门活动（不受下方筛选影响，保持全局展示）
  const topDouyin = useMemo(
    () => baseOverview?.items.find((i) => i.platform === "douyin"),
    [baseOverview],
  );
  const topXiaohongshu = useMemo(
    () => baseOverview?.items.find((i) => i.platform === "xiaohongshu"),
    [baseOverview],
  );
  const douyinTotalCount = baseOverview?.platformCounts?.douyin || 13;
  const xiaohongshuTotalCount = baseOverview?.platformCounts?.xiaohongshu || 3;

  return (
    <div className="min-h-screen bg-[var(--hero-bg)] text-[var(--hero-ink)]">
      <Navbar />

      {/* 顶部紧凑留白（pt-18 sm:pt-20，摒弃过大空白，与 CodexReset 对齐） */}
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-18 sm:px-6 sm:pt-20 lg:px-8">
        {/* 顶部标题区（对齐 CodexReset 规范，放置抖音与小红书真实官方图标徽章） */}
        <div className="flex flex-col gap-4 border-b border-[var(--hero-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3.5">
            {/* 真实平台独立图标展示 */}
            <div className="flex items-center gap-2.5 shrink-0">
              <DouyinIcon className="h-10 w-10 rounded-xl shadow-xs" />
              <XiaohongshuIcon className="h-10 w-10 rounded-xl shadow-xs" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--hero-ink)] sm:text-3xl">
                  自媒体流量标签
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  抖音 & 小红书实时收录
                </span>
              </div>
              <p className="text-xs text-[var(--hero-muted)] sm:text-sm">
                实时追踪官方最新 AI 流量扶持活动与热门标签，复制即可快速粘贴至文案
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadData()}
              className={cn(compactButtonBase, compactButtonSecondary, "h-8.5 text-xs shadow-xs gap-1.5")}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span>刷新</span>
            </button>
          </div>
        </div>

        {/* 内容主体与双侧吸顶广告（广告起始对齐分割线下方首排卡片顶线） */}
        <div className="relative mt-6 space-y-5">
          {/* 左侧大屏垂直广告位 (纯单色、无嵌套、白色咨询按钮) */}
          <div className="hidden min-[1560px]:block absolute -left-[270px] min-[1780px]:-left-[314px] top-0 bottom-0 w-[250px] min-[1780px]:w-[290px] pointer-events-none">
            <div className="sticky top-6 pointer-events-auto flex flex-col justify-between h-[520px] rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 shadow-xs transition-all hover:border-[var(--hero-border-strong)] select-none">
              <div className="flex items-center justify-between border-b border-[var(--hero-border)] pb-3 text-xs font-mono">
                <span className="font-semibold text-[var(--hero-ink)] tracking-wider">SPONSOR 01</span>
                <span className="text-[11px] text-[var(--hero-muted)]">招租中</span>
              </div>

              <div className="my-auto flex items-center justify-center text-center">
                <span className="text-sm font-semibold tracking-wider text-[var(--hero-ink)]">
                  广告位
                </span>
              </div>

              <div className="pt-3 border-t border-[var(--hero-border)]">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(true)}
                  className={cn(
                    compactButtonBase,
                    compactButtonPrimary,
                    "w-full h-8 text-xs cursor-pointer font-medium gap-1.5 shadow-xs",
                  )}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>咨询</span>
                </button>
              </div>
            </div>
          </div>

          {/* 右侧大屏垂直广告位 (纯单色、无嵌套、白色咨询按钮) */}
          <div className="hidden min-[1560px]:block absolute -right-[270px] min-[1780px]:-right-[314px] top-0 bottom-0 w-[250px] min-[1780px]:w-[290px] pointer-events-none">
            <div className="sticky top-6 pointer-events-auto flex flex-col justify-between h-[520px] rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 shadow-xs transition-all hover:border-[var(--hero-border-strong)] select-none">
              <div className="flex items-center justify-between border-b border-[var(--hero-border)] pb-3 text-xs font-mono">
                <span className="font-semibold text-[var(--hero-ink)] tracking-wider">SPONSOR 02</span>
                <span className="text-[11px] text-[var(--hero-muted)]">虚位以待</span>
              </div>

              <div className="my-auto flex items-center justify-center text-center">
                <span className="text-sm font-semibold tracking-wider text-[var(--hero-ink)]">
                  广告位
                </span>
              </div>

              <div className="pt-3 border-t border-[var(--hero-border)]">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(true)}
                  className={cn(
                    compactButtonBase,
                    compactButtonPrimary,
                    "w-full h-8 text-xs cursor-pointer font-medium gap-1.5 shadow-xs",
                  )}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>咨询</span>
                </button>
              </div>
            </div>
          </div>

          {/* 上半部分双平台主推卡片（仿 CodexReset 的 5-col / 7-col 双卡排布） */}
          <div className="grid gap-5 lg:grid-cols-12">
            {/* 左卡：抖音 AI 专区置顶 (5 cols) */}
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 sm:p-6 shadow-xs lg:col-span-5">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--hero-border)] pb-3.5">
                  <div className="flex items-center gap-2">
                    <DouyinIcon className="h-6 w-6 rounded-lg shadow-xs" />
                    <span className="text-sm font-bold text-[var(--hero-ink)]">抖音 AI 热门</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-500 border border-emerald-500/20">
                    在榜 {douyinTotalCount} 个活动
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-[var(--hero-muted)] font-mono">平台主推</span>
                  <h3 className="mt-1 text-base font-bold text-[var(--hero-ink)] leading-snug">
                    {topDouyin?.title || "抖音 AI 创作热潮活动"}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--hero-muted)] line-clamp-2">
                    {topDouyin?.description || "参与抖音官方 AI 内容激励计划，携带话题发布即可进入精准流量池。"}
                  </p>
                </div>

                {topDouyin?.tags && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {topDouyin.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-[6px] border border-[var(--hero-border)] bg-[var(--hero-bg)]/60 px-2 py-0.5 text-[11px] font-mono text-[var(--hero-ink)]"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[var(--hero-border)] pt-3 text-[11px] text-[var(--hero-muted)] font-mono">
                <span className="inline-flex items-center gap-1 text-[#EF7B43]">
                  <Flame className="h-3 w-3 fill-current" />
                  热度 {topDouyin?.heat || 695}
                </span>
                {topDouyin?.sourceUrl ? (
                  <a
                    href={topDouyin.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 hover:text-[var(--hero-ink)] hover:underline"
                  >
                    去抖音查看 <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span>官方扶持活动</span>
                )}
              </div>
            </div>

            {/* 右卡：小红书 AI 灵感季主推 (7 cols) */}
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 sm:p-6 shadow-xs lg:col-span-7">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--hero-border)] pb-3.5">
                  <div className="flex items-center gap-2">
                    <XiaohongshuIcon className="h-6 w-6 rounded-lg shadow-xs" />
                    <span className="text-sm font-bold text-[var(--hero-ink)]">小红书 AI 灵感</span>
                  </div>
                  <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-500 border border-blue-500/20">
                    在榜 {xiaohongshuTotalCount} 个活动
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-[var(--hero-muted)] font-mono">灵感精选</span>
                  <h3 className="mt-1 text-base font-bold text-[var(--hero-ink)] leading-snug">
                    {topXiaohongshu?.title || "小红书数字艺术灵感季"}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--hero-muted)] line-clamp-2">
                    {topXiaohongshu?.description || "小红书视觉/绘画类创作者扶持计划，封面高清、带完整参数解析即可获笔记曝光。"}
                  </p>
                </div>

                {topXiaohongshu?.tags && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {topXiaohongshu.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-[6px] border border-[var(--hero-border)] bg-[var(--hero-bg)]/60 px-2 py-0.5 text-[11px] font-mono text-[var(--hero-ink)]"
                      >
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[var(--hero-border)] pt-3 text-[11px] text-[var(--hero-muted)] font-mono">
                <span className="inline-flex items-center gap-1 text-[#EF7B43]">
                  <Flame className="h-3 w-3 fill-current" />
                  热度 {topXiaohongshu?.heat || 850}
                </span>
                {topXiaohongshu?.sourceUrl ? (
                  <a
                    href={topXiaohongshu.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 hover:text-[var(--hero-ink)] hover:underline"
                  >
                    去小红书查看 <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span>长期有效专区</span>
                )}
              </div>
            </div>
          </div>


          {/* 下半部分：筛选工具条 + 标签列表流 */}
          <div className="space-y-4">
            {/* 结构化筛选工具栏 */}
            <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4 sm:p-5 space-y-3.5 shadow-xs">
              {/* 顶层：平台分段选择器（内嵌真实图标） + 排序器 */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hero-border)] pb-3.5">
                <div className="inline-flex rounded-xl border border-[var(--hero-border)] bg-[var(--hero-bg)]/50 p-1">
                  {platforms.map((item) => {
                    const isActive = platform === item.value;
                    const count =
                      item.value === "all"
                        ? baseOverview?.items.length || 0
                        : baseOverview?.platformCounts?.[item.value] || 0;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setPlatform(item.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer",
                          isActive
                            ? "bg-[var(--hero-ink)] text-[var(--hero-bg)] shadow-xs"
                            : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]",
                        )}
                      >
                        {item.value === "douyin" ? (
                          <DouyinIcon className="h-3.5 w-3.5 rounded-[3px]" />
                        ) : item.value === "xiaohongshu" ? (
                          <XiaohongshuIcon className="h-3.5 w-3.5 rounded-[3px]" />
                        ) : null}
                        <span>{item.label}</span>
                        <span className="font-mono text-[10px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* 排序器 */}
                <div className="flex items-center gap-1 rounded-xl border border-[var(--hero-border)] bg-[var(--hero-bg)]/50 p-1">
                  <span className="text-[11px] text-[var(--hero-muted)] font-mono px-1.5">排序</span>
                  {sorts.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSort(item.value)}
                      className={cn(
                        "h-6.5 rounded-lg px-2.5 text-[11px] font-medium transition-colors cursor-pointer",
                        sort === item.value
                          ? "bg-[var(--hero-ink)] text-[var(--hero-bg)] shadow-xs"
                          : "text-[var(--hero-muted)] hover:text-[var(--hero-ink)]",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 底层：分类细分过滤 */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-mono text-[var(--hero-muted)] mr-1.5">分类:</span>
                {categories.map((item) => {
                  const isActive = category === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCategory(item.value)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs transition-colors cursor-pointer",
                        isActive
                          ? "border-[var(--hero-border-strong)] bg-[var(--hero-ink)] text-[var(--hero-bg)] font-medium shadow-xs"
                          : "border-[var(--hero-border)] bg-[var(--hero-bg)]/40 text-[var(--hero-muted)] hover:border-[var(--hero-border-strong)] hover:text-[var(--hero-ink)]",
                      )}
                    >
                      {item.label}
                      <span className="ml-1 font-mono text-[10px] opacity-65">({item.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 内容卡片区 */}
            {loading && !data ? (
              <div className="flex min-h-[360px] items-center justify-center gap-2 text-[13px] text-[var(--hero-muted)]">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>正在加载流量标签…</span>
              </div>
            ) : error && !data ? (
              <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-10 text-center shadow-xs">
                <Search className="mx-auto h-6 w-6 text-[var(--hero-muted)]" />
                <p className="mt-3 text-[13px] text-[var(--hero-muted)]">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadData()}
                  className={cn(compactButtonBase, compactButtonSecondary, "mt-4 h-8 px-3 text-[12px]")}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>重新加载</span>
                </button>
              </div>
            ) : (
              <>
                <div className={cn("grid gap-4 md:grid-cols-2", loading && "opacity-60")}>
                  {visibleItems.map((item) => (
                    <TrafficTagCard key={item.id} item={item} />
                  ))}
                </div>

                {!loading && visibleItems.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--hero-border)] py-16 text-center text-[13px] text-[var(--hero-muted)]">
                    当前筛选条件下暂无活动与标签
                  </div>
                )}

                {!showAll && (data?.items.length || 0) > INITIAL_COUNT && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className={cn(
                        compactButtonBase,
                        compactButtonSecondary,
                        "h-9 px-4 text-[12px] gap-2 cursor-pointer shadow-xs",
                      )}
                    >
                      <span>显示更多</span>
                      <span className="font-mono text-[10px] opacity-65">
                        +{(data?.items.length || 0) - INITIAL_COUNT} 条
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* 常见问题区 */}
            <section className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-6 shadow-xs">
              <h2 className="text-base font-bold tracking-tight text-[var(--hero-ink)] mb-4">
                常见问题解答
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "这些标签有什么作用？",
                    "它们用于补充平台对作品赛道与风格的识别，也能帮助你参与官方正在进行的流量扶持活动。",
                  ],
                  [
                    "使用标签就一定有流量吗？",
                    "不能保证。标签只是分发与打标信号之一，内容质量、完播率与发布时间同样至关重要。",
                  ],
                  [
                    "怎样选择合适的标签？",
                    "建议选择 3~5 个与内容高度强相关的标签，避免无关标签堆叠被平台判定为恶意营销。",
                  ],
                  [
                    "活动标签过期后还能用吗？",
                    "已失效标签保留供参考。若要获取活动扶持曝光，应优先参与进行中或长期有效的活动。",
                  ],
                ].map(([question, answer]) => (
                  <div
                    key={question}
                    className="rounded-xl border border-[var(--hero-border)] bg-[var(--hero-bg)]/40 p-4"
                  >
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--hero-ink)]">
                      <Info className="h-3.5 w-3.5 text-[var(--hero-muted)] shrink-0" />
                      <span>{question}</span>
                    </p>
                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--hero-muted)]">
                      {answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* 统一联系客服弹窗（同款纯黑卡片、xh1092968780 复制） */}
      <DialogPrimitive.Root open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-[3px]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[100] w-[calc(100%-32px)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-white/10 bg-[#171717] p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.48)] focus:outline-none">
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="关闭客服窗口"
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
              <MessageCircle className="h-5 w-5" />
            </div>
            <DialogPrimitive.Title className="mt-5 text-[20px] font-semibold">
              联系客服
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-[13px] leading-6 text-white/58">
              购买广告位或合作咨询，可以添加微信联系解决。
            </DialogPrimitive.Description>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-[10px] border border-white/10 bg-white/[0.045] px-4 py-3">
              <div>
                <p className="text-[11px] text-white/45">微信号</p>
                <p className="mt-1 text-[15px] font-medium text-white">xh1092968780</p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyWechat()}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-white px-3 text-[12px] font-semibold text-black transition-colors hover:bg-white/88"
              >
                {wechatCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {wechatCopied ? "已复制" : "复制"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <Footer />
    </div>
  );
}
