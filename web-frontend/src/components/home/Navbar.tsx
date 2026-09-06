import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CreditCard,
  Bell,
  BookOpen,
  Clapperboard,
  ChevronDown,
  Code2,
  House,
  Library,
  Mail,
  Menu,
  Moon,
  Sparkles,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnnouncementPanel } from "@/components/home/AnnouncementPanel";
import { AuthenticatedUserMenu } from "@/components/home/AuthenticatedUserMenu";
import { CheckInButton } from "@/components/home/CheckInButton";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  clearPersistedLoginUser,
  getPersistedLoginUser,
  logoutUser,
  updatePersistedLoginUser,
} from "@/lib/auth";
import { getUnreadAnnouncementCount } from "@/lib/announcement";
import { getAuthSessionEventName } from "@/lib/auth-session";
import {
  compactButtonBase,
  compactButtonDanger,
  compactButtonPrimary,
  compactButtonSecondary,
} from "@/lib/buttonStyles";
import { usePreferredLocale } from "@/lib/locale";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { LoginUserVO } from "@/lib/types";

type NavItem = {
  id:
    | "home"
    | "frontendPrompts"
    | "imageStudio"
    | "videoBackground"
    | "tutorials"
    | "profile"
    | "contact"
    | "pricing";
  label: string;
  icon: LucideIcon;
  to:
    | "/"
    | "/frontend-prompts"
    | "/image-studio-2"
    | "/video-backgrounds"
    | "/tutorials"
    | "/profile"
    | "/contact"
    | "/pricing";
};

const NAV_COPY = {
  "en-US": {
    home: "Home",
    frontendPrompts: "Frontend Prompts",
    imageStudio: "Image Prompt Library",
    videoBackground: "Motion Backgrounds",
    promptLibrary: "Prompt Library",
    tutorials: "VibeCoding Tutorials",
    profile: "My Community",
    contact: "Contact Us",
    pricing: "Pricing",
    login: "Log in",
    signup: "Sign up",
    membership: "Membership",
    signOut: "Sign out",
    announcementAvailable: "Announcement updates available",
    announcements: "Announcements",
    backToMenu: "Back",
    lightMode: "Light mode",
    darkMode: "Dark mode",
  },
  "zh-CN": {
    imageStudio: "图像提示词库",
    frontendPrompts: "前端提示词",
    videoBackground: "动效背景素材",
    promptLibrary: "提示词库",
    tutorials: "VibeCoding教程",
    home: "首页",
    profile: "我的社区",
    contact: "联系我们",
    pricing: "项目套餐",
    login: "登录",
    signup: "注册",
    membership: "会员等级",
    signOut: "退出登录",
    announcementAvailable: "有未读公告",
    announcements: "公告",
    backToMenu: "返回",
    lightMode: "浅色模式",
    darkMode: "深色模式",
  },
} as const;

type PersistedLoginUser = LoginUserVO & { userAccount?: string };

const memberLabelMap: Record<string, string> = {
  NORMAL: "Normal",
  MEMBER: "Member",
};

function getMemberLabel(memberLevel?: string) {
  if (!memberLevel) {
    return "Normal";
  }

  return memberLabelMap[memberLevel.toUpperCase()] ?? memberLevel;
}

function getUserDisplayName(user: PersistedLoginUser) {
  return (
    user.userName?.trim() ||
    user.userAccount?.trim() ||
    "DESIGN EVERYTHING MEMBER"
  );
}

function getUserSecondaryLabel(
  user: PersistedLoginUser,
  locale: "en-US" | "zh-CN",
) {
  const memberSuffix = locale === "zh-CN" ? "会员" : "member";

  return (
    user.userAccount?.trim() ||
    user.userProfile?.trim() ||
    `${getMemberLabel(user.memberLevel)} ${memberSuffix}`
  );
}

