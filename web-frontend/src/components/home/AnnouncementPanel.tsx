import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Bell, CheckCheck, ChevronLeft, ChevronRight, LoaderCircle, UserRound } from "lucide-react";
import "./AnnouncementPanel.css";
import { CommunityMarkdown } from "@/components/community/CommunityMarkdown";
import { UserAvatar } from "@/components/home/UserAvatar";
import {
  getAnnouncementDetail,
  getUnreadAnnouncementCount,
  listAnnouncements,
  markAllAnnouncementsRead,
  markAnnouncementRead,
} from "@/lib/announcement";
import { usePreferredLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { communityFlag } from "@/lib/community";
import type { AnnouncementVO } from "@/lib/types";
import { useSearchParams } from "react-router-dom";
import { scrollToCommunityElement } from "@/lib/community-state";

const ANNOUNCEMENT_PAGE_SIZE = 5;

const PANEL_COPY = {
  "en-US": {
    title: "Announcements",
    empty: "No announcements",
    loadFailed: "Unable to load announcements",
    detailFailed: "Unable to load this announcement",
    markAllRead: "Mark all read",
    markingAll: "Marking",
    loading: "Loading announcements",
    unread: "Unread",
    read: "Read",
    unknownType: "Announcement",
    typeLabels: {
      activity: "Activity",
      maintenance: "Maintenance",
      price_change: "Price change",
      site_update: "Site update",
    },
  },
  "zh-CN": {
    title: "公告",
    empty: "暂无公告",
    loadFailed: "当前无法加载公告",
    detailFailed: "当前无法加载公告详情",
    markAllRead: "全部已读",
    markingAll: "处理中",
    loading: "公告加载中",
    unread: "未读",
    read: "已读",
    unknownType: "公告",
    typeLabels: {
      activity: "活动通知",
      maintenance: "维护通知",
      price_change: "价格变动",
      site_update: "网站更新",
    },
  },
} as const;

interface AnnouncementPanelProps {
  title?: string;
  className?: string;
  onUnreadCountChange: (count: number) => void;
  variant?: "desktop" | "mobile" | "page";
}

function isAnnouncementUnread(announcement: AnnouncementVO) {
  const readStatus = announcement.readStatus;

  if (typeof readStatus === "boolean") {
    return !readStatus;
  }

  if (typeof readStatus === "number") {
    return readStatus === 0;
  }

  if (typeof readStatus === "string") {
    const normalized = readStatus.trim().toLowerCase();

    return normalized === "0" || normalized === "false" || normalized === "unread";
  }

  return false;
}

function getAnnouncementText(value?: string) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAnnouncementDate(value?: string, locale?: "en-US" | "zh-CN") {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

export function AnnouncementPanel({
  title,
  className,
  onUnreadCountChange,
  variant = "desktop",
}: AnnouncementPanelProps) {
  const { locale } = usePreferredLocale();
  const copy = PANEL_COPY[locale];
  const [params] = useSearchParams();
  const targetId = variant === "page" ? params.get("announcement") : null;
  const targeted = useRef<string | null>(null);
  const [targetError, setTargetError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const pageSize = variant === "page" ? 12 : ANNOUNCEMENT_PAGE_SIZE;
  const [announcements, setAnnouncements] = useState<AnnouncementVO[]>([]);
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [detail, setDetail] = useState<AnnouncementVO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [detailErrorMessage, setDetailErrorMessage] = useState("");

  const hasUnreadAnnouncements = useMemo(
    () => announcements.some((announcement) => isAnnouncementUnread(announcement)),
    [announcements],
  );

  const refreshUnreadCount = async () => {
    try {
      const count = await getUnreadAnnouncementCount();
      onUnreadCountChange(Math.max(0, count));
    } catch {
      onUnreadCountChange(0);
    }
  };

  const loadAnnouncements = async () => {
    const request = ++listRequest.current;
    ++detailRequest.current;
    setSelectedId(null);
    setDetail(null);
    setIsLoading(true);
    setErrorMessage("");

    try {
      const page = await listAnnouncements({
        current: currentPage,
        pageSize,
      });
      if (request !== listRequest.current) return;
      setTotalPages(Math.max(1, page.pages ?? Math.ceil((page.total ?? 0) / pageSize)));
      setTotal(Number(page.total ?? 0));
      setAnnouncements(page.records ?? []);
    } catch {
      if (request !== listRequest.current) return;
      setErrorMessage(copy.loadFailed);
      setAnnouncements([]);
    } finally {
      if (request === listRequest.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
    return () => { ++listRequest.current; ++detailRequest.current; };
  }, [locale, currentPage, pageSize]);

  const handleSelectAnnouncement = async (announcement: AnnouncementVO, retry = false) => {
    const request = ++detailRequest.current;
    if (!retry && selectedId === announcement.id) {
      setSelectedId(null);
      setDetail(null);
      return;
    }
    setSelectedId(announcement.id);
    setDetail(null);
    setDetailErrorMessage("");
    setIsDetailLoading(true);

    try {
      const nextDetail = await getAnnouncementDetail(announcement.id);
      if (request !== detailRequest.current) return;
      setDetail(nextDetail);

      if (isAnnouncementUnread(announcement)) {
        await markAnnouncementRead(announcement.id);
        setAnnouncements((current) =>
          current.map((item) =>
            item.id === announcement.id
              ? {
                  ...item,
                  readStatus: true,
                  readTime: new Date().toISOString(),
                }
              : item,
          ),
        );
        void refreshUnreadCount();
      }
    } catch {
      if (request === detailRequest.current) setDetailErrorMessage(copy.detailFailed);
    } finally {
      if (request === detailRequest.current) setIsDetailLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);

    try {
      await markAllAnnouncementsRead();
      setAnnouncements((current) =>
        current.map((announcement) => ({
          ...announcement,
          readStatus: true,
          readTime: announcement.readTime || new Date().toISOString(),
        })),
      );
      onUnreadCountChange(0);
    } catch {
      setErrorMessage(copy.loadFailed);
    } finally {
      setIsMarkingAll(false);
    }
  };

  useEffect(() => {
    if (!targetId || isLoading || errorMessage || targeted.current === targetId) return;
    let active = true;
    setTargetError("");
    void getAnnouncementDetail(targetId).then(async announcement => {
      if (!active) return;
      targeted.current = targetId;
      setAnnouncements(current => current.some(item => String(item.id) === targetId) ? current : [announcement, ...current]);
      setSelectedId(announcement.id); setDetail(announcement); setDetailErrorMessage(""); setIsDetailLoading(false);
      requestAnimationFrame(() => { if (active) scrollToCommunityElement(`announcement-${targetId}`); });
      await markAnnouncementRead(announcement.id);
      if (active) { setAnnouncements(current => current.map(item => String(item.id) === targetId ? { ...item, readStatus: true } : item)); void refreshUnreadCount(); }
    }).catch(() => { if (active) setTargetError("这条公告暂时无法打开，请从列表中查看其他公告"); });
    return () => { active = false; };
  }, [targetId, isLoading, errorMessage]);

  if (variant === "page") {
    const isChinese = locale === "zh-CN";
    return <section className={cn("community-feed announcement-page", className)} aria-label={title || copy.title}>
      <div className="announcement-page-intro">
        <p>{isChinese ? "了解社区新动态与重要消息" : "Community updates and important news"}</p>
        <button className="announcement-page-action" onClick={handleMarkAllRead} disabled={!hasUnreadAnnouncements || isMarkingAll}>
          {isMarkingAll ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCheck size={15} />}
          {isMarkingAll ? copy.markingAll : isChinese ? "全部标为已读" : copy.markAllRead}
        </button>
      </div>
      <div className="announcement-page-label"><span>{isChinese ? "全部公告" : "All announcements"}</span>{!isLoading && !errorMessage && <span className="announcement-page-count">{total}</span>}</div>
      {targetError && <p className="community-inline-error" role="alert">{targetError}</p>}
      {isLoading ? <div className="announcement-page-state" role="status"><LoaderCircle size={19} className="animate-spin" /><p>{copy.loading}</p></div>
        : errorMessage ? <div className="announcement-page-state" role="alert"><Bell size={24} /><p>{errorMessage}</p><button className="announcement-page-action" onClick={() => void loadAnnouncements()}>{isChinese ? "重新加载" : "Retry"}</button></div>
        : announcements.length ? <div className="announcement-page-list">
          {announcements.map(announcement => {
            const isUnread = isAnnouncementUnread(announcement);
            const isSelected = selectedId === announcement.id;
            const typeLabel = copy.typeLabels[announcement.type as keyof typeof copy.typeLabels] || copy.unknownType;
            const date = announcement.publishTime || announcement.createTime;
            const contentId = `announcement-body-${announcement.id}`;
            const authorName = announcement.authorName?.trim() || (isChinese ? "官方账号" : "Official account");
            return <article key={announcement.id} id={`announcement-${announcement.id}`} tabIndex={-1} className="community-post announcement-page-item" data-unread={isUnread || undefined} data-selected={isSelected || undefined}>
              <div className="community-author"><UserAvatar className="community-author-avatar" src={announcement.authorAvatar} alt={authorName} fallback={<UserRound size={17} />} /><div><div><strong>{authorName}</strong>{communityFlag(announcement.official) && <span className="community-official">{isChinese ? "官方" : "Official"}</span>}<time dateTime={date}>{getAnnouncementDate(date, locale)}</time></div></div>{isUnread && <span className="announcement-page-unread">{copy.unread}</span>}</div>
              <div className="community-post-body">
              <button className="community-post-link" onClick={() => void handleSelectAnnouncement(announcement)} aria-expanded={isSelected} aria-controls={contentId}>
                <h2>{announcement.title || typeLabel}</h2>
                {!isSelected && <p className="announcement-page-excerpt">{getAnnouncementText(announcement.summary || announcement.content)}</p>}
              </button>
              <div id={contentId} hidden={!isSelected} className="announcement-page-body">
                {isDetailLoading ? <div className="announcement-page-detail-status" role="status"><LoaderCircle size={15} className="animate-spin" />{copy.loading}</div>
                  : detailErrorMessage ? <div className="announcement-page-detail-status" role="alert">{detailErrorMessage}<button className="announcement-page-action" onClick={() => void handleSelectAnnouncement(announcement, true)}>{isChinese ? "重试" : "Retry"}</button></div>
                  : <CommunityMarkdown content={(detail?.content || announcement.content || "").replace(/<br\s*\/?\s*>|<\/p>/gi, "\n").trim()} />}
              </div>
              <div className="community-post-tags"><span>{typeLabel}</span></div>
              <div className="announcement-page-footer"><button className="community-read-more" onClick={() => void handleSelectAnnouncement(announcement)} aria-expanded={isSelected} aria-controls={contentId}>{isSelected ? isChinese ? "收起正文" : "Show less" : isChinese ? "阅读全文" : "Read announcement"}<ArrowUpRight size={13} /></button>{!isUnread && <span className="announcement-page-read"><CheckCheck size={13} />{copy.read}</span>}</div>
              </div>
            </article>;
          })}
        </div> : <div className="announcement-page-state"><Bell size={26} strokeWidth={1.5} /><h2>{copy.empty}</h2><p>{isChinese ? "新的通知发布后，会在这里与你见面" : "New announcements will appear here"}</p></div>}
      {totalPages > 1 && <nav className="announcement-page-pagination" aria-label={isChinese ? "公告分页" : "Announcement pages"}>
        <button aria-label={isChinese ? "上一页" : "Previous page"} disabled={isLoading || currentPage <= 1} onClick={() => setCurrentPage(page => page - 1)}><ChevronLeft size={16} /></button>
        <span>{currentPage} / {totalPages}</span>
        <button aria-label={isChinese ? "下一页" : "Next page"} disabled={isLoading || currentPage >= totalPages} onClick={() => setCurrentPage(page => page + 1)}><ChevronRight size={16} /></button>
      </nav>}
    </section>;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)] text-[var(--hero-ink)] shadow-[0_18px_48px_rgba(17,17,17,0.13)]",
        variant === "desktop" ? "w-[320px]" : "w-full shadow-none",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--hero-ink)]/6 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--hero-ink)]/[0.055] text-[var(--hero-ink)]">
            <Bell className="h-3.5 w-3.5" />
          </span>
          <p className="truncate text-[14px] font-medium">{title ?? copy.title}</p>
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={!hasUnreadAnnouncements || isMarkingAll}
          className="inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2 text-[12px] font-medium text-[var(--hero-muted)] transition-colors hover:bg-[var(--hero-ink)]/[0.045] hover:text-[var(--hero-ink)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          <span>{isMarkingAll ? copy.markingAll : copy.markAllRead}</span>
        </button>
      </div>

      <div className={cn("max-h-[min(420px,70vh)] overflow-y-auto p-2", variant === "mobile" && "max-h-[calc(100dvh-190px)]")}>
        {isLoading ? (
          <div className="flex h-28 items-center justify-center gap-2 text-[13px] text-[var(--hero-muted)]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            <span>{copy.loading}</span>
          </div>
        ) : errorMessage ? (
          <div className="rounded-[10px] border border-[#e5484d]/18 bg-[#e5484d]/8 px-3 py-2 text-[13px] text-[#c7383d]">
            {errorMessage}
            <button type="button" onClick={() => void loadAnnouncements()} className="ml-3 underline">{locale === "zh-CN" ? "重试" : "Retry"}</button>
          </div>
        ) : announcements.length ? (
          <div className="space-y-1.5">
            {announcements.map((announcement) => {
              const isUnread = isAnnouncementUnread(announcement);
              const isSelected = selectedId === announcement.id;
              const typeLabel =
                copy.typeLabels[announcement.type as keyof typeof copy.typeLabels] ||
                copy.unknownType;
              const contentText = getAnnouncementText(
                isSelected ? detail?.content || announcement.content : announcement.content,
              );

              return (
                <button
                  key={announcement.id}
                  type="button"
                  aria-expanded={isSelected}
                  onClick={() => void handleSelectAnnouncement(announcement)}
                  className={cn(
                    "block w-full min-w-0 break-words rounded-[10px] border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15",
                    isSelected
                      ? "border-[var(--hero-ink)]/14 bg-[var(--hero-ink)]/[0.045]"
                      : "border-[var(--hero-ink)]/7 hover:bg-[var(--hero-ink)]/[0.035]",
                  )}
                >
                  <span className="flex min-w-0 items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-[var(--hero-ink)]">
                        {announcement.title || typeLabel}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--hero-muted)]">
                        <span>{typeLabel}</span>
                        {getAnnouncementDate(announcement.publishTime || announcement.createTime, locale) ? (
                          <span>{getAnnouncementDate(announcement.publishTime || announcement.createTime, locale)}</span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        isUnread
                          ? "bg-[#e5484d]/10 text-[#c7383d]"
                          : "bg-[var(--hero-ink)]/[0.045] text-[var(--hero-muted)]",
                      )}
                    >
                      {isUnread ? copy.unread : copy.read}
                    </span>
                  </span>

                  {contentText ? (
                    <span className={cn("mt-1.5 block break-words text-[12px] leading-5 text-[var(--hero-muted)]", !isSelected && "line-clamp-2")}>
                      {contentText}
                    </span>
                  ) : null}

                  {isSelected && isDetailLoading ? (
                    <span className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--hero-muted)]">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      {copy.loading}
                    </span>
                  ) : null}

                  {isSelected && detailErrorMessage ? (
                    <span className="mt-2 block text-[12px] text-[#c7383d]">
                      {detailErrorMessage}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center rounded-[10px] border border-[var(--hero-ink)]/7 bg-[var(--hero-ink)]/[0.025] text-[13px] text-[var(--hero-muted)]">
            {copy.empty}
          </div>
        )}
      </div>
    </div>
  );
}
