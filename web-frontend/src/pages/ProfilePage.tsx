import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  Home,
  Newspaper,
  MessageCircle,
  ReceiptText,
  LoaderCircle,
  PackageSearch,
  RefreshCw,
  Shuffle,
  UserRound,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnnouncementPanel } from "@/components/home/AnnouncementPanel";
import { UserAvatar } from "@/components/home/UserAvatar";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunityInteractions } from "@/components/community/CommunityInteractions";
import { getUnreadAnnouncementCount } from "@/lib/announcement";
import "@/components/community/community.css";
import { TutorialWorkspaceShell, type TutorialSidebarItem } from "@/components/tutorial/TutorialWorkspaceShell";
import { ProfileCheckInPanel } from "@/components/community/ProfileCheckInPanel";
import "@/components/community/profile-settings.css";
import { openAlipayCheckoutWindow, submitAlipayPaymentForm } from "@/lib/alipay-checkout";
import {
  clearPersistedLoginUser,
  getPersistedLoginUser,
  updatePersistedLoginUser,
} from "@/lib/auth";
import {
  compactButtonBase,
  compactButtonPrimary,
  compactButtonSecondary,
} from "@/lib/buttonStyles";
import { usePreferredLocale } from "@/lib/locale";
import { resumeMemberAlipayPayment } from "@/lib/member";
import {
  compactBodyText,
  compactSectionTitle,
} from "@/lib/textStyles";
import {
  getCurrentLoginUser,
  listMyMemberOrders,
  updateMyProfile,
} from "@/lib/profile";
import { isAuthenticationError } from "@/lib/request";
import { cn } from "@/lib/utils";
import { createProfileAvatarOption, createProfileAvatarOptions } from "@/lib/avatar";
import type {
  MemberOrder,
  ProfileUpdateRequest,
  UserProfileDetail,
} from "@/lib/types";

interface FeedbackState {
  tone: "success" | "error";
  message: string;
}

const DEFAULT_ORDER_PAGE_SIZE = 12;

const MEMBER_LEVEL_LABELS = {
  "en-US": {
    NORMAL: "Normal",
    MEMBER: "Member",
    unknown: "Member",
  },
  "zh-CN": {
    NORMAL: "普通用户",
    MEMBER: "会员",
    unknown: "会员",
  },
} as const;

