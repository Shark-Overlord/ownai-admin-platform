import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent, UIEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowUp,
  Camera,
  CheckCircle2,
  Copy,
  Download,
  Home,
  ImageIcon,
  Loader2,
  Menu,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  createImageGenerationTask,
  getCurrentImageGenerationConversation,
  getImageGenerationConversation,
  listImageGenerationConversations,
  uploadImageGenerationReference,
  type ImageGenerationConversation,
  type ImageGenerationConversationMessage,
  type ImageGenerationConversationSummary,
  type ImageGenerationImageSize,
  type ImageGenerationMode,
  type ImageGenerationTaskStatus,
  type ImageGenerationAspectRatio,
} from "@/lib/image-generation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { AuthenticatedUserMenu } from "@/components/home/AuthenticatedUserMenu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  getAnnouncementDetail,
  getUnreadAnnouncementCount,
  listAnnouncements,
  markAnnouncementRead,
} from "@/lib/announcement";
import { listCategoryTags } from "@/lib/category";
import {
  clearPersistedLoginUser,
  getPersistedLoginUser,
  logoutUser,
  updatePersistedLoginUser,
} from "@/lib/auth";
import { getAuthSessionEventName } from "@/lib/auth-session";
import {
  addPromptAssetFavorite,
  cancelPromptAssetFavorite,
  checkPromptAssetFavorite,
  listMyPromptAssetFavorites,
  notifyPromptAssetFavoriteChange,
  subscribePromptAssetFavoriteChange,
} from "@/lib/favorite";
import { getPromptAssetHomeOverview, listHomePromptAssets } from "@/lib/artwork";
import { usePreferredLocale, type AppLocale } from "@/lib/locale";
import type { AnnouncementVO, HomeTagOption, LoginUserVO, LocalizedText, SiteItem } from "@/lib/types";
import { isAuthenticationError, RequestError } from "@/lib/request";
import { cn } from "@/lib/utils";

type ChatMode = "assist" | "manual";
type StudioMainView = "home" | "chat" | "promptMarket" | "promptSearch" | "promptFavorites";
type PromptMarketFilter = "latest" | "featured";
type PromptMarketCategoryKey = "all" | string;
type AspectRatioId = "square" | "portrait" | "story" | "landscape" | "wide";
type ImageSizeId = "1k" | "2k" | "4k";
type SidebarRoute = "/";
type ConversationRole = "user" | "assistant";

const SHOW_NEW_SESSION_ACTION = false;
const SHOW_CONVERSATION_HISTORY = false;

interface RatioOption {
  id: AspectRatioId;
  label: string;
  resolution: string;
}

interface SizeOption {
  id: ImageSizeId;
  label: string;
  resolution: string;
  cost: number;
}

interface ModeOption {
  id: ChatMode;
  label: LocalizedText;
  shortLabel: LocalizedText;
}

interface ConversationMessageView {
  localId: string;
  id?: string | number;
  conversationId?: string;
  role: ConversationRole;
  prompt: string;
  resultImageUrls: string[];
  aspectRatio?: ImageGenerationAspectRatio | string;
  apiCostCny?: number;
  generationMode?: ImageGenerationMode | string;
  imageCount?: number;
  imageSize?: ImageGenerationImageSize | string;
  modelCode?: string;
  pointCost?: number;
  providerCode?: string;
  referenceImageUrl?: string;
  sourcePromptAssetId?: string | number;
  status?: ImageGenerationTaskStatus;
  taskId?: string | number;
  vendorSize?: string;
  errorMessage?: string;
  createTime?: string;
  updateTime?: string;
}

interface FeedbackState {
  message: string;
  tone: "error" | "info" | "success";
}

const PAGE_COPY = {
  "en-US": {
    brand: "Design Everything",
    newSessionTitle: "New session",
    newChat: "New chat",
    searchChats: "Search chats",
    history: "History",
    designServices: "Design services",
    promptMarket: "Prompt market",
    promptMarketTitle: "Prompt market",
    promptMarketDescription: "Curated visual prompts ready for concept, layout, and production exploration",
    featured: "Featured",
    latest: "Latest",
    promptMarketViews: "views",
    promptLibrary: "Prompt library",
    promptSearch: "Search prompts",
    promptPlaceholder: "Describe your design need, or upload a reference to continue",
    promptRequired: "Enter a design request or upload a reference",
    referenceOnlyPrompt: "Continue based on the uploaded reference image",
    submit: "Send",
    ratio: "Ratio",
    size: "Size",
    mode: "Mode",
    assist: "Assist",
    manual: "Manual",
    consume: "Cost",
    balance: "Balance",
    quote: "Quote",
    reference: "Reference",
    upload: "Upload reference",
    project: "Project",
    delivered: "Delivered",
    running: "Running",
    home: "Home",
    designService: "Design services",
    pricing: "Project plans",
    profile: "Profile",
    promptCount: "Prompt",
    points: "Points",
    emptyChats: "No chats",
    emptyPrompts: "No prompts",
    emptyConversationTitle: "Start a new session",
    emptyConversationDescription:
      "Pick a prompt, drop in a reference, or type a brief to begin with a clean canvas",
    emptyConversationHint: "Three quick starts",
    quickPrompts: [
      "Luxury product shot",
      "Mobile app onboarding",
      "Brand campaign key visual",
    ],
    promptLoading: "Loading prompts",
    promptLoadFailed: "Prompts failed to load",
    loadingConversation: "Loading conversation",
    historyLoading: "Loading history",
    historyLoadFailed: "History failed to load",
    conversationLoadFailed: "Conversation failed to load",
    currentConversationFailed: "Current conversation failed to load",
    conversationEmpty: "No conversation yet",
    conversationRefresh: "Refresh conversation",
    conversationAnchorList: "Conversation anchors",
    conversationAnchor: "Jump to message",
    submitFailed: "Failed to submit request",
    submitSuccess: "Request submitted",
    authRequired: "Please sign in again",
    referenceReady: "Reference ready",
    quotedReferenceName: "Quoted image",
    quotedReferenceReady: "Quoted image ready",
    uploadedReferenceName: "Uploaded reference",
    referenceInvalid: "This image URL cannot be used as a reference",
    retry: "Retry",
    retrySourceMissing: "Original request not found",
    download: "Download",
    noDelivery: "Delivered, but no image yet",
    estimatedCost: "Estimated cost",
    statusManualReview: "Manual review",
    statusStudioWorking: "Studio working",
    closeSidebar: "Close sidebar",
    openSidebar: "Open sidebar",
    promptDetail: "Prompt detail",
    closePromptDetail: "Close prompt detail",
    promptContent: "Prompt content",
    usePrompt: "Use prompt",
    savePrompt: "Save prompt",
    cancelPromptFavorite: "Cancel favorite",
    favoriteSaved: "Saved to favorites",
    favoriteCanceled: "Removed from favorites",
    favoriteSaveFailed: "Save failed",
    favoriteCancelFailed: "Cancel failed",
    copyPrompt: "Copy prompt",
    copied: "Copied",
    copyFailed: "Copy failed",
    referenceImage: "Reference image",
    sceneTags: "Scene tags",
    assetTags: "Asset tags",
    statusPending: "Waiting",
    statusRunning: "Working",
    statusSuccess: "Delivered",
    statusFailed: "Failed",
  },
  "zh-CN": {
    brand: "Design Everything",
    newSessionTitle: "新会话",
    newChat: "新建对话",
    searchChats: "搜索会话",
    history: "历史记录",
    designServices: "设计服务",
    promptMarket: "提示词市场",
    promptMarketTitle: "提示词市场",
    promptMarketDescription: "精选视觉 Prompt，适合概念、版式和交付探索",
    featured: "精选",
    latest: "最新",
    promptMarketViews: "浏览",
    promptLibrary: "提示词",
    promptSearch: "搜索提示词",
    promptPlaceholder: "描述你的设计需求，或上传参考图继续对话",
    promptRequired: "请输入需求，或先上传一张参考图",
    referenceOnlyPrompt: "根据已上传的参考图继续设计",
    submit: "发送",
    ratio: "比例",
    size: "尺寸",
    mode: "制作模式",
    assist: "辅助制作",
    manual: "人工定制",
    consume: "消耗",
    balance: "余额",
    quote: "引用",
    reference: "引用图片",
    upload: "上传参考图",
    project: "项目",
    delivered: "已交付",
    running: "进行中",
    home: "首页",
    designService: "设计服务",
    pricing: "项目套餐",
    profile: "个人中心",
    promptCount: "提示词",
    points: "积分",
    emptyChats: "暂无会话",
    emptyPrompts: "暂无提示词",
    emptyConversationTitle: "开始一个新会话",
    emptyConversationDescription: "先选一个提示词、上传参考图，或直接输入一句需求，页面就会开始回应",
    emptyConversationHint: "三个快速开始",
    quickPrompts: [
      "极简奢华产品图",
      "移动端引导页",
      "品牌活动主视觉",
    ],
    promptLoading: "正在加载提示词",
    promptLoadFailed: "提示词加载失败",
    loadingConversation: "正在加载会话",
    historyLoading: "正在加载历史",
    historyLoadFailed: "历史加载失败",
    conversationLoadFailed: "会话加载失败",
    currentConversationFailed: "当前会话加载失败",
    conversationEmpty: "还没有会话内容",
    conversationRefresh: "刷新会话",
    conversationAnchorList: "会话锚点",
    conversationAnchor: "跳转到消息",
    submitFailed: "提交失败",
    submitSuccess: "已提交请求",
    authRequired: "请重新登录",
    referenceReady: "参考图已就绪",
    quotedReferenceName: "引用生成图",
    quotedReferenceReady: "引用生成图已就绪",
    uploadedReferenceName: "已上传参考图",
    referenceInvalid: "该图片链接不是公网地址，无法作为参考图",
    retry: "重新提交",
    retrySourceMissing: "未找到可重新提交的原始输入",
    download: "下载",
    noDelivery: "已交付，暂无交付稿",
    estimatedCost: "预估服务额度",
    statusManualReview: "工作人员审核中",
    statusStudioWorking: "工作室制作中",
    closeSidebar: "关闭侧边栏",
    openSidebar: "打开侧边栏",
    promptDetail: "提示词详情",
    closePromptDetail: "关闭提示词详情",
    promptContent: "提示词内容",
    usePrompt: "使用创意",
    savePrompt: "收藏提示词",
    cancelPromptFavorite: "取消收藏",
    favoriteSaved: "已加入收藏",
    favoriteCanceled: "已取消收藏",
    favoriteSaveFailed: "收藏失败",
    favoriteCancelFailed: "取消收藏失败",
    copyPrompt: "复制提示词",
    copied: "已复制",
    copyFailed: "复制失败",
    referenceImage: "引用图片",
    sceneTags: "二级场景标签",
    assetTags: "资产描述标签",
    statusPending: "等待中",
    statusRunning: "制作中",
    statusSuccess: "已交付",
    statusFailed: "制作失败",
  },
} as const;

const RATIO_OPTIONS: RatioOption[] = [
  { id: "square", label: "1:1", resolution: "1024x1024" },
  { id: "portrait", label: "3:4", resolution: "768x1024" },
  { id: "story", label: "9:16", resolution: "720x1280" },
  { id: "landscape", label: "4:3", resolution: "1024x768" },
  { id: "wide", label: "16:9", resolution: "1280x720" },
];

const SIZE_OPTIONS: SizeOption[] = [
  { id: "1k", label: "1K", resolution: "1024x1024", cost: 10 },
  { id: "2k", label: "2K", resolution: "2048x2048", cost: 80 },
  { id: "4k", label: "4K", resolution: "4096x4096", cost: 150 },
];

const IMAGE_PROMPT_CATEGORY_ID = "2057283059198771201";
const PROMPT_PAGE_SIZE = 20;
const DRAFT_TEXTAREA_MIN_HEIGHT = 46;
const DRAFT_TEXTAREA_MAX_HEIGHT = 200;
const MOBILE_DRAFT_TEXTAREA_MIN_HEIGHT = 38;
const MOBILE_DRAFT_TEXTAREA_MAX_HEIGHT = 136;

const MODE_OPTIONS: ModeOption[] = [
  {
    id: "assist",
    label: { "en-US": "Assist mode", "zh-CN": "辅助制作" },
    shortLabel: { "en-US": "Assist", "zh-CN": "辅助" },
  },
  {
    id: "manual",
    label: { "en-US": "Manual mode", "zh-CN": "人工定制" },
    shortLabel: { "en-US": "Manual", "zh-CN": "定制" },
  },
];

const PROMPT_MARKET_FILTERS: PromptMarketFilter[] = ["latest", "featured"];
const PROMPT_MARKET_VISIBLE_CATEGORY_COUNT = 12;

const MEMBER_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  MEMBER: "Member",
};

function translate(text: LocalizedText, locale: AppLocale) {
  return text[locale];
}

function getMemberLabel(memberLevel?: string) {
  if (!memberLevel) {
    return "Normal";
  }

  return MEMBER_LABELS[memberLevel.toUpperCase()] ?? memberLevel;
}

function getTextValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function isScrollNearEnd(element: HTMLElement, threshold = 240) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

function mergeUniqueSiteItems(currentItems: SiteItem[], nextItems: SiteItem[]) {
  const existingIds = new Set(currentItems.map((item) => item.id));
  const uniqueNextItems = nextItems.filter((item) => !existingIds.has(item.id));

  return uniqueNextItems.length ? [...currentItems, ...uniqueNextItems] : currentItems;
}

function getResponsivePromptMasonryColumnCount(maxColumns: number) {
  if (maxColumns <= 1) {
    return 1;
  }

  if (typeof window === "undefined") {
    return Math.min(maxColumns, 5);
  }

  const width = window.innerWidth;
  const responsiveCount = width >= 1536 ? 5 : width >= 1280 ? 4 : width >= 640 ? 3 : 2;

  return Math.max(1, Math.min(maxColumns, responsiveCount));
}

function usePromptMasonryColumnCount(maxColumns: number) {
  const [columnCount, setColumnCount] = useState(() =>
    getResponsivePromptMasonryColumnCount(maxColumns),
  );

  useEffect(() => {
    const syncColumnCount = () => {
      setColumnCount(getResponsivePromptMasonryColumnCount(maxColumns));
    };

    syncColumnCount();
    window.addEventListener("resize", syncColumnCount);

    return () => {
      window.removeEventListener("resize", syncColumnCount);
    };
  }, [maxColumns]);

  return columnCount;
}

function getPromptMasonryAspectRatio(item: SiteItem, index: number) {
  const explicitRatio =
    typeof item.imageAspectRatio === "number" && Number.isFinite(item.imageAspectRatio)
      ? item.imageAspectRatio
      : undefined;
  const sizeRatio =
    item.imageWidth && item.imageHeight && item.imageWidth > 0 && item.imageHeight > 0
      ? item.imageWidth / item.imageHeight
      : undefined;
  const fallbackRatios = [0.74, 1, 1.28, 0.82, 1.42, 0.68, 1.12];
  const ratio = explicitRatio || sizeRatio || fallbackRatios[index % fallbackRatios.length];

  return Math.min(2.4, Math.max(0.45, ratio));
}

function distributePromptMasonryItems<T extends SiteItem>(items: T[], columnCount: number) {
  const columns = Array.from({ length: Math.max(1, columnCount) }, () => [] as Array<{
    index: number;
    item: T;
  }>);
  const columnHeights = columns.map(() => 0);

  items.forEach((item, index) => {
    const targetColumnIndex = columnHeights.reduce(
      (shortestIndex, height, currentIndex) =>
        height < columnHeights[shortestIndex] ? currentIndex : shortestIndex,
      0,
    );
    const aspectRatio = getPromptMasonryAspectRatio(item, index);

    columns[targetColumnIndex].push({ index, item });
    columnHeights[targetColumnIndex] += 1 / aspectRatio + 0.08;
  });

  return columns;
}

function distributePromptMasonryIndexes(itemCount: number, columnCount: number) {
  return Array.from({ length: Math.max(1, columnCount) }, (_, columnIndex) =>
    Array.from({ length: itemCount }, (_, index) => index).filter(
      (index) => index % columnCount === columnIndex,
    ),
  );
}

function safeParseResultImageUrls(value: ImageGenerationConversationMessage["resultImageUrls"]) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((url): url is string => typeof url === "string" && Boolean(url.trim()));
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(trimmedValue) as unknown;

    if (Array.isArray(parsedValue)) {
      return parsedValue.filter((url): url is string => typeof url === "string" && Boolean(url.trim()));
    }

    if (typeof parsedValue === "string" && parsedValue.trim()) {
      return [parsedValue.trim()];
    }
  } catch {
    return [trimmedValue];
  }

  return [];
}

function getConversationIdFromData(data: ImageGenerationConversation | null | undefined) {
  return getTextValue(data?.conversationId, data?.id);
}

function normalizeGenerationMode(value: unknown): ImageGenerationMode {
  return value === "manual" ? "manual" : "api";
}

function getNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return undefined;
}

