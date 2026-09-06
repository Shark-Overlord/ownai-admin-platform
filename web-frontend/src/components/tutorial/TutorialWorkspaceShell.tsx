import { useEffect, useState, type ReactNode, type Ref } from "react";
import {
  BookOpen,
  ChevronRight,
  FileText,
  Heart,
  Library,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthenticatedUserMenu } from "@/components/home/AuthenticatedUserMenu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { getUnreadAnnouncementCount } from "@/lib/announcement";
import {
  clearPersistedLoginUser,
  getPersistedLoginUser,
  logoutUser,
  updatePersistedLoginUser,
} from "@/lib/auth";
import { getAuthSessionEventName } from "@/lib/auth-session";
import type { LoginUserVO } from "@/lib/types";
import { cn } from "@/lib/utils";

type PersistedLoginUser = LoginUserVO & { userAccount?: string };

export interface TutorialSidebarItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: string | number;
  kind?: "category" | "chapter" | "post";
  parentId?: string;
  locked?: boolean;
  active?: boolean;
  onClick: () => void;
}

interface TutorialWorkspaceShellProps {
  appearance?: "community";
  children: ReactNode;
  header: ReactNode;
  aside?: ReactNode;
  items: TutorialSidebarItem[];
  sidebarHeading: string;
  sidebarDescription?: string;
  topItems?: TutorialSidebarItem[];
  groups?: { label: string; items: TutorialSidebarItem[] }[];
  mainRef?: Ref<HTMLElement>;
  mainClassName?: string;
  sectionClassName?: string;
  navigationLabel?: string;
  collapsedItems?: TutorialSidebarItem[];
}

function getUserDisplayName(user: PersistedLoginUser) {
  return user.userName?.trim() || user.userAccount?.trim() || "DESIGN EVERYTHING MEMBER";
}

function getUserMemberLabel(user: PersistedLoginUser) {
  return user.memberLevel?.trim().toUpperCase() === "MEMBER" ? "会员" : "普通用户";
}

function SidebarNavigation({
  items,
  topItems,
  sidebarDescription,
  sidebarHeading,
  groups,
  onNavigate,
}: Pick<TutorialWorkspaceShellProps, "items" | "topItems" | "sidebarDescription" | "sidebarHeading" | "groups"> & {
  onNavigate?: () => void;
}) {
  const [collapsedChapterIds, setCollapsedChapterIds] = useState<Set<string>>(() => new Set());

  const renderItem = (item: TutorialSidebarItem) => {
    const Icon = item.icon ?? (item.id === "favorites" ? Heart : item.kind === "post" ? FileText : item.kind === "chapter" ? BookOpen : Library);
    const isChapterCollapsed = item.kind === "chapter" && collapsedChapterIds.has(item.id);
    return (
      <button
        key={item.id}
        type="button"
        aria-current={item.active ? "page" : undefined}
        aria-expanded={item.kind === "chapter" ? !isChapterCollapsed : undefined}
        onClick={() => {
          if (item.kind === "chapter") {
            setCollapsedChapterIds((current) => {
              const next = new Set(current);
              if (next.has(item.id)) next.delete(item.id);
              else next.add(item.id);
              return next;
            });
            return;
          }
          item.onClick();
          onNavigate?.();
        }}
        className={cn(
          "group flex min-h-9 w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] transition-colors",
          item.active
            ? "bg-[var(--chat-sidebar-active)] font-semibold text-[var(--chat-sidebar-text)]"
            : "text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)]",
          item.kind === "post" && "pl-5",
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.locked ? <span className="text-[9px] font-semibold">会员</span> : null}
        {item.count !== undefined ? (
          <span className="text-[10px] tabular-nums text-[var(--chat-sidebar-muted)]">{item.count}</span>
        ) : null}
        {item.kind === "chapter" ? <ChevronRight className={cn("h-3 w-3 shrink-0 opacity-50 transition-transform", !isChapterCollapsed && "rotate-90")} /> : null}
      </button>
    );
  };

  const visibleItems = items.filter((item) => !item.parentId || !collapsedChapterIds.has(item.parentId));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-3">
      {topItems?.length ? <nav className="mt-4 space-y-1">{topItems.map(renderItem)}</nav> : null}
      {groups ? groups.map((group) => (
        <div key={group.label} className="mt-5">
          <p className="px-2.5 text-[11px] font-medium text-[var(--chat-sidebar-muted)]">{group.label}</p>
          <nav aria-label={group.label} className="mt-2 space-y-1">{group.items.map(renderItem)}</nav>
        </div>
      )) : (
        <>
      <div className="mt-5 px-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--chat-sidebar-muted)]">
          {sidebarHeading}
        </p>
        {sidebarDescription ? (
          <p className="mt-1 text-[11px] leading-4 text-[var(--chat-sidebar-muted)]">{sidebarDescription}</p>
        ) : null}
      </div>
      <nav className="mt-2 space-y-1">{visibleItems.map(renderItem)}</nav>
        </>
      )}
    </div>
  );
}

