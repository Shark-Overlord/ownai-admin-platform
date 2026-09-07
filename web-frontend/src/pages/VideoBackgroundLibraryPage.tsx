import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clapperboard,
  Download,
  FileVideo2,
  Heart,
  ImageOff,
  LoaderCircle,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { PromptMasonry } from "@/components/frontend-prompts/PromptMasonry";
import { RequestErrorToast, type RequestToastTone } from "@/components/ui/RequestErrorToast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { AuthenticatedUserMenu } from "@/components/home/AuthenticatedUserMenu";
import { getUnreadAnnouncementCount } from "@/lib/announcement";
import {
  clearPersistedLoginUser,
  getPersistedLoginUser,
  logoutUser,
  updatePersistedLoginUser,
} from "@/lib/auth";
import { getAuthSessionEventName } from "@/lib/auth-session";
import { isAuthenticationError, RequestError } from "@/lib/request";
import type { LoginUserVO } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  addVideoBackgroundFavorite,
  cancelVideoBackgroundFavorite,
  checkVideoBackgroundFavorite,
  downloadVideoBackgroundSource,
  getVideoBackgroundResource,
  listMyVideoBackgroundFavorites,
  listVideoBackgrounds,
  type VideoBackgroundItem,
  type VideoBackgroundResource,
} from "@/lib/video-background";