const PROFILE_COPY = {
  "en-US": {
    title: "Profile",
    subtitle:
      "Keep membership purchases in view, then manage account details below.",
    ordersLabel: "Orders",
    ordersDesc:
      "This page keeps your purchase records front and center, including plan, channel, amount, and payment progress.",
    currentPlanLabel: "Current plan",
    totalOrdersLabel: "Orders",
    refreshOrders: "Refresh",
    noOrders: "No orders yet.",
    noOrdersHint:
      "Choose a membership plan first and new purchase records will show up here.",
    openPricing: "Browse plans",
    accountOverview: "Account overview",
    accountOverviewDesc:
      "A compact view of your account identity and active membership status.",
    membershipLabel: "Membership",
    expireLabel: "Expires on",
    updatedLabel: "Last updated",
    accountLabel: "Account",
    profileCardLabel: "Profile details",
    profileCardDesc:
      "Edit your display name, bio, and avatar without leaving the order center.",
    displayNameLabel: "Display name",
    bioLabel: "Bio",
    avatarLabel: "Avatar",
    avatarHint: "Choose a built-in avatar. It will appear in your profile and community discussions.",
    changeAvatar: "Choose avatar",
    defaultAvatar: "Use default avatar",
    refreshAvatars: "Show more avatars",
    saveProfile: "Save profile",
    savingProfile: "Saving...",
    orderNumber: "Order No.",
    orderAmount: "Amount",
    orderChannel: "Channel",
    orderCreated: "Created",
    orderPaid: "Paid",
    orderFinished: "Finished",
    orderPlan: "Plan",
    orderAction: "Action",
    orderStatus: "Status",
    paymentDeadline: "Pay before",
    paymentRemaining: "Remaining",
    paymentExpired: "Expired",
    continuePayment: "Continue payment",
    retry: "Retry",
    loading: "Loading profile...",
    loadFailed: "Unable to load your profile right now",
    backToLogin: "Back to sign in",
    notAvailable: "Not available",
    avatarUploadFailed: "Avatar upload failed",
    avatarUploadSuccess:
      "Avatar updated, save profile to keep the latest version",
    profileUpdateSuccess: "Profile updated successfully",
    profileUpdateFailed: "Unable to update your profile right now",
    ordersLoadFailed: "Unable to load membership orders",
    profileRefreshFailed: "Unable to refresh your profile",
    statusPending: "Pending",
    statusPaid: "Paid",
    statusCompleted: "Completed",
    statusPaymentCompleted: "Payment completed",
    statusActivating: "Payment received, activating",
    statusCanceled: "Canceled",
    statusExpired: "Expired",
    statusFailed: "Failed",
    statusUnknown: "Unknown",
    emptyName: "Member",
    tabProfile: "Profile Settings",
    tabOrders: "Order History",
    upgradePlan: "Upgrade Plan",
  },
  "zh-CN": {
    title: "个人中心",
    subtitle: "查看交易订单与账号资料。",
    ordersLabel: "交易订单",
    ordersDesc:
      "查看会员购买、积分充值的金额、支付渠道和订单进度。",
    currentPlanLabel: "当前会员",
    totalOrdersLabel: "订单数量",
    refreshOrders: "刷新订单",
    noOrders: "暂时没有交易订单。",
    noOrdersHint: "前往项目套餐购买会员或充值积分，新订单会同步展示在这里。",
    openPricing: "查看会员方案",
    accountOverview: "账号概览",
    accountOverviewDesc: "保留紧凑的账号信息和当前会员状态，方便快速查看。",
    membershipLabel: "会员等级",
    expireLabel: "到期时间",
    updatedLabel: "最近更新",
    accountLabel: "账号",
    profileCardLabel: "个人资料",
    profileCardDesc: "在订单视图下方继续维护昵称、简介和头像。",
    displayNameLabel: "昵称",
    bioLabel: "个人简介",
    avatarLabel: "头像",
    avatarHint: "选择一个内置头像，保存后会同步显示在个人中心和社区讨论中。",
    changeAvatar: "选择头像",
    defaultAvatar: "使用默认头像",
    refreshAvatars: "换一批头像",
    saveProfile: "保存资料",
    savingProfile: "保存中...",
    orderNumber: "订单号",
    orderAmount: "金额",
    orderChannel: "支付渠道",
    orderCreated: "创建时间",
    orderPaid: "支付时间",
    orderFinished: "完成时间",
    orderPlan: "套餐",
    orderAction: "操作",
    orderStatus: "状态",
    paymentDeadline: "支付截止",
    paymentRemaining: "剩余",
    paymentExpired: "已失效",
    continuePayment: "继续支付",
    retry: "重试",
    loading: "正在加载个人中心...",
    loadFailed: "当前无法加载个人中心信息",
    backToLogin: "返回登录",
    notAvailable: "暂无",
    avatarUploadFailed: "头像上传失败",
    avatarUploadSuccess: "头像已上传，保存资料后会同步到当前账号",
    profileUpdateSuccess: "个人资料更新成功",
    profileUpdateFailed: "当前无法更新个人资料",
    ordersLoadFailed: "当前无法加载交易订单",
    profileRefreshFailed: "当前无法刷新个人资料",
    statusPending: "待支付",
    statusPaid: "已支付",
    statusCompleted: "已完成",
    statusPaymentCompleted: "支付完成",
    statusActivating: "支付成功，正在开通",
    statusCanceled: "已取消",
    statusExpired: "已过期",
    statusFailed: "失败",
    statusUnknown: "未知状态",
    emptyName: "会员用户",
    tabProfile: "个人资料",
    tabOrders: "订单",
    upgradePlan: "升级会员",
  },
} as const;

function getMemberLabel(
  locale: "en-US" | "zh-CN",
  memberLevel?: string | null,
) {
  if (!memberLevel) {
    return MEMBER_LEVEL_LABELS[locale].NORMAL;
  }

  const normalized =
    memberLevel.toUpperCase() as keyof (typeof MEMBER_LEVEL_LABELS)["en-US"];

  return (
    MEMBER_LEVEL_LABELS[locale][normalized] ?? MEMBER_LEVEL_LABELS[locale].unknown
  );
}