function getConversationMessages(
  data: ImageGenerationConversation | null | undefined,
): ConversationMessageView[] {
  const conversationId = getConversationIdFromData(data);

  return (data?.messages ?? [])
    .map<ConversationMessageView | null>((message, index) => {
      const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;

      if (!role) {
        return null;
      }

      const id = message.id ?? message.messageId;
      const prompt = getTextValue(message.prompt);
      const errorMessage = getTextValue(message.errorMessage);
      const pointCost = getNumberValue(message.pointCost);

      return {
        localId: getTextValue(id, message.taskId, `${conversationId || "conversation"}-${index}`),
        id,
        conversationId: getTextValue(message.conversationId, conversationId) || undefined,
        role,
        prompt,
        resultImageUrls: safeParseResultImageUrls(message.resultImageUrlList || message.resultImageUrls),
        ...(message.aspectRatio ? { aspectRatio: message.aspectRatio } : {}),
        ...(message.apiCostCny !== undefined ? { apiCostCny: message.apiCostCny } : {}),
        ...(message.generationMode ? { generationMode: normalizeGenerationMode(message.generationMode) } : {}),
        ...(message.imageCount !== undefined ? { imageCount: message.imageCount } : {}),
        ...(message.imageSize ? { imageSize: message.imageSize } : {}),
        ...(message.modelCode ? { modelCode: message.modelCode } : {}),
        ...(pointCost !== undefined ? { pointCost } : {}),
        ...(message.providerCode ? { providerCode: message.providerCode } : {}),
        ...(getTextValue(message.referenceImageUrl) ? { referenceImageUrl: getTextValue(message.referenceImageUrl) } : {}),
        ...(message.sourcePromptAssetId !== undefined
          ? { sourcePromptAssetId: message.sourcePromptAssetId }
          : {}),
        ...(message.taskId !== undefined ? { taskId: message.taskId } : {}),
        ...(message.status ? { status: message.status } : {}),
        ...(message.vendorSize ? { vendorSize: message.vendorSize } : {}),
        ...(errorMessage ? { errorMessage } : {}),
        ...(message.createTime ? { createTime: message.createTime } : {}),
        ...(message.updateTime ? { updateTime: message.updateTime } : {}),
      };
    })
    .filter((message): message is ConversationMessageView => Boolean(message));
}

function getLastAssistantMessage(messages: ConversationMessageView[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") {
      return messages[index];
    }
  }

  return null;
}

function isActiveGenerationStatus(status: ImageGenerationTaskStatus | undefined) {
  return status === "pending" || status === "running";
}

function isManualGeneration(message: ConversationMessageView) {
  return normalizeGenerationMode(message.generationMode) === "manual";
}

function isPublicImageUrl(value: string | undefined) {
  return /^https?:\/\//i.test(value || "");
}