const PAGE_SIZE = 20;
const VIDEO_MEDIA_EXTENSION_PATTERN = /\.(?:mp4|webm|mov|m4v|avi|mkv)(?:$|[?#])/i;

function isStaticCoverUrl(value?: string) {
  return Boolean(value?.trim() && !VIDEO_MEDIA_EXTENSION_PATTERN.test(value.trim()));
}

type VideoLibraryView = "library" | "favorites";
type MemberFilter = "all" | "member";

type ToastState = {
  message: string;
  tone: RequestToastTone;
};

type PersistedLoginUser = LoginUserVO & { userAccount?: string };

function getUserDisplayName(user: PersistedLoginUser) {
  return user.userName?.trim() || user.userAccount?.trim() || "DESIGN EVERYTHING MEMBER";
}

function getUserMemberLabel(user: PersistedLoginUser) {
  return user.memberLevel?.trim().toUpperCase() === "MEMBER" ? "会员" : "普通用户";
}

function isVideoMemberLocked(item: VideoBackgroundItem) {
  return item.memberOnly === 1 && item.canAccess !== true;
}

function getVideoAspectRatio(item: VideoBackgroundItem) {
  const ratio = item.videoAspectRatio;

  if (ratio && ratio > 0.2 && ratio < 5) {
    return ratio;
  }

  if (item.videoWidth && item.videoHeight) {
    return item.videoWidth / item.videoHeight;
  }

  return 16 / 9;
}

function formatDuration(durationMs?: number) {
  if (!durationMs || durationMs <= 0) {
    return "时长未知";
  }

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`;
}

function formatResolution(item: VideoBackgroundItem) {
  if (!item.videoWidth || !item.videoHeight) {
    return "分辨率未知";
  }

  return `${item.videoWidth} × ${item.videoHeight}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof RequestError ? error.message : fallback;
}

function VideoFavoriteButton({
  compact = false,
  item,
  onChanged,
  onLoginRequired,
  onMessage,
  reconcile = false,
}: {
  compact?: boolean;
  item: VideoBackgroundItem;
  onChanged: (change: {
    favoriteCount: number;
    isFavorited: boolean;
    item: VideoBackgroundItem;
  }) => void;
  onLoginRequired: () => void;
  onMessage: (message: string, tone?: RequestToastTone) => void;
  reconcile?: boolean;
}) {
  const [isFavorited, setIsFavorited] = useState(Boolean(item.favorited));
  const [favoriteCount, setFavoriteCount] = useState(item.favoriteCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsFavorited(Boolean(item.favorited));
    setFavoriteCount(item.favoriteCount);
  }, [item.favoriteCount, item.favorited, item.id]);

  useEffect(() => {
    if (!reconcile || !getPersistedLoginUser()) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    void checkVideoBackgroundFavorite(item.id, { signal: controller.signal })
      .then((nextValue) => {
        if (!active) {
          return;
        }

        if (nextValue !== Boolean(item.favorited)) {
          setIsFavorited(nextValue);
          onChanged({ item, isFavorited: nextValue, favoriteCount });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [favoriteCount, item, onChanged, reconcile]);

  const handleToggle = async () => {
    if (isLoading) {
      return;
    }

    if (!getPersistedLoginUser()) {
      onLoginRequired();
      return;
    }

    const previousValue = isFavorited;
    const previousCount = favoriteCount;
    const nextValue = !previousValue;
    const nextCount = nextValue ? previousCount + 1 : Math.max(0, previousCount - 1);

    setIsFavorited(nextValue);
    setFavoriteCount(nextCount);
    setIsLoading(true);

    try {
      if (nextValue) {
        await addVideoBackgroundFavorite(item.id);
      } else {
        await cancelVideoBackgroundFavorite(item.id);
      }

      onChanged({ item, isFavorited: nextValue, favoriteCount: nextCount });
    } catch (error) {
      setIsFavorited(previousValue);
      setFavoriteCount(previousCount);

      if (isAuthenticationError(error)) {
        onLoginRequired();
        return;
      }

      onMessage(getErrorMessage(error, "收藏操作失败"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void handleToggle();
      }}
      disabled={isLoading}
      className={cn(
        compact
          ? "inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[var(--frontend-prompt-card-control-bg)] px-2 text-[12px] font-medium text-[var(--frontend-prompt-card-control-text)] transition-colors hover:bg-[var(--frontend-prompt-card-control-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          : "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-favorite-bg)] text-[var(--frontend-prompt-card-muted)] transition-colors hover:border-[var(--frontend-prompt-card-border-hover)] hover:bg-[var(--frontend-prompt-favorite-hover-bg)] hover:text-[var(--frontend-prompt-card-text)] disabled:cursor-not-allowed disabled:opacity-70",
        isFavorited && "text-rose-500",
      )}
      aria-label={isFavorited ? "取消收藏" : "收藏"}
      title={isFavorited ? "取消收藏" : "收藏"}
      aria-pressed={isFavorited}
    >
      {isLoading ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Heart className="h-3.5 w-3.5" fill={isFavorited ? "currentColor" : "none"} />
      )}
      {compact ? <span>{favoriteCount}</span> : null}
    </button>
  );
}

function VideoResourceActionButtons({
  compact = false,
  item,
  onLoginRequired,
  onMessage,
  onUpgradeRequired,
}: {
  compact?: boolean;
  item: VideoBackgroundItem;
  onLoginRequired: () => void;
  onMessage: (message: string, tone?: RequestToastTone) => void;
  onUpgradeRequired: () => void;
}) {
  const [resource, setResource] = useState<VideoBackgroundResource | null>(null);
  const [isResourceLoading, setIsResourceLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const memberLocked = isVideoMemberLocked(item);

  const getResourceForAction = async (): Promise<VideoBackgroundResource | null> => {
    if (!getPersistedLoginUser()) {
      onLoginRequired();
      return null;
    }

    if (memberLocked) {
      onUpgradeRequired();
      return null;
    }

    if (resource) {
      return resource;
    }

    setIsResourceLoading(true);

    try {
      const nextResource = await getVideoBackgroundResource(item.id);
      setResource(nextResource);
      return nextResource;
    } catch (error) {
      if (isAuthenticationError(error)) {
        if (getPersistedLoginUser()) {
          onUpgradeRequired();
        } else {
          onLoginRequired();
        }
        return null;
      }

      onMessage(getErrorMessage(error, "素材资源加载失败"));
      return null;
    } finally {
      setIsResourceLoading(false);
    }
  };

  const handleDownload = async () => {
    if (isDownloading || isResourceLoading) {
      return;
    }

    setIsDownloading(true);

    try {
      const nextResource = await getResourceForAction();

      if (!nextResource) {
        return;
      }

      await downloadVideoBackgroundSource(nextResource.downloadUrl, item);
      onMessage("已开始下载原视频", "success");
    } catch (error) {
      if (isAuthenticationError(error)) {
        if (getPersistedLoginUser()) {
          onUpgradeRequired();
        } else {
          onLoginRequired();
        }
        return;
      }

      onMessage(getErrorMessage(error, "原视频下载失败"));
    } finally {
      setIsDownloading(false);
    }
  };

  const isBusy = isDownloading || isResourceLoading;
  const downloadIcon = isDownloading
    ? <LoaderCircle className="h-4 w-4 animate-spin" />
    : memberLocked
      ? <Lock className="h-4 w-4" />
      : <Download className="h-4 w-4" />;

  return (
    <div className={compact ? "flex items-center" : "w-full"}>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={isBusy}
        aria-label="下载视频"
        title="下载视频"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[8px] transition-colors disabled:cursor-not-allowed disabled:opacity-70",
          compact
            ? "h-8 w-8 bg-[var(--frontend-prompt-card-control-bg)] text-[var(--frontend-prompt-card-control-text)] hover:bg-[var(--frontend-prompt-card-control-hover)]"
            : "h-9 w-full bg-[var(--chat-primary-bg)] px-3 text-[13px] font-semibold text-[var(--chat-primary-text)] hover:bg-[var(--chat-primary-hover)]",
        )}
      >
        {downloadIcon}
        {compact ? null : <span>{isDownloading ? "下载中" : "下载视频"}</span>}
      </button>
    </div>
  );
}

function VideoBackgroundCard({
  item,
  onFavoriteChanged,
  onLoginRequired,
  onMessage,
  onOpen,
  onUpgradeRequired,
}: {
  item: VideoBackgroundItem;
  onFavoriteChanged: (change: {
    favoriteCount: number;
    isFavorited: boolean;
    item: VideoBackgroundItem;
  }) => void;
  onLoginRequired: () => void;
  onMessage: (message: string, tone?: RequestToastTone) => void;
  onOpen: (item: VideoBackgroundItem) => void;
  onUpgradeRequired: () => void;
}) {
  const [isCoverUnavailable, setIsCoverUnavailable] = useState(false);
  const hasStaticCover = isStaticCoverUrl(item.coverUrl) && !isCoverUnavailable;
  const ratio = getVideoAspectRatio(item);

  useEffect(() => {
    setIsCoverUnavailable(false);
  }, [item.coverUrl, item.id]);

  return (
    <article className="group relative overflow-hidden rounded-[14px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-bg)] shadow-[var(--frontend-prompt-card-shadow)] transition-[border-color,box-shadow] hover:border-[var(--frontend-prompt-card-border-hover)] hover:shadow-[var(--frontend-prompt-card-shadow-hover)]">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-ink)]/20"
      >
        <div className="relative overflow-hidden bg-[var(--frontend-prompt-card-image-bg)]" style={{ aspectRatio: ratio }}>
          {hasStaticCover ? (
            <img
              src={item.coverUrl}
              alt={`${item.title} 封面`}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={() => setIsCoverUnavailable(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--frontend-prompt-card-muted)]">
              <ImageOff className="h-5 w-5" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 via-black/10 to-transparent px-3 pb-2.5 pt-8 text-white">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium">
              <FileVideo2 className="h-3.5 w-3.5" />
              带水印预览
            </span>
            <span className="text-[11px]">{formatDuration(item.durationMs)}</span>
          </div>
          {item.memberOnly === 1 ? (
            <span className="absolute left-2.5 top-2.5 inline-flex h-6 items-center rounded-[7px] bg-black/58 px-2 text-[11px] font-semibold text-white backdrop-blur-sm">
              会员专享
            </span>
          ) : null}
        </div>

      </button>
      <div className="flex h-11 items-center justify-end border-t border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-footer-bg)] px-3">
        <VideoResourceActionButtons
          compact
          item={item}
          onLoginRequired={onLoginRequired}
          onMessage={onMessage}
          onUpgradeRequired={onUpgradeRequired}
        />
      </div>
      <div className="absolute right-2.5 top-2.5 z-10">
        <VideoFavoriteButton
          item={item}
          onChanged={onFavoriteChanged}
          onLoginRequired={onLoginRequired}
          onMessage={onMessage}
        />
      </div>
    </article>
  );
}

function VideoBackgroundSkeleton() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-bg)]">
      <div className="aspect-video animate-pulse bg-[var(--frontend-prompt-card-image-bg)]" />
      <div className="space-y-2 px-3 py-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--chat-control-soft)]" />
        <div className="h-3 w-full animate-pulse rounded bg-[var(--chat-control-soft)]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--chat-control-soft)]" />
      </div>
    </div>
  );
}