function formatDateTime(
  locale: "en-US" | "zh-CN",
  value?: string | null,
  fallback?: string,
) {
  if (!value) {
    return fallback ?? PROFILE_COPY[locale].notAvailable;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback ?? PROFILE_COPY[locale].notAvailable;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(locale: "en-US" | "zh-CN", value?: string | null) {
  if (!value) {
    return PROFILE_COPY[locale].notAvailable;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return PROFILE_COPY[locale].notAvailable;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}

function formatAmount(
  locale: "en-US" | "zh-CN",
  amount?: number | null,
  fallback?: string,
) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return fallback ?? PROFILE_COPY[locale].notAvailable;
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getPaymentChannelLabel(locale: "en-US" | "zh-CN", paymentChannel?: string) {
  if (!paymentChannel) {
    return PROFILE_COPY[locale].notAvailable;
  }
  if (paymentChannel.toLowerCase() === "stripe") {
    return locale === "zh-CN" ? "历史支付" : "Legacy payment";
  }
  return paymentChannel;
}

function getPlanLabel(locale: "en-US" | "zh-CN", planType?: string) {
  const labels = {
    points: locale === "zh-CN" ? "积分充值" : "Points recharge",
    month: locale === "zh-CN" ? "月费会员" : "Monthly",
    year: locale === "zh-CN" ? "年费会员" : "Yearly",
    lifetime: locale === "zh-CN" ? "永久会员" : "Lifetime",
  };
  return planType && planType in labels
    ? labels[planType as keyof typeof labels]
    : PROFILE_COPY[locale].notAvailable;
}

function canResumeOrder(order: MemberOrder, now = Date.now()) {
  if (order.orderStatus?.toLowerCase() !== "pending" || order.paymentChannel?.toLowerCase() !== "alipay") {
    return false;
  }
  const expiresAt = order.expiresAt ? new Date(order.expiresAt).getTime() : 0;
  return Number.isFinite(expiresAt) && expiresAt > now;
}

function isPendingOrderExpired(order: MemberOrder, now = Date.now()) {
  if (order.orderStatus?.toLowerCase() !== "pending" || !order.expiresAt) {
    return false;
  }
  const expiresAt = new Date(order.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

function formatRemainingTime(locale: "en-US" | "zh-CN", expiresAt: string | undefined, now: number) {
  if (!expiresAt) {
    return PROFILE_COPY[locale].notAvailable;
  }
  const remainingSeconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) {
    return PROFILE_COPY[locale].paymentExpired;
  }
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const clock = [hours, minutes, seconds]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, "0"))
    .join(":");
  return `${PROFILE_COPY[locale].paymentRemaining} ${clock}`;
}

function getOrderStatusLabel(locale: "en-US" | "zh-CN", order: MemberOrder, now = Date.now()) {
  const normalized = order.orderStatus?.toUpperCase() || "";
  const copy = PROFILE_COPY[locale];

  if (isPendingOrderExpired(order, now)) {
    return copy.statusExpired;
  }

  if (normalized === "COMPLETED") {
    return copy.statusPaymentCompleted;
  }

  if (normalized === "PAID") {
    return copy.statusPaid;
  }

  if (
    normalized.includes("SUCCESS") ||
    normalized.includes("PAID") ||
    normalized.includes("PAYED")
  ) {
    return copy.statusPaid;
  }

  if (normalized.includes("FINISH") || normalized.includes("DONE")) {
    return copy.statusCompleted;
  }

  if (normalized.includes("CANCEL") || normalized.includes("CLOSED")) {
    return copy.statusCanceled;
  }

  if (normalized.includes("EXPIRED")) {
    return copy.statusExpired;
  }

  if (normalized.includes("FAILED") || normalized.includes("ERROR")) {
    return copy.statusFailed;
  }

  if (normalized.includes("PENDING") || normalized.includes("WAIT")) {
    return copy.statusPending;
  }

  return copy.statusUnknown;
}

function getOrderStatusClass(order: MemberOrder, now = Date.now()) {
  const normalized = order.orderStatus?.toUpperCase() || "";

  if (isPendingOrderExpired(order, now)) {
    return "border-red-200 bg-red-50 text-red-600";
  }

  if (
    normalized === "COMPLETED" ||
    normalized.includes("SUCCESS") ||
    normalized.includes("PAID") ||
    normalized.includes("PAYED")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized.includes("FINISH") || normalized.includes("DONE")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (
    normalized.includes("CANCEL") ||
    normalized.includes("CLOSED") ||
    normalized.includes("EXPIRED") ||
    normalized.includes("FAILED") ||
    normalized.includes("ERROR")
  ) {
    return "border-red-200 bg-red-50 text-red-600";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function buildMergedProfile(nextUser: UserProfileDetail) {
  const storedUser = getPersistedLoginUser();

  return {
    ...storedUser,
    ...nextUser,
    memberExpireTime:
      nextUser.memberExpireTime ?? storedUser?.memberExpireTime,
    memberLevel: nextUser.memberLevel ?? storedUser?.memberLevel,
  } satisfies UserProfileDetail;
}

function getRequestMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = usePreferredLocale();
  const copy = PROFILE_COPY[locale];

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = requestedTab === "orders" || requestedTab === "announcements" || requestedTab === "profile" || requestedTab === "interactions" ? requestedTab : "news";
  const setActiveTab = (tab: string) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    next.set("tab", tab);
    next.delete("post");
    next.delete("comment"); next.delete("from"); next.delete("announcement");
    return next;
  });
  useEffect(() => {
    if (requestedTab !== "downloads") return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", "news");
      return next;
    }, { replace: true });
  }, [requestedTab, setSearchParams]);
  const [unreadCount, setUnreadCount] = useState<number | undefined>();
  useEffect(() => {
    let active = true;
    void getUnreadAnnouncementCount().then(count => { if (active) setUnreadCount(Number(count)); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const [profile, setProfile] = useState<UserProfileDetail | null>(() =>
    getPersistedLoginUser(),
  );
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [resumingOrderNo, setResumingOrderNo] = useState<string | null>(null);
  const [orderClock, setOrderClock] = useState(() => Date.now());
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState | null>(
    null,
  );
  useEffect(() => {
    if (!profileFeedback) return;
    const timer = window.setTimeout(() => setProfileFeedback(null), 4500);
    return () => window.clearTimeout(timer);
  }, [profileFeedback]);
  const [draft, setDraft] = useState<ProfileUpdateRequest>({
    userAvatar: "",
    userName: "",
    userProfile: "",
  });
  const [avatarOptions, setAvatarOptions] = useState(() => createProfileAvatarOptions());
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const selectedAvatarOption = createProfileAvatarOption(draft.userAvatar);
  const visibleAvatarOptions = selectedAvatarOption && !avatarOptions.some(option => option.value === selectedAvatarOption.value)
    ? [selectedAvatarOption, ...avatarOptions].slice(0, 12)
    : avatarOptions;
  const profileDirty = ["userAvatar", "userName", "userProfile"].some(key => {
    const field = key as keyof ProfileUpdateRequest;
    return (draft[field] || "").trim() !== (profile?.[field] || "").trim();
  });

  const syncProfileState = (nextUser: UserProfileDetail) => {
    const mergedProfile = buildMergedProfile(nextUser);
    const currentAvatarOption = createProfileAvatarOption(mergedProfile.userAvatar);

    setProfile(mergedProfile);
    setDraft({
      userAvatar: mergedProfile.userAvatar ?? "",
      userName: mergedProfile.userName ?? "",
      userProfile: mergedProfile.userProfile ?? "",
    });
    if (currentAvatarOption) {
      setAvatarOptions((current) => current.some((option) => option.value === currentAvatarOption.value)
        ? current
        : [currentAvatarOption, ...current].slice(0, 12));
    }
    updatePersistedLoginUser(mergedProfile);

    return mergedProfile;
  };

  const handlePointBalanceChange = (pointBalance: number) => {
    updatePersistedLoginUser({ pointBalance });
    setProfile((currentProfile) => {
      if (!currentProfile) {
        return currentProfile;
      }

      const nextProfile = {
        ...currentProfile,
        pointBalance,
      };

      return nextProfile;
    });
  };

  const redirectToLogin = () => {
    clearPersistedLoginUser();
    navigate("/auth/login", {
      replace: true,
      state: {
        redirectTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const handleRequestError = (error: unknown, fallbackMessage: string) => {
    if (isAuthenticationError(error)) {
      redirectToLogin();
      return true;
    }

    setLoadError(getRequestMessage(error, fallbackMessage));
    return false;
  };

  const loadProfileOverview = async (signal?: AbortSignal) => {
    const user = await getCurrentLoginUser({ signal });

    return syncProfileState(user);
  };

  const loadOrders = async (signal?: AbortSignal) => {
    setIsOrdersLoading(true);
    setOrdersError(null);

    try {
      const orderPage = await listMyMemberOrders(
        {
          current: 1,
          pageSize: DEFAULT_ORDER_PAGE_SIZE,
          sortField: "createTime",
          sortOrder: "descend",
        },
        { signal },
      );

      setOrders(orderPage.records ?? []);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setOrders([]);
      setOrdersError(getRequestMessage(error, copy.ordersLoadFailed));
    } finally {
      if (!signal?.aborted) {
        setIsOrdersLoading(false);
      }
    }
  };

  const handleResumePayment = async (order: MemberOrder) => {
    if (!order.orderNo || !canResumeOrder(order)) {
      return;
    }
    const checkoutWindow = openAlipayCheckoutWindow();
    if (!checkoutWindow) {
      setOrdersError("支付窗口被浏览器拦截，请允许本站打开新窗口后重试");
      return;
    }
    setOrdersError(null);
    setResumingOrderNo(order.orderNo);
    try {
      const checkout = await resumeMemberAlipayPayment(order.orderNo);
      submitAlipayPaymentForm(checkout.paymentFormHtml, checkoutWindow.name);
    } catch (error) {
      checkoutWindow.window.close();
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }
      setOrdersError(getRequestMessage(error, copy.ordersLoadFailed));
      await loadOrders();
    } finally {
      setResumingOrderNo(null);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setLoadError(null);

    void loadProfileOverview(controller.signal)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        handleRequestError(error, copy.profileRefreshFailed);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [locale]);

  useEffect(() => {
    if (activeTab !== "orders") return;
    const controller = new AbortController();
    void loadOrders(controller.signal);
    const timer = window.setInterval(() => setOrderClock(Date.now()), 1_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [activeTab, locale]);


  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(null);

    void Promise.all([loadProfileOverview(), loadOrders()])
      .catch((error: unknown) => {
        handleRequestError(error, copy.profileRefreshFailed);
      })
      .finally(() => setIsLoading(false));
  };

  const handleProfileSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (isSavingProfile || !profileDirty) return;
    if (!draft.userName?.trim()) {
      setProfileFeedback({ tone: "error", message: locale === "zh-CN" ? "请填写昵称" : "Enter a display name" });
      return;
    }
    setProfileFeedback(null);

    try {
      setIsSavingProfile(true);
      await updateMyProfile({
        userAvatar: draft.userAvatar?.trim() || "",
        userName: draft.userName.trim(),
        userProfile: draft.userProfile?.trim() || "",
      });
      await loadProfileOverview();
      setProfileFeedback({
        tone: "success",
        message: copy.profileUpdateSuccess,
      });
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setProfileFeedback({
        tone: "error",
        message: getRequestMessage(error, copy.profileUpdateFailed),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const sidebarItems: TutorialSidebarItem[] = [
    { id: "news", label: locale === "zh-CN" ? "新闻与帖子" : "News & posts", icon: Newspaper, active: activeTab === "news", onClick: () => setActiveTab("news") },
    { id: "announcements", label: locale === "zh-CN" ? "社区公告" : "Community announcements", icon: Bell, count: unreadCount || undefined, active: activeTab === "announcements", onClick: () => setActiveTab("announcements") },
    { id: "interactions", label: "我的互动", icon: MessageCircle, active: activeTab === "interactions", onClick: () => setActiveTab("interactions") },
    { id: "profile", label: copy.tabProfile, icon: UserRound, active: activeTab === "profile", onClick: () => setActiveTab("profile") },
    { id: "orders", label: copy.tabOrders, icon: ReceiptText, active: activeTab === "orders", onClick: () => setActiveTab("orders") },
  ];
  const activeLabel = sidebarItems.find((item) => item.active)?.label;
  const isProfileUnavailable = !profile && (isLoading || Boolean(loadError));

  return (
    <TutorialWorkspaceShell
      appearance="community"
      mainClassName={activeTab === "news" ? "community-main community-main-feed" : "community-main"}
      sectionClassName="community-section"
      sidebarHeading={copy.title}
      navigationLabel={locale === "zh-CN" ? "个人中心导航" : "Account navigation"}
      groups={[
        { label: locale === "zh-CN" ? "社区" : "Community", items: sidebarItems.slice(0, 3) },
        { label: locale === "zh-CN" ? "账号" : "Account", items: sidebarItems.slice(3) },
      ]}
      items={sidebarItems}
      collapsedItems={sidebarItems}
      topItems={[{ id: "home", label: locale === "zh-CN" ? "返回首页" : "Back to home", icon: Home, onClick: () => navigate("/") }]}
      header={<div className="min-w-0"><h1 className="community-page-title">{activeLabel}</h1></div>}
    >
      <div className={activeTab === "news" || activeTab === "announcements" || activeTab === "interactions" ? "min-w-0 w-full" : "community-account-container mx-auto w-full min-w-0 p-4 sm:p-6 lg:p-8"}>
        {isProfileUnavailable && (activeTab === "profile" || activeTab === "orders") ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center text-[14px] text-[var(--hero-muted)]" role="status">
            {isLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <UserRound className="h-5 w-5" />}
            <p>{isLoading ? copy.loading : loadError || copy.loadFailed}</p>
            {!isLoading && <div className="flex gap-3">
              <button type="button" onClick={handleRetry} className={cn(compactButtonBase, compactButtonSecondary)}>{copy.retry}</button>
              <button type="button" onClick={redirectToLogin} className={cn(compactButtonBase, compactButtonPrimary)}>{copy.backToLogin}</button>
            </div>}
          </div>
        ) : (
          <>
            {activeTab === "profile" && (
              <div className="profile-settings">
                <section className="profile-identity" aria-label="账号信息">
                  <div className="profile-identity-top">
                    <UserAvatar className="profile-identity-avatar" src={profile?.userAvatar} alt={profile?.userName || copy.emptyName} fallback={<UserRound size={25} />} />
                    <div className="profile-identity-name"><div><h2>{profile?.userName || copy.emptyName}</h2><span className="profile-membership-badge">{getMemberLabel(locale, profile?.memberLevel)}</span></div><p>{copy.accountLabel} · {profile?.userAccount || copy.notAvailable}</p></div>
                  </div>
                  <dl className="profile-account-facts">
                    <div><dt>{copy.membershipLabel}</dt><dd>{getMemberLabel(locale, profile?.memberLevel)}</dd></div>
                    <div><dt>{copy.expireLabel}</dt><dd>{formatDate(locale, profile?.memberExpireTime)}</dd></div>
                    <div><dt>{copy.updatedLabel}</dt><dd>{formatDateTime(locale, profile?.updateTime || profile?.createTime)}</dd></div>
                  </dl>
                </section>
                <div className="profile-settings-grid">
                  <section className="profile-settings-card" aria-labelledby="profile-edit-title">
                    <div className="profile-card-heading"><div><h2 id="profile-edit-title">{locale === "zh-CN" ? "编辑资料" : "Edit profile"}</h2><p>{locale === "zh-CN" ? "让大家更好地认识你" : "Tell the community about yourself"}</p></div><UserRound size={19} /></div>
                    <form onSubmit={handleProfileSubmit} className="profile-settings-form" data-unsaved={profileDirty || undefined}>
                      <fieldset className="profile-avatar-picker" disabled={isSavingProfile}>
                        <legend>{copy.avatarLabel}</legend>
                        <div className="profile-avatar-picker-layout">
                          <UserAvatar className="profile-avatar-preview" src={draft.userAvatar} alt={draft.userName || copy.emptyName} fallback={<UserRound size={25} />} />
                          <button type="button" className="profile-avatar-toggle" aria-expanded={avatarPickerOpen} aria-controls="profile-avatar-choices" onClick={() => setAvatarPickerOpen(open => !open)}>{avatarPickerOpen ? "收起头像" : copy.changeAvatar}</button>
                        </div>
                        <div id="profile-avatar-choices" hidden={!avatarPickerOpen}>
                          <p>{copy.avatarHint}</p>
                          <div className="profile-avatar-options" aria-label={copy.changeAvatar}>
                            {visibleAvatarOptions.map((avatar, index) => (
                              <button
                                key={avatar.id}
                                type="button"
                                aria-label={`${copy.changeAvatar} ${index + 1}`}
                                aria-pressed={draft.userAvatar === avatar.value}
                                className="profile-avatar-option"
                                onClick={() => setDraft((current) => ({ ...current, userAvatar: avatar.value }))}
                              >
                                <img src={avatar.src} alt="" />
                              </button>
                            ))}
                          </div>
                        <div className="profile-avatar-actions">
                          <button type="button" onClick={() => setAvatarOptions(createProfileAvatarOptions())}>
                            <Shuffle size={12} />{copy.refreshAvatars}
                          </button>
                          <button type="button" onClick={() => setDraft((current) => ({ ...current, userAvatar: "" }))}>
                            {copy.defaultAvatar}
                          </button>
                        </div>
                        </div>
                      </fieldset>
                      <div className="profile-settings-field"><label htmlFor="profile-name">{copy.displayNameLabel}</label><input id="profile-name" type="text" required maxLength={256} value={draft.userName ?? ""} disabled={isSavingProfile} onChange={event => setDraft(current => ({ ...current, userName: event.target.value }))} /></div>
                      <div className="profile-settings-field"><label htmlFor="profile-bio">{copy.bioLabel}</label><textarea id="profile-bio" rows={4} maxLength={512} aria-describedby="profile-bio-count" value={draft.userProfile ?? ""} disabled={isSavingProfile} placeholder={locale === "zh-CN" ? "聊聊你的兴趣、正在做的事…" : "Share your interests and what you are working on…"} onChange={event => setDraft(current => ({ ...current, userProfile: event.target.value }))} /><span className="profile-field-count" id="profile-bio-count">{draft.userProfile?.length || 0} / 512</span></div>
                      <div className="profile-settings-form-footer"><span aria-live="polite">{profileDirty ? "有未保存的修改" : "资料已保存"}</span><div className="profile-form-actions">{profileDirty && <button type="button" disabled={isSavingProfile} onClick={() => setDraft({ userAvatar: profile?.userAvatar || "", userName: profile?.userName || "", userProfile: profile?.userProfile || "" })}>取消修改</button>}<button type="submit" disabled={isSavingProfile || !profileDirty} className="profile-settings-primary">{isSavingProfile && <LoaderCircle size={14} className="animate-spin" />}{isSavingProfile ? copy.savingProfile : copy.saveProfile}</button></div></div>
                    </form>
                  </section>
                  <ProfileCheckInPanel onPointBalanceChange={handlePointBalanceChange} />
                </div>
                {profileFeedback && <div className="community-toast" role="status">{profileFeedback.message}<button aria-label="关闭资料提示" onClick={() => setProfileFeedback(null)}><X size={14} /></button></div>}
              </div>
            )}
            {activeTab === "orders" && (
              <div
                className="min-w-0 rounded-[12px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className={compactSectionTitle}>
                      {copy.ordersLabel}
                    </h2>
                    <p className={cn("mt-1", compactBodyText)}>
                      {copy.ordersDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadOrders()}
                    disabled={isOrdersLoading}
                    className={cn(compactButtonBase, compactButtonSecondary, "shrink-0")}
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", isOrdersLoading && "animate-spin")}
                    />
                    {copy.refreshOrders}
                  </button>
                </div>

                {ordersError ? (
                  <div className="mb-6 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-[0.88rem] leading-6 text-red-600">
                    {ordersError}
                  </div>
                ) : null}

                {isOrdersLoading ? (
                  <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-[var(--hero-ink)]/6 bg-[var(--hero-surface)]">
                    <div className="inline-flex items-center gap-2 text-[13px] text-[var(--hero-muted)]">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      {copy.loading}
                    </div>
                  </div>
                ) : orders.length ? (
                  <div className="overflow-x-auto rounded-[16px] border border-[var(--hero-ink)]/8">
                    <table className="w-full min-w-[1220px] table-fixed border-collapse text-left text-[13px]">
                      <thead className="bg-[var(--hero-ink)]/[0.035] text-[12px] text-[var(--hero-muted)]">
                        <tr>
                          <th className="w-[220px] px-4 py-3 font-medium">{copy.orderNumber}</th>
                          <th className="w-[90px] px-4 py-3 font-medium">{copy.orderPlan}</th>
                          <th className="w-[100px] px-4 py-3 font-medium">{copy.orderAmount}</th>
                          <th className="w-[90px] px-4 py-3 font-medium">{copy.orderChannel}</th>
                          <th className="w-[165px] px-4 py-3 font-medium">{copy.orderCreated}</th>
                          <th className="w-[165px] px-4 py-3 font-medium">{copy.orderPaid}</th>
                          <th className="w-[105px] px-4 py-3 font-medium">{copy.orderStatus}</th>
                          <th className="w-[215px] px-4 py-3 font-medium">{copy.paymentDeadline}</th>
                          <th className="w-[120px] px-4 py-3 text-right font-medium">{copy.orderAction}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const resumable = canResumeOrder(order, orderClock);
                          const resuming = resumingOrderNo === order.orderNo;
                          const isPending = order.orderStatus?.toLowerCase() === "pending";
                          return (
                            <tr key={order.id} className="border-t border-[var(--hero-ink)]/7 align-middle">
                              <td className="px-4 py-3 font-medium text-[var(--hero-ink)]">
                                <span className="block truncate">{order.orderNo || copy.notAvailable}</span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-[var(--hero-ink)]">{getPlanLabel(locale, order.planType)}{order.orderType === 'point_recharge' && <span className="mt-1 block text-[12px] text-[var(--hero-muted)]">{order.rechargeQuantity} 份 · {order.pointsAmount} 积分</span>}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-[var(--hero-ink)]">¥{formatAmount(locale, order.orderAmount)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-[var(--hero-muted)]">{getPaymentChannelLabel(locale, order.paymentChannel)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-[var(--hero-muted)]">{formatDateTime(locale, order.createTime)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-[var(--hero-muted)]">{formatDateTime(locale, order.payTime)}</td>
                              <td className="px-4 py-3">
                                <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-medium", getOrderStatusClass(order, orderClock))}>
                                  {getOrderStatusLabel(locale, order, orderClock)}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-[var(--hero-muted)]">
                                {isPending && order.expiresAt ? (
                                  <>
                                    <span className="block">{formatDateTime(locale, order.expiresAt)}</span>
                                    <span className={cn("mt-1 block text-[11px]", resumable ? "text-amber-600" : "text-red-600")}>
                                      {formatRemainingTime(locale, order.expiresAt, orderClock)}
                                    </span>
                                  </>
                                ) : "-"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {resumable ? (
                                  <button
                                    type="button"
                                    disabled={resumingOrderNo !== null}
                                    onClick={() => void handleResumePayment(order)}
                                    className={cn(compactButtonBase, compactButtonPrimary, "ml-auto whitespace-nowrap")}
                                  >
                                    {resuming ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                                    {copy.continuePayment}
                                  </button>
                                ) : <span className="text-[12px] text-[var(--hero-muted)]">-</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-dashed border-[var(--hero-ink)]/12 bg-[var(--hero-surface)] px-6 py-16 text-center">
                    <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--hero-surface)] text-[var(--hero-muted)] shadow-[0_10px_24px_rgba(17,17,17,0.05)]">
                      <PackageSearch className="h-6 w-6" />
                    </div>
                    <p className="mt-5 text-[16px] font-medium tracking-[-0.02em] text-[var(--hero-ink)]">
                      {copy.noOrders}
                    </p>
                    <p className={cn("mx-auto mt-2 max-w-[440px]", compactBodyText)}>
                      {copy.noOrdersHint}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/pricing")}
                      className={cn(compactButtonBase, compactButtonPrimary, "mt-6")}
                    >
                      {copy.openPricing}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
            {activeTab === "announcements" && (
              <AnnouncementPanel title={activeLabel} variant="page" onUnreadCountChange={setUnreadCount} />
            )}
            {activeTab === "news" && (
              <CommunityFeed />
            )}
            {activeTab === "interactions" && <CommunityInteractions />}
          </>
        )}
      </div>
    </TutorialWorkspaceShell>
  );
}
