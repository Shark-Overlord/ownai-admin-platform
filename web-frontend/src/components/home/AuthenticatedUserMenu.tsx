import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LogOut,
  CreditCard,
  Sun,
  Moon,
  Bell,
  Zap,
} from "lucide-react";
import { AnnouncementPanel } from "@/components/home/AnnouncementPanel";
import { CheckInButton } from "@/components/home/CheckInButton";
import { UserAvatar } from "@/components/home/UserAvatar";
import { usePreferredLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type { LoginUserVO } from "@/lib/types";
import { useTheme } from "@/lib/theme";

interface AuthenticatedUserMenuProps {
  align?: "left" | "right";
  triggerVariant?: "compact" | "avatar";
  menuPlacement?: "bottom" | "top";
  hasUnreadAnnouncements?: boolean;
  onPointBalanceChange: (pointBalance: number) => void;
  onUnreadAnnouncementCountChange: (count: number) => void;
  user: LoginUserVO & { userAccount?: string };
  onOpenProfile: () => void;
  onUpgrade: () => void;
  onSignOut: () => void;
}

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

function getDisplayName(user: LoginUserVO & { userAccount?: string }) {
  return (
    user.userName?.trim() ||
    user.userAccount?.trim() ||
    "DESIGN EVERYTHING MEMBER"
  );
}

function getSecondaryLabel(
  user: LoginUserVO & { userAccount?: string },
  locale: "en-US" | "zh-CN",
) {
  const memberSuffix = locale === "zh-CN" ? "会员" : "member";

  return (
    user.userAccount?.trim() ||
    user.userProfile?.trim() ||
    `${getMemberLabel(user.memberLevel)} ${memberSuffix}`
  );
}

function getAvatarText(user: LoginUserVO & { userAccount?: string }) {
  return getDisplayName(user).charAt(0).toUpperCase() || "D";
}

const MENU_COPY = {
  "en-US": {
    announcementAvailable: "Announcement updates available",
    membership: "Membership",
    upgrade: "Upgrade",
    settings: "Profile",
    signOut: "Sign out",
    lightMode: "Light mode",
    darkMode: "Dark mode",
  },
  "zh-CN": {
    announcementAvailable: "有未读公告",
    membership: "会员等级",
    upgrade: "升级会员",
    settings: "个人中心",
    signOut: "退出登录",
    lightMode: "浅色模式",
    darkMode: "深色模式",
  },
} as const;

export function AuthenticatedUserMenu({
  align = "right",
  hasUnreadAnnouncements = false,
  menuPlacement = "bottom",
  onPointBalanceChange,
  onUnreadAnnouncementCountChange,
  triggerVariant = "compact",
  user,
  onOpenProfile,
  onUpgrade,
  onSignOut,
}: AuthenticatedUserMenuProps) {
  const { locale } = usePreferredLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const displayName = useMemo(() => getDisplayName(user), [user]);
  const secondaryLabel = useMemo(
    () => getSecondaryLabel(user, locale),
    [locale, user],
  );
  const avatarText = useMemo(() => getAvatarText(user), [user]);
  const memberLabel = useMemo(() => getMemberLabel(user.memberLevel), [user]);
  const copy = MENU_COPY[locale];
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";
  const panelPositionClassName = cn(
    menuPlacement === "top" ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]",
    align === "left" ? "left-0" : "right-0",
  );

  useEffect(() => {
    if (!isOpen && !isAnnouncementOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAnnouncementOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsAnnouncementOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAnnouncementOpen, isOpen]);

  const toggleMenu = () => {
    setIsAnnouncementOpen(false);
    setIsOpen((current) => !current);
  };
  const closeMenu = () => setIsOpen(false);
  const toggleAnnouncementPanel = () => {
    setIsOpen(false);
    setIsAnnouncementOpen((current) => !current);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative hidden items-center gap-2 lg:flex",
        triggerVariant === "avatar" && "block",
      )}
    >
      {triggerVariant === "compact" ? (
        <button
          type="button"
          onClick={toggleAnnouncementPanel}
          className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)]/82 text-[var(--hero-ink)]/72 transition-[background-color,border-color,transform] duration-150 hover:-translate-y-[0.5px] hover:border-[var(--hero-ink)]/12 hover:bg-[var(--hero-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
          aria-label={hasUnreadAnnouncements ? copy.announcementAvailable : undefined}
        >
          <Bell className="h-3.5 w-3.5" strokeWidth={2.1} />
          {hasUnreadAnnouncements ? (
            <span
              className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e5484d] ring-2 ring-[var(--hero-surface)]"
              aria-hidden="true"
            />
          ) : null}
        </button>
      ) : null}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
        className={cn(
          "inline-flex text-[12px] font-medium text-[var(--hero-ink)] transition-[transform,background-color] duration-150 hover:-translate-y-[0.5px] hover:bg-[var(--hero-ink)]/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 select-none",
          triggerVariant === "avatar"
            ? "h-9 w-9 items-center justify-center rounded-full bg-[var(--hero-surface)]/82 p-0"
            : "h-9 items-center gap-2.5 rounded-[10px] bg-[var(--hero-ink)]/[0.045] pl-1.5 pr-3",
        )}
      >
        <UserAvatar
          alt={displayName}
          src={user.userAvatar}
          fallback={avatarText}
          className={cn(
          "authenticated-user-avatar inline-flex shrink-0 items-center justify-center rounded-full bg-[#0052d6] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]",
          triggerVariant === "avatar" ? "h-8 w-8 text-[12px] font-semibold" : "h-6 w-6 text-[11px] font-bold",
          )}
        />
        {triggerVariant === "compact" ? (
          <>
            <Zap className="h-3.5 w-3.5 text-[var(--hero-ink)] opacity-72" strokeWidth={2.2} />
            <span className="font-semibold tracking-[-0.01em] text-[var(--hero-ink)]/90">{user.pointBalance ?? 0}</span>
          </>
        ) : null}
      </button>

      <AnimatePresence>
        {isAnnouncementOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn("absolute z-50", panelPositionClassName)}
          >
            <AnnouncementPanel
              onUnreadCountChange={onUnreadAnnouncementCountChange}
            />
          </motion.div>
        ) : null}
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-50 w-[240px] overflow-hidden rounded-[16px] border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)] shadow-[0_12px_36px_rgba(0,0,0,0.12)]",
              panelPositionClassName,
            )}
          >
            <div className="flex items-center gap-3 border-b border-[var(--hero-ink)]/6 px-4 py-4">
              <UserAvatar
                alt={displayName}
                src={user.userAvatar}
                fallback={avatarText}
                className="h-9 w-9 rounded-full bg-[var(--hero-ink)] text-[0.85rem] font-medium text-[var(--hero-bg)]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[var(--hero-ink)]">
                  {displayName}
                </p>
                <p className="truncate text-[0.75rem] text-[var(--hero-muted)]">
                  {secondaryLabel}
                </p>
              </div>
            </div>

            <div className="border-b border-[var(--hero-ink)]/6 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-[var(--hero-muted)]">{copy.membership}</span>
                <span className="text-[14px] font-medium text-[var(--hero-ink)]">{memberLabel}</span>
              </div>
              <CheckInButton
                className="mb-2"
                onPointBalanceChange={onPointBalanceChange}
                variant="menu"
              />
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onUpgrade();
                }}
                className="grid h-8 w-full place-items-center rounded-[8px] border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)] px-3 font-medium text-[var(--hero-ink)] shadow-sm transition-[background-color,border-color,box-shadow] hover:border-[var(--hero-ink)]/12 hover:bg-[var(--hero-surface)] hover:shadow-[0_8px_18px_rgba(17,17,17,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
              >
                <span className="grid grid-cols-[20px_auto] items-center gap-2">
                  <CreditCard className="mx-auto h-3.5 w-3.5" />
                  <span className="text-[13px] leading-none">{copy.upgrade}</span>
                </span>
              </button>
            </div>

            <div className="p-2 space-y-0.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left font-medium text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/5 focus-visible:outline-none"
              >
                {nextTheme === "light" ? (
                  <Sun className="h-4 w-4 shrink-0 text-[var(--hero-muted)]" />
                ) : (
                  <Moon className="h-4 w-4 shrink-0 text-[var(--hero-muted)]" />
                )}
                <span className="text-[14px] leading-none">
                  {nextTheme === "light" ? copy.lightMode : copy.darkMode}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onSignOut();
                }}
                className="flex h-8 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left font-medium text-[#d64242] transition-colors hover:bg-[#d64242]/10 focus-visible:outline-none"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="text-[14px] leading-none">{copy.signOut}</span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