function formatElapsedTime(startTime?: string, endTime?: string, currentTimestamp = Date.now()) {
  const startTimestamp = startTime ? new Date(startTime).getTime() : 0;

  if (!Number.isFinite(startTimestamp) || startTimestamp <= 0) {
    return "0s";
  }

  const endTimestamp = endTime ? new Date(endTime).getTime() : currentTimestamp;
  const totalSeconds = Math.max(0, Math.floor((endTimestamp - startTimestamp) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function getAssistantStatusLabel(
  message: ConversationMessageView,
  copy: (typeof PAGE_COPY)[AppLocale],
) {
  if (message.status === "success" || message.resultImageUrls.length > 0) {
    return copy.statusSuccess;
  }

  if (message.status === "failed" || message.errorMessage) {
    return copy.statusFailed;
  }

  return isManualGeneration(message) ? copy.statusManualReview : copy.statusStudioWorking;
}

function getAspectRatioIdFromValue(value: string | undefined): AspectRatioId {
  const normalizedValue = value?.trim().toLowerCase();

  return (
    RATIO_OPTIONS.find(
      (item) =>
        item.id === normalizedValue ||
        item.label.toLowerCase() === normalizedValue ||
        item.resolution.toLowerCase() === normalizedValue,
    )?.id ?? "square"
  );
}

function getImageSizeIdFromValue(value: string | undefined): ImageSizeId {
  const normalizedValue = value?.trim().toLowerCase();

  return (
    SIZE_OPTIONS.find(
      (item) =>
        item.id === normalizedValue ||
        item.label.toLowerCase() === normalizedValue ||
        item.resolution.toLowerCase() === normalizedValue,
    )?.id ?? "1k"
  );
}

function truncateText(value: string, maxLength = 24) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}…`;
}

function getPromptItemText(item: SiteItem) {
  return getTextValue(item.prompt, item.description, item.title);
}

function getPlainAnnouncementText(value?: string) {
  return (value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAnnouncementUnread(announcement?: AnnouncementVO | null) {
  const readStatus = announcement?.readStatus;

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

function resizeDraftTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  const isMobileViewport =
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const minHeight = isMobileViewport
    ? MOBILE_DRAFT_TEXTAREA_MIN_HEIGHT
    : DRAFT_TEXTAREA_MIN_HEIGHT;
  const maxHeight = isMobileViewport
    ? MOBILE_DRAFT_TEXTAREA_MAX_HEIGHT
    : DRAFT_TEXTAREA_MAX_HEIGHT;

  textarea.style.height = "auto";
  const nextHeight = Math.min(
    Math.max(textarea.scrollHeight, minHeight),
    maxHeight,
  );

  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

function getPromptItemDescription(item: SiteItem) {
  return getTextValue(item.description, item.prompt, item.title);
}

function getPromptItemTags(item: SiteItem) {
  const tags = [
    ...item.tags,
    ...(item.assetTags ?? []),
    ...(item.assetTagTexts ?? []),
    ...(item.sceneTags ?? []),
  ];

  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);

  return Promise.resolve();
}

function getFirstUserPrompt(messages: ConversationMessageView[]) {
  return (
    messages.find((message) => message.role === "user" && message.prompt.trim())?.prompt.trim() ||
    ""
  );
}

function formatDateTime(value: string | undefined, locale: AppLocale) {
  if (!value) {
    return locale === "zh-CN" ? "暂无时间" : "No time";
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return locale === "zh-CN" ? "暂无时间" : "No time";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function formatMessageClock(value: string | undefined, locale: AppLocale) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  }).format(timestamp);
}

function getHistoryTitle(
  item: ImageGenerationConversationSummary,
  locale: AppLocale,
  cachedPromptTitle?: string,
) {
  if (cachedPromptTitle?.trim()) {
    return truncateText(cachedPromptTitle, locale === "zh-CN" ? 28 : 34);
  }

  return locale === "zh-CN" ? "新会话" : "New chat";
}

function getHistoryThumbnailUrl(item: ImageGenerationConversationSummary) {
  return item.thumbnailUrls?.find((url) => Boolean(url?.trim()))?.trim() || "";
}

function getHistoryTime(item: ImageGenerationConversationSummary, locale: AppLocale) {
  return formatDateTime(item.lastUpdateTime || item.firstCreateTime, locale);
}

function getSidebarAccountDisplayName(user: LoginUserVO | null) {
  return getTextValue(user?.userName, user?.userAccount) || "未设置";
}

function getSidebarAccountAvatarText(user: LoginUserVO | null) {
  return getSidebarAccountDisplayName(user).charAt(0).toUpperCase() || "D";
}

function SidebarThumbnail({
  active,
  alt,
  src,
}: {
  active?: boolean;
  alt: string;
  src?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const imageSrc = src?.trim();

  if (!imageSrc || hasError) {
    return (
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-control-bg)] text-[var(--chat-sidebar-muted-2)]",
          active && "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-muted)]",
        )}
        aria-hidden="true"
      >
        <ImageIcon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn(
        "h-9 w-9 shrink-0 rounded-[8px] border border-[var(--chat-sidebar-border)] object-cover",
      )}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

function SidebarSearchField({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="flex h-7 w-full items-center gap-1.5 rounded-[7px] px-2 text-[var(--chat-sidebar-muted-2)] transition-colors hover:bg-[var(--chat-sidebar-hover)] focus-within:bg-[var(--chat-sidebar-hover)]">
      <Search className="h-4 w-4 shrink-0" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--chat-sidebar-text)] outline-none placeholder:text-[var(--chat-sidebar-placeholder)] lg:w-[72px] lg:flex-none"
        placeholder={placeholder}
      />
    </label>
  );
}

function SidebarContent({
  activeMainView,
  conversationTitleMap,
  hasUnreadAnnouncements,
  historyItems,
  historyMessage,
  historyQuery,
  isHistoryLoading,
  locale,
  onClose,
  onCollapse,
  onHistoryRefresh,
  onHomeOpen,
  onNavigate,
  onNewChat,
  onPointBalanceChange,
  onProfileOpen,
  onFavoritesOpen,
  onPromptMarketOpen,
  onPromptSearchOpen,
  onSignOut,
  onUnreadAnnouncementCountChange,
  onUpgrade,
  onHistoryPick,
  onHistoryQueryChange,
  currentUser,
  selectedHistoryId,
}: {
  activeMainView: StudioMainView;
  conversationTitleMap: Record<string, string>;
  hasUnreadAnnouncements: boolean;
  historyItems: ImageGenerationConversationSummary[];
  historyMessage: string | null;
  historyQuery: string;
  isHistoryLoading: boolean;
  locale: AppLocale;
  onClose?: () => void;
  onCollapse?: () => void;
  onHistoryRefresh: () => void;
  onHomeOpen: () => void;
  onNavigate: (to: SidebarRoute) => void;
  onNewChat: () => void;
  onPointBalanceChange: (pointBalance: number) => void;
  onProfileOpen: () => void;
  onFavoritesOpen: () => void;
  onPromptMarketOpen: () => void;
  onPromptSearchOpen: () => void;
  onSignOut: () => void;
  onUnreadAnnouncementCountChange: (count: number) => void;
  onUpgrade: () => void;
  onHistoryPick: (item: ImageGenerationConversationSummary) => void;
  onHistoryQueryChange: (value: string) => void;
  currentUser: LoginUserVO | null;
  selectedHistoryId: string;
}) {
  const copy = PAGE_COPY[locale];
  const accountDisplayName = getSidebarAccountDisplayName(currentUser);
  const promptLibraryLabel = locale === "zh-CN" ? "提示词库" : copy.promptLibrary;
  const homeLabel = locale === "zh-CN" ? "首页" : copy.home;
  const sidebarSearchLabel = locale === "zh-CN" ? "搜索" : "Search";
  const favoritesLabel = locale === "zh-CN" ? "收藏" : "Favorites";
  const newSessionLabel = locale === "zh-CN" ? "新建会话" : copy.newSessionTitle;
  const navButtonClassName =
    "flex h-9 w-full items-center gap-3 rounded-[10px] px-2.5 text-left text-[14px] font-medium transition-colors";
  const filteredHistories = historyItems.filter((item) => {
    const cachedTitle = conversationTitleMap[item.conversationId];
    const title = getHistoryTitle(item, locale, cachedTitle).toLowerCase();
    const time = getHistoryTime(item, locale).toLowerCase();
    const query = historyQuery.trim().toLowerCase();

    return (
      !query ||
      title.includes(query) ||
      time.includes(query) ||
      item.conversationId.toLowerCase().includes(query)
    );
  });
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-[13px] lg:overflow-visible">
      <div className="flex h-9 items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="inline-flex min-w-0 shrink items-center gap-2 rounded-[8px] text-left text-[var(--hero-ink)] transition-opacity hover:opacity-90"
        >
          <span className="inline-flex h-8 w-9 shrink-0 items-center justify-center">
            <img
              src="/images/ownai-logo.png"
              alt={copy.brand}
              className="h-7 w-auto object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.10)]"
              draggable={false}
              decoding="async"
            />
          </span>
          <span className="brand-script-logo truncate py-[2px] !text-[16px] !leading-[1.18]">{copy.brand}</span>
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--chat-sidebar-muted)] transition-colors hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)] lg:hidden"
            aria-label={copy.closeSidebar}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            className="hidden h-8 w-8 items-center justify-center rounded-[8px] text-[var(--chat-sidebar-muted)] transition-colors hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)] lg:inline-flex"
            aria-label={copy.closeSidebar}
            title={copy.closeSidebar}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-1">
        <button
          type="button"
          onClick={onHomeOpen}
          aria-pressed={activeMainView === "home"}
          className={cn(
            navButtonClassName,
            activeMainView === "home"
              ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]"
              : "text-[var(--chat-sidebar-text)] hover:bg-[var(--chat-sidebar-hover)]",
          )}
        >
          <Home className="h-4 w-4 shrink-0" />
          <span className="truncate">{homeLabel}</span>
        </button>

        <button
          type="button"
          onClick={onPromptMarketOpen}
          aria-pressed={activeMainView === "promptMarket"}
          className={cn(
            navButtonClassName,
            activeMainView === "promptMarket"
              ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]"
              : "text-[var(--chat-sidebar-text)] hover:bg-[var(--chat-sidebar-hover)]",
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="truncate">{promptLibraryLabel}</span>
        </button>

        <button
          type="button"
          onClick={onPromptSearchOpen}
          aria-pressed={activeMainView === "promptSearch"}
          className={cn(
            navButtonClassName,
            activeMainView === "promptSearch"
              ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]"
              : "text-[var(--chat-sidebar-text)] hover:bg-[var(--chat-sidebar-hover)]",
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">{sidebarSearchLabel}</span>
        </button>

        <button
          type="button"
          onClick={onFavoritesOpen}
          aria-pressed={activeMainView === "promptFavorites"}
          className={cn(
            navButtonClassName,
            activeMainView === "promptFavorites"
              ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]"
              : "text-[var(--chat-sidebar-text)] hover:bg-[var(--chat-sidebar-hover)]",
          )}
        >
          <Star className="h-4 w-4 shrink-0" />
          <span className="truncate">{favoritesLabel}</span>
        </button>

        {SHOW_NEW_SESSION_ACTION ? (
          <button
            type="button"
            onClick={onNewChat}
            className={cn(navButtonClassName, "text-[var(--chat-sidebar-text)] hover:bg-[var(--chat-sidebar-hover)]")}
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            <span className="truncate">{newSessionLabel}</span>
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 pr-1 max-lg:pr-0">
        {SHOW_CONVERSATION_HISTORY ? (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-7 items-center gap-1.5 px-2.5">
            <span className="sr-only">{copy.history}</span>
            <div className="flex h-7 w-[142px] items-center">
              <SidebarSearchField
                value={historyQuery}
                onChange={onHistoryQueryChange}
                placeholder={copy.searchChats}
              />
              <button
                type="button"
                onClick={onHistoryRefresh}
                className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)] transition-colors hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)] lg:border-0 lg:bg-transparent lg:text-[var(--chat-sidebar-muted-2)] lg:hover:bg-[var(--chat-sidebar-hover)] lg:hover:text-[var(--chat-sidebar-muted)]"
                aria-label={copy.history}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isHistoryLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="mt-1 min-h-0 flex-1 overflow-y-auto space-y-0.5 pr-0.5">
            {historyMessage ? (
              <div className="mb-1 px-2.5 py-1 text-[12px] leading-4 text-[var(--auth-error-text)]">
                {historyMessage}
              </div>
            ) : null}

            {isHistoryLoading && !filteredHistories.length ? (
              <div className="flex h-9 items-center gap-2 px-2.5 text-[12px] text-[var(--chat-sidebar-muted-2)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{copy.historyLoading}</span>
              </div>
            ) : filteredHistories.length ? (
              filteredHistories.map((item) => {
                const active = item.conversationId === selectedHistoryId;
                const title = getHistoryTitle(item, locale, conversationTitleMap[item.conversationId]);
                const updatedTime = getHistoryTime(item, locale);
                const thumbnailUrl = getHistoryThumbnailUrl(item);

                return (
                  <button
                    key={item.conversationId}
                    type="button"
                    onClick={() => onHistoryPick(item)}
                    className={cn(
                      "flex min-h-[42px] w-full items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-left transition-colors",
                      active
                        ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]"
                        : "text-[var(--chat-sidebar-muted)] hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)]",
                    )}
                  >
                    <SidebarThumbnail active={active} alt="" src={thumbnailUrl} />
                    <span className="min-w-0 flex-1 pr-1">
                      <span className="block truncate text-[13px]">
                        {title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--chat-sidebar-muted-2)]">
                        {updatedTime}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-2.5 py-2 text-[13px] text-[var(--chat-sidebar-muted-2)]">
                {copy.emptyChats}
              </div>
            )}
          </div>
          </section>
        ) : null}
      </div>

      <SidebarAccountFooter
        accountDisplayName={accountDisplayName}
        copy={copy}
        currentUser={currentUser}
        hasUnreadAnnouncements={hasUnreadAnnouncements}
        locale={locale}
        onPointBalanceChange={onPointBalanceChange}
        onProfileOpen={onProfileOpen}
        onSignOut={onSignOut}
        onUnreadAnnouncementCountChange={onUnreadAnnouncementCountChange}
        onUpgrade={onUpgrade}
      />
    </div>
  );
}

function SidebarAccountFooter({
  accountDisplayName,
  copy,
  currentUser,
  hasUnreadAnnouncements,
  locale,
  onPointBalanceChange,
  onProfileOpen,
  onSignOut,
  onUnreadAnnouncementCountChange,
  onUpgrade,
}: {
  accountDisplayName: string;
  copy: (typeof PAGE_COPY)[AppLocale];
  currentUser: LoginUserVO | null;
  hasUnreadAnnouncements: boolean;
  locale: AppLocale;
  onPointBalanceChange: (pointBalance: number) => void;
  onProfileOpen: () => void;
  onSignOut: () => void;
  onUnreadAnnouncementCountChange: (count: number) => void;
  onUpgrade: () => void;
}) {
  const accountAvatarText = getSidebarAccountAvatarText(currentUser);
  const accountPoints = currentUser?.pointBalance ?? 0;

  return (
    <div className="mt-2.5 shrink-0 border-t border-[var(--chat-sidebar-border)] pt-2">
      <div className="flex items-center gap-2 px-1">
        {currentUser ? (
          <AuthenticatedUserMenu
            align="left"
            hasUnreadAnnouncements={hasUnreadAnnouncements}
            menuPlacement="top"
            onOpenProfile={onProfileOpen}
            onPointBalanceChange={onPointBalanceChange}
            onSignOut={onSignOut}
            onUnreadAnnouncementCountChange={onUnreadAnnouncementCountChange}
            onUpgrade={onUpgrade}
            triggerVariant="avatar"
            user={currentUser}
          />
        ) : (
          <SidebarAccountAvatar
            alt={accountDisplayName}
            avatarText={accountAvatarText}
            src={undefined}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium leading-4 text-[var(--chat-sidebar-text)]">
            {accountDisplayName}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] leading-none text-[var(--chat-sidebar-muted-2)]">{copy.points}</p>
          <p className="mt-0.5 text-[12px] font-semibold leading-none tabular-nums text-[var(--chat-sidebar-text)]">
            {new Intl.NumberFormat(locale).format(accountPoints)}
          </p>
        </div>
      </div>
    </div>
  );
}

function CollapsedSidebarRail({
  activeMainView,
  currentUser,
  hasUnreadAnnouncements,
  locale,
  onExpand,
  onHomeOpen,
  onNavigate,
  onNewChat,
  onPointBalanceChange,
  onProfileOpen,
  onFavoritesOpen,
  onPromptMarketOpen,
  onPromptSearchOpen,
  onSignOut,
  onUnreadAnnouncementCountChange,
  onUpgrade,
}: {
  activeMainView: StudioMainView;
  currentUser: LoginUserVO | null;
  hasUnreadAnnouncements: boolean;
  locale: AppLocale;
  onExpand: () => void;
  onHomeOpen: () => void;
  onNavigate: (to: SidebarRoute) => void;
  onNewChat: () => void;
  onPointBalanceChange: (pointBalance: number) => void;
  onProfileOpen: () => void;
  onFavoritesOpen: () => void;
  onPromptMarketOpen: () => void;
  onPromptSearchOpen: () => void;
  onSignOut: () => void;
  onUnreadAnnouncementCountChange: (count: number) => void;
  onUpgrade: () => void;
}) {
  const copy = PAGE_COPY[locale];
  const accountDisplayName = getSidebarAccountDisplayName(currentUser);
  const accountAvatarText = getSidebarAccountAvatarText(currentUser);
  const promptLibraryLabel = locale === "zh-CN" ? "提示词库" : copy.promptLibrary;
  const homeLabel = locale === "zh-CN" ? "首页" : copy.home;
  const sidebarSearchLabel = locale === "zh-CN" ? "搜索" : "Search";
  const favoritesLabel = locale === "zh-CN" ? "收藏" : "Favorites";
  const newSessionLabel = locale === "zh-CN" ? "新建会话" : copy.newSessionTitle;
  const iconButtonClassName =
    "inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--chat-sidebar-muted)] transition-colors hover:bg-[var(--chat-sidebar-hover)] hover:text-[var(--chat-sidebar-text)]";

  return (
    <div className="flex h-full min-h-0 flex-col items-center text-[var(--chat-sidebar-text)]">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onExpand}
          className={iconButtonClassName}
          aria-label={copy.openSidebar}
          title={copy.openSidebar}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate("/")}
          className={cn(iconButtonClassName, "text-[var(--chat-sidebar-text)]")}
          aria-label={copy.brand}
          title={copy.brand}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--chat-sidebar-active)] text-[11px] font-semibold tracking-[0.02em] text-[var(--chat-sidebar-text)]">
            DE
          </span>
        </button>

        <button
          type="button"
          onClick={onHomeOpen}
          className={cn(
            iconButtonClassName,
            activeMainView === "home" && "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]",
          )}
          aria-label={homeLabel}
          title={homeLabel}
          aria-pressed={activeMainView === "home"}
        >
          <Home className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onPromptMarketOpen}
          className={cn(
            iconButtonClassName,
            activeMainView === "promptMarket" && "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]",
          )}
          aria-label={promptLibraryLabel}
          title={promptLibraryLabel}
          aria-pressed={activeMainView === "promptMarket"}
        >
          <Sparkles className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onPromptSearchOpen}
          className={cn(
            iconButtonClassName,
            activeMainView === "promptSearch" && "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]",
          )}
          aria-label={sidebarSearchLabel}
          title={sidebarSearchLabel}
          aria-pressed={activeMainView === "promptSearch"}
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onFavoritesOpen}
          className={cn(
            iconButtonClassName,
            activeMainView === "promptFavorites" && "bg-[var(--chat-sidebar-active)] text-[var(--chat-sidebar-text)]",
          )}
          aria-label={favoritesLabel}
          title={favoritesLabel}
          aria-pressed={activeMainView === "promptFavorites"}
        >
          <Star className="h-4 w-4" />
        </button>

        {SHOW_NEW_SESSION_ACTION ? (
          <button
            type="button"
            onClick={onNewChat}
            className={iconButtonClassName}
            aria-label={newSessionLabel}
            title={newSessionLabel}
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-[8px]">
        {currentUser ? (
          <AuthenticatedUserMenu
            align="left"
            hasUnreadAnnouncements={hasUnreadAnnouncements}
            menuPlacement="top"
            onOpenProfile={onProfileOpen}
            onPointBalanceChange={onPointBalanceChange}
            onSignOut={onSignOut}
            onUnreadAnnouncementCountChange={onUnreadAnnouncementCountChange}
            onUpgrade={onUpgrade}
            triggerVariant="avatar"
            user={currentUser}
          />
        ) : (
          <div aria-label={accountDisplayName} title={accountDisplayName}>
            <SidebarAccountAvatar
              alt={accountDisplayName}
              avatarText={accountAvatarText}
              src={undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarAccountAvatar({
  alt,
  avatarText,
  src,
}: {
  alt: string;
  avatarText: string;
  src?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const avatarSrc = src?.trim();

  if (avatarSrc && !hasError) {
    return (
      <img
        src={avatarSrc}
        alt={alt}
        className="h-7 w-7 shrink-0 rounded-[8px] border border-[var(--chat-sidebar-border)] object-cover"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--chat-primary-bg)] text-[11px] font-semibold text-[var(--chat-primary-text)]">
      {avatarText}
    </span>
  );
}

function FloatingMessage({
  feedback,
  placement = "composer",
}: {
  feedback: FeedbackState | null;
  placement?: "composer" | "top";
}) {
  if (!feedback) {
    return null;
  }

  const Icon =
    feedback.tone === "success"
      ? CheckCircle2
      : feedback.tone === "error"
        ? AlertCircle
        : Sparkles;

  return (
    <div
      className={cn(
        "fixed z-[90] flex max-w-[min(320px,calc(100vw-32px))] items-center gap-2 rounded-[12px] border px-3 py-2 text-[13px] shadow-[0_16px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl",
        placement === "top"
          ? "left-1/2 top-5 -translate-x-1/2"
          : "bottom-[148px] right-4 md:right-6",
        feedback.tone === "success" &&
          "border-[var(--auth-success-border)] bg-[var(--auth-success-bg)] text-[var(--auth-success-text)]",
        feedback.tone === "error" &&
          "border-[var(--auth-error-border)] bg-[var(--auth-error-bg)] text-[var(--auth-error-text)]",
        feedback.tone === "info" &&
          "border-[var(--chat-border)] bg-[var(--chat-control-bg)] text-[var(--chat-control-text)]",
      )}
      role="status"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{feedback.message}</span>
    </div>
  );
}

function LoadingConversationPanel({
  copy,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
}) {
  return (
    <div className="flex min-h-[240px] w-full max-w-[640px] flex-col items-center justify-center text-center">
      <Loader2 className="h-5 w-5 animate-spin text-[var(--chat-muted)]" />
      <p className="mt-3 text-[13px] text-[var(--chat-muted)]">{copy.loadingConversation}</p>
    </div>
  );
}

function EmptyConversationState({
  copy,
  onSuggestionPick,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  onSuggestionPick: (prompt: string) => void;
}) {
  return (
    <section className="w-full max-w-[640px] py-16 text-center">
      <p className="text-[16px] font-semibold leading-6 text-[var(--chat-ink)]">
        {copy.emptyConversationTitle}
      </p>
      <p className="mx-auto mt-2 max-w-[440px] text-[13px] leading-5 text-[var(--chat-muted)]">
        {copy.emptyConversationDescription}
      </p>

      <div className="mx-auto mt-5 flex max-w-[520px] flex-wrap justify-center gap-2">
        {copy.quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSuggestionPick(prompt)}
            className="inline-flex h-8 max-w-full items-center rounded-[9px] border border-[var(--chat-control-border)] bg-[var(--chat-control-bg)] px-3 text-[13px] text-[var(--chat-control-muted)] transition-colors hover:border-[var(--chat-control-border-strong)] hover:bg-[var(--chat-control-hover)] hover:text-[var(--chat-control-text)]"
          >
            <span className="truncate">{prompt}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function AssistantReplyHeader({
  copy,
  currentTimestamp,
  message,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  currentTimestamp: number;
  message: ConversationMessageView;
}) {
  const isWorking =
    isActiveGenerationStatus(message.status) ||
    (!message.status && !message.resultImageUrls.length && !message.errorMessage);
  const elapsedEndTime = isWorking ? undefined : message.updateTime;
  const isFailed = message.status === "failed" || Boolean(message.errorMessage);
  const isDelivered = message.status === "success" || message.resultImageUrls.length > 0;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] font-medium text-[var(--chat-muted)]">
      {isWorking ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--chat-accent)]" />
      ) : isFailed ? (
        <AlertCircle className="h-3.5 w-3.5 text-[var(--auth-error-text)]" />
      ) : isDelivered ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--auth-success-text)]" />
      ) : null}
      <span>{getAssistantStatusLabel(message, copy)}</span>
      <span className="text-[var(--chat-muted-2)]">
        {formatElapsedTime(message.createTime, elapsedEndTime, currentTimestamp)}
      </span>
      <span className="text-[var(--chat-muted-2)]">›</span>
    </div>
  );
}

function GenerationLoadingPreview({
  copy,
  message,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  message: ConversationMessageView;
}) {
  return (
    <div className="mt-3 w-full max-w-[430px]">
      {message.pointCost ? (
        <p className="mb-2 text-[12px] text-[var(--chat-muted-2)]">
          {copy.estimatedCost} {message.pointCost}
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        <div className="h-[220px] flex-1 animate-pulse rounded-[14px] border border-[var(--chat-border)] bg-[image:var(--chat-skeleton)] md:h-[280px]" />
        <div className="hidden w-11 shrink-0 flex-col gap-2 md:flex">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-11 animate-pulse rounded-[9px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AssistantResultGrid({
  copy,
  imageUrls,
  onReferenceImage,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  imageUrls: string[];
  onReferenceImage: (imageUrl: string) => void;
}) {
  if (!imageUrls.length) {
    return (
      <div className="mt-3 max-w-[430px] rounded-[14px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-4 py-4 text-[13px] text-[var(--chat-muted)]">
        {copy.noDelivery}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "image-studio-chat-result mt-3 grid w-full max-w-[430px] gap-3",
        imageUrls.length > 1 && "sm:grid-cols-2",
      )}
    >
      {imageUrls.map((imageUrl, index) => (
        <figure
          key={`${imageUrl}-${index}`}
          className="overflow-hidden rounded-[14px] border border-[var(--chat-result-border)] bg-[var(--chat-result-shell)] shadow-[var(--chat-result-shadow)]"
        >
          <div className="relative bg-[var(--chat-result-stage)] p-2">
            <img
              src={imageUrl}
              alt=""
              className="block max-h-[380px] w-full rounded-[8px] object-contain"
              loading="lazy"
              decoding="async"
            />
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-[9px] border border-[var(--chat-result-border)] bg-[var(--chat-download-bg)] text-[var(--chat-download-text)] shadow-[0_8px_18px_rgba(0,0,0,0.12)] backdrop-blur-md transition-colors hover:bg-[var(--chat-download-hover)]"
              aria-label={`${copy.download} ${index + 1}`}
              title={copy.download}
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
          <figcaption className="flex items-center justify-start border-t border-[var(--chat-result-border)] bg-[var(--chat-result-bar)] px-3 py-2.5">
            <button
              type="button"
              onClick={() => onReferenceImage(imageUrl)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[var(--chat-result-border)] bg-[var(--chat-result-button)] px-3 text-[12px] font-medium text-[var(--chat-result-text)] transition-colors hover:border-[var(--chat-border-strong)] hover:bg-[var(--chat-result-button-hover)] hover:text-[var(--chat-ink)]"
              aria-label={`${copy.quote} ${index + 1}`}
              title={copy.quote}
            >
              <Quote className="h-3.5 w-3.5" />
              {copy.quote}
            </button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function AssistantFailedCard({
  copy,
  message,
  onRetryFailed,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  message: ConversationMessageView;
  onRetryFailed: () => void;
}) {
  return (
    <div className="mt-3 max-w-[430px] rounded-[14px] border border-[var(--auth-error-border)] bg-[var(--auth-error-bg)] px-4 py-3">
      <div className="flex items-start gap-2 text-[13px] leading-5 text-[var(--auth-error-text)]">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{message.errorMessage || copy.statusFailed}</span>
      </div>
      <button
        type="button"
        onClick={onRetryFailed}
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-[var(--chat-control-border)] bg-[var(--chat-control-bg)] px-3 text-[12px] font-medium text-[var(--chat-control-text)] transition-colors hover:bg-[var(--chat-control-hover)]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {copy.retry}
      </button>
    </div>
  );
}

function UserMessageActions({
  copy,
  locale,
  message,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  locale: AppLocale;
  message: ConversationMessageView;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimerRef = useRef<number | null>(null);
  const promptText = message.prompt.trim();
  const clockText = formatMessageClock(message.createTime, locale);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!promptText) {
      return;
    }

    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    try {
      await copyTextToClipboard(promptText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    } finally {
      resetTimerRef.current = window.setTimeout(() => {
        setCopyStatus("idle");
        resetTimerRef.current = null;
      }, 1400);
    }
  };

  if (!clockText && !promptText) {
    return null;
  }

  return (
    <div className="mt-1 flex h-6 items-center justify-end gap-2 pr-1 text-[12px] leading-none text-[var(--chat-muted-2)] opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100">
      {clockText ? (
        <span className="tabular-nums">{clockText}</span>
      ) : null}
      {promptText ? (
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-[7px] text-[var(--chat-muted-2)] transition-colors hover:bg-[var(--chat-control-hover)] hover:text-[var(--chat-control-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-control-border-strong)]",
            copyStatus === "copied" && "text-[var(--auth-success-text)]",
            copyStatus === "error" && "text-[var(--auth-error-text)]",
          )}
          aria-label={copy.copyPrompt}
          title={copyStatus === "copied" ? copy.copied : copyStatus === "error" ? copy.copyFailed : copy.copyPrompt}
        >
          {copyStatus === "copied" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      ) : null}
    </div>
  );
}

function ConversationMessageCard({
  copy,
  currentTimestamp,
  locale,
  message,
  onReferenceImage,
  onRetryFailed,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  currentTimestamp: number;
  locale: AppLocale;
  message: ConversationMessageView;
  onReferenceImage: (imageUrl: string) => void;
  onRetryFailed: () => void;
}) {
  const isUser = message.role === "user";

  if (!isUser) {
    const isFailed = message.status === "failed" || Boolean(message.errorMessage);
    const isDelivered = message.status === "success" || message.resultImageUrls.length > 0;

    return (
      <div className="flex w-full justify-start">
        <article className="flex w-full max-w-[720px] items-start gap-3 text-left">
          <span
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] text-[10px] font-semibold text-[var(--chat-muted)]"
            aria-hidden="true"
          >
            DE
          </span>
          <div className="min-w-0 flex-1">
            <AssistantReplyHeader
              copy={copy}
              currentTimestamp={currentTimestamp}
              message={message}
            />

            {message.prompt ? (
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[var(--chat-ink)]">
                {message.prompt}
              </p>
            ) : null}

            {isFailed ? (
              <AssistantFailedCard
                copy={copy}
                message={message}
                onRetryFailed={onRetryFailed}
              />
            ) : isDelivered ? (
              <AssistantResultGrid
                copy={copy}
                imageUrls={message.resultImageUrls}
                onReferenceImage={onReferenceImage}
              />
            ) : (
              <GenerationLoadingPreview copy={copy} message={message} />
            )}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="group/message flex w-full justify-end">
      <div
        className="flex min-w-0 max-w-[min(82%,560px)] flex-col items-end"
      >
        <article
          className="min-w-0 rounded-[17px] border border-[var(--chat-user-border)] bg-[var(--chat-user-bg)] px-3.5 py-2.5 text-left text-[var(--chat-user-text)]"
        >
          {message.prompt ? (
            <p className="whitespace-pre-wrap text-[14px] leading-6 text-[var(--chat-user-muted)]">
              {message.prompt}
            </p>
          ) : null}

          {message.referenceImageUrl ? (
            <img
              src={message.referenceImageUrl}
              alt=""
              className="mt-2 h-20 w-20 rounded-[10px] border border-[var(--chat-user-border)] object-cover"
              loading="lazy"
            />
          ) : null}
        </article>
        <UserMessageActions
          copy={copy}
          locale={locale}
          message={message}
        />
      </div>
    </div>
  );
}

function ConversationThread({
  copy,
  currentTimestamp,
  isSidebarCollapsed,
  isLoading,
  locale,
  messages,
  onReferenceImage,
  onRetryFailed,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  currentTimestamp: number;
  isSidebarCollapsed: boolean;
  isLoading: boolean;
  locale: AppLocale;
  messages: ConversationMessageView[];
  onReferenceImage: (imageUrl: string) => void;
  onRetryFailed: (messageIndex: number) => void;
}) {
  const messageItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);
  const hasAnchorRail = messages.length > 1;

  useEffect(() => {
    messageItemRefs.current = messageItemRefs.current.slice(0, messages.length);
    setActiveMessageIndex((currentIndex) =>
      messages.length ? Math.min(currentIndex, messages.length - 1) : 0,
    );
  }, [messages.length]);

  useEffect(() => {
    if (!hasAnchorRail) {
      return;
    }

    const firstMessageElement = messageItemRefs.current.find(Boolean);
    const scrollRoot = firstMessageElement?.closest(".image-studio-chat-scroll") ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => ({
            index: Number((entry.target as HTMLElement).dataset.messageIndex),
            topDistance: Math.abs(entry.boundingClientRect.top - 112),
          }))
          .filter(({ index }) => Number.isFinite(index))
          .sort((first, second) => first.topDistance - second.topDistance)[0];

        if (visibleEntry) {
          setActiveMessageIndex(visibleEntry.index);
        }
      },
      {
        root: scrollRoot,
        rootMargin: "-96px 0px -52% 0px",
        threshold: [0, 0.15, 0.4, 0.75],
      },
    );

    messageItemRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [hasAnchorRail, messages.length]);

  const handleAnchorClick = (index: number) => {
    const targetElement = messageItemRefs.current[index];

    if (!targetElement) {
      return;
    }

    setActiveMessageIndex(index);
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative w-full max-w-[760px]">
      {hasAnchorRail ? (
        <nav
          aria-label={copy.conversationAnchorList}
          className={cn(
            "pointer-events-none fixed top-0 z-10 hidden h-screen w-10 transition-[left] duration-200 ease-out lg:block",
            isSidebarCollapsed ? "left-[calc(64px+5px)]" : "left-[calc(272px+5px)]",
          )}
        >
          <div
            className="absolute top-1/2 flex max-h-[calc(100vh-260px)] w-10 -translate-y-1/2 flex-col items-start gap-1.5 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onMouseLeave={() => setHoveredMessageIndex(null)}
          >
            {messages.map((message, index) => {
              const isActive = activeMessageIndex === index;
              const waveCenterIndex = hoveredMessageIndex ?? activeMessageIndex;
              const waveDistance = Math.abs(waveCenterIndex - index);
              const isHoveringRail = hoveredMessageIndex !== null;
              const anchorWidth = isHoveringRail
                ? [30, 23, 17, 12][waveDistance] ?? 9
                : 9;
              const anchorOpacity = isHoveringRail
                ? Math.max(0.45, 1 - waveDistance * 0.16)
                : isActive
                  ? 1
                  : 0.46;

              return (
                <button
                  key={`anchor-${message.localId}`}
                  type="button"
                  onClick={() => handleAnchorClick(index)}
                  onFocus={() => setHoveredMessageIndex(index)}
                  onMouseEnter={() => setHoveredMessageIndex(index)}
                  onBlur={() => setHoveredMessageIndex(null)}
                  className="pointer-events-auto flex h-4 w-10 items-center justify-start rounded-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-control-border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--chat-bg)]"
                  aria-label={`${copy.conversationAnchor} ${index + 1}`}
                  aria-current={isActive ? "location" : undefined}
                  title={`${copy.conversationAnchor} ${index + 1}`}
                >
                  <span
                    className="h-[3px] rounded-full transition-[background-color,width,opacity] duration-200 ease-out"
                    style={{
                      width: `${anchorWidth}px`,
                      opacity: anchorOpacity,
                      backgroundColor:
                        isActive || hoveredMessageIndex === index
                          ? "var(--chat-ink)"
                          : "var(--chat-muted-2)",
                    }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}

      <div className="space-y-5">
        {messages.map((message, index) => (
          <div
            key={message.localId}
            ref={(element) => {
              messageItemRefs.current[index] = element;
            }}
            data-message-index={index}
            className="scroll-mt-10"
          >
            <ConversationMessageCard
              copy={copy}
              currentTimestamp={currentTimestamp}
              locale={locale}
              message={message}
              onReferenceImage={onReferenceImage}
              onRetryFailed={() => onRetryFailed(index)}
            />
          </div>
        ))}
        {isLoading ? (
          <div className="flex items-center gap-2 pl-10 text-[12px] text-[var(--chat-muted-2)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{copy.loadingConversation}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PromptMarketCard({
  copy,
  index,
  item,
  onFeedback,
  onOpenPrompt,
  onUsePrompt,
  showFeaturedBadge,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  index: number;
  item: SiteItem;
  onFeedback: (feedback: FeedbackState) => void;
  onOpenPrompt: (item: SiteItem) => void;
  onUsePrompt: (item: SiteItem) => void;
  showFeaturedBadge: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  useEffect(() => {
    if (!item.id || !getPersistedLoginUser()) {
      setIsFavorited(false);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    void checkPromptAssetFavorite(item.id, { signal: controller.signal })
      .then((nextIsFavorited) => {
        if (isActive) {
          setIsFavorited(nextIsFavorited);
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
  }, [item.id]);

  useEffect(() => {
    if (!item.id) {
      return;
    }

    return subscribePromptAssetFavoriteChange((change) => {
      if (String(change.promptAssetId) === String(item.id)) {
        setIsFavorited(change.isFavorited);
      }
    });
  }, [item.id]);

  const redirectToLogin = () => {
    navigate("/auth/login", {
      state: {
        redirectTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const handleFavoriteClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!item.id || isFavoriteLoading) {
      return;
    }

    if (!getPersistedLoginUser()) {
      redirectToLogin();
      return;
    }

    const previousValue = isFavorited;
    const nextValue = !previousValue;

    setIsFavorited(nextValue);
    setIsFavoriteLoading(true);
    notifyPromptAssetFavoriteChange({
      promptAssetId: String(item.id),
      isFavorited: nextValue,
    });

    try {
      if (nextValue) {
        await addPromptAssetFavorite(item.id);
      } else {
        await cancelPromptAssetFavorite(item.id);
      }
      onFeedback({
        message: nextValue ? copy.favoriteSaved : copy.favoriteCanceled,
        tone: "success",
      });
    } catch (error) {
      if (isAuthenticationError(error)) {
        setIsFavorited(previousValue);
        notifyPromptAssetFavoriteChange({
          promptAssetId: String(item.id),
          isFavorited: previousValue,
        });
        redirectToLogin();
        return;
      }

      setIsFavorited(previousValue);
      notifyPromptAssetFavoriteChange({
        promptAssetId: String(item.id),
        isFavorited: previousValue,
      });
      onFeedback({
        message: nextValue ? copy.favoriteSaveFailed : copy.favoriteCancelFailed,
        tone: "error",
      });
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  return (
    <article className="group relative overflow-hidden rounded-[12px] bg-transparent shadow-none sm:rounded-[14px]">
      {showFeaturedBadge ? (
        <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex h-6 items-center gap-1 rounded-[8px] bg-white/90 px-2.5 text-[11px] font-semibold text-[#171717] shadow-[0_8px_18px_rgba(0,0,0,0.12)] backdrop-blur-md">
          <Sparkles className="h-3 w-3" />
          <span>{copy.featured}</span>
        </span>
      ) : null}

      <button
        type="button"
        onClick={() => onOpenPrompt(item)}
        className="relative block w-full overflow-hidden text-left"
        aria-label={item.title}
      >
        <div className="relative w-full overflow-hidden rounded-[12px] bg-[var(--chat-control-soft)] sm:rounded-[14px]">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.025]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center text-[var(--chat-muted-2)]">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_48%,rgba(0,0,0,0.58)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-3 items-end justify-end gap-3 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={isFavoriteLoading}
          className={cn(
            "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-white/92 text-[#171717] shadow-[0_10px_24px_rgba(0,0,0,0.14)] backdrop-blur-md transition-[transform,background-color,color,opacity] hover:-translate-y-[1px] hover:bg-white disabled:cursor-not-allowed disabled:opacity-70",
            isFavorited && "text-amber-500",
          )}
          aria-label={isFavorited ? copy.cancelPromptFavorite : copy.savePrompt}
          aria-pressed={isFavorited}
        >
          {isFavoriteLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Star
              className="h-4 w-4"
              fill={isFavorited ? "currentColor" : "none"}
              strokeWidth={1.8}
            />
          )}
        </button>
      </div>

      <div className="sr-only">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </article>
  );
}

function PromptMasonrySkeletonGrid({
  loadingCount = 15,
  maxColumns = 5,
}: {
  loadingCount?: number;
  maxColumns?: number;
}) {
  const columnCount = usePromptMasonryColumnCount(maxColumns);
  const columns = useMemo(
    () => distributePromptMasonryIndexes(loadingCount, columnCount),
    [columnCount, loadingCount],
  );

  return (
    <div
      className="grid gap-2 sm:gap-3"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((indexes, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-col gap-2 sm:gap-3">
          {indexes.map((index) => (
            <div
              key={index}
              className={cn(
                "animate-pulse rounded-[12px] bg-[var(--chat-control-soft)] sm:rounded-[14px]",
                index % 3 === 0
                  ? "h-[210px] sm:h-[320px]"
                  : index % 2 === 0
                    ? "h-[156px] sm:h-[244px]"
                    : "h-[188px] sm:h-[284px]",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function PromptMasonryGrid({
  copy,
  isLoading,
  items,
  loadingCount = 15,
  maxColumns = 5,
  onFeedback,
  onOpenPrompt,
  onUsePrompt,
  showFeaturedBadge,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  isLoading?: boolean;
  items: SiteItem[];
  loadingCount?: number;
  maxColumns?: number;
  onFeedback: (feedback: FeedbackState) => void;
  onOpenPrompt: (item: SiteItem) => void;
  onUsePrompt: (item: SiteItem) => void;
  showFeaturedBadge?: (item: SiteItem, index: number) => boolean;
}) {
  const columnCount = usePromptMasonryColumnCount(maxColumns);
  const columns = useMemo(
    () => distributePromptMasonryItems(items, columnCount),
    [columnCount, items],
  );

  if (isLoading && !items.length) {
    return <PromptMasonrySkeletonGrid loadingCount={loadingCount} maxColumns={maxColumns} />;
  }

  return (
    <div
      className="grid gap-2 sm:gap-3"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((columnItems, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-col gap-2 sm:gap-3">
          {columnItems.map(({ index, item }) => (
            <PromptMarketCard
              key={item.id}
              copy={copy}
              index={index}
              item={item}
              onFeedback={onFeedback}
              onOpenPrompt={onOpenPrompt}
              onUsePrompt={onUsePrompt}
              showFeaturedBadge={showFeaturedBadge?.(item, index) ?? false}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function PromptRelatedMasonryGrid({
  items,
  onOpenRelated,
}: {
  items: SiteItem[];
  onOpenRelated: (item: SiteItem) => void;
}) {
  const visibleItems = useMemo(() => items.slice(0, 6), [items]);
  const columnCount = usePromptMasonryColumnCount(2);
  const columns = useMemo(
    () => distributePromptMasonryItems(visibleItems, columnCount),
    [columnCount, visibleItems],
  );

  return (
    <div
      className="mt-3 grid gap-2.5"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((columnItems, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-col gap-2.5">
          {columnItems.map(({ item }) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenRelated(item)}
              className="group block w-full overflow-hidden rounded-[12px] bg-[var(--chat-control-soft)] text-left"
              title={item.title}
            >
              <div className="overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="block h-auto w-full transition-transform duration-300 group-hover:scale-[1.025]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center text-[var(--chat-muted-2)]">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function PromptMarketView({
  activeCategoryId,
  categories,
  copy,
  filter,
  isFetchingMore,
  isLoading,
  items,
  message,
  onCategoryChange,
  onFilterChange,
  onFeedback,
  onOpenPrompt,
  onUsePrompt,
}: {
  activeCategoryId: PromptMarketCategoryKey;
  categories: HomeTagOption[];
  copy: (typeof PAGE_COPY)[AppLocale];
  filter: PromptMarketFilter;
  isFetchingMore: boolean;
  isLoading: boolean;
  items: SiteItem[];
  message: string | null;
  onCategoryChange: (categoryId: PromptMarketCategoryKey) => void;
  onFilterChange: (filter: PromptMarketFilter) => void;
  onFeedback: (feedback: FeedbackState) => void;
  onOpenPrompt: (item: SiteItem) => void;
  onUsePrompt: (item: SiteItem) => void;
}) {
  const [areCategoriesExpanded, setAreCategoriesExpanded] = useState(false);
  const hiddenCategories = categories.slice(PROMPT_MARKET_VISIBLE_CATEGORY_COUNT);
  const visibleCategories = areCategoriesExpanded
    ? categories
    : categories.slice(0, PROMPT_MARKET_VISIBLE_CATEGORY_COUNT);
  const activeCategoryLabel =
    activeCategoryId === "all"
      ? "全部"
      : categories.find((category) => category.id === activeCategoryId)?.name ?? "";

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[24px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] shadow-[var(--chat-panel-shadow)]">
        <div className="border-b border-transparent bg-[var(--chat-panel-bg)] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onCategoryChange("all")}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
                    activeCategoryId === "all"
                      ? "bg-[var(--chat-pill-active-bg)] text-[var(--chat-pill-active-text)] shadow-[var(--chat-pill-active-shadow)]"
                      : "bg-[var(--chat-control-soft)] text-[var(--chat-control-muted)] hover:bg-[var(--chat-pill-active-bg)] hover:text-[var(--chat-control-text)]",
                  )}
                  aria-pressed={activeCategoryId === "all"}
                >
                  全部
                </button>
                {visibleCategories.map((category) => {
                  const active = category.id === activeCategoryId;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        onCategoryChange(activeCategoryId === category.id ? "all" : category.id)
                      }
                      title={category.description || category.name}
                      className={cn(
                        "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
                        active
                          ? "bg-[var(--chat-pill-active-bg)] text-[var(--chat-pill-active-text)] shadow-[var(--chat-pill-active-shadow)]"
                          : "bg-[var(--chat-control-soft)] text-[var(--chat-control-muted)] hover:bg-[var(--chat-pill-active-bg)] hover:text-[var(--chat-control-text)]",
                      )}
                      aria-pressed={active}
                    >
                      {category.name}
                    </button>
                  );
                })}
                {hiddenCategories.length ? (
                  <button
                    type="button"
                    onClick={() => setAreCategoriesExpanded((value) => !value)}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-[var(--chat-pill-active-bg)] px-4 text-[13px] font-semibold text-[var(--chat-pill-active-text)] shadow-[var(--chat-pill-active-shadow)] transition-[background-color,box-shadow] duration-150 hover:bg-[var(--chat-control-soft)]"
                    aria-expanded={areCategoriesExpanded}
                  >
                    {areCategoriesExpanded ? "收起" : `更多 ${hiddenCategories.length}`}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex h-[33px] shrink-0 items-center justify-end">
              <div className="relative inline-grid h-[33px] w-[101px] grid-cols-2 items-center rounded-[10px] bg-[var(--chat-mode-bg)] p-0.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0.5 top-0.5 h-[29px] w-[calc(50%-2px)] rounded-[8px] bg-[var(--chat-mode-active-bg)] shadow-[var(--chat-mode-active-shadow)] transition-transform duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform motion-reduce:transition-none",
                    filter === "latest" ? "translate-x-0" : "translate-x-full",
                  )}
                />
                {PROMPT_MARKET_FILTERS.map((option) => {
                  const active = filter === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onFilterChange(option)}
                      className={cn(
                        "relative z-10 inline-flex h-[29px] items-center justify-center rounded-[8px] px-2 text-[12px] font-medium whitespace-nowrap transition-colors duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
                        active
                          ? "text-[var(--chat-mode-active-text)]"
                          : "text-[var(--chat-control-muted)] hover:text-[var(--chat-control-text)]",
                      )}
                      aria-pressed={active}
                    >
                      {option === "latest" ? copy.latest : copy.featured}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--chat-panel-bg)] px-3 pb-5 pt-3 sm:px-4 sm:pb-6 sm:pt-4">
          {message ? (
            <div className="mb-4 rounded-[12px] border border-[var(--auth-error-border)] bg-[var(--auth-error-bg)] px-3 py-2 text-[12px] leading-5 text-[var(--auth-error-text)]">
              {message}
            </div>
          ) : null}

          <PromptMasonryGrid
            copy={copy}
            isLoading={isLoading}
            items={items}
            onFeedback={onFeedback}
            onOpenPrompt={onOpenPrompt}
            onUsePrompt={onUsePrompt}
            showFeaturedBadge={(item) => filter === "latest" && item.isFeatured === true}
          />

          {!isLoading && !items.length ? (
            <div className="mt-4 flex min-h-[180px] flex-col items-center justify-center rounded-[14px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-4 text-center">
              <ImageIcon className="h-5 w-5 text-[var(--chat-muted-2)]" />
              <p className="mt-3 text-[13px] text-[var(--chat-muted)]">
                {activeCategoryId !== "all" && activeCategoryLabel
                  ? `${activeCategoryLabel} 暂无匹配作品`
                  : copy.emptyPrompts}
              </p>
            </div>
          ) : null}
          {isFetchingMore ? (
            <div className="mt-3 flex h-10 items-center justify-center gap-2 text-[12px] text-[var(--chat-muted-2)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{copy.promptLoading}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PromptSearchView({
  copy,
  draftQuery,
  isFetchingMore,
  isLoading,
  items,
  message,
  onBack,
  onDraftQueryChange,
  onFeedback,
  onOpenPrompt,
  onSearch,
  onUsePrompt,
  submittedQuery,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  draftQuery: string;
  isFetchingMore: boolean;
  isLoading: boolean;
  items: SiteItem[];
  message: string | null;
  onBack: () => void;
  onDraftQueryChange: (value: string) => void;
  onFeedback: (feedback: FeedbackState) => void;
  onOpenPrompt: (item: SiteItem) => void;
  onSearch: () => void;
  onUsePrompt: (item: SiteItem) => void;
  submittedQuery: string;
}) {
  const trimmedSubmittedQuery = submittedQuery.trim();

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[24px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] shadow-[var(--chat-panel-shadow)]">
        <div className="border-b border-transparent bg-[var(--chat-panel-bg)] px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--chat-control-muted)] transition-colors hover:bg-[var(--chat-control-soft)] hover:text-[var(--chat-control-text)]"
              aria-label={copy.promptMarket}
            >
              <ArrowUp className="h-4 w-4 -rotate-90" />
            </button>
            <form
              className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-[var(--chat-control-soft)] px-4 text-[var(--chat-control-text)]"
              onSubmit={(event) => {
                event.preventDefault();
                onSearch();
              }}
            >
              <Search className="h-5 w-5 shrink-0 text-[var(--chat-control-muted)]" />
              <input
                value={draftQuery}
                onChange={(event) => onDraftQueryChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[var(--chat-control-text)] outline-none placeholder:text-[var(--chat-input-placeholder)]"
                placeholder="搜索帖子或生成记录"
              />
              {draftQuery ? (
                <button
                  type="button"
                  onClick={() => onDraftQueryChange("")}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--chat-control-muted)] transition-colors hover:bg-[var(--chat-control-hover)] hover:text-[var(--chat-control-text)]"
                  aria-label={copy.closePromptDetail}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="submit"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--chat-pill-active-bg)] text-[var(--chat-control-muted)] shadow-[var(--chat-pill-active-shadow)] transition-colors hover:text-[var(--chat-control-text)]"
                aria-label="搜索"
              >
                <Camera className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="bg-[var(--chat-panel-bg)] px-3 pb-5 pt-4 sm:px-4 sm:pb-6">
          {trimmedSubmittedQuery ? (
            <p className="mb-4 px-0.5 text-[13px] font-medium text-[var(--chat-muted)]">
              搜索结果 "{trimmedSubmittedQuery}"
            </p>
          ) : (
            <p className="mb-4 px-0.5 text-[13px] font-medium text-[var(--chat-muted)]">
              输入关键词后按 Enter 搜索提示词
            </p>
          )}

          {message ? (
            <div className="mb-4 rounded-[12px] border border-[var(--auth-error-border)] bg-[var(--auth-error-bg)] px-3 py-2 text-[12px] leading-5 text-[var(--auth-error-text)]">
              {message}
            </div>
          ) : null}

          <PromptMasonryGrid
            copy={copy}
            isLoading={isLoading}
            items={items}
            onFeedback={onFeedback}
            onOpenPrompt={onOpenPrompt}
            onUsePrompt={onUsePrompt}
            showFeaturedBadge={(item) => item.isFeatured === true}
          />

          {!isLoading && trimmedSubmittedQuery && !items.length ? (
            <div className="mt-4 flex min-h-[180px] flex-col items-center justify-center rounded-[14px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-4 text-center">
              <Search className="h-5 w-5 text-[var(--chat-muted-2)]" />
              <p className="mt-3 text-[13px] text-[var(--chat-muted)]">暂无匹配结果</p>
            </div>
          ) : null}
          {isFetchingMore ? (
            <div className="mt-3 flex h-10 items-center justify-center gap-2 text-[12px] text-[var(--chat-muted-2)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{copy.promptLoading}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PromptFavoritesView({
  copy,
  isFetchingMore,
  isLoading,
  items,
  message,
  onFeedback,
  onOpenPrompt,
  onUsePrompt,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  isFetchingMore: boolean;
  isLoading: boolean;
  items: SiteItem[];
  message: string | null;
  onFeedback: (feedback: FeedbackState) => void;
  onOpenPrompt: (item: SiteItem) => void;
  onUsePrompt: (item: SiteItem) => void;
}) {
  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[24px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] shadow-[var(--chat-panel-shadow)]">
        <div className="border-b border-transparent bg-[var(--chat-panel-bg)] px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-semibold leading-6 text-[var(--chat-ink)]">收藏</h2>
              <p className="mt-1 text-[13px] text-[var(--chat-muted)]">你收藏的提示词会显示在这里</p>
            </div>
            <span className="rounded-full bg-[var(--chat-control-soft)] px-3 py-1 text-[12px] font-medium text-[var(--chat-control-muted)]">
              {items.length}
            </span>
          </div>
        </div>

        <div className="bg-[var(--chat-panel-bg)] px-3 pb-5 pt-2 sm:px-4 sm:pb-6">
          {message ? (
            <div className="mb-4 rounded-[12px] border border-[var(--auth-error-border)] bg-[var(--auth-error-bg)] px-3 py-2 text-[12px] leading-5 text-[var(--auth-error-text)]">
              {message}
            </div>
          ) : null}

          <PromptMasonryGrid
            copy={copy}
            isLoading={isLoading}
            items={items}
            onFeedback={onFeedback}
            onOpenPrompt={onOpenPrompt}
            onUsePrompt={onUsePrompt}
          />

          {!isLoading && !items.length ? (
            <div className="mt-4 flex min-h-[180px] flex-col items-center justify-center rounded-[14px] bg-[var(--chat-control-bg)] px-4 text-center">
              <Star className="h-5 w-5 text-[var(--chat-muted-2)]" />
              <p className="mt-3 text-[13px] text-[var(--chat-muted)]">暂无收藏提示词</p>
            </div>
          ) : null}
          {isFetchingMore ? (
            <div className="mt-3 flex h-10 items-center justify-center gap-2 text-[12px] text-[var(--chat-muted-2)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{copy.promptLoading}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PromptHomeView({
  announcement,
  announcementUnreadCount,
  copy,
  isLoading,
  items,
  onFeedback,
  onOpenAnnouncement,
  onOpenPrompt,
  onUsePrompt,
  todayNewCount,
  totalCount,
}: {
  announcement: AnnouncementVO | null;
  announcementUnreadCount: number;
  copy: (typeof PAGE_COPY)[AppLocale];
  isLoading: boolean;
  items: SiteItem[];
  onFeedback: (feedback: FeedbackState) => void;
  onOpenAnnouncement: () => void;
  onOpenPrompt: (item: SiteItem) => void;
  onUsePrompt: (item: SiteItem) => void;
  todayNewCount: number | null;
  totalCount: number | null;
}) {
  const formatStatValue = (value: number | null) =>
    value === null ? "--" : value.toLocaleString("zh-CN");
  const stats = [
    {
      label: "当前系统提示词数量",
      value: formatStatValue(totalCount),
      description: "平台已收录可用于生成的提示词总量",
      tone: "bg-[var(--chat-stat-green-bg)]",
    },
    {
      label: "今日新增",
      value: formatStatValue(todayNewCount),
      description: "今天新发布或入库的提示词数量",
      tone: "bg-[var(--chat-stat-blue-bg)]",
    },
  ];
  const latestItems = items;
  const announcementTitle = announcement?.title?.trim() || "暂无公告";
  const announcementUnread = announcementUnreadCount > 0 || isAnnouncementUnread(announcement);

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
          <div className="mx-auto w-full max-w-[760px] text-center">
            <h2 className="text-[26px] font-semibold leading-9 text-[var(--chat-ink)]">提示词库数据概览</h2>
            <p className="mt-2 text-[14px] leading-6 text-[var(--chat-muted)]">
              了解当前网站提示词资产与今日新增情况
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAnnouncement}
            disabled={!announcement}
            className="mx-auto mt-8 block w-full max-w-[960px] rounded-[18px] bg-[var(--chat-panel-soft)] px-4 py-3 text-left transition-colors hover:bg-[var(--chat-panel-soft-hover)] disabled:cursor-default disabled:hover:bg-[var(--chat-panel-soft)] sm:px-5"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="shrink-0 text-[13px] font-semibold text-[var(--chat-ink)]">网站公告</span>
              <p className="min-w-0 flex-1 truncate text-[13px] text-[var(--chat-muted)]">
                {announcementTitle}
              </p>
              {announcementUnread ? (
                <span className="shrink-0 rounded-full bg-[var(--chat-primary-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--chat-primary-text)]">
                  {announcementUnreadCount > 0 ? `${announcementUnreadCount} 未读` : "未读"}
                </span>
              ) : null}
            </div>
          </button>

          <div className="mx-auto mt-8 grid w-full max-w-[1120px] gap-4 lg:grid-cols-2">
            {stats.map((item) => (
              <article
                key={item.label}
                className={cn(
                  "min-h-[140px] rounded-[20px] px-5 py-5 sm:px-6 sm:py-6",
                  item.tone,
                )}
              >
                <p className="text-[15px] font-semibold text-[var(--chat-ink)]">{item.label}</p>
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

          <section className="mx-auto mt-8 w-full max-w-[1440px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[17px] font-semibold text-[var(--chat-ink)]">最新提示词</h3>
                <p className="mt-1 text-[13px] text-[var(--chat-muted)]">今日更新的提示词会优先展示在这里</p>
              </div>
              <span className="shrink-0 text-[12px] font-medium text-[var(--chat-muted-2)]">今日更新</span>
            </div>

            <div className="mt-4">
              {!isLoading && !latestItems.length ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-[14px] bg-[var(--chat-control-bg)] px-4 text-center">
                  <p className="text-[13px] text-[var(--chat-muted)]">今日暂无更新提示词</p>
                </div>
              ) : (
                <PromptMasonryGrid
                  copy={copy}
                  isLoading={isLoading}
                  items={latestItems}
                  loadingCount={6}
                  maxColumns={4}
                  onFeedback={onFeedback}
                  onOpenPrompt={onOpenPrompt}
                  onUsePrompt={onUsePrompt}
                  showFeaturedBadge={(item) => item.isFeatured === true}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function PromptHomeViewLegacy() {
  const statCards = [
    {
      label: "当前系统提示词数量",
      value: "--",
      hint: "后续接入后端统计",
      icon: Sparkles,
    },
    {
      label: "今日新增",
      value: "--",
      hint: "按自然日统计新增提示词",
      icon: Plus,
    },
  ];

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[18px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] shadow-[var(--chat-panel-shadow)]">
        <div className="border-b border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-5 py-5">
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-medium text-[var(--chat-muted-2)]">数据概览</p>
            <h2 className="text-[22px] font-semibold leading-7 text-[var(--chat-ink)]">提示词库首页</h2>
          </div>
        </div>

        <div className="bg-[var(--chat-bg)] px-4 py-4 sm:px-5 sm:py-5">
          <div className="grid gap-3 md:grid-cols-2">
            {statCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.label}
                  className="rounded-[16px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-4 py-4 shadow-[var(--chat-panel-shadow)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--chat-muted)]">{card.label}</p>
                      <p className="mt-3 text-[34px] font-semibold leading-none tracking-[0.01em] text-[var(--chat-ink)]">
                        {card.value}
                      </p>
                    </div>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--chat-control-soft)] text-[var(--chat-control-muted)]">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-4 text-[12px] leading-5 text-[var(--chat-muted-2)]">{card.hint}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[16px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-4 py-4 shadow-[var(--chat-panel-shadow)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-[var(--chat-ink)]">增长趋势</p>
                  <p className="mt-1 text-[12px] text-[var(--chat-muted-2)]">统计接口接入后展示最近 7 天新增</p>
                </div>
                <span className="rounded-full bg-[var(--chat-control-soft)] px-3 py-1 text-[12px] font-medium text-[var(--chat-control-muted)]">
                  7 天
                </span>
              </div>
              <div className="mt-5 flex h-[180px] items-end gap-2">
                {[34, 58, 42, 76, 64, 88, 70].map((height, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-[10px] bg-[linear-gradient(180deg,#e6e6e6_0%,#f2f2f2_100%)]"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[11px] text-[var(--chat-muted-2)]">{index + 1}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[16px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-4 py-4 shadow-[var(--chat-panel-shadow)]">
              <p className="text-[14px] font-semibold text-[var(--chat-ink)]">分类分布</p>
              <div className="mt-4 space-y-3">
                {["人像写真", "商品电商", "品牌海报", "UI界面"].map((label, index) => (
                  <div key={label}>
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="font-medium text-[var(--chat-muted)]">{label}</span>
                      <span className="text-[var(--chat-muted-2)]">待接入</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--chat-control-soft)]">
                      <div
                        className="h-full rounded-full bg-[var(--chat-primary-bg)]"
                        style={{ width: `${[72, 58, 46, 34][index]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
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
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>公告加载中</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-[14px] leading-7 text-[var(--chat-ink)]">
              {getPlainAnnouncementText(announcement?.content) || "暂无公告内容"}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PromptDetailOverlay({
  copy,
  copyStatus,
  item,
  relatedItems,
  onClose,
  onCopyPrompt,
  onOpenRelated,
  onReferenceImage,
  onUsePrompt,
}: {
  copy: (typeof PAGE_COPY)[AppLocale];
  copyStatus: "idle" | "copied" | "error";
  item: SiteItem;
  relatedItems: SiteItem[];
  onClose: () => void;
  onCopyPrompt: () => void;
  onOpenRelated: (item: SiteItem) => void;
  onReferenceImage: (imageUrl: string) => void;
  onUsePrompt: () => void;
}) {
  const promptText = getPromptItemText(item);
  const promptDescription = getPromptItemDescription(item);
  const sceneTags = item.sceneTags ?? [];
  const assetTags = [...(item.assetTags ?? []), ...(item.assetTagTexts ?? [])];
  const fallbackTags = getPromptItemTags(item).filter(
    (tag) => !sceneTags.includes(tag) && !assetTags.includes(tag),
  );
  return (
    <div
      className="image-studio-prompt-detail-overlay fixed inset-0 z-50 flex text-[var(--chat-ink)]"
      role="dialog"
      aria-modal="true"
      aria-label={copy.promptDetail}
    >
      <div className="relative hidden min-w-0 flex-1 items-center justify-center px-8 py-8 lg:flex">
        <div className="absolute right-6 top-5 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={onCopyPrompt}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full bg-[var(--chat-panel-bg)] px-3 text-[13px] font-semibold text-[var(--chat-ink)] shadow-[0_10px_28px_rgba(0,0,0,0.10)] backdrop-blur-md transition-colors hover:bg-[var(--chat-panel-soft)]",
              copyStatus === "copied" && "text-[var(--auth-success-text)]",
              copyStatus === "error" && "text-[var(--auth-error-text)]",
            )}
            title={copy.copyPrompt}
          >
            {copyStatus === "copied" ? copy.copied : copyStatus === "error" ? copy.copyFailed : copy.copyPrompt}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--chat-panel-bg)] px-3 text-[13px] font-semibold text-[var(--chat-ink)] shadow-[0_10px_28px_rgba(0,0,0,0.10)] backdrop-blur-md transition-colors hover:bg-[var(--chat-panel-soft)]"
            aria-label={copy.closePromptDetail}
            title={copy.closePromptDetail}
          >
            <span>esc</span>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex h-full w-full items-center justify-center">
          <div className="relative flex max-h-full max-w-[min(62vw,760px)] items-center justify-center">
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="max-h-[calc(100vh-88px)] max-w-full rounded-[16px] object-contain"
                loading="lazy"
              />
            ) : (
              <div className="flex h-[520px] w-[520px] items-center justify-center rounded-[16px] bg-[var(--chat-panel-bg)] text-[var(--chat-muted-2)]">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="flex h-full w-full flex-col overflow-hidden bg-[var(--chat-panel-bg)] text-[var(--chat-ink)] shadow-[-18px_0_60px_rgba(0,0,0,0.08)] lg:w-[460px] xl:w-[500px]">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--chat-border)] px-4 lg:hidden">
          <h2 className="text-[15px] font-semibold">{copy.promptDetail}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-[var(--chat-control-muted)] transition-colors hover:bg-[var(--chat-control-hover)] hover:text-[var(--chat-control-text)]"
            aria-label={copy.closePromptDetail}
            title={copy.closePromptDetail}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="image-studio-chat-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-5 lg:px-5 lg:pb-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[18px] font-semibold leading-6 text-[var(--chat-ink)]">{item.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[var(--chat-control-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--chat-control-muted)]">
                  {item.category}
                </span>
                {fallbackTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--chat-control-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--chat-control-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <span className="shrink-0 text-[12px] font-medium text-[var(--chat-muted-2)]">GPT Image</span>
          </div>

          <div className="mb-5 overflow-hidden rounded-[12px] bg-[var(--chat-control-soft)] lg:hidden">
            {item.image ? (
              <img src={item.image} alt={item.title} className="h-auto max-h-[56vh] w-full object-contain" loading="lazy" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-[var(--chat-muted-2)]">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
          </div>

          <section className="border-b border-[var(--chat-border)] pb-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-[var(--chat-muted-2)]">{copy.promptContent}</span>
              <button
                type="button"
                onClick={onCopyPrompt}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[12px] font-semibold text-[var(--chat-ink)] transition-colors hover:bg-[var(--chat-control-soft)]",
                  copyStatus === "copied" && "text-[var(--auth-success-text)]",
                  copyStatus === "error" && "text-[var(--auth-error-text)]",
                )}
              >
                <Copy className="h-3.5 w-3.5" />
                {copyStatus === "copied" ? copy.copied : copyStatus === "error" ? copy.copyFailed : copy.copyPrompt}
              </button>
            </div>
            {promptDescription && promptDescription !== item.title ? (
              <p className="mb-3 text-[13px] leading-6 text-[var(--chat-muted)]">{truncateText(promptDescription, 160)}</p>
            ) : null}
            <p className="max-h-[190px] overflow-y-auto whitespace-pre-wrap pr-1 text-[14px] leading-7 text-[var(--chat-ink)]">
              {promptText}
            </p>
          </section>

          {sceneTags.length || assetTags.length ? (
            <section className="border-b border-[var(--chat-border)] py-5">
              {sceneTags.length ? (
                <div>
                  <p className="text-[12px] font-medium text-[var(--chat-muted-2)]">{copy.sceneTags}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-medium text-[var(--chat-ink)]">
                    {sceneTags.map((tag) => (
                      <span key={`scene-${tag}`} className="rounded-full bg-[var(--chat-control-soft)] px-2.5 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {assetTags.length ? (
                <div className={cn(sceneTags.length && "mt-4")}>
                  <p className="text-[12px] font-medium text-[var(--chat-muted-2)]">{copy.assetTags}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-medium text-[var(--chat-ink)]">
                    {assetTags.map((tag) => (
                      <span key={`asset-${tag}`} className="rounded-full bg-[var(--chat-control-soft)] px-2.5 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {relatedItems.length ? (
            <section className="py-5">
              <h3 className="text-[18px] font-semibold text-[var(--chat-ink)]">更多相关内容</h3>
              <PromptRelatedMasonryGrid items={relatedItems} onOpenRelated={onOpenRelated} />
            </section>
          ) : null}
        </div>

      </aside>
    </div>
  );
}

export function ImageStudio2Page() {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale } = usePreferredLocale();
  const copy = PAGE_COPY[locale];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [currentUser, setCurrentUser] = useState<LoginUserVO | null>(() => getPersistedLoginUser());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [mainView, setMainView] = useState<StudioMainView>("home");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyConversations, setHistoryConversations] = useState<ImageGenerationConversationSummary[]>([]);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [promptMarketFilter, setPromptMarketFilter] = useState<PromptMarketFilter>("latest");
  const [promptMarketCategoryId, setPromptMarketCategoryId] =
    useState<PromptMarketCategoryKey>("all");
  const [promptMarketCategories, setPromptMarketCategories] = useState<HomeTagOption[]>([]);
  const [promptMarketItems, setPromptMarketItems] = useState<SiteItem[]>([]);
  const [promptMarketMessage, setPromptMarketMessage] = useState<string | null>(null);
  const [promptMarketPage, setPromptMarketPage] = useState(1);
  const [promptMarketHasMore, setPromptMarketHasMore] = useState(false);
  const [isPromptMarketLoading, setIsPromptMarketLoading] = useState(false);
  const [isPromptMarketFetchingMore, setIsPromptMarketFetchingMore] = useState(false);
  const [promptSearchDraft, setPromptSearchDraft] = useState("");
  const [promptSearchQuery, setPromptSearchQuery] = useState("");
  const [promptSearchItems, setPromptSearchItems] = useState<SiteItem[]>([]);
  const [promptSearchMessage, setPromptSearchMessage] = useState<string | null>(null);
  const [promptSearchPage, setPromptSearchPage] = useState(1);
  const [promptSearchHasMore, setPromptSearchHasMore] = useState(false);
  const [isPromptSearchLoading, setIsPromptSearchLoading] = useState(false);
  const [isPromptSearchFetchingMore, setIsPromptSearchFetchingMore] = useState(false);
  const [promptFavoriteItems, setPromptFavoriteItems] = useState<SiteItem[]>([]);
  const [promptFavoriteMessage, setPromptFavoriteMessage] = useState<string | null>(null);
  const [promptFavoritePage, setPromptFavoritePage] = useState(1);
  const [promptFavoriteHasMore, setPromptFavoriteHasMore] = useState(false);
  const [isPromptFavoriteLoading, setIsPromptFavoriteLoading] = useState(false);
  const [isPromptFavoriteFetchingMore, setIsPromptFavoriteFetchingMore] = useState(false);
  const [homeAnnouncement, setHomeAnnouncement] = useState<AnnouncementVO | null>(null);
  const [homeAnnouncementUnreadCount, setHomeAnnouncementUnreadCount] = useState(0);
  const [homePromptItems, setHomePromptItems] = useState<SiteItem[]>([]);
  const [isPromptHomeLoading, setIsPromptHomeLoading] = useState(true);
  const [homeTodayNewPromptCount, setHomeTodayNewPromptCount] = useState<number | null>(null);
  const [homeTotalPromptCount, setHomeTotalPromptCount] = useState<number | null>(null);
  const [announcementDetail, setAnnouncementDetail] = useState<AnnouncementVO | null>(null);
  const [isAnnouncementDetailOpen, setIsAnnouncementDetailOpen] = useState(false);
  const [isAnnouncementDetailLoading, setIsAnnouncementDetailLoading] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState("");
  const [activePromptId, setActivePromptId] = useState("");
  const [promptDetailItem, setPromptDetailItem] = useState<SiteItem | null>(null);
  const [promptCopyStatus, setPromptCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessageView[]>([]);
  const [conversationTitleMap, setConversationTitleMap] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isConversationLoading, setIsConversationLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveTimestamp, setLiveTimestamp] = useState(() => Date.now());
  const [draftPrompt, setDraftPrompt] = useState("");
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioId>("square");
  const [selectedSize, setSelectedSize] = useState<ImageSizeId>("1k");
  const [selectedMode, setSelectedMode] = useState<ChatMode>("assist");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
  const [quotedReferenceImageUrl, setQuotedReferenceImageUrl] = useState<string | null>(null);

  const selectedRatioOption = useMemo(
    () => RATIO_OPTIONS.find((item) => item.id === selectedRatio) ?? RATIO_OPTIONS[0],
    [selectedRatio],
  );
  const selectedSizeOption = useMemo(
    () => SIZE_OPTIONS.find((item) => item.id === selectedSize) ?? SIZE_OPTIONS[0],
    [selectedSize],
  );
  const balance = currentUser?.pointBalance ?? 105;
  const currentProjectCost = selectedSizeOption.cost;

  const stopPolling = () => {
    if (pollingIntervalRef.current !== null) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const redirectToLogin = () => {
    navigate("/auth/login", {
      replace: true,
      state: {
        redirectTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const cacheConversationPromptTitle = (targetConversationId: string, prompt: string) => {
    const promptTitle = prompt.trim();

    if (!targetConversationId || !promptTitle) {
      return;
    }

    setConversationTitleMap((currentMap) => {
      if (currentMap[targetConversationId] === promptTitle) {
        return currentMap;
      }

      return {
        ...currentMap,
        [targetConversationId]: promptTitle,
      };
    });
  };

  const applyConversationData = (data: ImageGenerationConversation | null) => {
    const nextConversationId = getConversationIdFromData(data);
    const nextMessages = getConversationMessages(data);
    const firstUserPrompt = getFirstUserPrompt(nextMessages);

    setConversationId(nextConversationId || null);
    setConversationMessages(nextMessages);
    setActiveHistoryId(nextConversationId);
    cacheConversationPromptTitle(nextConversationId, firstUserPrompt);

    return {
      conversationId: nextConversationId,
      messages: nextMessages,
    };
  };

  const hydrateHistoryConversationTitles = async (
    records: ImageGenerationConversationSummary[],
  ) => {
    const missingRecords = records.filter(
      (item) => item.conversationId && !conversationTitleMap[item.conversationId],
    );

    if (!missingRecords.length) {
      return;
    }

    const results = await Promise.allSettled(
      missingRecords.map(async (item) => {
        const data = await getImageGenerationConversation(item.conversationId);
        const messages = getConversationMessages(data);

        return {
          conversationId: item.conversationId,
          firstUserPrompt: getFirstUserPrompt(messages),
        };
      }),
    );

    let shouldRedirect = false;

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        cacheConversationPromptTitle(result.value.conversationId, result.value.firstUserPrompt);
        return;
      }

      if (isAuthenticationError(result.reason)) {
        shouldRedirect = true;
      }
    });

    if (shouldRedirect) {
      redirectToLogin();
    }
  };

  const loadHistoryConversations = async () => {
    if (!SHOW_CONVERSATION_HISTORY) {
      setHistoryConversations([]);
      setHistoryMessage(null);
      setIsHistoryLoading(false);
      return;
    }

    setIsHistoryLoading(true);
    setHistoryMessage(null);

    try {
      const page = await listImageGenerationConversations({
        current: 1,
        pageSize: 20,
      });

      const records = page?.records ?? [];

      setHistoryConversations(records);
      void hydrateHistoryConversationTitles(records);
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setHistoryMessage(error instanceof RequestError ? error.message : copy.historyLoadFailed);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadPromptMarketItems = async (
    filter: PromptMarketFilter,
    categoryId: PromptMarketCategoryKey,
    page = 1,
    signal?: AbortSignal,
  ) => {
    if (page === 1) {
      setIsPromptMarketLoading(true);
      setPromptMarketItems([]);
    } else {
      setIsPromptMarketFetchingMore(true);
    }
    setPromptMarketMessage(null);

    try {
      const result = await listHomePromptAssets({
        categoryId: IMAGE_PROMPT_CATEGORY_ID,
        current: page,
        isFeatured: filter === "featured" ? "1" : undefined,
        pageSize: PROMPT_PAGE_SIZE,
        sceneTagIdList: categoryId === "all" ? undefined : [categoryId],
        signal,
      });

      if (signal?.aborted) {
        return;
      }

      setPromptMarketPage(result.current);
      setPromptMarketHasMore(result.hasMore);
      setPromptMarketItems((currentItems) =>
        page === 1 ? result.items : mergeUniqueSiteItems(currentItems, result.items),
      );
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setPromptMarketMessage(error instanceof RequestError ? error.message : copy.promptLoadFailed);
    } finally {
      if (!signal?.aborted) {
        if (page === 1) {
          setIsPromptMarketLoading(false);
        } else {
          setIsPromptMarketFetchingMore(false);
        }
      }
    }
  };

  const loadPromptSearchItems = async (
    searchText: string,
    page = 1,
    signal?: AbortSignal,
  ) => {
    const nextSearchText = searchText.trim();

    if (!nextSearchText) {
      setPromptSearchItems([]);
      setPromptSearchMessage(null);
      setPromptSearchPage(1);
      setPromptSearchHasMore(false);
      setIsPromptSearchLoading(false);
      setIsPromptSearchFetchingMore(false);
      return;
    }

    if (page === 1) {
      setIsPromptSearchLoading(true);
      setPromptSearchItems([]);
    } else {
      setIsPromptSearchFetchingMore(true);
    }
    setPromptSearchMessage(null);

    try {
      const result = await listHomePromptAssets({
        categoryId: IMAGE_PROMPT_CATEGORY_ID,
        current: page,
        pageSize: PROMPT_PAGE_SIZE,
        searchText: nextSearchText,
        signal,
      });

      if (signal?.aborted) {
        return;
      }

      setPromptSearchPage(result.current);
      setPromptSearchHasMore(result.hasMore);
      setPromptSearchItems((currentItems) =>
        page === 1 ? result.items : mergeUniqueSiteItems(currentItems, result.items),
      );
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setPromptSearchMessage(error instanceof RequestError ? error.message : copy.promptLoadFailed);
    } finally {
      if (!signal?.aborted) {
        if (page === 1) {
          setIsPromptSearchLoading(false);
        } else {
          setIsPromptSearchFetchingMore(false);
        }
      }
    }
  };

  const loadPromptFavoriteItems = async (
    page = 1,
    signal?: AbortSignal,
  ) => {
    if (page === 1) {
      setIsPromptFavoriteLoading(true);
      setPromptFavoriteItems([]);
    } else {
      setIsPromptFavoriteFetchingMore(true);
    }
    setPromptFavoriteMessage(null);

    try {
      const result = await listMyPromptAssetFavorites(
        {
          current: page,
          pageSize: PROMPT_PAGE_SIZE,
        },
        { signal },
      );

      if (signal?.aborted) {
        return;
      }

      setPromptFavoritePage(result.current);
      setPromptFavoriteHasMore(result.hasMore);
      setPromptFavoriteItems((currentItems) =>
        page === 1 ? result.items : mergeUniqueSiteItems(currentItems, result.items),
      );
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setPromptFavoriteMessage(error instanceof RequestError ? error.message : copy.promptLoadFailed);
    } finally {
      if (!signal?.aborted) {
        if (page === 1) {
          setIsPromptFavoriteLoading(false);
        } else {
          setIsPromptFavoriteFetchingMore(false);
        }
      }
    }
  };

  const refreshConversation = async (targetConversationId: string) => {
    try {
      const data = await getImageGenerationConversation(targetConversationId);
      const { messages } = applyConversationData(data);
      const lastAssistantMessage = getLastAssistantMessage(messages);

      if (!isActiveGenerationStatus(lastAssistantMessage?.status)) {
        stopPolling();
        void loadHistoryConversations();
      }
    } catch (error) {
      stopPolling();

      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setFeedback({
        message: error instanceof RequestError ? error.message : copy.conversationLoadFailed,
        tone: "error",
      });
    }
  };

  const startPolling = (targetConversationId: string) => {
    stopPolling();
    pollingIntervalRef.current = window.setInterval(() => {
      void refreshConversation(targetConversationId);
    }, 3000);
  };

  useEffect(() => {
    const sessionEventName = getAuthSessionEventName();
    const syncUser = () => {
      setCurrentUser(getPersistedLoginUser());
    };

    window.addEventListener("storage", syncUser);
    window.addEventListener(sessionEventName, syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener(sessionEventName, syncUser);
    };
  }, []);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = window.setTimeout(() => setFeedback(null), 2600);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (!promptDetailItem) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setPromptDetailItem(null);
        setPromptCopyStatus("idle");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [promptDetailItem]);

  useEffect(() => {
    resizeDraftTextarea(textareaRef.current);
  }, [draftPrompt]);

  useEffect(() => {
    const hasRunningAssistantMessage = conversationMessages.some(
      (message) => message.role === "assistant" && isActiveGenerationStatus(message.status),
    );

    if (!hasRunningAssistantMessage) {
      return;
    }

    const timerId = window.setInterval(() => {
      setLiveTimestamp(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [conversationMessages]);

  useEffect(() => {
    void loadHistoryConversations();
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    void listCategoryTags(IMAGE_PROMPT_CATEGORY_ID, { signal: abortController.signal })
      .then((categories) => {
        if (!abortController.signal.aborted) {
          setPromptMarketCategories(categories);
        }
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setPromptMarketCategories([]);
        }
      });

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (mainView !== "promptMarket") {
      return;
    }

    const abortController = new AbortController();

    void loadPromptMarketItems(
      promptMarketFilter,
      promptMarketCategoryId,
      1,
      abortController.signal,
    );

    return () => {
      abortController.abort();
    };
  }, [mainView, promptMarketCategoryId, promptMarketFilter]);

  useEffect(() => {
    if (mainView !== "promptSearch") {
      return;
    }

    if (!promptSearchQuery.trim()) {
      setPromptSearchItems([]);
      setPromptSearchMessage(null);
      setPromptSearchHasMore(false);
      setPromptSearchPage(1);
      return;
    }

    const abortController = new AbortController();

    void loadPromptSearchItems(promptSearchQuery, 1, abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [mainView, promptSearchQuery]);

  useEffect(() => {
    if (mainView !== "promptFavorites") {
      return;
    }

    const abortController = new AbortController();

    void loadPromptFavoriteItems(1, abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [mainView]);

  useEffect(() => {
    return subscribePromptAssetFavoriteChange((change) => {
      if (change.isFavorited) {
        if (mainView === "promptFavorites") {
          void loadPromptFavoriteItems(1);
        }
        return;
      }

      setPromptFavoriteItems((currentItems) =>
        currentItems.filter((item) => String(item.id) !== String(change.promptAssetId)),
      );
    });
  }, [mainView]);

  useEffect(() => {
    if (mainView !== "home") {
      return;
    }

    const abortController = new AbortController();

    async function loadFallbackHomeItems() {
      const result = await listHomePromptAssets({
        categoryId: IMAGE_PROMPT_CATEGORY_ID,
        current: 1,
        pageSize: 30,
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        return;
      }

      setHomePromptItems(result.items);
      setHomeTotalPromptCount((currentValue) => currentValue ?? result.total);
    }

    async function loadHomeOverview() {
      setIsPromptHomeLoading(true);
      setHomePromptItems([]);
      setHomeTodayNewPromptCount(null);
      setHomeTotalPromptCount(null);

      try {
        const overview = await getPromptAssetHomeOverview({
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        setHomeTotalPromptCount(overview.totalCount);
        setHomeTodayNewPromptCount(overview.todayNewCount);

        if (overview.items.length) {
          setHomePromptItems(overview.items);
          return;
        }

        await loadFallbackHomeItems();
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        if (isAuthenticationError(error)) {
          redirectToLogin();
          return;
        }

        try {
          await loadFallbackHomeItems();
        } catch (fallbackError) {
          if (abortController.signal.aborted) {
            return;
          }

          if (isAuthenticationError(fallbackError)) {
            redirectToLogin();
          }
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsPromptHomeLoading(false);
        }
      }
    }

    void loadHomeOverview();

    return () => {
      abortController.abort();
    };
  }, [mainView]);

  useEffect(() => {
    if (mainView !== "home") {
      return;
    }

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
          setHomeAnnouncement(announcementResult.value?.records?.[0] ?? null);
        } else {
          setHomeAnnouncement(null);
        }

        if (unreadCountResult.status === "fulfilled") {
          setHomeAnnouncementUnreadCount(Math.max(0, unreadCountResult.value));
        } else {
          setHomeAnnouncementUnreadCount(0);
        }
      } catch {
        if (isActive) {
          setHomeAnnouncement(null);
          setHomeAnnouncementUnreadCount(0);
        }
      }
    }

    void loadHomeAnnouncement();

    return () => {
      isActive = false;
    };
  }, [mainView]);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadCurrentConversation() {
      setIsConversationLoading(true);

      try {
        const data = await getCurrentImageGenerationConversation({
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        const { conversationId: restoredConversationId, messages } = applyConversationData(data);
        const lastAssistantMessage = getLastAssistantMessage(messages);

        if (restoredConversationId && isActiveGenerationStatus(lastAssistantMessage?.status)) {
          startPolling(restoredConversationId);
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        if (isAuthenticationError(error)) {
          redirectToLogin();
          return;
        }

        setFeedback({
          message: error instanceof RequestError ? error.message : copy.currentConversationFailed,
          tone: "error",
        });
      } finally {
        if (!abortController.signal.aborted) {
          setIsConversationLoading(false);
        }
      }
    }

    void loadCurrentConversation();

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const handleNavigate = (to: SidebarRoute) => {
    setIsSidebarOpen(false);
    navigate(to);
  };

  const handlePointBalanceChange = (pointBalance: number) => {
    setCurrentUser((user) => (user ? { ...user, pointBalance } : user));
    updatePersistedLoginUser({ pointBalance });
  };

  const handleProfileOpen = () => {
    setIsSidebarOpen(false);
    navigate("/profile");
  };

  const handleUpgrade = () => {
    setIsSidebarOpen(false);
    navigate("/pricing");
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch {
      // Local session cleanup is still required even when the network logout fails.
    } finally {
      clearPersistedLoginUser();
      setCurrentUser(null);
      setIsSidebarOpen(false);
      navigate("/");
    }
  };

  const handleHomeOpen = () => {
    setMainView("home");
    setPromptDetailItem(null);
    setPromptCopyStatus("idle");
    setFeedback(null);
    setIsSidebarOpen(false);
  };

  const handlePromptMarketOpen = () => {
    setMainView("promptMarket");
    setPromptDetailItem(null);
    setPromptCopyStatus("idle");
    setIsSidebarOpen(false);
  };

  const handlePromptSearchOpen = () => {
    setMainView("promptSearch");
    setPromptDetailItem(null);
    setPromptCopyStatus("idle");
    setFeedback(null);
    setIsSidebarOpen(false);
  };

  const handlePromptSearchSubmit = () => {
    const nextQuery = promptSearchDraft.trim();

    if (!nextQuery) {
      setPromptSearchQuery("");
      setPromptSearchItems([]);
      setPromptSearchHasMore(false);
      setPromptSearchPage(1);
      setPromptSearchMessage(null);
      return;
    }

    setMainView("promptSearch");
    setPromptSearchQuery(nextQuery);
    setPromptDetailItem(null);
    setPromptCopyStatus("idle");
    setFeedback(null);
  };

  const handleOpenAnnouncement = async () => {
    if (!homeAnnouncement?.id) {
      return;
    }

    setIsAnnouncementDetailOpen(true);
    setAnnouncementDetail(homeAnnouncement);
    setIsAnnouncementDetailLoading(true);

    try {
      const detail = await getAnnouncementDetail(homeAnnouncement.id);
      setAnnouncementDetail(detail || homeAnnouncement);

      if (isAnnouncementUnread(homeAnnouncement)) {
        await markAnnouncementRead(homeAnnouncement.id);
        setHomeAnnouncement((current) =>
          current?.id === homeAnnouncement.id
            ? {
                ...current,
                readStatus: true,
                readTime: current.readTime || new Date().toISOString(),
              }
            : current,
        );
        setHomeAnnouncementUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      setFeedback({
        message: error instanceof RequestError ? error.message : "公告详情加载失败",
        tone: "error",
      });
    } finally {
      setIsAnnouncementDetailLoading(false);
    }
  };

  const handleFavoritesOpen = () => {
    setMainView("promptFavorites");
    setPromptDetailItem(null);
    setPromptCopyStatus("idle");
    setFeedback(null);
    setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    stopPolling();
    setMainView("chat");
    setConversationId(null);
    setConversationMessages([]);
    setActiveHistoryId("");
    setActivePromptId("");
    setPromptDetailItem(null);
    setPromptCopyStatus("idle");
    setDraftPrompt("");
    setFeedback(null);
    setIsConversationLoading(false);
    setReferenceFile(null);
    setReferenceFileName(null);
    setQuotedReferenceImageUrl(null);
    setIsSidebarOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    textareaRef.current?.focus();
  };

  const handlePromptMarketPick = (item: SiteItem) => {
    setActivePromptId(item.id);
    setPromptDetailItem(item);
    setPromptCopyStatus("idle");
    setIsSidebarOpen(false);
  };

  const handleUsePromptItem = (item: SiteItem) => {
    const prompt = getPromptItemText(item);

    if (mainView === "promptMarket" || mainView === "promptSearch" || mainView === "promptFavorites") {
      handleNewChat();
      setActivePromptId(item.id);
      setDraftPrompt(prompt);
      window.requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }

    setMainView("chat");
    setActivePromptId(item.id);
    setDraftPrompt(prompt);
    setPromptDetailItem(null);
    setPromptCopyStatus("idle");
    setIsSidebarOpen(false);
    textareaRef.current?.focus();
  };

  const handleCopyPromptItem = async () => {
    if (!promptDetailItem) {
      return;
    }

    try {
      await copyTextToClipboard(getPromptItemText(promptDetailItem));
      setPromptCopyStatus("copied");
    } catch {
      setPromptCopyStatus("error");
    }
  };

  const handleHistoryPick = async (item: ImageGenerationConversationSummary) => {
    if (!item.conversationId) {
      return;
    }

    stopPolling();
    setMainView("chat");
    setActiveHistoryId(item.conversationId);
    setPromptDetailItem(null);
    setPromptCopyStatus("idle");
    setFeedback(null);
    setIsConversationLoading(true);
    setIsSidebarOpen(false);

    try {
      const data = await getImageGenerationConversation(item.conversationId);
      const { conversationId: restoredConversationId, messages } = applyConversationData(data);
      const lastAssistantMessage = getLastAssistantMessage(messages);

      if (restoredConversationId && isActiveGenerationStatus(lastAssistantMessage?.status)) {
        startPolling(restoredConversationId);
      }

      textareaRef.current?.focus();
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setFeedback({
        message: error instanceof RequestError ? error.message : copy.conversationLoadFailed,
        tone: "error",
      });
    } finally {
      setIsConversationLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setReferenceFileName(file.name);
    setReferenceFile(file);
    setQuotedReferenceImageUrl(null);
    setFeedback({
      message: copy.referenceReady,
      tone: "success",
    });
  };

  const handleUseResultAsReference = (imageUrl: string) => {
    if (!isPublicImageUrl(imageUrl)) {
      setFeedback({
        message: copy.referenceInvalid,
        tone: "error",
      });
      return;
    }

    setReferenceFile(null);
    setReferenceFileName(copy.quotedReferenceName);
    setQuotedReferenceImageUrl(imageUrl);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFeedback({
      message: copy.quotedReferenceReady,
      tone: "success",
    });

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleRetryFailedMessage = (assistantMessageIndex: number) => {
    for (let index = assistantMessageIndex - 1; index >= 0; index -= 1) {
      const previousMessage = conversationMessages[index];

      if (previousMessage?.role !== "user") {
        continue;
      }

      setDraftPrompt(previousMessage.prompt);
      setSelectedRatio(getAspectRatioIdFromValue(String(previousMessage.aspectRatio || "")));
      setSelectedSize(getImageSizeIdFromValue(String(previousMessage.imageSize || "")));
      setSelectedMode(normalizeGenerationMode(previousMessage.generationMode) === "manual" ? "manual" : "assist");

      if (previousMessage.referenceImageUrl) {
        setReferenceFile(null);
        setReferenceFileName(copy.uploadedReferenceName);
        setQuotedReferenceImageUrl(previousMessage.referenceImageUrl);
      } else {
        setReferenceFile(null);
        setReferenceFileName(null);
        setQuotedReferenceImageUrl(null);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setFeedback(null);
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
      return;
    }

    setFeedback({
      message: copy.retrySourceMissing,
      tone: "error",
    });
  };

  const handleSubmit = async () => {
    const nextPrompt = draftPrompt.trim();

    if (!nextPrompt && !referenceFile && !quotedReferenceImageUrl) {
      setFeedback({
        message: copy.promptRequired,
        tone: "error",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const submittedReferenceImageUrl = referenceFile
        ? await uploadImageGenerationReference(referenceFile)
        : quotedReferenceImageUrl || undefined;
      const effectivePrompt = nextPrompt || copy.referenceOnlyPrompt;
      const selectedAspectRatio = selectedRatioOption.label as ImageGenerationAspectRatio;
      const selectedGenerationMode: ImageGenerationMode = selectedMode === "manual" ? "manual" : "api";
      const createResult = await createImageGenerationTask({
        generationMode: selectedGenerationMode,
        ...(conversationId ? { conversationId } : {}),
        prompt: effectivePrompt,
        aspectRatio: selectedAspectRatio,
        imageCount: 1,
        imageSize: selectedSize as ImageGenerationImageSize,
        modelCode: "gpt-image-2",
        ...(submittedReferenceImageUrl ? { referenceImageUrl: submittedReferenceImageUrl } : {}),
      });
      const nextConversationId = createResult.conversationId;

      if (!nextConversationId) {
        throw new RequestError(copy.submitFailed);
      }

      const submittedAt = new Date().toISOString();
      const submittedAspectRatio = createResult.aspectRatio || selectedAspectRatio;
      const submittedGenerationMode = normalizeGenerationMode(
        createResult.generationMode || selectedGenerationMode,
      );
      const submittedPointCost = getNumberValue(createResult.pointCost) ?? currentProjectCost;
      const submittedImageSize = createResult.imageSize || selectedSize;
      const submittedMessages: ConversationMessageView[] = [
        {
          localId: getTextValue(createResult.messageId, `${nextConversationId}-user-${submittedAt}`),
          id: createResult.messageId,
          conversationId: nextConversationId,
          role: "user",
          prompt: effectivePrompt,
          aspectRatio: submittedAspectRatio,
          generationMode: submittedGenerationMode,
          imageCount: createResult.imageCount || 1,
          imageSize: submittedImageSize,
          modelCode: createResult.modelCode || "gpt-image-2",
          pointCost: submittedPointCost,
          referenceImageUrl: submittedReferenceImageUrl,
          resultImageUrls: [],
          vendorSize: createResult.vendorSize,
          createTime: submittedAt,
        },
        {
          localId: getTextValue(createResult.assistantMessageId, createResult.taskId, `${nextConversationId}-assistant-${submittedAt}`),
          id: createResult.assistantMessageId,
          conversationId: nextConversationId,
          role: "assistant",
          prompt: "",
          aspectRatio: submittedAspectRatio,
          apiCostCny: createResult.apiCostCny,
          generationMode: submittedGenerationMode,
          imageCount: createResult.imageCount || 1,
          imageSize: submittedImageSize,
          modelCode: createResult.modelCode || "gpt-image-2",
          pointCost: submittedPointCost,
          providerCode: createResult.providerCode,
          taskId: createResult.taskId,
          status: createResult.status || "pending",
          resultImageUrls: [],
          vendorSize: createResult.vendorSize,
          createTime: submittedAt,
        },
      ];

      setConversationId(nextConversationId);
      setMainView("chat");
      setActiveHistoryId(nextConversationId);
      cacheConversationPromptTitle(nextConversationId, effectivePrompt);
      setConversationMessages((currentMessages) => [
        ...(conversationId ? currentMessages : []),
        ...submittedMessages,
      ]);
      setDraftPrompt("");
      setReferenceFile(null);
      setReferenceFileName(null);
      setQuotedReferenceImageUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setFeedback({
        message: copy.submitSuccess,
        tone: "success",
      });
      startPolling(nextConversationId);
      void loadHistoryConversations();
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setFeedback({
        message: error instanceof RequestError ? error.message : copy.submitFailed,
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void handleSubmit();
  };

  const canSubmit = Boolean(draftPrompt.trim() || referenceFile || quotedReferenceImageUrl) && !isSubmitting;
  const isPromptHomeView = mainView === "home";
  const isPromptMarketView = mainView === "promptMarket";
  const isPromptSearchView = mainView === "promptSearch";
  const isPromptFavoritesView = mainView === "promptFavorites";
  const isPromptGalleryView = isPromptMarketView || isPromptSearchView || isPromptFavoritesView;
  const isPromptWorkspaceView = isPromptHomeView || isPromptGalleryView;
  const mobileHeaderTitle = isPromptFavoritesView
    ? locale === "zh-CN" ? "我的收藏" : "Favorites"
    : isPromptSearchView
      ? locale === "zh-CN" ? "搜索提示词" : "Search prompts"
      : isPromptWorkspaceView
        ? locale === "zh-CN" ? "图像提示词库" : "Image prompt library"
        : locale === "zh-CN" ? "图像创作" : "Image workspace";
  const mobileHeaderDescription = isPromptFavoritesView
    ? locale === "zh-CN" ? "已收藏的图像提示词" : "Your saved image prompts"
    : isPromptSearchView
      ? locale === "zh-CN" ? "搜索图像提示词与创作参考" : "Search image prompts and references"
      : isPromptWorkspaceView
        ? locale === "zh-CN" ? "浏览、收藏并使用图像提示词" : "Browse, save, and use image prompts"
        : locale === "zh-CN" ? "使用提示词生成并继续创作" : "Generate and continue creating with prompts";
  const handleMainScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!isScrollNearEnd(event.currentTarget, 560)) {
      return;
    }

    if (
      isPromptMarketView &&
      !isPromptMarketLoading &&
      !isPromptMarketFetchingMore &&
      promptMarketHasMore
    ) {
      void loadPromptMarketItems(promptMarketFilter, promptMarketCategoryId, promptMarketPage + 1);
      return;
    }

    if (
      isPromptSearchView &&
      promptSearchQuery.trim() &&
      !isPromptSearchLoading &&
      !isPromptSearchFetchingMore &&
      promptSearchHasMore
    ) {
      void loadPromptSearchItems(promptSearchQuery, promptSearchPage + 1);
      return;
    }

    if (
      isPromptFavoritesView &&
      !isPromptFavoriteLoading &&
      !isPromptFavoriteFetchingMore &&
      promptFavoriteHasMore
    ) {
      void loadPromptFavoriteItems(promptFavoritePage + 1);
    }
  };

  return (
    <div className="image-studio-chat-page overflow-hidden text-[var(--chat-ink)]">
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent
          side="left"
          className="image-studio-chat-sheet image-studio-chat-sidebar w-[min(88vw,300px)] overflow-hidden border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-bg)] p-0 text-[var(--chat-sidebar-text)] shadow-none [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Design Everything</SheetTitle>
          <SheetDescription className="sr-only">
            {copy.designServices}
          </SheetDescription>
          <div className="h-full min-h-0 overflow-hidden px-3 py-3">
            <SidebarContent
              activeMainView={mainView}
              conversationTitleMap={conversationTitleMap}
              hasUnreadAnnouncements={homeAnnouncementUnreadCount > 0}
              historyItems={historyConversations}
              historyMessage={historyMessage}
              historyQuery={historyQuery}
              isHistoryLoading={isHistoryLoading}
              locale={locale}
              onClose={() => setIsSidebarOpen(false)}
              onHistoryRefresh={() => void loadHistoryConversations()}
              onHomeOpen={handleHomeOpen}
              onNavigate={handleNavigate}
              onNewChat={handleNewChat}
              onPointBalanceChange={handlePointBalanceChange}
              onProfileOpen={handleProfileOpen}
              onFavoritesOpen={handleFavoritesOpen}
              onPromptMarketOpen={handlePromptMarketOpen}
              onPromptSearchOpen={handlePromptSearchOpen}
              onSignOut={handleSignOut}
              onUnreadAnnouncementCountChange={setHomeAnnouncementUnreadCount}
              onUpgrade={handleUpgrade}
              onHistoryPick={handleHistoryPick}
              onHistoryQueryChange={setHistoryQuery}
              currentUser={currentUser}
              selectedHistoryId={activeHistoryId}
            />
          </div>
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          "image-studio-chat-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-bg)] py-3 text-[var(--chat-sidebar-text)] transition-[width,padding] duration-200 ease-out lg:flex",
          isDesktopSidebarCollapsed ? "w-[64px] px-2" : "w-[272px] px-3",
        )}
      >
        {isDesktopSidebarCollapsed ? (
          <CollapsedSidebarRail
            activeMainView={mainView}
            currentUser={currentUser}
            hasUnreadAnnouncements={homeAnnouncementUnreadCount > 0}
            locale={locale}
            onExpand={() => setIsDesktopSidebarCollapsed(false)}
            onHomeOpen={handleHomeOpen}
            onNavigate={handleNavigate}
            onNewChat={handleNewChat}
            onPointBalanceChange={handlePointBalanceChange}
            onProfileOpen={handleProfileOpen}
            onFavoritesOpen={handleFavoritesOpen}
            onPromptMarketOpen={handlePromptMarketOpen}
            onPromptSearchOpen={handlePromptSearchOpen}
            onSignOut={handleSignOut}
            onUnreadAnnouncementCountChange={setHomeAnnouncementUnreadCount}
            onUpgrade={handleUpgrade}
          />
        ) : (
          <div className="h-full overflow-visible pr-1">
            <SidebarContent
              activeMainView={mainView}
              conversationTitleMap={conversationTitleMap}
              hasUnreadAnnouncements={homeAnnouncementUnreadCount > 0}
              historyItems={historyConversations}
              historyMessage={historyMessage}
              historyQuery={historyQuery}
              isHistoryLoading={isHistoryLoading}
              locale={locale}
              onCollapse={() => setIsDesktopSidebarCollapsed(true)}
              onHistoryRefresh={() => void loadHistoryConversations()}
              onHomeOpen={handleHomeOpen}
              onNavigate={handleNavigate}
              onNewChat={handleNewChat}
              onPointBalanceChange={handlePointBalanceChange}
              onProfileOpen={handleProfileOpen}
              onFavoritesOpen={handleFavoritesOpen}
              onPromptMarketOpen={handlePromptMarketOpen}
              onPromptSearchOpen={handlePromptSearchOpen}
              onSignOut={handleSignOut}
              onUnreadAnnouncementCountChange={setHomeAnnouncementUnreadCount}
              onUpgrade={handleUpgrade}
              onHistoryPick={handleHistoryPick}
              onHistoryQueryChange={setHistoryQuery}
              currentUser={currentUser}
              selectedHistoryId={activeHistoryId}
            />
          </div>
        )}
      </aside>

      <FloatingMessage feedback={feedback} placement={isPromptWorkspaceView ? "top" : "composer"} />

      <main
        className={cn(
          "relative flex h-full min-h-full flex-col overflow-hidden transition-[margin-left,margin-right] duration-200 ease-out max-lg:ml-0",
          isDesktopSidebarCollapsed ? "lg:ml-[64px]" : "lg:ml-[272px]",
        )}
      >
        <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-3 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] text-[var(--chat-control-text)] transition-colors hover:bg-[var(--chat-control-hover)]"
            aria-label={copy.openSidebar}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold text-[var(--chat-ink)]">{mobileHeaderTitle}</h1>
            <p className="mt-0.5 truncate text-[12px] text-[var(--chat-muted)]">{mobileHeaderDescription}</p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "image-studio-chat-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-3 sm:px-6 lg:px-10 lg:pt-10",
              isPromptWorkspaceView
                ? "px-3 pb-6 pt-3 sm:px-4 lg:px-4 lg:pb-6 lg:pt-4 2xl:px-5"
                : "pb-[212px] md:pb-[196px]",
            )}
            onScroll={handleMainScroll}
          >
            <div
              className={cn(
                "mx-auto flex w-full flex-col",
                isPromptWorkspaceView
                  ? "mx-0 max-w-none items-stretch"
                  : "max-w-[880px] items-center",
              )}
            >
              {isPromptHomeView ? (
                <PromptHomeView
                  announcement={homeAnnouncement}
                  announcementUnreadCount={homeAnnouncementUnreadCount}
                  copy={copy}
                  isLoading={isPromptHomeLoading}
                  items={homePromptItems}
                  onFeedback={setFeedback}
                  onOpenAnnouncement={handleOpenAnnouncement}
                  onOpenPrompt={handlePromptMarketPick}
                  onUsePrompt={handleUsePromptItem}
                  todayNewCount={homeTodayNewPromptCount}
                  totalCount={homeTotalPromptCount}
                />
              ) : isPromptMarketView ? (
                <PromptMarketView
                  activeCategoryId={promptMarketCategoryId}
                  categories={promptMarketCategories}
                  copy={copy}
                  filter={promptMarketFilter}
                  isFetchingMore={isPromptMarketFetchingMore}
                  isLoading={isPromptMarketLoading}
                  items={promptMarketItems}
                  message={promptMarketMessage}
                  onCategoryChange={setPromptMarketCategoryId}
                  onFilterChange={setPromptMarketFilter}
                  onFeedback={setFeedback}
                  onOpenPrompt={handlePromptMarketPick}
                  onUsePrompt={handleUsePromptItem}
                />
              ) : isPromptSearchView ? (
                <PromptSearchView
                  copy={copy}
                  draftQuery={promptSearchDraft}
                  isFetchingMore={isPromptSearchFetchingMore}
                  isLoading={isPromptSearchLoading}
                  items={promptSearchItems}
                  message={promptSearchMessage}
                  onBack={handlePromptMarketOpen}
                  onDraftQueryChange={setPromptSearchDraft}
                  onFeedback={setFeedback}
                  onOpenPrompt={handlePromptMarketPick}
                  onSearch={handlePromptSearchSubmit}
                  onUsePrompt={handleUsePromptItem}
                  submittedQuery={promptSearchQuery}
                />
              ) : isPromptFavoritesView ? (
                <PromptFavoritesView
                  copy={copy}
                  isFetchingMore={isPromptFavoriteFetchingMore}
                  isLoading={isPromptFavoriteLoading}
                  items={promptFavoriteItems}
                  message={promptFavoriteMessage}
                  onFeedback={setFeedback}
                  onOpenPrompt={handlePromptMarketPick}
                  onUsePrompt={handleUsePromptItem}
                />
              ) : (
                <div className="flex w-full justify-center">
                  {isConversationLoading && !conversationMessages.length ? (
                    <LoadingConversationPanel copy={copy} />
                  ) : conversationMessages.length ? (
                    <ConversationThread
                      copy={copy}
                      currentTimestamp={liveTimestamp}
                      isSidebarCollapsed={isDesktopSidebarCollapsed}
                      isLoading={isConversationLoading}
                      locale={locale}
                      messages={conversationMessages}
                      onReferenceImage={handleUseResultAsReference}
                      onRetryFailed={handleRetryFailedMessage}
                    />
                  ) : (
                    <EmptyConversationState
                      copy={copy}
                      onSuggestionPick={(prompt) => {
                        setMainView("chat");
                        setDraftPrompt(prompt);
                        textareaRef.current?.focus();
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {!isPromptWorkspaceView ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-3 sm:px-6 lg:px-10 lg:pb-5">
            <div className="mx-auto w-full max-w-[860px]">
              <div className="image-studio-chat-composer pointer-events-auto rounded-[16px] border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] p-2.5 shadow-[var(--chat-composer-shadow)] transition-[border-color,box-shadow] duration-200 backdrop-blur-xl focus-within:border-[var(--chat-control-border-strong)] focus-within:shadow-[var(--chat-composer-focus-shadow)] lg:rounded-[24px] lg:p-4">
                <div className="border-b border-[var(--chat-composer-divider)] pb-[2px]">
                  <textarea
                    ref={textareaRef}
                    value={draftPrompt}
                    onChange={(event) => {
                      setDraftPrompt(event.target.value);
                      resizeDraftTextarea(event.currentTarget);
                    }}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder={copy.promptPlaceholder}
                    className="max-h-[136px] min-h-[38px] w-full resize-none overflow-y-hidden bg-transparent px-1 py-0 text-[14px] leading-5 text-[var(--chat-control-text)] outline-none placeholder:text-[var(--chat-input-placeholder)] focus-visible:outline-none focus-visible:ring-0 lg:max-h-[200px] lg:min-h-[46px]"
                  />
                </div>

                <div className="mt-2 flex items-center gap-2 pt-0 md:flex-nowrap md:gap-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pr-1 [scrollbar-width:none] md:contents md:overflow-visible md:pr-0 [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      onClick={handleUploadClick}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-[var(--chat-control-border)] bg-[var(--chat-control-bg)] text-[var(--chat-control-muted)] transition-colors hover:border-[var(--chat-control-border-strong)] hover:bg-[var(--chat-control-hover)] hover:text-[var(--chat-control-text)]"
                      aria-label={copy.upload}
                      title={copy.upload}
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {referenceFileName ? (
                      <span className="inline-flex max-w-[180px] shrink-0 items-center gap-1 rounded-[8px] border border-[var(--chat-control-border)] bg-[var(--chat-control-bg)] px-2 py-1 text-[11px] text-[var(--chat-control-muted)]">
                        <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{referenceFileName}</span>
                      </span>
                    ) : null}

                    <Select value={selectedRatio} onValueChange={(value) => setSelectedRatio(value as AspectRatioId)}>
                      <SelectTrigger className="image-studio-chat-select-trigger h-8 w-auto min-w-[88px] shrink-0 rounded-[8px] border border-[var(--chat-select-trigger-border)] bg-[var(--chat-select-trigger-bg)] px-3 text-[13px] font-medium text-[var(--chat-control-text)] shadow-[var(--chat-select-trigger-shadow)] hover:border-[var(--chat-select-trigger-border-strong)] hover:bg-[var(--chat-select-trigger-hover)] focus-visible:!border-[var(--chat-select-trigger-border-strong)] focus-visible:!bg-[var(--chat-select-trigger-hover)] focus-visible:!ring-0 data-[state=open]:!border-[var(--chat-select-trigger-border-strong)] data-[state=open]:!bg-[var(--chat-select-trigger-hover)]">
                        {selectedRatioOption.label}
                      </SelectTrigger>
                      <SelectContent className="image-studio-chat-select-content !w-max !min-w-0 !rounded-[12px] !border !border-[var(--chat-select-border)] !bg-[var(--chat-select-bg)] !px-1 !pb-[2px] !pt-[7px] text-[var(--chat-select-text)] !shadow-[var(--chat-select-shadow)] !backdrop-blur-none data-[side=top]:!translate-y-0">
                        {RATIO_OPTIONS.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.id}
                            className="image-studio-chat-select-item !mb-0 !grid-cols-[12px_max-content] !gap-x-1.5 !rounded-[9px] !px-1 !py-1.5 !text-[12px] text-[var(--chat-select-text)]"
                          >
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <span className="shrink-0">{item.label}</span>
                              <span className="truncate text-[var(--chat-select-muted)]">{item.resolution}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedSize} onValueChange={(value) => setSelectedSize(value as ImageSizeId)}>
                      <SelectTrigger className="image-studio-chat-select-trigger h-8 w-auto min-w-[132px] shrink-0 rounded-[8px] border border-[var(--chat-select-trigger-border)] bg-[var(--chat-select-trigger-bg)] px-3 text-[13px] font-medium text-[var(--chat-control-text)] shadow-[var(--chat-select-trigger-shadow)] hover:border-[var(--chat-select-trigger-border-strong)] hover:bg-[var(--chat-select-trigger-hover)] focus-visible:!border-[var(--chat-select-trigger-border-strong)] focus-visible:!bg-[var(--chat-select-trigger-hover)] focus-visible:!ring-0 data-[state=open]:!border-[var(--chat-select-trigger-border-strong)] data-[state=open]:!bg-[var(--chat-select-trigger-hover)]">
                        {selectedSizeOption.label} · {selectedSizeOption.resolution}
                      </SelectTrigger>
                      <SelectContent className="image-studio-chat-select-content !w-max !min-w-0 !rounded-[12px] !border !border-[var(--chat-select-border)] !bg-[var(--chat-select-bg)] !px-1 !pb-[2px] !pt-[7px] text-[var(--chat-select-text)] !shadow-[var(--chat-select-shadow)] !backdrop-blur-none data-[side=top]:!translate-y-0">
                        {SIZE_OPTIONS.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.id}
                            className="image-studio-chat-select-item !mb-0 !grid-cols-[12px_max-content] !gap-x-1.5 !rounded-[9px] !px-1 !py-1.5 !text-[12px] text-[var(--chat-select-text)]"
                          >
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <span className="shrink-0">{item.label}</span>
                              <span className="truncate text-[var(--chat-select-muted)]">{item.resolution}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="inline-flex h-8 shrink-0 items-center rounded-[9px] border border-[var(--chat-control-border)] bg-[var(--chat-mode-bg)] p-0.5">
                      {MODE_OPTIONS.map((item) => {
                        const active = item.id === selectedMode;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelectedMode(item.id)}
                            className={cn(
                              "image-studio-chat-mode-button inline-flex h-7 items-center rounded-[8px] px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                              active
                                ? "shadow-[var(--chat-mode-active-shadow)]"
                                : "text-[var(--chat-control-muted)] hover:bg-[var(--chat-control-hover)] hover:text-[var(--chat-control-text)]",
                            )}
                          >
                            {translate(item.label, locale)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ml-auto flex shrink-0 flex-col items-end gap-0 text-[11px] leading-4 text-[var(--chat-control-muted-2)] md:flex-row md:items-center md:gap-3 md:text-[12px]">
                    <span>
                      {copy.consume} {currentProjectCost}
                    </span>
                    <span>
                      {copy.balance} {balance}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-transparent bg-[var(--chat-send-bg)] text-[var(--chat-send-text)] transition-colors hover:bg-[var(--chat-send-hover)] disabled:cursor-not-allowed disabled:border-[var(--chat-control-border)] disabled:bg-[var(--chat-send-disabled-bg)] disabled:text-[var(--chat-send-disabled-text)]"
                    aria-label={copy.submit}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          ) : null}
        </div>
      </main>

      {isAnnouncementDetailOpen ? (
        <AnnouncementDetailOverlay
          announcement={announcementDetail}
          isLoading={isAnnouncementDetailLoading}
          onClose={() => setIsAnnouncementDetailOpen(false)}
        />
      ) : null}

      {promptDetailItem ? (
        <PromptDetailOverlay
          copy={copy}
          copyStatus={promptCopyStatus}
          item={promptDetailItem}
          relatedItems={(
            isPromptSearchView
              ? promptSearchItems
              : isPromptFavoritesView
                ? promptFavoriteItems
                : promptMarketItems
          ).filter((item) => item.id !== promptDetailItem.id)}
          onClose={() => {
            setPromptDetailItem(null);
            setPromptCopyStatus("idle");
          }}
          onCopyPrompt={handleCopyPromptItem}
          onOpenRelated={(item) => {
            setActivePromptId(item.id);
            setPromptDetailItem(item);
            setPromptCopyStatus("idle");
          }}
          onReferenceImage={(imageUrl) => {
            handleUseResultAsReference(imageUrl);
            setPromptDetailItem(null);
            setPromptCopyStatus("idle");
          }}
          onUsePrompt={() => handleUsePromptItem(promptDetailItem)}
        />
      ) : null}
    </div>
  );
}
