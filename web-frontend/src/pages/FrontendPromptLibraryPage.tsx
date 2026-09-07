import { usePromptUnlock } from "@/components/prompt/PromptUnlockProvider";
import { subscribePromptAccess } from "@/lib/prompt-unlock";
import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
  FileText,
  Heart,
  Home,
  LoaderCircle,
  Lock,
  Menu,
  PanelLeftOpen,
  PanelLeftClose,
  Search,
  Star,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthenticatedUserMenu } from "@/components/home/AuthenticatedUserMenu";
import { PromptMasonry } from "@/components/frontend-prompts/PromptMasonry";
import { RequestErrorToast } from "@/components/ui/RequestErrorToast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getAnnouncementDetail,
  getUnreadAnnouncementCount,
  listAnnouncements,
  markAnnouncementRead,
} from "@/lib/announcement";
import {
  getArtworkHomeOverview,
  getArtworkPromptContent,
  getPromptAssetPromptContent,
  downloadArtworkSource,
  listHomeArtworks,
} from "@/lib/artwork";
import {
  addArtworkFavorite,
  addPromptAssetFavorite,
  cancelArtworkFavorite,
  cancelPromptAssetFavorite,
  checkArtworkFavorite,
  checkPromptAssetFavorite,
  listMyArtworkFavorites,
  notifyArtworkFavoriteChange,
  notifyPromptAssetFavoriteChange,
  subscribeArtworkFavoriteChange,
  subscribePromptAssetFavoriteChange,
} from "@/lib/favorite";
import {
  clearPersistedLoginUser,
  getPersistedLoginUser,
  logoutUser,
  updatePersistedLoginUser,
} from "@/lib/auth";
import { getAuthSessionEventName, getPersistedAuthToken } from "@/lib/auth-session";
import {
  getArtworkAccessState,
} from "@/lib/artwork-display-rules";
import { getJson, isAuthenticationError, RequestError } from "@/lib/request";
import { cn } from "@/lib/utils";
import type {
  CategoryVO,
  AnnouncementVO,
  LoginUserVO,
  SiteItem,
  TagVO,
} from "@/lib/types";

const FRONTEND_PROMPT_CATEGORY_ID = "2071608263790104578";
const IMAGE_PROMPT_CATEGORY_ID = "2057283059198771201";
const PAGE_SIZE = 20;

type FrontendPromptView = "home" | "library" | "favorites";
type CategoryKey = string;

interface PromptDetailState {
  imageAspectRatio: number;
  isVertical: boolean;
  item: SiteItem;
  promptContent: string;
}

interface FrontendPromptFilter {
  categoryId?: string;
  tagId?: string;
}

interface FrontendPromptCategory {
  children?: FrontendPromptCategory[];
  description?: string;
  filter: FrontendPromptFilter;
  id: CategoryKey;
  name: string;
}

const CATEGORY_PROMPT_CARD_VARIANTS = [
  "square",
  "vertical",
  "square",
  "square",
  "square",
  "vertical",
  "square",
  "square",
  "vertical",
  "square",
  "square",
  "square",
] as const;

function isVerticalCategoryPromptCard(index: number) {
  return CATEGORY_PROMPT_CARD_VARIANTS[index % CATEGORY_PROMPT_CARD_VARIANTS.length] === "vertical";
}

function getPromptImageAspectRatio(item: SiteItem) {
  if (
    typeof item.imageAspectRatio === "number" &&
    Number.isFinite(item.imageAspectRatio) &&
    item.imageAspectRatio > 0
  ) {
    return item.imageAspectRatio;
  }

  if (
    typeof item.imageWidth === "number" &&
    item.imageWidth > 0 &&
    typeof item.imageHeight === "number" &&
    item.imageHeight > 0
  ) {
    return item.imageWidth / item.imageHeight;
  }

  return undefined;
}

function getPromptCardEstimatedHeight(item: SiteItem, index: number) {
  const fallbackRatio = isVerticalCategoryPromptCard(index) ? 9 / 16 : 4 / 3;
  const imageRatio = getPromptImageAspectRatio(item) ?? fallbackRatio;

  return 1 / imageRatio + 0.25;
}

type PersistedLoginUser = LoginUserVO & { userAccount?: string };

const MEMBER_LABELS: Record<string, string> = {
  NORMAL: "普通用户",
  MEMBER: "会员",
};

function getUserDisplayName(user: PersistedLoginUser) {
  return (
    user.userName?.trim() ||
    user.userAccount?.trim() ||
    "DESIGN EVERYTHING MEMBER"
  );
}

function getUserInitial(user: PersistedLoginUser) {
  return getUserDisplayName(user).charAt(0).toUpperCase() || "D";
}

function getUserMemberLabel(user: PersistedLoginUser) {
  const memberLevel = user.memberLevel?.trim().toUpperCase() || "NORMAL";

  return MEMBER_LABELS[memberLevel] ?? `${user.memberLevel} 会员`;
}

function getAnnouncementText(value?: string) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAnnouncementUnread(announcement?: AnnouncementVO | null) {
  const readStatus = announcement?.readStatus;

  return readStatus === false || readStatus === 0 || readStatus === "0";
}

function getTrimmedText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizeCategoryName(name: string) {
  return name.trim();
}