export function TutorialWorkspaceShell({
  appearance,
  aside,
  children,
  header,
  items,
  mainClassName,
  mainRef,
  sectionClassName,
  sidebarDescription,
  sidebarHeading,
  topItems,
  navigationLabel = "教程导航",
  collapsedItems,
  groups,
}: TutorialWorkspaceShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loginUser, setLoginUser] = useState<PersistedLoginUser | null>(
    getPersistedLoginUser() as PersistedLoginUser | null,
  );
  const [announcementUnreadCount, setAnnouncementUnreadCount] = useState(0);

  useEffect(() => {
    const syncLoginUser = () => setLoginUser(getPersistedLoginUser() as PersistedLoginUser | null);
    const eventName = getAuthSessionEventName();
    window.addEventListener("storage", syncLoginUser);
    window.addEventListener(eventName, syncLoginUser);
    return () => {
      window.removeEventListener("storage", syncLoginUser);
      window.removeEventListener(eventName, syncLoginUser);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!loginUser) {
      setAnnouncementUnreadCount(0);
      return () => { active = false; };
    }
    void getUnreadAnnouncementCount()
      .then((count) => { if (active) setAnnouncementUnreadCount(Math.max(0, count)); })
      .catch(() => { if (active) setAnnouncementUnreadCount(0); });
    return () => { active = false; };
  }, [loginUser]);

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } finally {
      clearPersistedLoginUser();
      setLoginUser(null);
      navigate("/auth/login", { replace: true });
    }
  };

  const accountFooter = loginUser ? (
    <div className="shrink-0 border-t border-[var(--chat-sidebar-border)] pt-2">
      <div className="flex items-center gap-2 px-1">
        <AuthenticatedUserMenu
          align="left"
          hasUnreadAnnouncements={announcementUnreadCount > 0}
          menuPlacement="top"
          onOpenProfile={() => navigate("/profile?tab=profile")}
          onPointBalanceChange={(pointBalance) => {
            updatePersistedLoginUser({ pointBalance });
            setLoginUser(getPersistedLoginUser() as PersistedLoginUser | null);
          }}
          onSignOut={() => void handleSignOut()}
          onUnreadAnnouncementCountChange={setAnnouncementUnreadCount}
          onUpgrade={() => navigate("/pricing")}
          triggerVariant="avatar"
          user={loginUser}
        />
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--chat-sidebar-text)]">
          {getUserDisplayName(loginUser)}
        </p>
        <span className="text-[12px] font-semibold text-[var(--chat-sidebar-text)]">
          {getUserMemberLabel(loginUser)}
        </span>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => navigate("/auth/login", {
        state: {
          redirectTo: window.location.hash.startsWith("#/")
            ? window.location.hash.slice(1)
            : `${location.pathname}${location.search}`,
        },
      })}
      className="mt-auto flex h-9 items-center gap-2 rounded-[9px] px-2 text-[12px] text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-hover)]"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--chat-primary-bg)] font-semibold text-[var(--chat-primary-text)]">D</span>
      登录后继续
    </button>
  );

  return (
    <div className={cn("image-studio-chat-page frontend-prompt-page flex text-[var(--chat-ink)]", appearance === "community" && "profile-community-shell")}>
      <aside className={cn(
        "image-studio-chat-sidebar hidden shrink-0 flex-col border-r border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-bg)] py-3 text-[var(--chat-sidebar-text)] lg:flex",
        isCollapsed ? "w-[64px] px-2" : "w-[272px] px-3",
      )}>
        {isCollapsed ? (
          <div className="flex h-full flex-col items-center">
            <button type="button" onClick={() => navigate("/")} className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] hover:bg-[var(--chat-sidebar-hover)]" aria-label="Design Everything">
              <img src="/images/ownai-logo.png" alt="" className="h-7 w-7 object-contain" />
            </button>
            <button type="button" onClick={() => setIsCollapsed(false)} className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-hover)]" aria-label={`展开${navigationLabel}`}>
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            {collapsedItems ? collapsedItems.map((item) => {
              const Icon = item.icon ?? Library;
              return (
                <button key={item.id} type="button" onClick={item.onClick} title={item.label} aria-label={item.label} aria-current={item.active ? "page" : undefined}
                  className={cn("mt-2 inline-flex h-9 w-9 items-center justify-center rounded-[8px] hover:bg-[var(--chat-sidebar-hover)]", item.active && "bg-[var(--chat-sidebar-active)]")}>
                  <Icon className="h-4 w-4" />
                </button>
              );
            }) : (
              <button type="button" onClick={() => navigate("/tutorials")} className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--chat-sidebar-active)]" aria-label="教程">
                <BookOpen className="h-4 w-4" />
              </button>
            )}
            <div className="mt-auto flex h-9 w-9 items-center justify-center">
              {loginUser ? (
                <AuthenticatedUserMenu
                  align="left"
                  hasUnreadAnnouncements={announcementUnreadCount > 0}
                  menuPlacement="top"
                  onOpenProfile={() => navigate("/profile?tab=profile")}
                  onPointBalanceChange={(pointBalance) => {
                    updatePersistedLoginUser({ pointBalance });
                    setLoginUser(getPersistedLoginUser() as PersistedLoginUser | null);
                  }}
                  onSignOut={() => void handleSignOut()}
                  onUnreadAnnouncementCountChange={setAnnouncementUnreadCount}
                  onUpgrade={() => navigate("/pricing")}
                  triggerVariant="avatar"
                  user={loginUser}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex h-9 items-center justify-between gap-2">
              <button type="button" onClick={() => navigate("/")} className="inline-flex min-w-0 items-center gap-2 rounded-[8px] text-left hover:opacity-90">
                <img src="/images/ownai-logo.png" alt="Design Everything" className="h-7 w-8 object-contain" />
                <span className="brand-script-logo truncate py-[2px] !text-[16px] !leading-[1.18]">Design Everything</span>
              </button>
              <button type="button" onClick={() => setIsCollapsed(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-hover)]" aria-label={`收起${navigationLabel}`}>
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <SidebarNavigation items={items} topItems={topItems} sidebarHeading={sidebarHeading} sidebarDescription={sidebarDescription} groups={groups} />
            {accountFooter}
          </div>
        )}
      </aside>

      <main
        ref={mainRef}
        className={cn(
          "image-studio-chat-scroll min-w-0 flex-1 overflow-y-auto px-3 pb-6 pt-3 sm:px-4 lg:px-4 lg:pb-6 lg:pt-4 2xl:px-5",
          mainClassName,
        )}
      >
        <section
          className={cn(
            "min-h-full overflow-hidden rounded-[18px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] shadow-[var(--chat-panel-shadow)]",
            sectionClassName,
          )}
        >
          {aside ? (
            <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] xl:grid-cols-[minmax(0,17fr)_minmax(180px,3fr)]">
              <div className="flex min-h-14 items-center gap-3 border-b border-[var(--chat-border)] px-4 py-2.5 sm:px-5 xl:col-span-2">
                <button type="button" onClick={() => setIsMobileOpen(true)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] text-[var(--chat-control-text)] lg:hidden" aria-label={`打开${navigationLabel}`}>
                  <Menu className="h-4 w-4" />
                </button>
                {header}
              </div>
              <div className="flex min-h-0 min-w-0 flex-col">{children}</div>
              {aside}
            </div>
          ) : (
            <>
              <div className="workspace-header flex min-h-14 shrink-0 items-center gap-3 border-b border-[var(--chat-border)] px-4 py-2.5 sm:px-5">
                <button type="button" onClick={() => setIsMobileOpen(true)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] text-[var(--chat-control-text)] lg:hidden" aria-label={`打开${navigationLabel}`}>
                  <Menu className="h-4 w-4" />
                </button>
                {header}
              </div>
              {children}
            </>
          )}
        </section>
      </main>

      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className={cn("image-studio-chat-sheet image-studio-chat-sidebar w-[min(88vw,300px)] overflow-hidden border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-bg)] p-0 text-[var(--chat-sidebar-text)] shadow-none [&>button]:hidden", appearance === "community" && "community-mobile-sheet")}>
          <SheetTitle className="sr-only">{navigationLabel}</SheetTitle>
          <SheetDescription className="sr-only">{sidebarDescription || navigationLabel}</SheetDescription>
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => navigate("/")} className="inline-flex min-w-0 items-center gap-2">
                <img src="/images/ownai-logo.png" alt="Design Everything" className="h-7 w-8 object-contain" />
                <span className="brand-script-logo truncate !text-[16px]">Design Everything</span>
              </button>
              <button type="button" onClick={() => setIsMobileOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] hover:bg-[var(--chat-sidebar-hover)]" aria-label={`关闭${navigationLabel}`}><X className="h-4 w-4" /></button>
            </div>
            <SidebarNavigation items={items} topItems={topItems} sidebarHeading={sidebarHeading} sidebarDescription={sidebarDescription} groups={groups} onNavigate={() => setIsMobileOpen(false)} />
            {accountFooter}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
