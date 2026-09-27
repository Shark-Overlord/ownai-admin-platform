import { useCallback, useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Copy,
  ExternalLink,
  History,
  MessageCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { Footer } from "@/components/home/Footer";
import { Navbar } from "@/components/home/Navbar";
import {
  getCodexResetOverview,
  type CodexResetKind,
  type CodexResetOverview,
  type CodexResetSignal,
} from "@/lib/codex-reset";
import {
  compactButtonBase,
  compactButtonPrimary,
  compactButtonSecondary,
} from "@/lib/buttonStyles";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_ANNOUNCEMENT_COUNT = 8;
const NOTIFICATION_KEY = "ownai.codexReset.notificationEnabled";
const LAST_SIGNAL_KEY = "ownai.codexReset.lastSignalId";
const WEEKS_COUNT = 30; // 30 周自然跨越 3 月至 9 月，自然平铺填满右侧卡片宽度，无任何右侧死角与多余空白
const MONO_SCALE: Record<
  CodexResetKind,
  { text: string; bg: string; dot: string }
> = {
  reset: {
    text: "全员重置",
    bg: "bg-[var(--hero-ink)] hover:opacity-90 shadow-[0_0_8px_rgba(255,255,255,0.25)]",
    dot: "bg-[var(--hero-ink)]",
  },
  reset_card: {
    text: "发重置卡",
    bg: "bg-[#EF7B43] hover:bg-[#EF7B43]/85",
    dot: "bg-[#EF7B43]",
  },
  info: {
    text: "观察动态",
    bg: "bg-[var(--hero-ink)]/[0.22] hover:bg-[var(--hero-ink)]/[0.3]",
    dot: "bg-[var(--hero-ink)]/[0.22]",
  },
  no_reset: {
    text: "未重置",
    bg: "bg-[#FE2C55] hover:bg-[#FE2C55]/85",
    dot: "bg-[#FE2C55]",
  },
};

function formatShortDate(val?: string | null) {
  if (!val) return "--";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? val : `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatFullDateTime(val?: string | null) {
  if (!val) return "--";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatRelativeTime(val?: string | null) {
  if (!val) return null;
  const target = new Date(val).getTime();
  if (Number.isNaN(target)) return null;
  const diffHours = Math.max(0, Math.floor((Date.now() - target) / (1000 * 60 * 60)));
  if (diffHours < 1) return "刚刚";
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

function toDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

interface CalendarWeek {
  weekIndex: number;
  monthLabel?: string;
  isCurrentMonth?: boolean;
  days: Array<{
    date: string;
    isToday: boolean;
    dayOfWeek: number;
    signal?: CodexResetSignal;
  }>;
}

interface BurstParticle {
  id: number;
  label: string;
  kind: "text" | "avatar";
  x: number;
  endY: number;
  rotate: number;
}

const PRAY_COUNT_KEY = "ownai.codexReset.prayCount";
const BASE_PRAY_COUNT = 1286;
const SNAPSHOT_CACHE_KEY = "ownai.codexReset.cachedOverview";

function getSignalConfig(kind?: string | null) {
  if (kind && kind in MONO_SCALE) {
    return MONO_SCALE[kind as CodexResetKind];
  }
  return MONO_SCALE.info;
}

export function CodexResetMonitorPage() {
  const [data, setData] = useState<CodexResetOverview | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem(SNAPSHOT_CACHE_KEY);
      return saved ? (JSON.parse(saved) as CodexResetOverview) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.localStorage.getItem(SNAPSHOT_CACHE_KEY);
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [notif, setNotif] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(NOTIFICATION_KEY) === "true"
  );
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [notificationNoticeOpen, setNotificationNoticeOpen] = useState(false);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [wechatCopied, setWechatCopied] = useState(false);

  const handleCopyWechat = async () => {
    await navigator.clipboard.writeText("xh1092968780");
    setWechatCopied(true);
    window.setTimeout(() => setWechatCopied(false), 1800);
  };

  // 求重置互动状态
  const [prayCount, setPrayCount] = useState<number>(() => {
    if (typeof window === "undefined") return BASE_PRAY_COUNT;
    const saved = window.localStorage.getItem(PRAY_COUNT_KEY);
    return saved ? parseInt(saved, 10) : BASE_PRAY_COUNT;
  });
  const [bursts, setBursts] = useState<BurstParticle[]>([]);
  const [isHandShaking, setIsHandShaking] = useState(false);

  const handlePrayReset = useCallback(() => {
    setPrayCount((prev) => {
      const next = prev + 1;
      window.localStorage.setItem(PRAY_COUNT_KEY, next.toString());
      return next;
    });

    setIsHandShaking(true);
    window.setTimeout(() => setIsHandShaking(false), 300);

    const options: Array<{ kind: "text" | "avatar"; label: string }> = [
      { kind: "text", label: "+1" },
      { kind: "text", label: "求求了" },
      { kind: "text", label: "拜托" },
      { kind: "text", label: "立即重置" },
      { kind: "text", label: "全员重置" },
      { kind: "text", label: "发重置卡" },
      { kind: "text", label: "🙏" },
      { kind: "text", label: "✨" },
      { kind: "text", label: "🎉" },
      { kind: "text", label: "速速回满" },
      { kind: "avatar", label: "" },
    ];
    const picked = options[Math.floor(Math.random() * options.length)];
    const x = Math.round(90 * Math.random() - 45);
    const endY = -55 - Math.round(35 * Math.random());
    const rotate = Math.round(24 * Math.random() - 12);

    const newBurst: BurstParticle = {
      id: Date.now() + Math.random(),
      kind: picked.kind,
      label: picked.label,
      x,
      endY,
      rotate,
    };

    setBursts((prev) => [...prev.slice(-12), newBurst]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== newBurst.id));
    }, 1500);
  }, []);

  const processNotification = useCallback((overview: CodexResetOverview) => {
    const signal = overview.latestSignal;
    if (!signal) return;
    const currentKey = `${signal.id}:${signal.status}:${signal.publishedAt || signal.date}`;
    const previousKey = window.localStorage.getItem(LAST_SIGNAL_KEY);
    const enabled = window.localStorage.getItem(NOTIFICATION_KEY) === "true";

    if (
      previousKey &&
      previousKey !== currentKey &&
      enabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("Codex 重置信号更新", {
        body: `${signal.label}：${signal.summary || "发现新的公开信号"}`,
        icon: "/images/ownai-logo.webp",
      });
    }
    window.localStorage.setItem(LAST_SIGNAL_KEY, currentKey);
  }, []);

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    setLoadError(null);
    try {
      const res = await getCodexResetOverview();
      setData(res);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(res));
        } catch {
          // ignore cache write error
        }
      }
      processNotification(res);
    } catch (err) {
      console.error("加载 Codex 重置信号快照失败:", err);
      setLoadError(err instanceof Error ? err.message : "获取数据失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [processNotification]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    void loadData();
    const timer = setInterval(() => void loadData(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadData]);

  const confirmEnableNotification = async () => {
    if (!("Notification" in window)) {
      setNotificationNoticeOpen(false);
      return;
    }

    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      window.localStorage.setItem(NOTIFICATION_KEY, "true");
      setNotif(true);
    }
    setNotificationNoticeOpen(false);
  };

  const toggleNotification = () => {
    if (!notif) {
      setNotificationNoticeOpen(true);
      return;
    }

    window.localStorage.setItem(NOTIFICATION_KEY, "false");
    setNotif(false);
  };

  const announcements = data?.announcements || [];
  const visibleAnnouncements = showAllAnnouncements
    ? announcements
    : announcements.slice(0, INITIAL_ANNOUNCEMENT_COUNT);

  // 生成对齐且带月份的 22 周网格（自然填满，最右侧是当前最新周）
  const calendarWeeks = useMemo<CalendarWeek[]>(() => {
    if (!data) return [];
    const map = new Map(data.history.map((s) => [s.date, s]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toDateKey(today);
    const currentMonthNum = today.getMonth();

    // 本周日为结束基准
    const currentDayOfWeek = (today.getDay() + 6) % 7; // 0=周一, 6=周日
    const calendarEnd = new Date(today);
    calendarEnd.setDate(today.getDate() + (6 - currentDayOfWeek));

    const totalDays = WEEKS_COUNT * 7;
    const calendarStart = new Date(calendarEnd);
    calendarStart.setDate(calendarEnd.getDate() - totalDays + 1);

    const weeks: CalendarWeek[] = [];
    let lastMonth = -1;
    const runner = new Date(calendarStart);

    for (let w = 0; w < WEEKS_COUNT; w += 1) {
      const daysInWeek = [];
      let weekMonthLabel: string | undefined;
      let isCurrentMonth = false;

      for (let d = 0; d < 7; d += 1) {
        const dateKey = toDateKey(runner);
        const month = runner.getMonth();

        // 仅在跨月且列初时标记月份
        if (d === 0 && month !== lastMonth) {
          weekMonthLabel = `${month + 1}月`;
          lastMonth = month;
          if (month === currentMonthNum) {
            isCurrentMonth = true;
          }
        }

        daysInWeek.push({
          date: dateKey,
          isToday: dateKey === todayKey,
          dayOfWeek: d,
          signal: map.get(dateKey),
        });

        runner.setDate(runner.getDate() + 1);
      }

      weeks.push({
        weekIndex: w,
        monthLabel: weekMonthLabel,
        isCurrentMonth,
        days: daysInWeek,
      });
    }

    return weeks;
  }, [data]);

  // 上次确认重置的相对时间
  const lastResetRelative = useMemo(() => {
    if (!data?.stats?.latestConfirmedResetAt) return null;
    return formatRelativeTime(data.stats.latestConfirmedResetAt);
  }, [data?.stats?.latestConfirmedResetAt]);

  const latest = data?.latestSignal;

  return (
    <div className="min-h-screen bg-[var(--hero-bg)] text-[var(--hero-ink)] antialiased">
      <style>{`
        @keyframes codexBurst {
          0% {
            opacity: 0;
            filter: blur(1px);
            transform: translate(-50%, -20%) rotate(0deg) scale(0.82);
          }
          12%, 76% {
            opacity: 1;
            filter: blur(0);
          }
          100% {
            opacity: 0;
            filter: blur(1px);
            transform: translate(calc(-50% + var(--bx)), calc(-50% + var(--by))) rotate(var(--br)) scale(0.95);
          }
        }
        @keyframes codexHandShake {
          0% { transform: scale(0.85) rotate(-8deg); }
          50% { transform: scale(1.25) rotate(8deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
      <Navbar />

      <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-6 sm:py-10">
        {/* Header: 标题 + 追踪说明与操作按钮 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--hero-border)] pb-6">
          <div className="flex items-center gap-3.5">
            {/* 头像 */}
            <img
              src="/images/thsottiaux.jpg"
              alt={data?.sourceHandle || "thsottiaux"}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "https://unavatar.io/x/thsottiaux";
              }}
              className="h-10 w-10 shrink-0 rounded-xl object-cover border border-[var(--hero-border)] shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold tracking-tight text-[var(--hero-ink)] sm:text-2xl">
                  Codex 重置监控
                </h1>
                <span className="rounded-md border border-[var(--hero-border)] bg-[var(--hero-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--hero-muted)]">
                  每 5 分钟轮询
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--hero-muted)]">
                实时追踪 @{data?.sourceHandle || "thsottiaux"} 发布的 Codex 重置消息，掌握额度刷新节奏
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={toggleNotification}
              className={cn(
                compactButtonBase,
                notif ? compactButtonPrimary : compactButtonSecondary,
                "h-8.5 text-xs shadow-xs"
              )}
            >
              {notif ? <BellRing className="h-3.5 w-3.5 shrink-0" /> : <Bell className="h-3.5 w-3.5 shrink-0" />}
              <span>{notif ? "提醒已开启" : "开启浏览器提醒"}</span>
            </button>
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void loadData(true)}
              className={cn(compactButtonBase, compactButtonSecondary, "h-8.5 text-xs shadow-xs")}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              <span>刷新</span>
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="py-24 text-center font-mono text-xs text-[var(--hero-muted)]">
            正在拉取重置信号快照…
          </div>
        ) : data ? (
          <div className="relative mt-6 space-y-5">
            {/* 左侧大屏垂直广告位 (精简极简版) */}
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
                    className={cn(compactButtonBase, compactButtonPrimary, "w-full h-8 text-xs cursor-pointer font-medium gap-1.5 shadow-xs")}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>咨询</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧大屏垂直广告位 (精简极简版) */}
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
                    className={cn(compactButtonBase, compactButtonPrimary, "w-full h-8 text-xs cursor-pointer font-medium gap-1.5 shadow-xs")}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>咨询</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 上半部分双卡片 (优化布局，摒弃一切胶囊按钮) */}
            <div className="grid gap-5 lg:grid-cols-12">
              {/* 左卡：最新重置信号 (5 cols) */}
              <div className="flex flex-col justify-between rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 sm:p-6 shadow-xs lg:col-span-5">
                <div>
                  {/* 顶部通栏：左侧仅放置求重置互动按钮，右侧是上次确认重置 */}
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--hero-border)] pb-3.5">
                    {/* 这里就放置一个求重置按钮即可，样式与右上角一致 */}
                    <div className="relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={handlePrayReset}
                        title="展示数包含社区累计值；点击参与求重置"
                        className={cn(
                          compactButtonBase,
                          compactButtonSecondary,
                          "h-8.5 text-xs shadow-xs cursor-pointer select-none"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block text-xs transition-transform duration-200",
                            isHandShaking && "animate-[codexHandShake_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
                          )}
                          aria-hidden="true"
                        >
                          🙏
                        </span>
                        <span>求重置</span>
                        <span className="font-mono text-[11px] font-semibold text-[var(--hero-muted)] tabular-nums">
                          {prayCount.toLocaleString()}
                        </span>
                      </button>

                      {/* 浮动飘散特效粒子容器 */}
                      <span className="pointer-events-none absolute inset-0 overflow-visible z-30" aria-hidden="true">
                        {bursts.map((b) => (
                          <span
                            key={b.id}
                            style={
                              {
                                "--bx": `${b.x}px`,
                                "--by": `${b.endY}px`,
                                "--br": `${b.rotate}deg`,
                                animation: "codexBurst 1.48s cubic-bezier(0.2, 0.68, 0.32, 1) forwards",
                              } as React.CSSProperties
                            }
                            className={cn(
                              "absolute left-1/2 top-1/2 select-none whitespace-nowrap will-change-transform",
                              b.kind === "avatar"
                                ? "h-8 w-8 rounded-full border border-[var(--hero-border-strong)] bg-[var(--hero-surface)] p-0 shadow-lg overflow-hidden"
                                : "rounded-md border border-[var(--hero-border)] bg-[var(--hero-surface)] px-2.5 py-1 font-sans text-xs font-semibold text-[var(--hero-ink)] shadow-md"
                            )}
                          >
                            {b.kind === "avatar" ? (
                              <img src="/images/thsottiaux.jpg" alt="" className="h-full w-full object-cover" />
                            ) : (
                              b.label
                            )}
                          </span>
                        ))}
                      </span>
                    </div>

                    {/* 上次确认重置：直接数据呈现 */}
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-[var(--hero-muted)]">上次确认重置</span>
                      <div className="mt-0.5 flex items-baseline justify-end gap-1.5 font-mono">
                        <span className="text-sm font-bold text-[var(--hero-ink)]">
                          {lastResetRelative || "--"}
                        </span>
                        <span className="text-[10px] text-[var(--hero-muted)]">
                          ({formatShortDate(data.stats?.latestConfirmedResetAt)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 核心信号状态 + 摘要文案 */}
                  <div className="mt-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={cn("h-2 w-2 rounded-full", getSignalConfig(latest?.kind).dot)} />
                      <span className="text-sm font-bold tracking-tight text-[var(--hero-ink)]">
                        {latest?.label || "暂无信号"}
                      </span>
                    </div>
                    <p className="text-[15px] font-medium leading-relaxed tracking-[-0.01em] text-[var(--hero-ink)] sm:text-base">
                      {latest?.summary || "当前暂无可展示的信号摘要"}
                    </p>
                  </div>
                </div>

                {/* 底部信息与纯文本外链 */}
                <div className="mt-6 flex items-center justify-between border-t border-[var(--hero-border)] pt-3.5 text-xs text-[var(--hero-muted)]">
                  <time className="font-mono">
                    {formatFullDateTime(latest?.publishedAt || latest?.date)}
                  </time>
                  {latest?.sourceUrl && (
                    <a
                      href={latest.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-0.5 font-medium text-[var(--hero-muted)] hover:text-[var(--hero-ink)] hover:underline transition-colors"
                    >
                      去 X 查看 <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* 右卡：Codex 重置历史点阵热力图 (7 cols) */}
              <div className="flex flex-col justify-between rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 sm:p-6 shadow-xs lg:col-span-7">
                <div>
                  <div className="flex items-center justify-between pb-3">
                    <span className="text-xs font-bold tracking-tight text-[var(--hero-ink)]">
                      Codex 重置历史
                    </span>
                    {/* 图例：极简点阵说明，无药丸无胶囊 */}
                    <div className="flex items-center gap-3 text-[11px] text-[var(--hero-muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-[2.5px] bg-[var(--hero-ink)]" />
                        全员重置
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-[2.5px] bg-[#EF7B43]" />
                        发重置卡
                      </span>
                    </div>
                  </div>

                  {/* 矩阵带月份标尺 + 星期 (全宽自适应，铺满无死角) */}
                  <div className="overflow-x-auto pt-1 pb-2">
                    <div className="w-full min-w-[460px]">
                      {/* 月份标尺行 */}
                      <div className="mb-2 flex select-none">
                        <div className="w-[30px] shrink-0" />
                        <div className="flex w-full justify-between">
                          {calendarWeeks.map((week) => (
                            <div
                              key={week.weekIndex}
                              className={cn(
                                "w-[13.5px] shrink-0 text-left font-mono text-[11px] whitespace-nowrap",
                                week.isCurrentMonth
                                  ? "font-bold text-[var(--hero-ink)]"
                                  : "text-[var(--hero-muted)]"
                              )}
                            >
                              {week.monthLabel || ""}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 星期标签 + 7行点阵 */}
                      <div className="flex gap-[10px] items-stretch">
                        <div className="flex w-[20px] shrink-0 flex-col justify-between py-0.5 font-mono text-[10px] font-medium text-[var(--hero-muted)] select-none">
                          <span>周一</span>
                          <span>周三</span>
                          <span>周六</span>
                        </div>

                        <div className="flex w-full justify-between">
                          {calendarWeeks.map((week) => (
                            <div key={week.weekIndex} className="flex flex-col gap-[3.5px] shrink-0">
                              {week.days.map((day) => {
                                const signal = day.signal;
                                const hasSignal = Boolean(signal);
                                return (
                                  <a
                                    key={day.date}
                                    href={signal?.sourceUrl || undefined}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    onMouseEnter={() =>
                                      setHoveredCell(
                                        signal
                                          ? `${day.date} · ${signal.label}${signal.summary ? `：${signal.summary}` : ""}`
                                          : `${day.date} · 当日无重置记录`
                                      )
                                    }
                                    onMouseLeave={() => setHoveredCell(null)}
                                    className={cn(
                                      "h-[13.5px] w-[13.5px] rounded-[3px] transition-all duration-100",
                                      hasSignal
                                        ? cn(getSignalConfig(signal?.kind).bg, "hover:scale-120")
                                        : "bg-[var(--hero-ink)]/[0.07] hover:bg-[var(--hero-ink)]/[0.14]"
                                    )}
                                    aria-label={day.date}
                                  />
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-2 h-4 truncate font-mono text-[11px] text-[var(--hero-muted)]">
                  {hoveredCell || `* 记录近 ${WEEKS_COUNT} 周信号分布，右侧对应当前最新周期，悬停查看详情`}
                </p>
              </div>
            </div>

            {/* 中间：3 个大数字统计面板 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 shadow-xs">
                <p className="text-xs font-medium text-[var(--hero-muted)]">全员次数</p>
                <p className="mt-2 font-display text-[2.4rem] font-bold tracking-tight text-[var(--hero-ink)] leading-none">
                  {data.stats?.resetCount ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 shadow-xs">
                <p className="text-xs font-medium text-[var(--hero-muted)]">平均重置间隔</p>
                <p className="mt-2 font-display text-[2.4rem] font-bold tracking-tight text-[var(--hero-ink)] leading-none">
                  {data.stats?.averageIntervalDays ? (
                    <>
                      {data.stats.averageIntervalDays}
                      <span className="ml-1 text-sm font-normal text-[var(--hero-muted)]">天</span>
                    </>
                  ) : (
                    <span className="text-[var(--hero-muted)] text-[1.8rem]">-- 天</span>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 shadow-xs">
                <p className="text-xs font-medium text-[var(--hero-muted)]">最长等待</p>
                <p className="mt-2 font-display text-[2.4rem] font-bold tracking-tight text-[var(--hero-ink)] leading-none">
                  {data.stats?.longestIntervalDays ? (
                    <>
                      {data.stats.longestIntervalDays}
                      <span className="ml-1 text-sm font-normal text-[var(--hero-muted)]">天</span>
                    </>
                  ) : (
                    <span className="text-[var(--hero-muted)] text-[1.8rem]">-- 天</span>
                  )}
                </p>
              </div>
            </div>

            {/* 底部：Codex 重置公告时间线 */}
            <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--hero-border)]">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-[var(--hero-ink)]">
                    Codex 重置公告
                  </h2>
                  <span className="font-mono text-xs text-[var(--hero-muted)]">
                    （{announcements.length} 条动态）
                  </span>
                </div>
                <a
                  href={data.sourcePageUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-mono text-xs text-[var(--hero-muted)] hover:text-[var(--hero-ink)] hover:underline inline-flex items-center gap-1"
                >
                  数据源页面 <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="mt-4 space-y-3">
                {visibleAnnouncements.map((a) => (
                  <article
                    key={a.id}
                    className="flex flex-col gap-2 rounded-xl border border-[var(--hero-border)] bg-[var(--hero-bg)]/40 p-4 transition-colors hover:border-[var(--hero-border-strong)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {/* 作者头像 */}
                        {!avatarError ? (
                          <img
                            src="/images/thsottiaux.jpg"
                            alt="thsottiaux"
                            onError={() => setAvatarError(true)}
                            className="h-5 w-5 rounded-full object-cover border border-[var(--hero-border)]"
                          />
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--hero-ink)] text-[10px] font-bold text-[var(--hero-bg)]">
                            T
                          </div>
                        )}
                        <span className="font-mono text-xs font-semibold text-[var(--hero-ink)]">
                          @{data.sourceHandle}
                        </span>
                        {a.relativeTime && (
                          <span className="rounded bg-[var(--hero-ink)]/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-[var(--hero-muted)]">
                            {a.relativeTime}
                          </span>
                        )}
                      </div>
                      <time className="font-mono text-[11px] text-[var(--hero-muted)]">
                        {formatFullDateTime(a.publishedAt)}
                      </time>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-[var(--hero-ink)] sm:text-[13px]">
                      {a.summary}
                    </p>

                    {/* 纯文本外跳链接，去除胶囊框 */}
                    <div className="mt-1 flex justify-end">
                      <a
                        href={a.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--hero-muted)] hover:text-[var(--hero-ink)] hover:underline transition-colors"
                      >
                        去 X 查看 ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
              {!showAllAnnouncements && announcements.length > INITIAL_ANNOUNCEMENT_COUNT ? (
                <div className="mt-5 flex justify-center border-t border-[var(--hero-border)] pt-5">
                  <button
                    type="button"
                    onClick={() => setShowAllAnnouncements(true)}
                    className={cn(compactButtonBase, compactButtonSecondary, "h-8.5 px-4 text-xs shadow-xs")}
                  >
                    显示更多
                    <span className="font-mono text-[10px] text-[var(--hero-muted)]">
                      还有 {announcements.length - INITIAL_ANNOUNCEMENT_COUNT} 条
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* 底部信息 */}
            <div className="flex items-center justify-between border-t border-[var(--hero-border)] pt-6 font-mono text-[11px] text-[var(--hero-muted)]">
              <span>最近检查时间：{formatFullDateTime(data.lastCheckedAt)}</span>
              <span>数据来源于公开动态，最终额度以 Codex 客户端为准</span>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-8 text-center">
            <p className="text-sm font-medium text-[var(--hero-muted)]">
              {loadError || "暂未获取到重置数据快照"}
            </p>
            <button
              type="button"
              onClick={() => void loadData(true)}
              className={cn(compactButtonBase, compactButtonSecondary, "mt-4 h-8.5 text-xs shadow-xs")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>重新加载</span>
            </button>
          </div>
        )}
      </main>

      {/* 浏览器提醒使用说明 */}
      <DialogPrimitive.Root open={notificationNoticeOpen} onOpenChange={setNotificationNoticeOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-[3px]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[100] w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border border-white/10 bg-[#171717] p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.48)] focus:outline-none">
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="关闭提醒说明"
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
              <BellRing className="h-5 w-5" />
            </div>
            <DialogPrimitive.Title className="mt-5 text-[18px] font-semibold">
              开启浏览器提醒
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-[13px] leading-6 text-white/60">
              页面会每 5 分钟检查一次重置信号。开启后请保持当前页面打开，可以放在后台标签页；关闭页面或浏览器后将无法收到提醒。
            </DialogPrimitive.Description>
            <div className="mt-6 flex justify-end gap-2">
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-[8px] border border-white/12 px-3 text-[12px] font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white"
                >
                  暂不开启
                </button>
              </DialogPrimitive.Close>
              <button
                type="button"
                onClick={() => void confirmEnableNotification()}
                className="inline-flex h-9 items-center justify-center rounded-[8px] bg-white px-3 text-[12px] font-semibold text-black transition-colors hover:bg-white/88"
              >
                我知道了，继续开启
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* 联系客服弹窗 */}
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