function dedupeCategories(categories: FrontendPromptCategory[]) {
  const seen = new Set<string>();

  return categories.filter((category) => {
    const key = String(category.id);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeTagChild(categoryId: string, tag: TagVO): FrontendPromptCategory | null {
  const name = getTrimmedText(tag.name);

  if (!name) {
    return null;
  }

  const tagId = String(tag.id ?? name);

  return {
    id: `tag:${categoryId}:${tagId}`,
    name,
    description: getTrimmedText(tag.description) || undefined,
    filter: {
      categoryId,
      tagId,
    },
  };
}

function normalizeCategoryNode(category: CategoryVO): FrontendPromptCategory | null {
  const name = getTrimmedText(category.name);

  if (!name) {
    return null;
  }

  const categoryId = String(category.id ?? name);
  const childCategories = (category.children ?? [])
    .map(normalizeCategoryNode)
    .filter((child): child is FrontendPromptCategory => Boolean(child));
  const tagChildren = (category.tags ?? [])
    .map((tag) => normalizeTagChild(categoryId, tag))
    .filter((child): child is FrontendPromptCategory => Boolean(child));

  return {
    id: `category:${categoryId}`,
    name,
    description: getTrimmedText(category.description) || undefined,
    filter: {
      categoryId,
    },
    children: dedupeCategories([...childCategories, ...tagChildren]),
  };
}

async function listFrontendCategoryNavigation(options?: { signal?: AbortSignal }) {
  const result = await getJson<CategoryVO[]>("/category/tree", {
    includeAuthToken: false,
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "分类加载失败", {
      code: result.code,
    });
  }

  const remoteCategories = (result.data ?? [])
    .map(normalizeCategoryNode)
    .filter((category): category is FrontendPromptCategory => Boolean(category))
    .filter((category) => category.filter.categoryId !== IMAGE_PROMPT_CATEGORY_ID);

  return dedupeCategories(remoteCategories);
}

function findCategoryById(
  categories: FrontendPromptCategory[],
  categoryId: CategoryKey,
): FrontendPromptCategory | null {
  for (const category of categories) {
    if (category.id === categoryId) {
      return category;
    }

    const childMatch = findCategoryById(category.children ?? [], categoryId);

    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

function getRelativeDateLabel(value?: string) {
  if (!value) {
    return "最近更新";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "最近更新";
  }

  return parsed.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

function getCategoryNameSet(categories: FrontendPromptCategory[]) {
  const names = new Set<string>();

  const collect = (categoryList: FrontendPromptCategory[]) => {
    categoryList.forEach((category) => {
      names.add(normalizeCategoryName(category.name));

      if (category.children?.length) {
        collect(category.children);
      }
    });
  };

  collect(categories);

  return names;
}

function filterFrontendItems(
  items: SiteItem[],
  categories: FrontendPromptCategory[],
) {
  const categoryNames = getCategoryNameSet(categories);

  return items.filter((item) => {
    const categoryName = normalizeCategoryName(item.category);

    return (
      categoryNames.has(categoryName) ||
      categoryName === "Untitled prompt asset"
    );
  });
}

function FrontendPromptSidebar({
  activeView,
  activeCategory,
  announcementUnreadCount,
  categories,
  isCollapsed,
  onCategoryChange,
  onAnnouncementUnreadCountChange,
  onToggleCollapsed,
  onViewChange,
  variant = "desktop",
}: {
  activeView: FrontendPromptView;
  activeCategory: CategoryKey;
  announcementUnreadCount: number;
  categories: FrontendPromptCategory[];
  isCollapsed: boolean;
  onCategoryChange: (categoryId: CategoryKey) => void;
  onAnnouncementUnreadCountChange: (count: number) => void;
  onToggleCollapsed: () => void;
  onViewChange: (view: FrontendPromptView) => void;
  variant?: "desktop" | "mobile";
}) {
  const navigate = useNavigate();
  const [loginUser, setLoginUser] = useState<PersistedLoginUser | null>(
    () => getPersistedLoginUser() as PersistedLoginUser | null,
  );
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(
    () => new Set(),
  );
  const items = [
    { id: "home" as const, icon: Home, label: "首页" },
    { id: "favorites" as const, icon: Heart, label: "收藏" },
  ];

  useEffect(() => {
    const authSessionEvent = getAuthSessionEventName();
    const syncLoginUser = () => {
      setLoginUser(getPersistedLoginUser() as PersistedLoginUser | null);
    };

    window.addEventListener("storage", syncLoginUser);
    window.addEventListener(authSessionEvent, syncLoginUser);

    return () => {
      window.removeEventListener("storage", syncLoginUser);
      window.removeEventListener(authSessionEvent, syncLoginUser);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!loginUser) {
      onAnnouncementUnreadCountChange(0);
      return () => {
        isActive = false;
      };
    }

    getUnreadAnnouncementCount()
      .then((count) => {
        if (isActive) {
          onAnnouncementUnreadCountChange(Math.max(0, count));
        }
      })
      .catch(() => {
        if (isActive) {
          onAnnouncementUnreadCountChange(0);
        }
      });

    return () => {
      isActive = false;
    };
  }, [loginUser, onAnnouncementUnreadCountChange]);

  useEffect(() => {
    const nextCollapsedIds = new Set<string>();

    categories.forEach((category) => {
      if (category.children?.length) {
        nextCollapsedIds.add(String(category.id));
      }
    });

    setCollapsedCategoryIds(nextCollapsedIds);
  }, [categories]);

  const handlePointBalanceChange = (pointBalance: number) => {
    updatePersistedLoginUser({ pointBalance });
  };

  const handleProfileOpen = () => {
    navigate("/profile");
  };

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } finally {
      clearPersistedLoginUser();
      navigate("/auth/login", { replace: true });
    }
  };

  if (isCollapsed) {
    const iconButtonClassName =
      "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[8px] text-[var(--chat-sidebar-muted)] transition-colors hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)]";

    return (
      <aside className="image-studio-chat-sidebar hidden w-[64px] shrink-0 flex-col items-center border-r border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-bg)] px-2 py-3 text-[var(--chat-sidebar-text)] lg:flex">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className={cn(iconButtonClassName, "text-[var(--chat-sidebar-text)]")}
            aria-label="Design Everything"
            title="Design Everything"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-[8px]">
              <img
                src="/images/ownai-logo.png"
                alt="Design Everything"
                className="h-7 w-7 object-contain"
                draggable={false}
              />
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleCollapsed}
            className={iconButtonClassName}
            aria-label="展开导航栏"
            title="展开导航栏"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>

          {items.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={cn(
                  iconButtonClassName,
                  active && "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]",
                )}
                aria-label={item.label}
                title={item.label}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-[8px]">
          {loginUser ? (
            <AuthenticatedUserMenu
              align="left"
              hasUnreadAnnouncements={announcementUnreadCount > 0}
              menuPlacement="top"
              onOpenProfile={handleProfileOpen}
              onPointBalanceChange={handlePointBalanceChange}
              onSignOut={handleSignOut}
              onUnreadAnnouncementCountChange={onAnnouncementUnreadCountChange}
              onUpgrade={handleUpgrade}
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
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "image-studio-chat-sidebar shrink-0 flex-col bg-[var(--chat-sidebar-bg)] px-3 py-3 text-[var(--chat-sidebar-text)] transition-[width,padding] duration-200 ease-out",
        variant === "mobile"
          ? "flex h-full w-full"
          : "hidden border-r border-[var(--chat-sidebar-border)] lg:flex",
        variant === "desktop" && (isCollapsed ? "w-[76px]" : "w-[272px]"),
      )}
    >
      <div className="h-full overflow-visible pr-1">
        <div className="flex h-full min-h-0 flex-col overflow-hidden text-[13px] lg:overflow-visible">
      <div
        className={cn(
          "flex h-9 gap-2",
          isCollapsed
            ? "flex-col items-center justify-center"
            : "items-center justify-between",
        )}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className={cn(
            "inline-flex min-w-0 shrink cursor-pointer items-center gap-2 rounded-[8px] text-left text-[var(--hero-ink)] transition-opacity hover:opacity-90",
            isCollapsed && "h-8 w-8 justify-center overflow-hidden rounded-[10px] px-0",
          )}
          aria-label="Design Everything"
        >
          <span className="inline-flex h-8 w-9 shrink-0 items-center justify-center">
            <img
              src="/images/ownai-logo.png"
              alt="Design Everything"
              className="h-7 w-auto object-contain drop-shadow-[0_8px_18px_rgba(91,125,210,0.16)]"
              draggable={false}
              decoding="async"
            />
          </span>
          {!isCollapsed ? (
            <span className="brand-script-logo truncate py-[2px] !text-[16px] !leading-[1.18]">
              Design Everything
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--chat-sidebar-muted)] transition-colors hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)]"
          aria-label={variant === "mobile" ? "关闭导航" : isCollapsed ? "展开导航栏" : "收起导航栏"}
          title={variant === "mobile" ? "关闭导航" : isCollapsed ? "展开导航栏" : "收起导航栏"}
        >
          {variant === "mobile" ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className={cn("mt-4 flex shrink-0 flex-col gap-1", isCollapsed && "items-center")}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex h-9 w-full cursor-pointer items-center rounded-[10px] text-left text-[14px] font-medium transition-colors",
                isCollapsed ? "justify-center px-0" : "gap-3 px-2.5",
                active
                  ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]"
                  : "text-[var(--chat-sidebar-text)] hover:bg-[var(--chat-sidebar-hover)]",
              )}
              aria-label={item.label}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4" />
              {!isCollapsed ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      {!isCollapsed ? (
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 pr-1 max-lg:pr-0">
        <div className="flex h-7 items-center px-2.5">
          <span className="text-[12px] font-semibold text-[var(--chat-sidebar-muted)]">
            分类
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-0.5 pr-0.5">
          {categories.map((category) => {
            const active = activeCategory === category.id;
            const children = category.children ?? [];
            const hasChildren = children.length > 0;
            const childrenCollapsed = collapsedCategoryIds.has(String(category.id));

            return (
              <div key={category.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (hasChildren) {
                      setCollapsedCategoryIds((currentIds) => {
                        const nextIds = new Set(currentIds);
                        const key = String(category.id);

                        if (nextIds.has(key)) {
                          nextIds.delete(key);
                        } else {
                          nextIds.add(key);
                        }

                        return nextIds;
                      });
                    }

                    onCategoryChange(category.id);
                  }}
                  className={cn(
                    "inline-flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors",
                    active
                      ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]"
                      : "text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)]",
                  )}
                  title={category.description || category.name}
                >
                  <span className="truncate">{category.name}</span>
                  {hasChildren ? (
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--chat-sidebar-muted)]">
                      {childrenCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  ) : null}
                </button>

                {hasChildren && !childrenCollapsed ? (
                  <div className="ml-3 mt-1 border-l border-[var(--chat-sidebar-border)] pl-2">
                    {children.map((child) => {
                      const childActive = activeCategory === child.id;

                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => onCategoryChange(child.id)}
                          className={cn(
                            "mb-1 inline-flex min-h-8 w-full cursor-pointer items-center rounded-[8px] px-2.5 py-1.5 text-left text-[12px] transition-colors",
                            childActive
                              ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]"
                              : "text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)]",
                          )}
                          title={child.description || child.name}
                        >
                          <span className="truncate">{child.name}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      ) : (
        <div className="min-h-0 flex-1" />
      )}

      {loginUser ? (
        <div className="mt-2.5 shrink-0 border-t border-[var(--chat-sidebar-border)] pt-2">
          <div className="flex items-center gap-2 px-1">
            <AuthenticatedUserMenu
              align="left"
              hasUnreadAnnouncements={announcementUnreadCount > 0}
              menuPlacement="top"
              onOpenProfile={handleProfileOpen}
              onPointBalanceChange={handlePointBalanceChange}
              onSignOut={handleSignOut}
              onUnreadAnnouncementCountChange={onAnnouncementUnreadCountChange}
              onUpgrade={handleUpgrade}
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
      </div>
    </aside>
  );
}

function ArtworkSourceButton({
  item,
  onMessage,
  variant,
}: {
  item: SiteItem;
  onMessage: (message: string) => void;
  variant: "card" | "section";
}) {
  const navigate = useNavigate();
  const requestUnlock = usePromptUnlock();
  const [isDownloading, setIsDownloading] = useState(false);
  const hasSourceCode =
    item.sourceType === "artwork" && item.hasSourceCode === true;
  const isSourceLocked =
    hasSourceCode && getArtworkAccessState(item) === "locked";

  if (!hasSourceCode) {
    return null;
  }

  const redirectToLogin = () => {
    navigate("/auth/login", {
      state: {
        redirectTo: "/frontend-prompts",
      },
    });
  };

  const handleDownload = async () => {
    if (isDownloading) {
      return;
    }

    if (isSourceLocked) {
      await requestUnlock(item.id);
      return; // A second, explicit click downloads the unlocked package.
    }

    if (!getPersistedLoginUser() || !getPersistedAuthToken()) {
      redirectToLogin();
      return;
    }

    setIsDownloading(true);

    try {
      await downloadArtworkSource(item.id, item.title);
    } catch (error) {
      if (
        error instanceof RequestError &&
        (error.status === 404 || error.code === 40400)
      ) {
        onMessage("该作品暂未提供源码");
        return;
      }

      if (
        error instanceof RequestError &&
        (error.status === 403 || error.code === 40300 || error.code === 40101)
      ) {
        await requestUnlock(item.id);
        return;
      }

      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      onMessage(
        error instanceof RequestError ? error.message : "源码下载失败",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const label = isDownloading
    ? "下载中"
    : isSourceLocked
      ? "解锁源码"
      : "下载源码";
  const Icon = isDownloading
    ? LoaderCircle
    : isSourceLocked
      ? Lock
      : Download;

  if (variant === "section") {
    return (
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={isDownloading}
        className="mt-2 flex h-10 w-full items-center justify-between rounded-[10px] border border-[var(--chat-border)] bg-[var(--chat-control-soft)] px-4 text-left text-[14px] font-semibold text-[var(--chat-ink)] shadow-[0_2px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[var(--chat-border-strong)] hover:bg-[var(--chat-control-hover)] disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
      >
        <span className="inline-flex items-center gap-2">
          <Code2 className="h-4 w-4 text-[var(--chat-muted)]" />
          源码
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--chat-muted)]">
          <Icon
            className={cn("h-3.5 w-3.5", isDownloading && "animate-spin")}
          />
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void handleDownload();
      }}
      disabled={isDownloading}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-control-bg)] px-2 text-[12px] font-semibold text-[var(--frontend-prompt-card-control-text)] transition-colors hover:border-[var(--frontend-prompt-card-border-hover)] hover:bg-[var(--frontend-prompt-card-control-hover)] hover:text-[var(--frontend-prompt-card-text)] disabled:cursor-not-allowed disabled:opacity-70"
      aria-label={label}
      title={label}
    >
      <Icon className={cn("h-3.5 w-3.5", isDownloading && "animate-spin")} />
      <span>{label}</span>
    </button>
  );
}

function PromptCard({
  item,
  index,
  onCopy,
  onMessage,
  onOpen,
}: {
  item: SiteItem;
  index: number;
  onCopy: (item: SiteItem) => Promise<boolean>;
  onMessage: (message: string) => void;
  onOpen: (item: SiteItem, imageAspectRatio: number) => Promise<boolean>;
}) {
  const navigate = useNavigate();
  const requestUnlock = usePromptUnlock();
  const fallbackAspectRatio = isVerticalCategoryPromptCard(index) ? 9 / 16 : 4 / 3;
  const imageAspectRatio = getPromptImageAspectRatio(item) ?? fallbackAspectRatio;
  const isArtworkFavorite = item.sourceType === "artwork";
  const hasFavoriteApi = isArtworkFavorite || item.sourceType === "promptAsset";
  const [isFavorited, setIsFavorited] = useState(Boolean(item.favorited));
  const [favoriteCount, setFavoriteCount] = useState(item.favoriteCount ?? 0);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isOpenLoading, setIsOpenLoading] = useState(false);
  const [isCopyLoading, setIsCopyLoading] = useState(false);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [isCoverUnavailable, setIsCoverUnavailable] = useState(!item.image);
  const isImageLoaded = loadedImageUrl === item.image;
  const isMediaReady = isImageLoaded || isCoverUnavailable;
  const accessState = getArtworkAccessState(item);
  const isLocked = accessState === "locked";
  const isLoggedIn = Boolean(getPersistedLoginUser());

  useEffect(() => {
    setLoadedImageUrl(null);
    setIsCoverUnavailable(!item.image);
  }, [item.id, item.image]);

  useEffect(() => {
    setIsFavorited(Boolean(item.favorited));
    setFavoriteCount(item.favoriteCount ?? 0);
  }, [item.favoriteCount, item.favorited, item.id]);

  useEffect(() => {
    if (!hasFavoriteApi || !getPersistedLoginUser()) {
      setIsFavorited(false);
      return;
    }

    if (isArtworkFavorite && item.favorited !== undefined) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;
    const favoriteCheck = isArtworkFavorite
      ? checkArtworkFavorite(item.id, { signal: controller.signal })
      : checkPromptAssetFavorite(item.id, { signal: controller.signal });

    void favoriteCheck
      .then((nextValue) => {
        if (isActive) {
          setIsFavorited(nextValue);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [hasFavoriteApi, isArtworkFavorite, item.favorited, item.id]);

  useEffect(() => {
    if (!hasFavoriteApi) {
      return;
    }

    if (isArtworkFavorite) {
      return subscribeArtworkFavoriteChange((change) => {
        if (String(change.artworkId) === String(item.id)) {
          setIsFavorited(change.isFavorited);
          if (change.favoriteCount !== undefined) {
            setFavoriteCount(change.favoriteCount);
          }
        }
      });
    }

    return subscribePromptAssetFavoriteChange((change) => {
      if (String(change.promptAssetId) === String(item.id)) {
        setIsFavorited(change.isFavorited);
      }
    });
  }, [hasFavoriteApi, isArtworkFavorite, item.id]);

  const redirectToLogin = () => {
    navigate("/auth/login", {
      state: {
        redirectTo: "/frontend-prompts",
      },
    });
  };

  const handleUnlock = () => {
    if (item.sourceType === "artwork") { void requestUnlock(item.id); return; }
    if (isLoggedIn) {
      navigate("/pricing");
    } else {
      redirectToLogin();
    }
  };

  const handleFavorite = async () => {
    if (!hasFavoriteApi || isFavoriteLoading) {
      return;
    }

    if (!getPersistedLoginUser()) {
      redirectToLogin();
      return;
    }

    const previousValue = isFavorited;
    const previousCount = favoriteCount;
    const nextValue = !previousValue;
    const nextCount = nextValue
      ? previousCount + 1
      : Math.max(previousCount - 1, 0);

    setIsFavorited(nextValue);
    setFavoriteCount(nextCount);
    setIsFavoriteLoading(true);

    if (isArtworkFavorite) {
      notifyArtworkFavoriteChange({
        artworkId: String(item.id),
        favoriteCount: nextCount,
        isFavorited: nextValue,
      });
    } else {
      notifyPromptAssetFavoriteChange({
        promptAssetId: String(item.id),
        isFavorited: nextValue,
      });
    }

    try {
      if (nextValue) {
        if (isArtworkFavorite) {
          await addArtworkFavorite(item.id);
        } else {
          await addPromptAssetFavorite(item.id);
        }
      } else if (isArtworkFavorite) {
        await cancelArtworkFavorite(item.id);
      } else {
        await cancelPromptAssetFavorite(item.id);
      }
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setIsFavorited(previousValue);
      setFavoriteCount(previousCount);
      if (isArtworkFavorite) {
        notifyArtworkFavoriteChange({
          artworkId: String(item.id),
          favoriteCount: previousCount,
          isFavorited: previousValue,
        });
      } else {
        notifyPromptAssetFavoriteChange({
          promptAssetId: String(item.id),
          isFavorited: previousValue,
        });
      }
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleOpen = async () => {
    if (isOpenLoading) {
      return;
    }

    setIsOpenLoading(true);

    try {
      await onOpen(item, imageAspectRatio);
    } finally {
      setIsOpenLoading(false);
    }
  };

  const handleCopy = async () => {
    if (isLocked) {
      handleUnlock();
      return;
    }

    if (isCopyLoading) {
      return;
    }

    setIsCopyLoading(true);

    try {
      const didComplete = await onCopy(item);

      if (didComplete) {
        setIsCopied(true);
        window.setTimeout(() => setIsCopied(false), 1400);
      }
    } finally {
      setIsCopyLoading(false);
    }
  };

  return (
    <article
      aria-busy={isOpenLoading || isCopyLoading}
      className="group relative inline-flex w-full flex-col overflow-hidden rounded-[16px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-bg)] shadow-[var(--frontend-prompt-card-shadow)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--frontend-prompt-card-border-hover)] hover:shadow-[var(--frontend-prompt-card-shadow-hover)]"
    >
      <button
        type="button"
        onClick={() => void handleOpen()}
        disabled={isOpenLoading}
        aria-label={`查看 ${item.title}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--chat-border-strong)]"
      />
      <div className="relative shrink-0 overflow-hidden bg-[var(--frontend-prompt-card-image-bg)]" style={{ aspectRatio: imageAspectRatio }}>
        {!isMediaReady ? (
          <div className="frontend-prompt-card-skeleton absolute inset-0 opacity-95" />
        ) : null}
        {!isCoverUnavailable && item.image ? (
          <img
            key={item.image}
            src={item.image}
            alt={`${item.title} 预览`}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onLoad={() => setLoadedImageUrl(item.image)}
            onError={() => setIsCoverUnavailable(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--frontend-prompt-card-muted)]">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            if (hasFavoriteApi) {
              void handleFavorite();
            }
          }}
          disabled={hasFavoriteApi && isFavoriteLoading}
          className={cn(
            "absolute right-2.5 top-2.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-favorite-bg)] text-[var(--frontend-prompt-card-muted)] opacity-0 shadow-[0_12px_28px_rgba(0,0,0,0.14)] backdrop-blur-md transition-[background-color,border-color,color,opacity] group-hover:opacity-100 focus-visible:opacity-100 hover:border-[var(--frontend-prompt-card-border-hover)] hover:bg-[var(--frontend-prompt-favorite-hover-bg)] hover:text-[var(--frontend-prompt-card-text)] disabled:cursor-not-allowed disabled:opacity-70",
            isFavorited && "text-amber-500 opacity-100",
          )}
          aria-label={isFavorited ? "取消收藏" : "收藏"}
          aria-pressed={hasFavoriteApi ? isFavorited : undefined}
          title={
            hasFavoriteApi
              ? `${isFavorited ? "取消收藏" : "收藏"} (${favoriteCount})`
              : "收藏"
          }
        >
          {isFavoriteLoading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Star className="h-4 w-4" fill={isFavorited ? "currentColor" : "none"} />
          )}
        </button>
      </div>

      <div className="flex min-h-[64px] shrink-0 items-center justify-between gap-2 bg-[var(--frontend-prompt-card-footer-bg)] px-3 pb-3 pt-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold leading-5 text-[var(--frontend-prompt-card-text)]">
            {item.title}
          </h3>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--frontend-prompt-card-muted)]">
            <span className="truncate">{item.permanentlyUnlocked ? "已永久解锁" : item.category || "前端提示词"}</span>
            {isLocked ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleUnlock();
                }}
                className="relative z-20 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--frontend-prompt-card-muted)] transition-colors hover:bg-[var(--frontend-prompt-card-control-hover)] hover:text-[var(--frontend-prompt-card-text)]"
                aria-label="查看解锁方式"
                title="查看解锁方式"
              >
                <Lock className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="relative z-20 flex shrink-0 items-center gap-1.5">
          <ArtworkSourceButton
            item={item}
            onMessage={onMessage}
            variant="card"
          />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleCopy();
            }}
            disabled={isCopyLoading}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-control-bg)] px-2.5 text-[12px] font-semibold text-[var(--frontend-prompt-card-control-text)] transition-colors hover:border-[var(--frontend-prompt-card-border-hover)] hover:bg-[var(--frontend-prompt-card-control-hover)] hover:text-[var(--frontend-prompt-card-text)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCopyLoading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : isLocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : isCopied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>
              {isCopyLoading
                ? "读取中"
                : isLocked
                  ? isLoggedIn
                    ? (item.sourceType === "artwork" ? "积分解锁" : "升级")
                    : "解锁"
                  : isCopied
                    ? "已复制"
                    : "复制"}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

function PromptCardSkeleton({ index }: { index: number }) {
  const isVertical = isVerticalCategoryPromptCard(index);

  return (
    <div
      className={cn(
        "inline-flex w-full break-inside-avoid-column flex-col overflow-hidden rounded-[16px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-bg)]",
        isVertical ? "aspect-[1/2]" : "aspect-square",
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "frontend-prompt-card-skeleton",
          isVertical ? "min-h-0 flex-1" : "aspect-[4/3] shrink-0",
        )}
      />
      <div
        className={cn(
          "flex items-center justify-between gap-3 bg-[var(--frontend-prompt-card-footer-bg)] px-3 pb-3 pt-2.5",
          isVertical ? "min-h-[64px] shrink-0" : "min-h-0 flex-1",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="h-3.5 w-3/4 animate-pulse rounded-[5px] bg-[var(--chat-control-soft)]" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded-[5px] bg-[var(--chat-control-soft)]" />
        </div>
        <div className="h-8 w-14 shrink-0 animate-pulse rounded-[8px] bg-[var(--chat-control-soft)]" />
      </div>
    </div>
  );
}

function EmptyState({
  message,
  title = "暂无前端提示词",
  action,
}: {
  message: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-6 py-12 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--chat-control-soft)] text-[var(--chat-muted)]">
        <FileText className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-[17px] font-semibold text-[var(--chat-ink)]">
        {title}
      </h3>
      <p className="mt-2 max-w-[420px] text-[13px] leading-6 text-[var(--chat-muted)]">
        {message}
      </p>
      {action}
    </div>
  );
}

function PromptDetailDialog({
  detail,
  onClose,
  onMessage,
}: {
  detail: PromptDetailState;
  onClose: () => void;
  onMessage: (message: string) => void;
}) {
  const navigate = useNavigate();
  const requestUnlock = usePromptUnlock();
  const [isCopied, setIsCopied] = useState(false);
  const [isFavorited, setIsFavorited] = useState(Boolean(detail.item.favorited));
  const [favoriteCount, setFavoriteCount] = useState(detail.item.favoriteCount ?? 0);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isVideoUnavailable, setIsVideoUnavailable] = useState(false);
  const accessState = getArtworkAccessState(detail.item);
  const isLocked = accessState === "locked";
  const isArtworkFavorite = detail.item.sourceType === "artwork";
  const hasFavoriteApi = isArtworkFavorite || detail.item.sourceType === "promptAsset";
  const hasArtworkSourceCode =
    detail.item.sourceType === "artwork" && detail.item.hasSourceCode === true;
  const shouldShowSections =
    detail.item.sourceType !== "artwork" || hasArtworkSourceCode;

  useEffect(() => {
    setIsFavorited(Boolean(detail.item.favorited));
    setFavoriteCount(detail.item.favoriteCount ?? 0);
  }, [detail.item.favoriteCount, detail.item.favorited, detail.item.id]);

  useEffect(() => {
    if (!hasFavoriteApi || !getPersistedLoginUser()) {
      setIsFavorited(false);
      return;
    }

    if (isArtworkFavorite && detail.item.favorited !== undefined) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;
    const favoriteCheck = isArtworkFavorite
      ? checkArtworkFavorite(detail.item.id, { signal: controller.signal })
      : checkPromptAssetFavorite(detail.item.id, { signal: controller.signal });

    void favoriteCheck
      .then((nextValue) => {
        if (isActive) {
          setIsFavorited(nextValue);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [detail.item.favorited, detail.item.id, hasFavoriteApi, isArtworkFavorite]);

  useEffect(() => {
    if (!hasFavoriteApi) {
      return;
    }

    if (isArtworkFavorite) {
      return subscribeArtworkFavoriteChange((change) => {
        if (String(change.artworkId) === String(detail.item.id)) {
          setIsFavorited(change.isFavorited);
          if (change.favoriteCount !== undefined) {
            setFavoriteCount(change.favoriteCount);
          }
        }
      });
    }

    return subscribePromptAssetFavoriteChange((change) => {
      if (String(change.promptAssetId) === String(detail.item.id)) {
        setIsFavorited(change.isFavorited);
      }
    });
  }, [detail.item.id, hasFavoriteApi, isArtworkFavorite]);

  const redirectToLogin = () => {
    navigate("/auth/login", {
      state: {
        redirectTo: "/frontend-prompts",
      },
    });
  };

  const handleUnlock = () => {
    if (detail.item.sourceType === "artwork") { void requestUnlock(detail.item.id); return; }
    if (getPersistedLoginUser()) {
      navigate("/pricing");
    } else {
      redirectToLogin();
    }
  };

  const handleCopy = async () => {
    if (isLocked) {
      handleUnlock();
      return;
    }

    try {
      const content = detail.item.sourceType === "artwork"
        ? await getArtworkPromptContent(detail.item.id) : detail.promptContent;
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1400);
    } catch (error) {
      if (detail.item.sourceType === "artwork" && error instanceof RequestError && [40101, 40300].includes(error.code ?? 0)) {
        await requestUnlock(detail.item.id);
      } else { onMessage("复制失败，请重试"); }
    }
  };

  const handleFavorite = async () => {
    if (!hasFavoriteApi) {
      return;
    }

    if (isFavoriteLoading) {
      return;
    }

    if (!getPersistedLoginUser()) {
      redirectToLogin();
      return;
    }

    const previousValue = isFavorited;
    const previousCount = favoriteCount;
    const nextValue = !previousValue;
    const nextCount = nextValue
      ? previousCount + 1
      : Math.max(previousCount - 1, 0);

    setIsFavorited(nextValue);
    setFavoriteCount(nextCount);
    setIsFavoriteLoading(true);

    if (isArtworkFavorite) {
      notifyArtworkFavoriteChange({
        artworkId: String(detail.item.id),
        favoriteCount: nextCount,
        isFavorited: nextValue,
      });
    } else {
      notifyPromptAssetFavoriteChange({
        promptAssetId: String(detail.item.id),
        isFavorited: nextValue,
      });
    }

    try {
      if (nextValue) {
        if (isArtworkFavorite) {
          await addArtworkFavorite(detail.item.id);
        } else {
          await addPromptAssetFavorite(detail.item.id);
        }
      } else if (isArtworkFavorite) {
        await cancelArtworkFavorite(detail.item.id);
      } else {
        await cancelPromptAssetFavorite(detail.item.id);
      }
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setIsFavorited(previousValue);
      setFavoriteCount(previousCount);
      if (isArtworkFavorite) {
        notifyArtworkFavoriteChange({
          artworkId: String(detail.item.id),
          favoriteCount: previousCount,
          isFavorited: previousValue,
        });
      } else {
        notifyPromptAssetFavoriteChange({
          promptAssetId: String(detail.item.id),
          isFavorited: previousValue,
        });
      }
      onMessage(error instanceof RequestError ? error.message : "收藏操作失败");
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <div className="frontend-prompt-dialog-layer frontend-prompt-preview-light fixed inset-0 z-[70] flex items-center justify-center px-4 py-5 text-[var(--chat-ink)] sm:px-5 sm:py-6">
          <DialogPrimitive.Overlay className="absolute inset-0 bg-black/32 dark:bg-black/42" />
          <DialogPrimitive.Content
            className={cn(
              "relative z-[1] flex flex-col overflow-hidden rounded-[24px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] shadow-[0_1px_1px_rgba(0,0,0,0.02),0_8px_16px_-4px_rgba(0,0,0,0.04),0_24px_32px_-8px_rgba(0,0,0,0.16)] focus:outline-none lg:flex-row dark:shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_32px_90px_rgba(0,0,0,0.46)]",
              detail.isVertical
                ? "w-auto max-w-[calc(100vw-40px)]"
                : "max-h-[min(760px,calc(100dvh-48px))] w-full max-w-[1180px]",
            )}
            style={
              detail.isVertical
                ? { height: "min(880px, calc(100dvh - 32px))" }
                : undefined
            }
          >
          <DialogPrimitive.Title className="sr-only">
            {detail.item.title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {detail.item.title} 的完整提示词与媒体预览
          </DialogPrimitive.Description>

          <aside className="flex shrink-0 flex-col border-b border-[var(--chat-border)] bg-[var(--chat-panel-soft)] px-5 py-5 sm:px-7 sm:py-7 lg:w-[320px] lg:border-b-0 lg:border-r">
            <p className="pr-10 text-[26px] font-semibold leading-8 text-[var(--chat-ink)] lg:pr-0">
              {detail.item.title}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[15px] text-[var(--chat-muted)]">
              <span>{detail.item.category || "前端提示词"}</span>
              {detail.item.permanentlyUnlocked && <span className="text-[12px]">已永久解锁</span>}
              {isLocked ? (
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[var(--chat-muted)] transition-colors hover:bg-[var(--chat-control-hover)] hover:text-[var(--chat-ink)]"
                  aria-label="查看解锁方式"
                  title="查看解锁方式"
                >
                  <Lock className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                if (hasFavoriteApi) {
                  void handleFavorite();
                }
              }}
              disabled={hasFavoriteApi && isFavoriteLoading}
              className={cn(
                "mt-7 inline-flex items-center gap-2 self-start text-[14px] text-[var(--chat-muted)] transition-colors hover:text-[var(--chat-ink)] disabled:cursor-not-allowed disabled:opacity-70",
                isFavorited && "text-amber-500",
              )}
              aria-label={isFavorited ? "取消收藏" : "收藏"}
              aria-pressed={hasFavoriteApi ? isFavorited : undefined}
              title={hasFavoriteApi ? (isFavorited ? "取消收藏" : "收藏") : "收藏"}
            >
              {isFavoriteLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Star
                  className="h-4 w-4"
                  fill={isFavorited ? "currentColor" : "none"}
                />
              )}
              <span>{isFavorited ? "已收藏" : "收藏"} · {favoriteCount}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[var(--chat-primary-bg)] px-4 text-[14px] font-semibold text-[var(--chat-primary-text)] transition-colors hover:bg-[var(--chat-primary-hover)]"
            >
              {isLocked ? (
                <Lock className="h-4 w-4" />
              ) : isCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>
                {isLocked
                  ? getPersistedLoginUser()
                    ? (detail.item.sourceType === "artwork" ? "积分永久解锁" : "升级会员")
                    : "登录解锁"
                  : isCopied
                    ? "已复制"
                    : "复制完整提示词"}
              </span>
            </button>

            {shouldShowSections ? (
              <div className="mt-8">
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--chat-muted)]">
                  Sections
                </p>
                {hasArtworkSourceCode ? (
                  <ArtworkSourceButton
                    item={detail.item}
                    onMessage={onMessage}
                    variant="section"
                  />
                ) : (
                  <div
                    className="mt-3 flex h-10 w-full items-center justify-between rounded-[10px] border border-[var(--chat-border)] bg-[var(--chat-control-soft)] px-4 text-left text-[14px] font-semibold text-[var(--chat-ink)] shadow-[0_2px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[var(--chat-border-strong)] hover:bg-[var(--chat-control-hover)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
                  >
                    <span className="inline-flex items-center gap-2">
                      {isLocked ? (
                        <Lock className="h-4 w-4 text-[var(--chat-muted)]" />
                      ) : (
                        <Code2 className="h-4 w-4 text-[var(--chat-muted)]" />
                      )}
                      {detail.item.permanentlyUnlocked ? "已永久解锁" : isLocked ? "受限提示词" : "Prompt"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[12px] text-[var(--chat-muted)] transition-colors hover:bg-[var(--chat-control-hover)] hover:text-[var(--chat-ink)]"
                    >
                      {isLocked ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {isLocked ? "解锁" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </aside>

          <section
            className={cn(
              "min-w-0 bg-[var(--frontend-prompt-preview-stage-bg)]",
              detail.isVertical ? "h-full shrink-0 overflow-hidden" : "flex-1 self-start",
            )}
            style={{ aspectRatio: detail.imageAspectRatio }}
          >
            <div className="relative h-full w-full overflow-hidden bg-[var(--frontend-prompt-preview-panel-bg)]">
              {detail.item.videoUrl && !isVideoUnavailable ? (
                <video
                  controls
                  playsInline
                  poster={detail.item.image}
                  className="h-full w-full bg-black object-cover"
                  onError={() => setIsVideoUnavailable(true)}
                >
                  <source src={detail.item.videoUrl} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={detail.item.image}
                  alt={`${detail.item.title} 作品预览`}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </section>

          <DialogPrimitive.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--chat-border)] bg-[var(--frontend-prompt-preview-close-bg)] text-[var(--chat-muted)] shadow-[0_14px_34px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors hover:border-[var(--chat-border-strong)] hover:bg-[var(--frontend-prompt-preview-close-hover)] hover:text-[var(--chat-ink)] sm:right-5 sm:top-5 dark:shadow-[0_14px_34px_rgba(0,0,0,0.34)]"
              aria-label="关闭提示词详情"
              title="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function AnnouncementDetailOverlay({
  announcement,
  isLoading,
  onClose,
}: {
  announcement: AnnouncementVO | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/38 px-4 py-6 backdrop-blur-sm">
      <section className="flex max-h-[min(720px,86dvh)] w-full max-w-[680px] flex-col overflow-hidden rounded-[22px] bg-[var(--chat-panel-bg)] shadow-[0_28px_90px_rgba(0,0,0,0.22)]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--chat-border)] px-5">
          <h2 className="min-w-0 truncate text-[16px] font-semibold text-[var(--chat-ink)]">
            {announcement?.title || "公告详情"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[var(--chat-control-muted)] transition-colors hover:bg-[var(--chat-control-soft)] hover:text-[var(--chat-control-text)]"
            aria-label="关闭公告"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="image-studio-chat-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center gap-2 text-[13px] text-[var(--chat-muted)]">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span>公告加载中</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--chat-ink)]">
              {getAnnouncementText(announcement?.content) || "暂无公告内容"}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FrontendPromptHomeView({
  isLoading,
  items,
  onMessage,
  onPromptCopy,
  onPromptOpen,
  recentThreeDaysCount,
  totalCount,
  error,
  onRetry,
  onBrowse,
}: {
  isLoading: boolean;
  items: SiteItem[];
  onMessage: (message: string) => void;
  onPromptCopy: (item: SiteItem) => Promise<boolean>;
  onPromptOpen: (item: SiteItem, imageAspectRatio: number) => Promise<boolean>;
  recentThreeDaysCount: number;
  totalCount: number;
  error: string;
  onRetry: () => void;
  onBrowse: () => void;
}) {
  const navigate = useNavigate();
  const stats = [
    {
      label: "当前组件数量",
      value: totalCount.toLocaleString("zh-CN"),
      description: "当前系统已收录的前端组件数量",
      tone: "bg-[var(--chat-stat-green-bg)]",
    },
    {
      label: "近 3 天更新",
      value: recentThreeDaysCount.toLocaleString("zh-CN"),
      description: "最近三天新发布或更新的组件数量",
      tone: "bg-[var(--chat-stat-blue-bg)]",
    },
  ];

  return (
    <section
      className="flex w-full"
      style={{ minHeight: "calc((100dvh * var(--chat-page-compensation)) - 2rem)" }}
    >
      <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] shadow-[var(--chat-panel-shadow)]">
        <div className="flex h-14 shrink-0 items-center border-b border-transparent px-5 sm:px-6">
          <div className="flex h-full items-center gap-6 text-[15px] font-semibold text-[var(--chat-ink)]">
            <span className="relative flex h-full items-center">
              首页概览
              <span className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-[var(--chat-ink)]" />
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-5 pb-8 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <div className="mx-auto w-full max-w-[1120px]">
            <div className="group relative isolate min-h-[170px] overflow-hidden rounded-[22px] border border-white/10 bg-[#07080c] shadow-[0_22px_60px_rgba(0,0,0,0.28)] sm:min-h-[186px]">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-95 transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 76% 52%, rgba(41,171,255,.96) 0%, rgba(24,99,239,.82) 21%, rgba(20,48,132,.78) 44%, rgba(3,8,24,.98) 75%), repeating-linear-gradient(90deg, rgba(151,220,255,.16) 0 1px, transparent 1px 7px)",
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(3,5,10,.98) 0%, rgba(3,5,10,.9) 38%, rgba(3,5,10,.28) 72%, rgba(3,5,10,.08) 100%)",
                }}
              />
              <div
                aria-hidden="true"
                className="absolute -right-12 -top-32 h-[430px] w-[560px] rotate-[8deg] opacity-70 blur-[0.4px]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, transparent 0 5px, rgba(132,218,255,.32) 5px 7px, transparent 7px 12px)",
                  maskImage: "linear-gradient(90deg, transparent, black 20%, black 82%, transparent)",
                }}
              />

              <div className="relative z-10 flex min-h-[170px] flex-col items-start justify-center px-6 py-6 sm:min-h-[186px] sm:px-9 lg:px-11">
                <div className="flex items-center gap-2.5 text-white">
                  <img src="/images/ownai-logo.webp" alt="" className="h-6 w-6 object-contain" />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/82">
                    OwnAI Design
                  </span>
                </div>
                <h2 className="mt-3 max-w-[660px] text-[23px] font-semibold leading-tight tracking-[-0.025em] text-white sm:text-[30px]">
                  一键复制任意网站中你喜欢的界面和组件UI设计
                </h2>
                <p className="mt-2 max-w-[650px] text-[13px] leading-6 text-white/68 sm:text-[14px]">
                  悬停并选中网页元素，快速生成可交给 Claude、Cursor、Lovable 或 Gemini 的复刻提示。
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/ownai-design")}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-[#111318] shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-0.5"
                >
                  <span>立即试用</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-8 grid w-full max-w-[1120px] gap-4 lg:grid-cols-2">
            {stats.map((item) => (
              <article
                key={item.label}
                className={cn(
                  "min-h-[140px] rounded-[20px] px-5 py-5 sm:px-6 sm:py-6",
                  item.tone,
                )}
              >
                <p className="text-[15px] font-semibold text-[var(--chat-ink)]">
                  {item.label}
                </p>
                <div className="mt-5 flex items-end justify-between gap-4">
                  <p className="text-[56px] font-semibold leading-none tracking-[0.01em] text-[var(--chat-ink)]">
                    {item.value}
                  </p>
                  <p className="max-w-[220px] pb-1 text-right text-[12px] leading-5 text-[var(--chat-muted)]">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <section className="mt-8 w-full">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[17px] font-semibold text-[var(--chat-ink)]">
                  最近更新组件
                </h3>
                <p className="mt-1 text-[13px] text-[var(--chat-muted)]">
                  最近更新的组件和对应提示词会优先展示在这里
                </p>
              </div>
              <span className="shrink-0 text-[12px] font-medium text-[var(--chat-muted-2)]">
                最近更新
              </span>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <PromptMasonry
                  getItemHeight={(index) => isVerticalCategoryPromptCard(index) ? 2 : 1}
                >
                  {Array.from({ length: 6 }).map((_, index) => (
                    <PromptCardSkeleton key={index} index={index} />
                  ))}
                </PromptMasonry>
              ) : items.length ? (
                <PromptMasonry
                  getItemHeight={(index) =>
                    getPromptCardEstimatedHeight(items[index], index)
                  }
                >
                  {items.map((item, index) => (
                    <PromptCard
                      key={item.id}
                      item={item}
                      index={index}
                      onCopy={onPromptCopy}
                      onMessage={onMessage}
                      onOpen={onPromptOpen}
                    />
                  ))}
                </PromptMasonry>
              ) : (
                <EmptyState title={error ? "概览暂时无法加载" : totalCount ? "最近暂无更新" : "资源正在准备中"} message={error || (totalCount ? "已收录的资源仍可正常浏览，去看看全部内容吧" : "新资源上架后，会展示在这里")} action={<button type="button" className="mt-4 h-9 rounded-md border border-[var(--chat-border)] px-4 text-[13px] text-[var(--chat-ink)]" onClick={error ? onRetry : onBrowse}>{error ? "重新加载" : "浏览全部资源"}</button>} />
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

export function FrontendPromptLibraryPage() {
  const requestUnlock = usePromptUnlock();
  const [activeView, setActiveView] = useState<FrontendPromptView>("home");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("");
  const [categories, setCategories] = useState<FrontendPromptCategory[]>([]);
  const [items, setItems] = useState<SiteItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<SiteItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [categorySearchText, setCategorySearchText] = useState("");
  const [promptDetail, setPromptDetail] = useState<PromptDetailState | null>(null);
  const [homeOverviewItems, setHomeOverviewItems] = useState<SiteItem[]>([]);
  const [homeTotalCount, setHomeTotalCount] = useState(0);
  const [homeRecentThreeDaysCount, setHomeRecentThreeDaysCount] = useState(0);
  const [isHomeOverviewLoading, setIsHomeOverviewLoading] = useState(true);
  const [homeOverviewError, setHomeOverviewError] = useState("");
  const [homeOverviewReload, setHomeOverviewReload] = useState(0);
  const [latestAnnouncement, setLatestAnnouncement] =
    useState<AnnouncementVO | null>(null);
  const [latestAnnouncementUnreadCount, setLatestAnnouncementUnreadCount] = useState(0);
  const [announcementDetail, setAnnouncementDetail] =
    useState<AnnouncementVO | null>(null);
  const [isAnnouncementDetailOpen, setIsAnnouncementDetailOpen] = useState(false);
  const [isAnnouncementDetailLoading, setIsAnnouncementDetailLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();

    void listFrontendCategoryNavigation({ signal: controller.signal })
      .then((nextCategories) => {
        setCategories(nextCategories);
        setActiveCategory((currentCategory) =>
          findCategoryById(nextCategories, currentCategory)
            ? currentCategory
            : (nextCategories[0]?.id ?? ""),
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadHomeAnnouncement() {
      try {
        const [announcementResult, unreadCountResult] = await Promise.allSettled([
          listAnnouncements({
            current: 1,
            pageSize: 1,
          }),
          getUnreadAnnouncementCount(),
        ]);

        if (!isActive) {
          return;
        }

        if (announcementResult.status === "fulfilled") {
          setLatestAnnouncement(announcementResult.value?.records?.[0] ?? null);
        } else {
          setLatestAnnouncement(null);
        }

        if (unreadCountResult.status === "fulfilled") {
          setLatestAnnouncementUnreadCount(Math.max(0, unreadCountResult.value));
        } else {
          setLatestAnnouncementUnreadCount(0);
        }
      } catch {
        if (isActive) {
          setLatestAnnouncement(null);
          setLatestAnnouncementUnreadCount(0);
        }
      }
    }

    void loadHomeAnnouncement();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setIsHomeOverviewLoading(true);
    setHomeOverviewError("");

    void getArtworkHomeOverview({ signal: controller.signal })
      .then((overview) => {
        setHomeOverviewItems(overview.items);
        setHomeTotalCount(overview.totalCount ?? 0);
        setHomeRecentThreeDaysCount(overview.recentThreeDaysCount ?? 0);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setHomeOverviewError(error instanceof RequestError ? error.message : "首页概览加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsHomeOverviewLoading(false);
        }
      });

    return () => controller.abort();
  }, [homeOverviewReload]);

  const loadItems = async (
    nextPage: number,
    options?: {
      signal?: AbortSignal;
      append?: boolean;
    },
  ) => {
    const append = Boolean(options?.append);

    if (append) {
      setIsFetchingMore(true);
    } else {
      setIsLoading(true);
      setItems([]);
    }

    setMessage(null);

    try {
      const activeFilter = findCategoryById(categories, activeCategory)?.filter;

      if (!activeFilter && activeCategory) {
        setCurrentPage(1);
        setHasMore(false);
        setItems([]);
        return;
      }

      const result = await listHomeArtworks({
        categoryId: activeFilter?.categoryId,
        current: nextPage,
        pageSize: PAGE_SIZE,
        searchText: categorySearchText,
        signal: options?.signal,
        tagIdList: activeFilter?.tagId ? [activeFilter.tagId] : undefined,
      });

      const nextItems = result.items;

      setCurrentPage(result.current);
      setHasMore(result.hasMore);
      setItems((currentItems) => append ? [...currentItems, ...nextItems] : nextItems);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage(error instanceof RequestError ? error.message : "前端提示词加载失败");
    } finally {
      if (append) {
        setIsFetchingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const loadFavorites = async (signal?: AbortSignal) => {
    setIsFavoriteLoading(true);
    setMessage(null);

    try {
      const result = await listMyArtworkFavorites(
        {
          current: 1,
          pageSize: 60,
        },
        { signal },
      );

      setFavoriteItems(result.items);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage(error instanceof RequestError ? error.message : "收藏加载失败");
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  useEffect(() => {
    if (activeView !== "library") {
      return;
    }

    const controller = new AbortController();

    void loadItems(1, { signal: controller.signal });

    return () => controller.abort();
  }, [activeCategory, activeView, categories, categorySearchText]);

  useEffect(() => {
    if (activeView !== "favorites") {
      return;
    }

    const controller = new AbortController();

    void loadFavorites(controller.signal);

    return () => controller.abort();
  }, [activeView]);

  useEffect(() => {
    const updateArtworkItems = (change: {
      artworkId: string;
      favoriteCount?: number;
      isFavorited: boolean;
    }) => {
      const updateItems = (currentItems: SiteItem[]) =>
        currentItems.map((item) =>
          item.sourceType === "artwork" && String(item.id) === String(change.artworkId)
            ? {
                ...item,
                favorited: change.isFavorited,
                favoriteCount: change.favoriteCount ?? item.favoriteCount,
              }
            : item,
        );

      setItems(updateItems);
      setHomeOverviewItems(updateItems);
      setFavoriteItems((currentItems) =>
        change.isFavorited
          ? updateItems(currentItems)
          : currentItems.filter(
              (item) => String(item.id) !== String(change.artworkId),
            ),
      );
    };

    const unsubscribeArtwork = subscribeArtworkFavoriteChange(updateArtworkItems);
    const unsubscribePromptAsset = subscribePromptAssetFavoriteChange((change) => {
      if (!change.isFavorited) {
        setFavoriteItems((currentItems) =>
          currentItems.filter((item) => String(item.id) !== String(change.promptAssetId)),
        );
      }
    });

    return () => {
      unsubscribeArtwork();
      unsubscribePromptAsset();
    };
  }, []);

  useEffect(() => subscribePromptAccess((unlocked) => {
    const update = (item: SiteItem): SiteItem => item.sourceType === "artwork" && item.id === String(unlocked.id)
      ? { ...item, canAccess: unlocked.canAccessPrompt, permanentlyUnlocked: unlocked.permanentlyUnlocked, pointsPrice: unlocked.pointsPrice }
      : item;
    setItems((items) => items.map(update));
    setHomeOverviewItems((items) => items.map(update));
    setFavoriteItems((items) => items.map(update));
    setPromptDetail((current) => current && current.item.sourceType === "artwork" && current.item.id === String(unlocked.id)
      ? { ...current, item: update(current.item), promptContent: unlocked.promptContent ?? "" } : current);
  }), []);

  const loadPromptContent = async (item: SiteItem) => {
    return item.sourceType === "artwork"
      ? getArtworkPromptContent(item.id)
      : getPromptAssetPromptContent(item.id);
  };

  const handlePromptOpen = async (
    item: SiteItem,
    imageAspectRatio: number,
  ) => {
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
      if (item.sourceType === "artwork" && error instanceof RequestError && [40101, 40300].includes(error.code ?? 0)) {
        setPromptDetail({ imageAspectRatio, isVertical, item: { ...item, canAccess: false }, promptContent: "" });
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
      return true;
    } catch (error) {
      if (item.sourceType === "artwork" && error instanceof RequestError && [40101, 40300].includes(error.code ?? 0)) {
        await requestUnlock(item.id);
      } else {
        setMessage(error instanceof RequestError ? error.message : "提示词复制失败");
      }
      return false;
    }
  };

  const handleOpenAnnouncement = async () => {
    if (!latestAnnouncement?.id) {
      return;
    }

    setIsAnnouncementDetailOpen(true);
    setAnnouncementDetail(latestAnnouncement);
    setIsAnnouncementDetailLoading(true);

    try {
      const detail = await getAnnouncementDetail(latestAnnouncement.id);
      setAnnouncementDetail(detail || latestAnnouncement);

      if (isAnnouncementUnread(latestAnnouncement)) {
        await markAnnouncementRead(latestAnnouncement.id);
        setLatestAnnouncement((current) =>
          current?.id === latestAnnouncement.id
            ? {
                ...current,
                readStatus: true,
                readTime: current.readTime || new Date().toISOString(),
              }
            : current,
        );
        setLatestAnnouncementUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      setMessage(error instanceof RequestError ? error.message : "公告详情加载失败");
    } finally {
      setIsAnnouncementDetailLoading(false);
    }
  };

  const handleViewChange = (view: FrontendPromptView) => {
    setActiveView(view);
  };

  const mobileHeaderTitle = activeView === "favorites" ? "我的收藏" : "前端提示词库";
  const mobileHeaderDescription =
    activeView === "favorites"
      ? "已收藏的前端提示词"
      : "按分类浏览可复用的前端 UI 提示词";

  const renderPromptList = (
    promptItems: SiteItem[],
    options: {
      emptyMessage: string;
      isBusy: boolean;
      showLoadMore?: boolean;
    },
  ) => {
    return (
      <section className="px-5 pt-5 sm:px-6 lg:px-8">
        {options.isBusy ? (
          <PromptMasonry
            getItemHeight={(index) => isVerticalCategoryPromptCard(index) ? 2 : 1}
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <PromptCardSkeleton key={index} index={index} />
            ))}
          </PromptMasonry>
      ) : promptItems.length ? (
        <>
          <PromptMasonry
            getItemHeight={(index) =>
              getPromptCardEstimatedHeight(promptItems[index], index)
            }
          >
            {promptItems.map((item, index) => (
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

          {options.showLoadMore && hasMore ? (
            <div className="mt-5 flex justify-center pb-5">
              <button
                type="button"
                onClick={() => void loadItems(currentPage + 1, { append: true })}
                disabled={isFetchingMore}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-4 text-[13px] font-semibold text-[var(--chat-control-text)] transition-colors hover:bg-[var(--chat-control-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isFetchingMore ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                <span>{isFetchingMore ? "加载中" : "加载更多"}</span>
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState message={message || options.emptyMessage} />
      )}
    </section>
    );
  };

  return (
    <div className="image-studio-chat-page frontend-prompt-page flex text-[var(--chat-ink)]">
      <FrontendPromptSidebar
        activeCategory={activeCategory}
        activeView={activeView}
        announcementUnreadCount={latestAnnouncementUnreadCount}
        categories={categories}
        isCollapsed={isSidebarCollapsed}
        onCategoryChange={(categoryId) => {
          setActiveCategory(categoryId);
          setActiveView("library");
        }}
        onAnnouncementUnreadCountChange={setLatestAnnouncementUnreadCount}
        onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
        onViewChange={handleViewChange}
      />

      <main className="image-studio-chat-scroll min-w-0 flex-1 overflow-y-auto px-3 pb-6 pt-3 sm:px-4 lg:px-4 lg:pb-6 lg:pt-4 2xl:px-5">
        <header className="mb-3 flex min-h-14 items-center gap-3 rounded-[14px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-3 py-2.5 shadow-[var(--chat-panel-shadow)] lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] text-[var(--chat-control-text)] transition-colors hover:bg-[var(--chat-control-hover)]"
            aria-label="打开前端提示词导航"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold text-[var(--chat-ink)]">{mobileHeaderTitle}</h1>
            <p className="mt-0.5 truncate text-[12px] text-[var(--chat-muted)]">{mobileHeaderDescription}</p>
          </div>
        </header>

        {activeView === "home" ? (
          <FrontendPromptHomeView
            error={homeOverviewError}
            onRetry={() => setHomeOverviewReload(value => value + 1)}
            onBrowse={() => { setActiveCategory(""); setActiveView("library"); }}
            isLoading={isHomeOverviewLoading}
            items={homeOverviewItems}
            onMessage={setMessage}
            onPromptCopy={handlePromptCopy}
            onPromptOpen={handlePromptOpen}
            recentThreeDaysCount={homeRecentThreeDaysCount}
            totalCount={homeTotalCount}
          />
        ) : activeView === "library" ? (
          <div className="min-h-full overflow-hidden rounded-[28px] bg-[var(--chat-panel-bg)] shadow-[var(--chat-panel-shadow)]">
            <div className="flex h-14 shrink-0 items-center border-b border-transparent px-5 sm:px-6">
              <div className="flex h-full items-center gap-6 text-[15px] font-semibold text-[var(--chat-ink)]">
                <span className="relative flex h-full items-center">
                  {activeCategory ? findCategoryById(categories, activeCategory)?.name || "分类资源" : "全部资源"}
                  <span className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-[var(--chat-ink)]" />
                </span>
              </div>
            </div>
            <div className="px-5 pt-3 sm:px-6">
              <label className="flex h-11 w-full items-center gap-2 rounded-full bg-[var(--chat-control-soft)] px-4 text-[var(--chat-control-text)]">
                <Search className="h-4 w-4 shrink-0 text-[var(--chat-muted)]" />
                <input
                  value={categorySearchText}
                  onChange={(event) => setCategorySearchText(event.target.value)}
                  aria-label={activeCategory ? "搜索当前分类提示词" : "搜索全部提示词"}
                  placeholder={activeCategory ? "搜索当前分类提示词" : "搜索全部提示词"}
                  className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[var(--chat-ink)] placeholder:text-[var(--chat-input-placeholder)] focus:outline-none"
                />
              </label>
            </div>
            {renderPromptList(items, {
              emptyMessage: categorySearchText ? "没有找到匹配内容，试试其他关键词" : "这个分类暂时没有资源，可以选择其他分类看看",
              isBusy: isLoading,
              showLoadMore: true,
            })}
          </div>
        ) : (
          <div className="min-h-full overflow-hidden rounded-[28px] bg-[var(--chat-panel-bg)] shadow-[var(--chat-panel-shadow)]">
            <div className="flex h-14 shrink-0 items-center border-b border-transparent px-5 sm:px-6">
              <div className="flex h-full items-center gap-6 text-[15px] font-semibold text-[var(--chat-ink)]">
                <span className="relative flex h-full items-center">
                  收藏
                  <span className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-[var(--chat-ink)]" />
                </span>
              </div>
            </div>
            {renderPromptList(favoriteItems, {
              emptyMessage: "你还没有收藏前端提示词。",
              isBusy: isFavoriteLoading,
            })}
          </div>
        )}
      </main>

      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="image-studio-chat-sheet image-studio-chat-sidebar w-[min(88vw,300px)] overflow-hidden border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-bg)] p-0 text-[var(--chat-sidebar-text)] shadow-none [&>button]:hidden"
        >
          <SheetTitle className="sr-only">前端提示词导航</SheetTitle>
          <SheetDescription className="sr-only">选择首页、收藏或前端提示词分类</SheetDescription>
          <FrontendPromptSidebar
            activeCategory={activeCategory}
            activeView={activeView}
            announcementUnreadCount={latestAnnouncementUnreadCount}
            categories={categories}
            isCollapsed={false}
            onCategoryChange={(categoryId) => {
              setActiveCategory(categoryId);
              setActiveView("library");
              setIsMobileSidebarOpen(false);
            }}
            onAnnouncementUnreadCountChange={setLatestAnnouncementUnreadCount}
            onToggleCollapsed={() => setIsMobileSidebarOpen(false)}
            onViewChange={(view) => {
              handleViewChange(view);
              setIsMobileSidebarOpen(false);
            }}
            variant="mobile"
          />
        </SheetContent>
      </Sheet>

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

      {isAnnouncementDetailOpen ? (
        <AnnouncementDetailOverlay
          announcement={announcementDetail}
          isLoading={isAnnouncementDetailLoading}
          onClose={() => setIsAnnouncementDetailOpen(false)}
        />
      ) : null}
    </div>
  );
}