function VideoBackgroundDetail({
  item,
  onClose,
  onFavoriteChanged,
  onLoginRequired,
  onMessage,
  onUpgradeRequired,
}: {
  item: VideoBackgroundItem;
  onClose: () => void;
  onFavoriteChanged: (change: {
    favoriteCount: number;
    isFavorited: boolean;
    item: VideoBackgroundItem;
  }) => void;
  onLoginRequired: () => void;
  onMessage: (message: string, tone?: RequestToastTone) => void;
  onUpgradeRequired: () => void;
}) {
  const memberLocked = isVideoMemberLocked(item);

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <div className="frontend-prompt-dialog-layer frontend-prompt-preview-light fixed inset-0 z-[70] flex items-center justify-center px-4 py-5 text-[var(--chat-ink)] sm:px-5 sm:py-6">
          <DialogPrimitive.Overlay className="absolute inset-0 bg-black/42" />
          <DialogPrimitive.Content className="relative z-[1] flex max-h-[calc(100dvh-40px)] w-full max-w-[1160px] flex-col overflow-hidden rounded-[18px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] shadow-[0_24px_70px_rgba(0,0,0,0.32)] focus:outline-none lg:flex-row">
            <DialogPrimitive.Title className="sr-only">{item.title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              {item.title} 的带水印预览、提示词与下载资源
            </DialogPrimitive.Description>

            <aside className="relative z-[2] order-2 flex min-h-0 shrink-0 flex-col overflow-y-auto border-t border-[var(--chat-border)] !bg-[var(--chat-panel-soft)] !opacity-100 px-5 py-5 lg:order-1 lg:w-[330px] lg:border-r lg:border-t-0">
              <div className="flex flex-wrap gap-1.5">
                {memberLocked ? (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-[7px] bg-[var(--chat-control-bg)] px-2 text-[12px] text-[var(--chat-control-text)]">
                    <Lock className="h-3.5 w-3.5" />
                    会员专享
                  </span>
                ) : null}
                <span className="inline-flex h-7 items-center rounded-[7px] bg-[var(--chat-control-bg)] px-2 text-[12px] text-[var(--chat-control-text)]">
                  {formatResolution(item)}
                </span>
                <span className="inline-flex h-7 items-center rounded-[7px] bg-[var(--chat-control-bg)] px-2 text-[12px] text-[var(--chat-control-text)]">
                  {formatDuration(item.durationMs)}
                </span>
              </div>

              <div className="mt-4">
                <VideoFavoriteButton
                  compact
                  item={item}
                  reconcile
                  onChanged={onFavoriteChanged}
                  onLoginRequired={onLoginRequired}
                  onMessage={onMessage}
                />
              </div>

              <div className="mt-6">
                <VideoResourceActionButtons
                  item={item}
                  onLoginRequired={onLoginRequired}
                  onMessage={onMessage}
                  onUpgradeRequired={onUpgradeRequired}
                />
              </div>
            </aside>

            <section className="relative order-1 flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black lg:order-2">
              {item.previewVideoUrl ? (
                <video
                  controls
                  playsInline
                  autoPlay
                  muted
                  loop
                  preload="metadata"
                  poster={isStaticCoverUrl(item.coverUrl) ? item.coverUrl : undefined}
                  className="max-h-[min(70dvh,760px)] w-full bg-black object-contain"
                >
                  <source src={item.previewVideoUrl} />
                </video>
              ) : isStaticCoverUrl(item.coverUrl) ? (
                <img src={item.coverUrl} alt={`${item.title} 预览`} className="max-h-[min(70dvh,760px)] w-full object-contain" decoding="async" />
              ) : (
                <div className="flex h-[320px] w-full items-center justify-center text-white/70">
                  <ImageOff className="h-6 w-6" />
                </div>
              )}
            </section>

            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--frontend-prompt-preview-close-bg)] text-[var(--chat-muted)] shadow-sm transition-colors hover:bg-[var(--frontend-prompt-preview-close-hover)] hover:text-[var(--chat-ink)]"
                aria-label="关闭详情"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function VideoBackgroundLibraryPage() {
  const navigate = useNavigate();
  const [loginUser, setLoginUser] = useState<PersistedLoginUser | null>(
    () => getPersistedLoginUser() as PersistedLoginUser | null,
  );
  const [announcementUnreadCount, setAnnouncementUnreadCount] = useState(0);
  const [activeView, setActiveView] = useState<VideoLibraryView>("library");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<VideoBackgroundItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<VideoBackgroundItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VideoBackgroundItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const currentItems = activeView === "favorites" ? favoriteItems : items;

  const showMessage = (message: string, tone: RequestToastTone = "error") => {
    setToast({ message, tone });
  };

  const redirectToLogin = () => {
    navigate("/auth/login", { state: { redirectTo: "/video-backgrounds" } });
  };

  const handlePointBalanceChange = (pointBalance: number) => {
    updatePersistedLoginUser({ pointBalance });
    setLoginUser(getPersistedLoginUser() as PersistedLoginUser | null);
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } finally {
      clearPersistedLoginUser();
      setLoginUser(null);
      navigate("/auth/login", { replace: true });
    }
  };

  useEffect(() => {
    const syncLoginUser = () => {
      setLoginUser(getPersistedLoginUser() as PersistedLoginUser | null);
    };
    const authSessionEvent = getAuthSessionEventName();

    window.addEventListener("storage", syncLoginUser);
    window.addEventListener(authSessionEvent, syncLoginUser);

    return () => {
      window.removeEventListener("storage", syncLoginUser);
      window.removeEventListener(authSessionEvent, syncLoginUser);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    if (!loginUser) {
      setAnnouncementUnreadCount(0);
      return () => {
        isCurrent = false;
      };
    }

    void getUnreadAnnouncementCount()
      .then((count) => {
        if (isCurrent) {
          setAnnouncementUnreadCount(Math.max(0, count));
        }
      })
      .catch(() => {
        if (isCurrent) {
          setAnnouncementUnreadCount(0);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [loginUser]);

  const handleFavoriteChanged = useCallback(({
    favoriteCount,
    isFavorited,
    item,
  }: {
    favoriteCount: number;
    isFavorited: boolean;
    item: VideoBackgroundItem;
  }) => {
    const updatedItem = { ...item, favorited: isFavorited, favoriteCount };
    const updateList = (current: VideoBackgroundItem[]) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, favorited: isFavorited, favoriteCount }
          : currentItem,
      );

    setItems(updateList);
    setFavoriteItems((current) => {
      if (!isFavorited) {
        return current.filter((currentItem) => currentItem.id !== item.id);
      }

      return current.some((currentItem) => currentItem.id === item.id)
        ? updateList(current)
        : [updatedItem, ...current];
    });
    setDetailItem((current) =>
      current?.id === item.id
        ? { ...current, favorited: isFavorited, favoriteCount }
        : current,
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchText(searchInput.trim()), 260);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadPage = async (nextPage: number, append = false, signal?: AbortSignal) => {
    const request = {
      current: nextPage,
      pageSize: PAGE_SIZE,
      memberOnly: activeView === "library" && memberFilter === "member" ? 1 : undefined,
      searchText,
      sortField: "createTime",
      sortOrder: "descend",
      signal,
    } as const;

    if (append) {
      setIsFetchingMore(true);
    } else {
      setIsLoading(true);
      if (activeView === "library") {
        setItems([]);
      } else {
        setFavoriteItems([]);
      }
    }

    try {
      const result = activeView === "favorites"
        ? await listMyVideoBackgroundFavorites(request)
        : await listVideoBackgrounds(request);

      setCurrentPage(result.current);
      setHasMore(result.hasMore);
      const setTargetItems = activeView === "favorites" ? setFavoriteItems : setItems;
      setTargetItems((current) => (append ? [...current, ...result.items] : result.items));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (activeView === "favorites" && isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      showMessage(getErrorMessage(error, "视频素材加载失败"));
    } finally {
      if (append) {
        setIsFetchingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (activeView === "favorites" && !getPersistedLoginUser()) {
      redirectToLogin();
      return;
    }

    const controller = new AbortController();
    void loadPage(1, false, controller.signal);

    return () => controller.abort();
  }, [activeView, memberFilter, searchText]);

  const handleViewChange = (nextView: VideoLibraryView) => {
    if (nextView === "favorites" && !getPersistedLoginUser()) {
      redirectToLogin();
      return;
    }

    setActiveView(nextView);
    setIsMobileFilterOpen(false);
  };

  return (
    <div className="image-studio-chat-page frontend-prompt-page flex text-[var(--chat-ink)]">
      <aside
        className={cn(
          "image-studio-chat-sidebar hidden shrink-0 flex-col border-r border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-bg)] py-3 text-[var(--chat-sidebar-text)] lg:flex",
          isSidebarCollapsed ? "w-[64px] px-2" : "w-[272px] px-3",
        )}
      >
        {isSidebarCollapsed ? (
          <div className="flex h-full flex-col items-center">
            <button type="button" onClick={() => navigate("/")} className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] hover:bg-[var(--chat-sidebar-hover)]" aria-label="Design Everything" title="Design Everything">
              <img src="/images/ownai-logo.png" alt="" className="h-7 w-7 object-contain" />
            </button>
            <button type="button" onClick={() => setIsSidebarCollapsed(false)} className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-hover)]" aria-label="展开导航">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => handleViewChange("library")} className={cn("mt-2 inline-flex h-9 w-9 items-center justify-center rounded-[8px]", activeView === "library" && "bg-[var(--chat-sidebar-active)]")} aria-label="全部素材" title="全部素材">
              <Clapperboard className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => handleViewChange("favorites")} className={cn("mt-2 inline-flex h-9 w-9 items-center justify-center rounded-[8px]", activeView === "favorites" && "bg-[var(--chat-sidebar-active)]")} aria-label="我的收藏" title="我的收藏">
              <Heart className="h-4 w-4" />
            </button>
            <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-[8px]">
              {loginUser ? (
                <AuthenticatedUserMenu
                  align="left"
                  hasUnreadAnnouncements={announcementUnreadCount > 0}
                  menuPlacement="top"
                  onOpenProfile={() => navigate("/profile")}
                  onPointBalanceChange={handlePointBalanceChange}
                  onSignOut={() => void handleSignOut()}
                  onUnreadAnnouncementCountChange={setAnnouncementUnreadCount}
                  onUpgrade={() => navigate("/pricing")}
                  triggerVariant="avatar"
                  user={loginUser}
                />
              ) : (
                <span
                  aria-label="未登录"
                  title="未登录"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--chat-primary-bg)] text-[14px] font-semibold text-[var(--chat-primary-text)]"
                >
                  D
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex h-9 items-center justify-between gap-2">
              <button type="button" onClick={() => navigate("/")} className="inline-flex min-w-0 items-center gap-2 rounded-[8px] text-left hover:opacity-90">
                <img src="/images/ownai-logo.png" alt="Design Everything" className="h-7 w-8 object-contain" />
                <span className="brand-script-logo truncate py-[2px] !text-[16px] !leading-[1.18]">Design Everything</span>
              </button>
              <button type="button" onClick={() => setIsSidebarCollapsed(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-hover)]" aria-label="收起导航">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <nav className="mt-4 flex shrink-0 flex-col gap-1">
              <button type="button" onClick={() => handleViewChange("library")} className={cn("flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-left text-[14px] font-medium transition-colors", activeView === "library" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]" : "text-[var(--chat-sidebar-text)] hover:bg-[var(--chat-sidebar-hover)]")}>
                <Clapperboard className="h-4 w-4" />
                全部素材
              </button>
              <button type="button" onClick={() => handleViewChange("favorites")} className={cn("flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-left text-[14px] font-medium transition-colors", activeView === "favorites" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]" : "text-[var(--chat-sidebar-text)] hover:bg-[var(--chat-sidebar-hover)]")}>
                <Heart className="h-4 w-4" />
                我的收藏
              </button>
            </nav>
            {loginUser ? (
              <div className="mt-auto shrink-0 border-t border-[var(--chat-sidebar-border)] pt-2">
                <div className="flex items-center gap-2 px-1">
                  <AuthenticatedUserMenu
                    align="left"
                    hasUnreadAnnouncements={announcementUnreadCount > 0}
                    menuPlacement="top"
                    onOpenProfile={() => navigate("/profile")}
                    onPointBalanceChange={handlePointBalanceChange}
                    onSignOut={() => void handleSignOut()}
                    onUnreadAnnouncementCountChange={setAnnouncementUnreadCount}
                    onUpgrade={() => navigate("/pricing")}
                    triggerVariant="avatar"
                    user={loginUser}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium leading-4 text-[var(--chat-sidebar-text)]">
                      {getUserDisplayName(loginUser)}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-[12px] font-semibold leading-4 text-[var(--chat-sidebar-text)]">
                    {getUserMemberLabel(loginUser)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </aside>

      <main className="image-studio-chat-scroll min-w-0 flex-1 overflow-y-auto px-3 pb-6 pt-3 sm:px-4 lg:px-4 lg:pb-6 lg:pt-4 2xl:px-5">
        <section className="min-h-full overflow-hidden rounded-[18px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] shadow-[var(--chat-panel-shadow)]">
          <header className="flex min-h-14 items-center gap-3 border-b border-[var(--chat-border)] px-4 py-2.5 sm:px-5">
            <button type="button" onClick={() => setIsMobileFilterOpen(true)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] text-[var(--chat-control-text)] lg:hidden" aria-label="打开筛选">
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[16px] font-semibold text-[var(--chat-ink)]">{activeView === "favorites" ? "我的收藏" : "动效背景素材"}</h1>
              <p className="mt-0.5 hidden text-[12px] text-[var(--chat-muted)] sm:block">{activeView === "favorites" ? "已收藏的视频背景素材" : "带水印预览，登录后获取提示词与无水印原视频"}</p>
            </div>
            <label className="flex h-9 min-w-0 flex-[1.4] items-center gap-2 rounded-[9px] bg-[var(--chat-control-soft)] px-3 text-[var(--chat-muted)] sm:max-w-[380px]">
              <Search className="h-4 w-4 shrink-0" />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="搜索视频素材" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--chat-ink)] placeholder:text-[var(--chat-input-placeholder)] focus:outline-none" />
            </label>
          </header>

          {activeView === "library" ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--chat-border)] px-4 py-2.5 sm:px-5">
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--chat-muted)]"><SlidersHorizontal className="h-3.5 w-3.5" />筛选</span>
              <button type="button" onClick={() => setMemberFilter("all")} className={cn("inline-flex h-8 items-center rounded-[7px] px-2.5 text-[12px] font-medium transition-colors", memberFilter === "all" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-ink)]" : "text-[var(--chat-muted)] hover:bg-[var(--chat-control-soft)]")}>全部</button>
              <button type="button" onClick={() => setMemberFilter("member")} className={cn("inline-flex h-8 items-center rounded-[7px] px-2.5 text-[12px] font-medium transition-colors", memberFilter === "member" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-ink)]" : "text-[var(--chat-muted)] hover:bg-[var(--chat-control-soft)]")}>会员专享</button>
            </div>
          ) : null}

          <div className="px-4 py-4 sm:px-5">
            {isLoading ? (
              <PromptMasonry maxColumnCount={4} preferredColumnWidth={250}>
                {Array.from({ length: 8 }).map((_, index) => <VideoBackgroundSkeleton key={index} />)}
              </PromptMasonry>
            ) : currentItems.length ? (
              <>
                <PromptMasonry
                  getItemHeight={(index) => 1 / getVideoAspectRatio(currentItems[index])}
                  maxColumnCount={4}
                  preferredColumnWidth={250}
                >
                  {currentItems.map((item) => (
                    <VideoBackgroundCard key={item.id} item={item} onFavoriteChanged={handleFavoriteChanged} onLoginRequired={redirectToLogin} onMessage={showMessage} onOpen={setDetailItem} onUpgradeRequired={() => navigate("/pricing")} />
                  ))}
                </PromptMasonry>
                {hasMore ? (
                  <div className="mt-5 flex justify-center">
                    <button type="button" onClick={() => void loadPage(currentPage + 1, true)} disabled={isFetchingMore} className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-3.5 text-[13px] font-semibold text-[var(--chat-control-text)] transition-colors hover:bg-[var(--chat-control-hover)] disabled:cursor-not-allowed disabled:opacity-70">
                      {isFetchingMore ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      {isFetchingMore ? "加载中" : "加载更多"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
                <FileVideo2 className="h-6 w-6 text-[var(--chat-muted-2)]" />
                <p className="mt-3 text-[14px] font-semibold text-[var(--chat-ink)]">{activeView === "favorites" ? "还没有收藏视频素材" : "暂未找到匹配的视频素材"}</p>
                <p className="mt-1 text-[12px] text-[var(--chat-muted)]">调整会员筛选或搜索词后再试</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <SheetContent side="left" className="image-studio-chat-sheet image-studio-chat-sidebar w-[min(88vw,300px)] overflow-hidden border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-bg)] p-0 text-[var(--chat-sidebar-text)] shadow-none [&>button]:hidden">
          <SheetTitle className="sr-only">视频素材</SheetTitle>
          <SheetDescription className="sr-only">选择全部素材或我的收藏</SheetDescription>
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between"><span className="text-[15px] font-semibold">筛选素材</span><button type="button" onClick={() => setIsMobileFilterOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] hover:bg-[var(--chat-sidebar-hover)]" aria-label="关闭筛选"><X className="h-4 w-4" /></button></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => handleViewChange("library")} className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-[8px] text-[13px] font-medium transition-colors", activeView === "library" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]" : "bg-[var(--chat-control-soft)] text-[var(--chat-sidebar-muted)]")}>
                <Clapperboard className="h-4 w-4" />全部素材
              </button>
              <button type="button" onClick={() => handleViewChange("favorites")} className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-[8px] text-[13px] font-medium transition-colors", activeView === "favorites" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]" : "bg-[var(--chat-control-soft)] text-[var(--chat-sidebar-muted)]")}>
                <Heart className="h-4 w-4" />我的收藏
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {detailItem ? <VideoBackgroundDetail item={detailItem} onClose={() => setDetailItem(null)} onFavoriteChanged={handleFavoriteChanged} onLoginRequired={redirectToLogin} onMessage={showMessage} onUpgradeRequired={() => navigate("/pricing")} /> : null}
      {toast ? <RequestErrorToast message={toast.message} tone={toast.tone} variant="chat" onClose={() => setToast(null)} /> : null}
    </div>
  );
}