function getUserInitial(user: PersistedLoginUser) {
  return getUserDisplayName(user).charAt(0).toUpperCase() || "D";
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { locale } = usePreferredLocale();
  const { theme, toggleTheme } = useTheme();
  const isAuthRoute = location.pathname.startsWith("/auth/");
  const [activeId, setActiveId] = useState<string>("home");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPromptMenuOpen, setIsPromptMenuOpen] = useState(false);
  const promptMenuRef = useRef<HTMLDivElement>(null);
  const promptTriggerRef = useRef<HTMLButtonElement>(null);
  const [loginUser, setLoginUser] = useState<PersistedLoginUser | null>(
    () => getPersistedLoginUser() as PersistedLoginUser | null,
  );
  const [unreadAnnouncementCount, setUnreadAnnouncementCount] = useState(0);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isMobileAnnouncementView, setIsMobileAnnouncementView] = useState(false);
  const copy = NAV_COPY[locale];
  const nextTheme = theme === "light" ? "dark" : "light";
  const desktopNavLabelClass = "whitespace-nowrap text-[14px] tracking-[-0.01em]";
  const mobileNavLabelClass = "text-[12px] tracking-[-0.01em]";
  const navItems: NavItem[] = [
    { id: "home", label: copy.home, icon: House, to: "/" },
    {
      id: "frontendPrompts",
      label: copy.frontendPrompts,
      icon: Code2,
      to: "/frontend-prompts",
    },
    {
      id: "imageStudio",
      label: copy.imageStudio,
      icon: Sparkles,
      to: "/image-studio-2",
    },
    {
      id: "videoBackground",
      label: copy.videoBackground,
      icon: Clapperboard,
      to: "/video-backgrounds",
    },
    {
      id: "tutorials",
      label: copy.tutorials,
      icon: BookOpen,
      to: "/tutorials",
    },
    { id: "pricing", label: copy.pricing, icon: CreditCard, to: "/pricing" },
    { id: "profile", label: copy.profile, icon: UserRound, to: "/profile" },
  ];
  const promptLibraryItems = navItems.filter(item => ["frontendPrompts", "imageStudio", "videoBackground"].includes(item.id));
  const desktopNavItems = navItems.filter((item) => !["contact", "imageStudio", "videoBackground"].includes(item.id));
  const desktopContactItem = navItems.find((item) => item.id === "contact");
  const hasUnreadAnnouncements = unreadAnnouncementCount > 0;

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
    let isCurrent = true;

    if (!loginUser) {
      setUnreadAnnouncementCount(0);
      return () => {
        isCurrent = false;
      };
    }

    getUnreadAnnouncementCount()
      .then((count) => {
        if (isCurrent) {
          setUnreadAnnouncementCount(Math.max(0, count));
        }
      })
      .catch(() => {
        if (isCurrent) {
          setUnreadAnnouncementCount(0);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [loginUser]);

  useEffect(() => {
    if (location.pathname === "/profile" || location.pathname === "/projects") {
      setActiveId("profile");
      return;
    }

    if (location.pathname === "/pricing") {
      setActiveId("pricing");
      return;
    }

    if (location.pathname === "/frontend-prompts") {
      setActiveId("frontendPrompts");
      return;
    }

    if (location.pathname === "/image-studio" || location.pathname === "/image-studio-2") {
      setActiveId("imageStudio");
      return;
    }

    if (location.pathname === "/video-backgrounds") {
      setActiveId("videoBackground");
      return;
    }

    if (location.pathname.startsWith("/tutorials")) {
      setActiveId("tutorials");
      return;
    }

    if (location.pathname === "/contact") {
      setActiveId("contact");
      return;
    }

    if (isAuthRoute) {
      setActiveId("");
      return;
    }

    if (location.pathname === "/") {
      setActiveId("home");
      return;
    }

    setActiveId("");
  }, [isAuthRoute, location.pathname]);

  const highlightedId = hoveredId;

  const handleNavItemClick = (item: NavItem) => {
    if (
      (item.id === "profile" ||
        item.id === "frontendPrompts" ||
        item.id === "imageStudio") &&
      !loginUser
    ) {
      navigate("/auth/login", {
        state: {
          redirectTo: item.id === "imageStudio" ? "/" : item.to,
        },
      });
      setActiveId("");
      return;
    }

    if (item.to === "/" && location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveId("home");
      return;
    }

    navigate(item.to);
    setActiveId(item.id);
  };

  const handleHomeClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveId("home");
      return;
    }

    navigate("/");
    setActiveId("home");
  };

  const renderPromptLibrarySelect = (mobile = false) => {
    const selected = promptLibraryItems.find(item => item.id === activeId);
    if (!mobile) return (
      <div key="prompt-library" ref={promptMenuRef} className="relative shrink-0"
        onMouseEnter={() => { setIsPromptMenuOpen(true); setHoveredId(null); }}
        onMouseLeave={() => setIsPromptMenuOpen(false)}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsPromptMenuOpen(false); }}
        onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); setIsPromptMenuOpen(false); promptTriggerRef.current?.focus(); }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault(); setIsPromptMenuOpen(true);
            requestAnimationFrame(() => {
              const items = Array.from(promptMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') || []);
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (index + 1) % items.length : (index <= 0 ? items.length : index) - 1;
              items[next]?.focus();
            });
          }
        }}>
        <button ref={promptTriggerRef} type="button" aria-haspopup="menu" aria-expanded={isPromptMenuOpen} aria-controls="desktop-prompt-library-menu"
          onClick={() => setIsPromptMenuOpen(open => !open)}
          className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15", selected || isPromptMenuOpen ? "text-[var(--hero-ink)]" : "text-[var(--hero-muted)]")}>
          <Library className="h-3.5 w-3.5" /><span className={desktopNavLabelClass}>{copy.promptLibrary}</span><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isPromptMenuOpen && "rotate-180")} />
        </button>
        {isPromptMenuOpen && <div className="absolute left-0 top-full z-[70] min-w-[190px] pt-2">
          <div id="desktop-prompt-library-menu" role="menu" aria-label={copy.promptLibrary} className="rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-1 shadow-lg">
            {promptLibraryItems.map(item => {
              const Icon = item.icon;
              return <button key={item.id} role="menuitem" type="button" tabIndex={-1} onClick={() => { setIsPromptMenuOpen(false); handleNavItemClick(item); }}
                className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 text-left text-[var(--hero-ink)] hover:bg-[var(--hero-ink)]/[0.06] focus-visible:bg-[var(--hero-ink)]/[0.06] focus-visible:outline-none">
                <Icon className="h-3.5 w-3.5" /><span className="whitespace-nowrap text-[14px]">{item.label}</span>
              </button>;
            })}
          </div>
        </div>}
      </div>
    );
    return (
      <Select key="prompt-library" value={selected?.id || ""} onValueChange={value => {
        const item = promptLibraryItems.find(option => option.id === value);
        if (item) {
          handleNavItemClick(item);
          if (mobile) setIsMobileSheetOpen(false);
        }
      }}>
        <SelectTrigger
          aria-label={copy.promptLibrary}
          className={cn(
            "h-8 w-auto justify-between gap-1.5 border-transparent bg-transparent px-3 shadow-none hover:bg-[var(--hero-ink)]/[0.045]",
            mobile ? "w-full rounded-[8px] border-[var(--hero-ink)]/8 bg-[var(--hero-surface)]/80 px-2.5" : "rounded-full",
            selected || mobile ? "text-[var(--hero-ink)]" : "text-[var(--hero-muted)]",
          )}
        >
          <span className={cn("relative inline-flex items-center gap-1.5", mobile ? mobileNavLabelClass : desktopNavLabelClass)}>
            <Library className="h-3.5 w-3.5" />{copy.promptLibrary}
            {selected && !mobile && <span className="absolute bottom-[-2px] left-1/2 h-[2px] w-3 rounded-full bg-current opacity-80" />}
          </span>
        </SelectTrigger>
        <SelectContent className="min-w-[190px] rounded-[10px] border-[var(--hero-border)] bg-[var(--hero-surface)] p-1 text-[var(--hero-ink)] shadow-lg" sideOffset={8}>
          {promptLibraryItems.map(item => {
            const Icon = item.icon;
            return <SelectItem key={item.id} value={item.id} className="min-h-9 rounded-[6px] py-2 text-[14px] data-[highlighted]:bg-[var(--hero-ink)]/[0.06]">
              <span className="inline-flex items-center gap-2 text-[14px]"><Icon className="h-3.5 w-3.5" />{item.label}</span>
            </SelectItem>;
          })}
        </SelectContent>
      </Select>
    );
  };

  const handleLoginClick = () => {
    navigate("/auth/login");
  };

  const handleSignupClick = () => {
    navigate("/auth/register");
  };

  const handleProfileUpgrade = () => {
    const item = navItems.find((navItem) => navItem.id === "pricing");

    if (!item) {
      return;
    }

    handleNavItemClick(item);
  };

  const handleOpenProfile = () => {
    const item = navItems.find((navItem) => navItem.id === "profile");

    if (!item) {
      return;
    }

    handleNavItemClick(item);
  };

  const handlePointBalanceChange = (pointBalance: number) => {
    setLoginUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      return {
        ...currentUser,
        pointBalance,
      };
    });
    updatePersistedLoginUser({ pointBalance });
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch {
      // Always clear local session so the UI can complete sign-out gracefully.
    } finally {
      clearPersistedLoginUser();
      setLoginUser(null);
      setHoveredId(null);

      if (location.pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveId("home");
        return;
      }

      navigate("/");
      setActiveId("home");
    }
  };

  return (
    <>
      {location.pathname !== "/" ? (
        <div className="h-16 w-full shrink-0" aria-hidden="true" />
      ) : null}
      <header className="site-navbar fixed inset-x-0 top-0 z-50">
        <div className="relative mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={handleHomeClick}
            className="inline-flex shrink-0 items-center gap-2.5 text-left text-[14px] font-medium text-[var(--hero-ink)]"
          >
            <span className="inline-flex h-9 w-11 items-center justify-center">
              <img
                src="/images/ownai-logo.webp"
                alt="Design Everything"
                className="h-8 w-auto object-contain drop-shadow-[0_8px_18px_rgba(91,125,210,0.16)]"
                draggable={false}
                decoding="async"
              />
            </span>
            <span className="home-ownai-wordmark hidden leading-none sm:block">
              ownai
            </span>
          </button>

          <nav
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center lg:flex"
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--hero-ink)]/6 bg-[var(--hero-surface)]/66 p-1 backdrop-blur-[10px]">
              {desktopNavItems.map((item) => {
                if (item.id === "frontendPrompts") return renderPromptLibrarySelect();
                const Icon = item.icon;
                const isActive = activeId === item.id;
                const isHighlighted = highlightedId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavItemClick(item)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-[color,transform] duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15",
                      isHighlighted || isActive
                        ? "text-[var(--hero-ink)]"
                        : "text-[var(--hero-muted)]",
                    )}
                  >
                    {isHighlighted ? (
                      <motion.span
                        layoutId="desktop-nav-highlight"
                        className="pointer-events-none absolute inset-0 rounded-full bg-[rgba(17,17,17,0.055)]"
                        transition={{
                          type: "spring",
                          stiffness: 440,
                          damping: 34,
                          mass: 0.62,
                        }}
                      />
                    ) : null}
                    <Icon className="relative z-[1] h-3.5 w-3.5" />
                    <span
                      className={cn(
                        "relative z-[1] inline-flex items-center",
                        desktopNavLabelClass,
                      )}
                    >
                      {item.label}
                      {isActive ? (
                        <span className="absolute left-1/2 bottom-[-2px] h-[2px] w-3 -translate-x-1/2 rounded-full bg-current opacity-80" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            {desktopContactItem ? (
              <button
                type="button"
                onClick={() => handleNavItemClick(desktopContactItem)}
                aria-current={activeId === desktopContactItem.id ? "page" : undefined}
                className={cn(
                  "hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition-[background-color,color,transform] duration-[180ms] hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 lg:inline-flex",
                  activeId === desktopContactItem.id
                    ? "bg-[rgba(17,17,17,0.055)] text-[var(--hero-ink)]"
                    : "text-[var(--hero-muted)] hover:bg-[rgba(17,17,17,0.04)] hover:text-[var(--hero-ink)]",
                )}
              >
                <Mail className="h-3.5 w-3.5" />
                <span className={desktopNavLabelClass}>
                  {desktopContactItem.label}
                </span>
              </button>
            ) : null}
            {loginUser ? (
              <AuthenticatedUserMenu
                hasUnreadAnnouncements={hasUnreadAnnouncements}
                onPointBalanceChange={handlePointBalanceChange}
                onUnreadAnnouncementCountChange={setUnreadAnnouncementCount}
                user={loginUser}
                onOpenProfile={handleOpenProfile}
                onUpgrade={handleProfileUpgrade}
                onSignOut={handleSignOut}
              />
            ) : (
              <>
                {location.pathname !== "/auth/login" ? (
                  <button
                    type="button"
                    onClick={handleLoginClick}
                    className="hidden items-center justify-center rounded-full px-3.5 py-1.5 font-medium text-[var(--hero-ink)] transition-colors hover:text-[var(--hero-ink)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/20 lg:inline-flex"
                  >
                    <span className={desktopNavLabelClass}>{copy.login}</span>
                  </button>
                ) : null}
                {location.pathname !== "/auth/register" ? (
                  <button
                    type="button"
                    onClick={handleSignupClick}
                    className="hidden items-center justify-center rounded-full bg-[var(--hero-ink)] px-4 py-1.5 font-medium text-[var(--hero-bg)] transition-all hover:-translate-y-[1px] hover:bg-[var(--hero-ink)]/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/20 lg:inline-flex"
                  >
                    <span className={desktopNavLabelClass}>{copy.signup}</span>
                  </button>
                ) : null}
              </>
            )}

            <Sheet
              open={isMobileSheetOpen}
              onOpenChange={(open) => {
                setIsMobileSheetOpen(open);

                if (!open) {
                  setIsMobileAnnouncementView(false);
                }
              }}
            >
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)]/82 text-[var(--hero-ink)] transition-[background-color,border-color,transform] duration-[160ms] hover:-translate-y-[1px] hover:border-[var(--hero-ink)]/12 hover:bg-[var(--hero-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/20 lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                  {loginUser && hasUnreadAnnouncements ? (
                    <span
                      className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[#e5484d] ring-2 ring-[var(--hero-surface)]"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[min(82vw,320px)] px-4 pb-5 pt-16"
              >
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Browse sections and open the collection library.
                </SheetDescription>

                {loginUser && isMobileAnnouncementView ? (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setIsMobileAnnouncementView(false)}
                      className="inline-flex h-8 w-fit items-center gap-1.5 rounded-[8px] px-2 text-[12px] font-medium text-[var(--hero-muted)] transition-colors hover:bg-[var(--hero-ink)]/[0.045] hover:text-[var(--hero-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>{copy.backToMenu}</span>
                    </button>
                    <AnnouncementPanel
                      onUnreadCountChange={setUnreadAnnouncementCount}
                      variant="mobile"
                    />
                  </div>
                ) : (
                  <>
                {loginUser ? (
                  <div className="mb-5 rounded-[18px] border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)] p-3 shadow-[0_12px_28px_rgba(17,17,17,0.045)]">
                    <div className="flex items-center gap-2.5">
                      <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--hero-ink)] text-[14px] font-medium text-[var(--hero-bg)]">
                        {getUserInitial(loginUser)}
                        {hasUnreadAnnouncements ? (
                          <span
                            className="absolute -right-0.5 top-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--hero-surface)] text-[#e5484d] ring-1 ring-[var(--hero-ink)]/8"
                            aria-label={copy.announcementAvailable}
                          >
                            <Bell className="h-2.5 w-2.5" strokeWidth={2.3} />
                            <span
                              className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#e5484d] ring-1 ring-[var(--hero-surface)]"
                              aria-hidden="true"
                            />
                          </span>
                        ) : null}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium tracking-[-0.01em] text-[var(--hero-ink)]">
                          {getUserDisplayName(loginUser)}
                        </p>
                        <p className="truncate text-[12px] text-[var(--hero-muted)]">
                          {getUserSecondaryLabel(loginUser, locale)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-[12px] border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)] px-3 py-2">
                      <span className="text-[12px] text-[var(--hero-muted)]">
                        {copy.membership}
                      </span>
                      <span className="text-[13px] font-medium text-[var(--hero-ink)]">
                        {getMemberLabel(loginUser.memberLevel)}
                      </span>
                    </div>

                    <CheckInButton
                      className="mt-2"
                      onPointBalanceChange={handlePointBalanceChange}
                      variant="mobile"
                    />

                    <button
                      type="button"
                      onClick={() => setIsMobileAnnouncementView(true)}
                      className="mt-2 inline-flex h-8 w-full items-center justify-between rounded-[8px] border border-[var(--hero-ink)]/8 bg-[var(--hero-bg)] px-2.5 !text-[12px] !font-normal text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
                          <Bell className="h-3.5 w-3.5 text-[var(--hero-muted)]" />
                          {hasUnreadAnnouncements ? (
                            <span
                              className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#e5484d] ring-1 ring-[var(--hero-bg)]"
                              aria-hidden="true"
                            />
                          ) : null}
                        </span>
                        <span className={mobileNavLabelClass}>
                          {copy.announcements}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="mt-2 inline-flex h-8 w-full items-center justify-between rounded-[8px] border border-[var(--hero-ink)]/8 bg-[var(--hero-bg)] px-2.5 !text-[12px] !font-normal text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                    >
                      <span className="inline-flex items-center gap-2">
                        {nextTheme === "light" ? (
                          <Sun className="h-3.5 w-3.5 text-[var(--hero-muted)]" />
                        ) : (
                          <Moon className="h-3.5 w-3.5 text-[var(--hero-muted)]" />
                        )}
                        <span className={mobileNavLabelClass}>
                          {nextTheme === "light" ? copy.lightMode : copy.darkMode}
                        </span>
                      </span>
                    </button>

                    <SheetClose asChild>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className={cn(
                          compactButtonBase,
                          compactButtonDanger,
                          "mt-3 h-8 w-full rounded-[8px] px-2.5 !text-[12px] !font-normal",
                        )}
                      >
                        {copy.signOut}
                      </button>
                    </SheetClose>
                  </div>
                ) : null}

                <div className="flex flex-col items-stretch gap-1.5">
                  {desktopNavItems.map((item) => {
                    if (item.id === "frontendPrompts") return renderPromptLibrarySelect(true);
                    const Icon = item.icon;
                    const isActive = activeId === item.id;

                    return (
                      <SheetClose asChild key={item.label}>
                        <button
                          type="button"
                          onClick={() => handleNavItemClick(item)}
                          className={cn(
                            "hover-fill inline-flex h-8 items-center gap-2 rounded-[8px] px-2.5 !text-[12px] !font-normal transition-[border-color,color] duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15",
                            isActive
                              ? "border border-[var(--hero-ink)]/12 bg-[var(--hero-ink)]/[0.055] text-[var(--hero-ink)]"
                              : "border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)]/80 text-[var(--hero-ink)]",
                          )}
                        >
                          <span className="hover-fill__bg" aria-hidden="true" />
                          <Icon className="relative z-[1] h-3 w-3" />
                          <span className={cn("relative z-[1]", mobileNavLabelClass)}>
                            {item.label}
                          </span>
                        </button>
                      </SheetClose>
                    );
                  })}
                </div>

                {!loginUser ? (
                  <div className="mt-6 flex flex-col gap-2.5 border-t border-[var(--hero-ink)]/8 pt-5">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="inline-flex h-8 w-full items-center justify-between rounded-[8px] border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)] px-2.5 !text-[12px] !font-normal text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                    >
                      <span className="inline-flex items-center gap-2">
                        {nextTheme === "light" ? (
                          <Sun className="h-3.5 w-3.5 text-[var(--hero-muted)]" />
                        ) : (
                          <Moon className="h-3.5 w-3.5 text-[var(--hero-muted)]" />
                        )}
                        <span className={mobileNavLabelClass}>
                          {nextTheme === "light" ? copy.lightMode : copy.darkMode}
                        </span>
                      </span>
                    </button>
                    {location.pathname !== "/auth/login" ? (
                      <SheetClose asChild>
                        <button
                          type="button"
                          onClick={handleLoginClick}
                          className={cn(compactButtonBase, compactButtonSecondary, "h-8 w-full rounded-[8px] px-2.5 !text-[12px] !font-normal")}
                        >
                          <span className={mobileNavLabelClass}>{copy.login}</span>
                        </button>
                      </SheetClose>
                    ) : null}
                    {location.pathname !== "/auth/register" ? (
                      <SheetClose asChild>
                        <button
                          type="button"
                          onClick={handleSignupClick}
                          className={cn(compactButtonBase, compactButtonPrimary, "h-8 w-full rounded-[8px] px-2.5 !text-[12px] !font-normal focus-visible:ring-[#111111]/40")}
                        >
                          <span className={mobileNavLabelClass}>{copy.signup}</span>
                        </button>
                      </SheetClose>
                    ) : null}
                  </div>
                ) : null}
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
