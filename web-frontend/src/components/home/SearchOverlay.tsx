import { RequestErrorToast } from "@/components/ui/RequestErrorToast";
import { usePromptUnlock } from "@/components/prompt/PromptUnlockProvider";
import { subscribePromptAccess } from "@/lib/prompt-unlock";
import { useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  LoaderCircle,
  Lock,
  Monitor,
  Plus,
  Share2,
  Smartphone,
  Tablet,
  X,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPersistedLoginUser } from "@/lib/auth";
import { getArtworkDetail, getArtworkPreview, getArtworkPromptContent } from "@/lib/artwork";
import {
  addPromptAssetFavorite,
  cancelPromptAssetFavorite,
  checkPromptAssetFavorite,
  notifyPromptAssetFavoriteChange,
  subscribePromptAssetFavoriteChange,
} from "@/lib/favorite";
import { type AppLocale, usePreferredLocale } from "@/lib/locale";
import { isAuthenticationError, RequestError } from "@/lib/request";
import type {
  ArtworkDetailVO,
  PreviewDeviceMode,
  PreviewLoadState,
  SiteItem,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface SearchOverlayProps {
  site: SiteItem;
  onClose: () => void;
}

interface PreviewCanvasConfig {
  shellHeight: number;
  shellWidth: number;
  stagePadding: number;
  viewportHeight: number;
  viewportWidth: number;
}

type DetailLoadState = "idle" | "loading" | "ready" | "error";
type PromptRestrictionReason = "membership" | "purchase";
type OverlayCopy = (typeof OVERLAY_COPY)["en-US"];

const PREVIEW_MODE_META: Record<
  PreviewDeviceMode,
  {
    icon: typeof Monitor;
    label: string;
  }
> = {
  web: {
    label: "Desktop",
    icon: Monitor,
  },
  tablet: {
    label: "Tablet",
    icon: Tablet,
  },
  mobile: {
    label: "Mobile",
    icon: Smartphone,
  },
};

const PREVIEW_MODE_ORDER: PreviewDeviceMode[] = ["mobile", "tablet", "web"];

const PREVIEW_CANVAS_CONFIG: Record<PreviewDeviceMode, PreviewCanvasConfig> = {
  web: {
    shellWidth: 1440,
    shellHeight: 900,
    viewportWidth: 1440,
    viewportHeight: 900,
    stagePadding: 24,
  },
  tablet: {
    shellWidth: 866,
    shellHeight: 1144,
    viewportWidth: 834,
    viewportHeight: 1112,
    stagePadding: 28,
  },
  mobile: {
    shellWidth: 422,
    shellHeight: 876,
    viewportWidth: 390,
    viewportHeight: 844,
    stagePadding: 28,
  },
};

const OVERLAY_COPY = {
  "en-US": {
    access: "Access",
    accessLabel: "Status",
    attributes: "Attributes",
    categoryFallback: "Prompt",
    categoryLabel: "Category",
    closeDetailView: "Close detail view",
    copy: "Copy",
    copyAll: "Copy All",
    copyFailed: "Copy failed",
    copyFullPrompt: "Copy full prompt",
    insertPrompt: "Insert prompt",
    copyPrompt: "Copy prompt",
    createdLabel: "Created",
    curatedReference: "Curated prompt",
    description: "Description",
    detailLoadFailed:
      "Unable to load the latest detail payload, showing the list summary for now",
    dialogDescriptionPrefix: "Detailed prompt notes and embedded preview for",
    details: "Details",
    linkCopied: "Link copied",
    loadingAction: "Loading details",
    loadingPreview: "Loading preview",
    loadingPreviewHint:
      "We are fetching the preview document and embedding it in this dialog",
    loginAndUnlock: "Login to unlock",
    loginToUnlock: "Login to unlock",
    insertPromptLabel: "Insert prompt",
    memberOnlyLabel: "Scope",
    memberOnlyValue: "Member only",
    openPreviewInTab: "Open preview in new tab",
    openOriginalReference: "Open original reference",
    openOriginalWebsite: "Open original website",
    previewUnavailable: "Preview unavailable",
    previewUnavailableHint:
      "The preview service did not return embeddable content for this prompt",
    pointsPriceLabel: "Points price",
    premiumBadge: "Premium",
    prompt: "Prompt",
    promptCopied: "Prompt copied",
    promptForSale: "Prompt for sale",
    promptLoadingHint:
      "Fetching the latest JSON detail for this prompt and updating the dialog",
    promptLockedGuest:
      "Sign in or upgrade membership to unlock the full prompt content",
    promptLockedMember: "Upgrade membership to unlock the full prompt content",
    promptLockedPurchase:
      "Sign in or upgrade membership to unlock the full prompt content",
    promptUnavailable:
      "Prompt content is unavailable for this item right now",
    roleLabel: "Role",
    shareReference: "Share reference",
    contextLabel: "Context",
    layoutLabel: "Layout",
    styleLabel: "Style",
    constraintsLabel: "Constraints",
    outputLabel: "Output",
    unlockBenefits: [
      "Preview the output before upgrading",
      "Unlock the full reusable prompt",
      "Copy and save premium prompt details",
    ],
    unlockBodyGuest:
      "The preview stays visible so you can judge the output first. Sign in to continue unlocking this premium prompt.",
    unlockBodyMember:
      "The preview stays visible so you can judge the output first. Upgrade membership to copy the full prompt.",
    unlockTitle: "Unlock the full prompt",
    statusRestricted: "Restricted",
    statusUnlocked: "Unlocked",
    summary: "Summary",
    unavailableAction: "Unavailable",
    upgradeMembership: "Upgrade membership",
    viewsLabel: "Views",
    cashPriceLabel: "Cash price",
    changePreviewDevice: "Change preview device",
  },
  "zh-CN": {
    access: "访问权限",
    accessLabel: "状态",
    attributes: "标签",
    categoryFallback: "Prompt",
    categoryLabel: "分类",
    closeDetailView: "关闭详情弹窗",
    copy: "复制",
    copyAll: "复制全部",
    copyFailed: "复制失败",
    copyFullPrompt: "复制完整提示词",
    insertPrompt: "使用 Prompt",
    copyPrompt: "复制 Prompt",
    createdLabel: "创建时间",
    curatedReference: "Prompt 详情",
    description: "说明",
    detailLoadFailed: "最新详情加载失败，当前先展示列表摘要数据",
    dialogDescriptionPrefix: "当前展示的是",
    details: "详情信息",
    linkCopied: "链接已复制",
    loadingAction: "加载中",
    loadingPreview: "正在加载预览",
    loadingPreviewHint: "正在获取预览文档并嵌入到当前弹窗中",
    loginAndUnlock: "登录解锁",
    loginToUnlock: "登录后解锁",
    insertPromptLabel: "使用 Prompt",
    memberOnlyLabel: "权限范围",
    memberOnlyValue: "会员专享",
    openPreviewInTab: "新标签打开预览",
    openOriginalReference: "打开原始页面",
    openOriginalWebsite: "打开原网页",
    previewUnavailable: "预览不可用",
    previewUnavailableHint: "预览服务当前没有返回可嵌入的内容",
    pointsPriceLabel: "积分价",
    premiumBadge: "会员专享",
    prompt: "Prompt",
    promptCopied: "Prompt 已复制",
    promptForSale: "正在售卖的 Prompt",
    promptLoadingHint: "正在获取该 Prompt 的最新详情 JSON 并更新弹窗内容",
    promptLockedGuest: "登录或升级会员后可查看完整 Prompt 内容",
    promptLockedMember: "升级会员后可查看完整 Prompt 内容",
    promptLockedPurchase: "登录或升级会员后可查看完整 Prompt 内容",
    promptUnavailable: "当前作品暂时没有可展示的 Prompt 内容",
    roleLabel: "角色",
    shareReference: "分享内容",
    contextLabel: "背景",
    layoutLabel: "布局",
    styleLabel: "风格",
    constraintsLabel: "限制",
    outputLabel: "输出",
    unlockBenefits: [
      "先看右侧效果预览，再决定是否解锁",
      "解锁可复用的完整 Prompt 正文",
      "支持复制并沉淀到会员 Prompt 工作流",
    ],
    unlockBodyGuest:
      "右侧预览保持可见，方便先判断产出质量。登录后可继续解锁这条高级 Prompt。",
    unlockBodyMember:
      "右侧预览保持可见，方便先判断产出质量。升级会员后可复制完整 Prompt。",
    unlockTitle: "解锁完整 Prompt",
    statusRestricted: "受限",
    statusUnlocked: "已解锁",
    summary: "摘要",
    unavailableAction: "暂不可用",
    upgradeMembership: "升级会员",
    viewsLabel: "浏览量",
    cashPriceLabel: "现金价",
    changePreviewDevice: "切换预览设备",
  },
} satisfies Record<
  AppLocale,
  {
    access: string;
    accessLabel: string;
    attributes: string;
    categoryFallback: string;
    categoryLabel: string;
    closeDetailView: string;
    copy: string;
    copyAll: string;
    copyFailed: string;
    copyFullPrompt: string;
    insertPrompt: string;
    copyPrompt: string;
    createdLabel: string;
    curatedReference: string;
    description: string;
    detailLoadFailed: string;
    dialogDescriptionPrefix: string;
    details: string;
    linkCopied: string;
    loadingAction: string;
    loadingPreview: string;
    loadingPreviewHint: string;
    loginAndUnlock: string;
    loginToUnlock: string;
    insertPromptLabel: string;
    memberOnlyLabel: string;
    memberOnlyValue: string;
    openPreviewInTab: string;
    openOriginalReference: string;
    openOriginalWebsite: string;
    previewUnavailable: string;
    previewUnavailableHint: string;
    pointsPriceLabel: string;
    premiumBadge: string;
    prompt: string;
    promptCopied: string;
    promptForSale: string;
    promptLoadingHint: string;
    promptLockedGuest: string;
    promptLockedMember: string;
    promptLockedPurchase: string;
    promptUnavailable: string;
    roleLabel: string;
    shareReference: string;
    contextLabel: string;
    layoutLabel: string;
    styleLabel: string;
    constraintsLabel: string;
    outputLabel: string;
    unlockBenefits: string[];
    unlockBodyGuest: string;
    unlockBodyMember: string;
    unlockTitle: string;
    statusRestricted: string;
    statusUnlocked: string;
    summary: string;
    unavailableAction: string;
    upgradeMembership: string;
    viewsLabel: string;
    cashPriceLabel: string;
    changePreviewDevice: string;
  }
>;

function trimText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

const ASSET_TAG_ZH_MAP: Record<string, string> = {
  hair: "头发",
  hairstyle: "发型",
  "character name": "角色名称",
  character: "角色",
  "dress color": "服装颜色",
  dress: "服装",
  outfit: "穿搭",
  "watermark text": "水印文字",
  watermark: "水印",
  pose: "姿态",
  expression: "表情",
  lighting: "光影",
  background: "背景",
  style: "风格",
  color: "颜色",
  composition: "构图",
  angle: "视角",
};

function toChineseAssetTag(tag: string) {
  const normalizedTag = tag.trim();
  const lookupKey = normalizedTag.toLowerCase();

  return ASSET_TAG_ZH_MAP[lookupKey] || normalizedTag;
}

function normalizeAccessReason(value?: string | null) {
  return trimText(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function getRestrictionReasonFromAccessReason(
  accessReason?: string | null,
): PromptRestrictionReason | null {
  const normalizedReason = normalizeAccessReason(accessReason);

  if (!normalizedReason || normalizedReason === "free") {
    return null;
  }

  if (normalizedReason.includes("purchase")) {
    return "purchase";
  }

  if (
    normalizedReason.includes("member") ||
    normalizedReason.includes("premium") ||
    normalizedReason.includes("login") ||
    normalizedReason.includes("guest")
  ) {
    return "membership";
  }

  return null;
}

function openSiteUrl(url?: string) {
  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function getPreviewErrorMessage(
  site: SiteItem,
  error: unknown,
  copy: OverlayCopy,
) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (site.url) {
    return `${copy.previewUnavailableHint} ${copy.openOriginalWebsite}`;
  }

  return copy.previewUnavailableHint;
}

function PreviewDeviceSelect({
  copy,
  onChange,
  value,
}: {
  copy: OverlayCopy;
  onChange: (value: PreviewDeviceMode) => void;
  value: PreviewDeviceMode;
}) {
  const CurrentIcon = PREVIEW_MODE_META[value].icon;

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as PreviewDeviceMode)}
    >
      <SelectPrimitive.Trigger
        aria-label={copy.changePreviewDevice}
        className="inline-flex h-8 w-[58px] items-center justify-center gap-1.5 rounded-[16px] border border-[var(--hero-ink)]/8 bg-[var(--hero-bg)] text-[var(--hero-ink)] shadow-[0_8px_18px_rgba(17,17,17,0.07)] outline-none transition-colors hover:border-[var(--hero-ink)]/14 hover:bg-[var(--hero-bg)] focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
      >
        <CurrentIcon className="h-4 w-4 shrink-0" />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--hero-ink)]/34" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
          <SelectPrimitive.Content
          align="end"
          className="z-[90] min-w-[138px] overflow-hidden rounded-[16px] border border-[var(--hero-border)] bg-[var(--hero-surface)]/98 p-1.5 text-[var(--hero-ink)] shadow-[0_14px_34px_rgba(17,17,17,0.12)] backdrop-blur-xl"
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport>
            {PREVIEW_MODE_ORDER.map((mode) => {
              const Icon = PREVIEW_MODE_META[mode].icon;

              return (
                <SelectPrimitive.Item
                  key={mode}
                  value={mode}
                  className="grid h-9 cursor-default select-none grid-cols-[16px_18px_minmax(0,1fr)] items-center gap-2 rounded-[11px] px-2.5 text-[13px] font-medium leading-none outline-none transition-colors data-[highlighted]:bg-[var(--hero-surface)] data-[highlighted]:text-[var(--hero-ink)] data-[state=checked]:bg-[var(--hero-surface)] data-[state=checked]:shadow-[0_5px_14px_rgba(17,17,17,0.045)]"
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-3.5 w-3.5" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                  <SelectPrimitive.ItemText>
                    {PREVIEW_MODE_META[mode].label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function PreviewFrame({
  copy,
  immersive = false,
  onPreviewTabUrlChange,
  previewMode,
  onPreviewModeChange,
  showDeviceSelect = true,
  site,
}: {
  copy: OverlayCopy;
  immersive?: boolean;
  onPreviewTabUrlChange: (url: string | null) => void;
  previewMode: PreviewDeviceMode;
  onPreviewModeChange: (value: PreviewDeviceMode) => void;
  showDeviceSelect?: boolean;
  site: SiteItem;
}) {
  const [loadState, setLoadState] = useState<PreviewLoadState>("idle");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ height: 0, width: 0 });
  const previewConfig = PREVIEW_CANVAS_CONFIG[previewMode];
  const stagePadding = immersive ? 0 : previewConfig.stagePadding;

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    let objectUrl: string | null = null;

    setLoadState("loading");
    setPreviewSrc(null);
    setErrorMessage(null);
    onPreviewTabUrlChange(null);

    void getArtworkPreview(site.id, { signal: controller.signal })
      .then((preview) => {
        if (!isActive) {
          return;
        }

        if (preview.previewUrl?.trim()) {
          setPreviewSrc(preview.previewUrl);
          onPreviewTabUrlChange(preview.previewUrl);
          setLoadState("ready");
          return;
        }

        if (preview.html?.trim()) {
          objectUrl = URL.createObjectURL(
            new Blob([preview.html], {
              type: "text/html; charset=utf-8",
            }),
          );
          setPreviewSrc(objectUrl);
          onPreviewTabUrlChange(objectUrl);
          setLoadState("ready");
          return;
        }

        throw new Error(copy.previewUnavailableHint);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setLoadState("error");
        setErrorMessage(getPreviewErrorMessage(site, error, copy));
        onPreviewTabUrlChange(null);
      });

    return () => {
      isActive = false;
      controller.abort();
      onPreviewTabUrlChange(null);

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [copy, onPreviewTabUrlChange, site.id, site.url]);

  useEffect(() => {
    const node = stageRef.current;

    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();

      setStageSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);

      return () => {
        window.removeEventListener("resize", updateSize);
      };
    }

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const frameScale = useMemo(() => {
    if (stageSize.width <= 0 || stageSize.height <= 0) {
      return 0;
    }

    const availableWidth = Math.max(
      stageSize.width - stagePadding * 2,
      0,
    );
    const availableHeight = Math.max(
      stageSize.height - stagePadding * 2,
      0,
    );

    if (availableWidth <= 0 || availableHeight <= 0) {
      return 0;
    }

    if (immersive) {
      return Math.min(availableWidth / previewConfig.shellWidth, 1);
    }

    return Math.min(
      availableWidth / previewConfig.shellWidth,
      availableHeight / previewConfig.shellHeight,
      1,
    );
  }, [previewConfig, stagePadding, stageSize.height, stageSize.width]);

  const scaledFrameWidth = previewConfig.shellWidth * frameScale;
  const scaledFrameHeight = previewConfig.shellHeight * frameScale;
  const stageReady = frameScale > 0;
  const previewIframe = previewSrc ? (
    <iframe
      src={previewSrc}
      title={`${site.title} preview`}
      className="shrink-0 border-0 bg-[var(--hero-surface)]"
      sandbox="allow-scripts allow-same-origin"
      style={{
        width: `${previewConfig.viewportWidth}px`,
        height: `${previewConfig.viewportHeight}px`,
      }}
    />
  ) : null;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden",
        immersive
          ? "rounded-none border-0 bg-transparent"
          : "rounded-[24px] bg-[var(--prompt-overlay-preview-bg)]",
      )}
    >
      {showDeviceSelect ? (
        <div className="flex shrink-0 items-center justify-end gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <PreviewDeviceSelect
            copy={copy}
            onChange={onPreviewModeChange}
            value={previewMode}
          />
        </div>
      ) : null}

      <div
        ref={stageRef}
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden",
          immersive ? "bg-transparent" : "bg-[var(--prompt-overlay-preview-bg)]",
        )}
      >
        {loadState === "ready" && previewSrc ? (
          <div
            className={cn(
              "flex h-full items-start justify-center overflow-hidden",
              immersive ? "px-0 py-0" : "px-4 py-4 sm:px-5 sm:py-5 lg:p-10",
            )}
          >
            <div
              className="relative shrink-0 transition-[width,height,opacity] duration-300 ease-out"
              style={{
                width: scaledFrameWidth,
                height: scaledFrameHeight,
                opacity: stageReady ? 1 : 0,
              }}
            >
              <div
                className="absolute left-0 top-0 origin-top-left transition-transform duration-300 ease-out"
                style={{
                  width: previewConfig.shellWidth,
                  height: previewConfig.shellHeight,
                  transform: `scale(${frameScale})`,
                }}
              >
                {previewMode === "web" ? (
                  <div
                    className={cn(
                      "flex h-full w-full overflow-hidden bg-[var(--hero-surface)]",
                      immersive
                        ? "rounded-none border-0 shadow-none"
                        : "rounded-[16px] border border-[var(--hero-ink)]/[0.08] shadow-[0_24px_60px_rgba(17,17,17,0.14)]",
                    )}
                  >
                    {previewIframe}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex h-full w-full items-center justify-center overflow-hidden border border-[var(--hero-ink)]/[0.08] bg-[var(--hero-surface)] shadow-[0_18px_46px_rgba(17,17,17,0.12)]",
                      previewMode === "tablet"
                        ? "rounded-[34px] p-[10px]"
                        : "rounded-[36px] p-[10px]",
                    )}
                  >
                    <div
                      className={cn(
                        "overflow-hidden bg-[var(--hero-surface)] shadow-[inset_0_0_0_1px_rgba(17,17,17,0.04)]",
                        previewMode === "tablet"
                          ? "rounded-[24px]"
                          : "rounded-[28px]",
                      )}
                      style={{
                        width: previewConfig.viewportWidth,
                        height: previewConfig.viewportHeight,
                      }}
                    >
                      {previewIframe}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {loadState === "idle" || loadState === "loading" ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--hero-surface)] text-[var(--hero-ink)] shadow-[0_12px_28px_rgba(17,17,17,0.08)]">
              <LoaderCircle className="h-5 w-5 animate-spin" />
            </span>
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.02em] text-[var(--hero-ink)]">
                {copy.loadingPreview}
              </p>
              <p className="mt-1 text-[12px] leading-6 text-[var(--hero-muted)]">
                {copy.loadingPreviewHint}
              </p>
            </div>
          </div>
        ) : null}

        {loadState === "error" ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 py-8 text-center">
            <div className="w-full max-w-[360px] rounded-[22px] border border-[var(--hero-ink)]/[0.06] bg-[var(--hero-surface)]/92 p-6 shadow-[0_16px_42px_rgba(17,17,17,0.08)]">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--hero-ink)]/[0.04] text-[var(--hero-ink)]">
                <Monitor className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[14px] font-semibold tracking-[-0.02em] text-[var(--hero-ink)]">
                {copy.previewUnavailable}
              </p>
              <p className="mt-2 text-[12px] leading-6 text-[var(--hero-muted)]">
                {errorMessage || copy.previewUnavailableHint}
              </p>
              {site.url ? (
                <button
                  type="button"
                  onClick={() => openSiteUrl(site.url)}
                  className="mt-5 inline-flex h-9 items-center gap-2 rounded-full bg-[var(--hero-ink)] px-4 text-[12px] font-semibold tracking-[-0.01em] text-[var(--hero-bg)] shadow-[0_10px_20px_rgba(17,17,17,0.16)] transition-transform hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>{copy.openOriginalWebsite}</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SearchOverlay({ site, onClose }: SearchOverlayProps) {
  const navigate = useNavigate();
  const requestUnlock = usePromptUnlock();
  const { locale } = usePreferredLocale();
  const copy = OVERLAY_COPY[locale];
  const isPromptAssetSite = site.sourceType === "promptAsset";
  const [loginUser] = useState(() => getPersistedLoginUser());
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewDeviceMode>("web");
  const [previewTabUrl, setPreviewTabUrl] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<DetailLoadState>("idle");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ArtworkDetailVO | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isPromptAssetPromptExpanded, setIsPromptAssetPromptExpanded] = useState(true);

  useEffect(() => {
    if (!isPromptAssetSite || !site.id || !loginUser) {
      setIsFavorited(false);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    void checkPromptAssetFavorite(site.id, { signal: controller.signal })
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
  }, [isPromptAssetSite, site.id]);

  useEffect(() => {
    if (!isPromptAssetSite) {
      return;
    }

    return subscribePromptAssetFavoriteChange((change) => {
      if (String(change.promptAssetId) === String(site.id)) {
        setIsFavorited(change.isFavorited);
      }
    });
  }, [isPromptAssetSite, site.id]);

  const redirectToLogin = () => {
    const currentRoute = `${window.location.hash.replace(/^#/, "") || "/"}${window.location.search}`;

    navigate("/auth/login", {
      state: {
        redirectTo: currentRoute,
      },
    });
  };

  const handleToggleFavorite = async () => {
    if (!isPromptAssetSite || !site.id || isFavoriteLoading) {
      return;
    }

    if (!loginUser) {
      redirectToLogin();
      return;
    }

    const previousValue = isFavorited;
    const nextValue = !previousValue;

    setIsFavorited(nextValue);
    setIsFavoriteLoading(true);
    notifyPromptAssetFavoriteChange({
      promptAssetId: String(site.id),
      isFavorited: nextValue,
    });

    try {
      if (nextValue) {
        await addPromptAssetFavorite(site.id);
      } else {
        await cancelPromptAssetFavorite(site.id);
      }
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setIsFavorited(previousValue);
      notifyPromptAssetFavoriteChange({
        promptAssetId: String(site.id),
        isFavorited: previousValue,
      });
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  useEffect(() => {
    if (isPromptAssetSite) {
      setDetailState("ready");
      setDetailError(null);
      setDetail(null);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    setDetailState("loading");
    setDetailError(null);
    setDetail(null);

    void getArtworkDetail(site.id, { signal: controller.signal })
      .then((nextDetail) => {
        if (!isActive) {
          return;
        }

        setDetail(nextDetail);
        setDetailState("ready");
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setDetailState("error");
        setDetailError(
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : copy.detailLoadFailed,
        );
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [copy.detailLoadFailed, isPromptAssetSite, site.id]);

  const resolvedTitle = trimText(detail?.title) || site.title;
  const resolvedDescription = trimText(detail?.description);
  const resolvedSummary =
    trimText(detail?.summary) ||
    resolvedDescription ||
    trimText(site.description) ||
    (locale === "zh-CN"
      ? "当前 Prompt 提供了可快速浏览的摘要信息。"
      : "This prompt includes a concise summary for quick browsing.");
  const resolvedCategory =
    trimText(detail?.category?.name) ||
    trimText(site.category) ||
    copy.categoryFallback;
  const resolvedUrl = trimText(detail?.htmlUrl) || site.url;
  const promptText = trimText(detail?.promptContent);
  const isMemberOnlyPrompt = detail?.memberOnly === 1;
  useEffect(() => subscribePromptAccess((next) => {
    if (!isPromptAssetSite && String(next.id) === String(site.id)) {
      setDetail(next);
      setDetailState("ready");
    }
  }), [site.id, isPromptAssetSite]);
  const promptRestrictionReason = useMemo<PromptRestrictionReason | null>(() => {
    if (detailState !== "ready") {
      return null;
    }

    if (promptText || detail?.canAccessPrompt === true) {
      return null;
    }

    const reasonFromAccess = getRestrictionReasonFromAccessReason(
      detail?.accessReason,
    );

    if (reasonFromAccess) {
      return reasonFromAccess;
    }

    if (detail?.canAccessPrompt === false) {
      return isMemberOnlyPrompt ? "membership" : "purchase";
    }

    if (promptText) {
      return null;
    }

    if (isMemberOnlyPrompt) {
      return "membership";
    }

    return null;
  }, [
    detail?.accessReason,
    detail?.canAccessPrompt,
    detailState,
    isMemberOnlyPrompt,
    promptText,
  ]);
  const isPromptRestricted =
    detailState === "ready" && promptRestrictionReason !== null;
  const hasPromptText = Boolean(promptText) && !isPromptRestricted;
  const shouldRenderPreviewOnly =
    !isPromptAssetSite && detailState === "ready" && detail === null;
  const promptAssetPromptText =
    trimText(site.prompt) || trimText(site.description) || copy.promptUnavailable;
  const promptAssetTagItems =
    site.assetTagTexts?.length
      ? site.assetTagTexts
      : (site.assetTags?.length ? site.assetTags : site.tags).map(toChineseAssetTag);
  const promptAssetTagText = promptAssetTagItems.join(" · ");

  const previewSite = useMemo(
    () => ({
      ...site,
      title: resolvedTitle,
      url: resolvedUrl || undefined,
    }),
    [resolvedTitle, resolvedUrl, site],
  );

  const writeClipboard = async (text: string, sectionId?: string) => {
    try {
      const content = isPromptAssetSite ? text : await getArtworkPromptContent(site.id);
      await navigator.clipboard.writeText(content);
      setCopiedSectionId(sectionId ?? null);
      window.setTimeout(() => {
        setCopiedSectionId(null);
      }, 1800);
    } catch (error) {
      if (!isPromptAssetSite && error instanceof RequestError && [40101, 40300].includes(error.code ?? 0)) {
        await requestUnlock(site.id);
      } else { setClipboardError("复制失败，请重试"); }
      window.setTimeout(() => {
        setCopiedSectionId(null);
      }, 1800);
    }
  };

  const handleOpenPricing = () => {
    if (!loginUser) {
      navigate("/auth/login");
      return;
    }

    navigate("/pricing");
  };

  const handleShare = async () => {
    if (resolvedUrl && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: resolvedTitle,
          text: resolvedSummary,
          url: resolvedUrl,
        });
        return;
      } catch {
        // Fall back to clipboard when share is cancelled/unavailable.
      }
    }

    if (resolvedUrl) {
      await writeClipboard(resolvedUrl);
      return;
    }

    if (hasPromptText) {
      await writeClipboard(promptText);
      return;
    }

    await writeClipboard(resolvedSummary);
  };

  const detailDialogDescription =
    locale === "zh-CN"
      ? `${copy.dialogDescriptionPrefix}${resolvedTitle}的详情与预览。`
      : `${copy.dialogDescriptionPrefix} ${resolvedTitle}.`;

  const handleOpenPreviewTab = () => {
    if (!previewTabUrl) {
      return;
    }

    openSiteUrl(previewTabUrl);
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-[var(--hero-bg)]/80 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[80] h-[calc(100vh-72px)] w-[calc(100vw-32px)] max-w-[1360px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border border-[var(--hero-border)] bg-[var(--prompt-overlay-bg)] shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_4px_8px_rgba(0,0,0,0.04),0_8px_16px_rgba(0,0,0,0.06),0_16px_32px_rgba(0,0,0,0.08)] outline-none sm:w-[90vw]",
            shouldRenderPreviewOnly
              ? "rounded-[24px] bg-[var(--prompt-overlay-bg)]"
              : null,
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {resolvedTitle}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {detailDialogDescription}
          </DialogPrimitive.Description>

          {shouldRenderPreviewOnly ? (
            <div className="flex h-full min-h-0 flex-col bg-[var(--prompt-overlay-bg)]">
              <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 px-6 py-6 sm:flex-nowrap">
                <div className="min-w-0">
                  <h2 className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[var(--hero-ink)]">
                    {resolvedTitle}
                  </h2>
                  <p className="mt-0.5 text-[12px] leading-4 text-[var(--hero-muted)]">
                    {resolvedCategory}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 self-start">
                  <button
                    type="button"
                    onClick={handleOpenPricing}
                    className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-[var(--hero-border)] bg-[var(--hero-ink)]/[0.05] px-2.5 text-[12px] font-medium tracking-[-0.01em] whitespace-nowrap text-[var(--hero-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[background-color,border-color] duration-150 hover:border-[var(--hero-border-strong)] hover:bg-[var(--hero-ink)]/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                  >
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span className="leading-none">
                      {copy.premiumBadge}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] bg-[var(--hero-ink)]/[0.08] text-[var(--hero-ink)] transition-[background-color] duration-150 hover:bg-[var(--hero-ink)]/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                    aria-label={copy.closeDetailView}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden border-t border-[var(--hero-border)]">
                <PreviewFrame
                  copy={copy}
                  immersive
                  onPreviewTabUrlChange={setPreviewTabUrl}
                  previewMode="web"
                  onPreviewModeChange={setPreviewMode}
                  showDeviceSelect={false}
                  site={previewSite}
                />
              </div>
            </div>
          ) : isPromptAssetSite ? (
            <div className="grid h-full min-h-0 gap-0 p-0 lg:grid-cols-[minmax(0,0.98fr)_minmax(420px,1.02fr)]">
              <section className="order-2 min-h-0 overflow-hidden border-t border-[var(--hero-border)] bg-[var(--prompt-overlay-preview-bg)] p-4 sm:p-5 lg:order-2 lg:border-l lg:border-t-0 lg:p-6">
                <div className="flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[20px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4 shadow-[0_18px_46px_rgba(17,17,17,0.08)]">
                  <img
                    src={site.image}
                    alt={resolvedTitle}
                    className="h-full max-h-full w-full rounded-[14px] object-contain object-center"
                  />
                </div>
              </section>

              <section className="order-1 min-h-0 overflow-hidden lg:order-1">
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
                  <div className="flex min-h-20 shrink-0 items-center justify-between px-6 py-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                      aria-label={copy.closeDetailView}
                    >
                      <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void writeClipboard(promptAssetPromptText, "copy-full-prompt")}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-surface)] px-3 text-[var(--hero-ink)] transition-transform hover:-translate-y-[0.5px] hover:border-[var(--hero-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                      >
                        {copiedSectionId === "copy-full-prompt" ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        ) : (
                          <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                        )}
                        <span className="text-[12px] font-medium leading-none">
                          {copiedSectionId === "copy-full-prompt"
                            ? (locale === "zh-CN" ? "已复制" : "Copied")
                            : copy.copyPrompt}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                        aria-label={copy.shareReference}
                      >
                        <Share2 className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleFavorite()}
                        disabled={isFavoriteLoading}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 disabled:cursor-not-allowed disabled:opacity-70",
                          isFavorited
                            ? "text-amber-500 hover:bg-[var(--hero-ink)]/[0.05]"
                            : "text-[var(--hero-ink)] hover:bg-[var(--hero-ink)]/[0.05]",
                        )}
                        aria-label={isFavorited ? "Cancel favorite" : "Save favorite"}
                        aria-pressed={isFavorited}
                      >
                        {isFavoriteLoading ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Star
                            className="h-4 w-4"
                            fill={isFavorited ? "currentColor" : "none"}
                            strokeWidth={1.8}
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-0">
                    <div className="space-y-3.5">
                      <section className="border-b border-[var(--hero-ink)]/[0.06] pb-3">
                        <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--hero-muted)]">
                          {locale === "zh-CN" ? "来源" : "Source"}
                        </p>
                        <p className="mt-1.5 text-[18px] font-semibold leading-7 tracking-[-0.02em] text-[var(--hero-ink)]">
                          {resolvedTitle}
                        </p>
                      </section>

                      <section className="rounded-[14px] border border-[var(--hero-ink)]/[0.05] bg-[var(--hero-ink)]/[0.03]">
                        <button
                          type="button"
                          onClick={() => setIsPromptAssetPromptExpanded((value) => !value)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                          aria-expanded={isPromptAssetPromptExpanded}
                        >
                          <span className="text-[13px] font-semibold tracking-[0.08em] text-[var(--hero-muted)]">
                            Prompt
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-[var(--hero-muted)] transition-transform",
                              isPromptAssetPromptExpanded ? "rotate-180" : null,
                            )}
                          />
                        </button>
                        {isPromptAssetPromptExpanded ? (
                          <p className="whitespace-pre-wrap px-4 pb-4 text-[14px] leading-6 text-[var(--hero-ink)]/82">
                            {promptAssetPromptText}
                          </p>
                        ) : null}
                      </section>

                      <section className="rounded-[14px] border border-[var(--hero-ink)]/[0.05] bg-[var(--hero-ink)]/[0.03] p-4">
                        <p className="text-[13px] font-semibold tracking-[0.08em] text-[var(--hero-muted)]">
                          {locale === "zh-CN" ? "资产标签" : "Asset Tags"}
                        </p>
                        {promptAssetTagItems.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {promptAssetTagItems.map((tag, index) => (
                              <span
                                key={`${tag}-${index}`}
                                className="inline-flex min-h-7 items-center rounded-full border border-[var(--hero-ink)]/[0.12] bg-[var(--hero-surface)] px-3 text-[12px] font-medium text-[var(--hero-ink)] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-[14px] leading-6 text-[var(--hero-ink)]/82">
                            {locale === "zh-CN" ? "暂无资产标签" : "No asset tags"}
                          </p>
                        )}
                      </section>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div
              className={cn(
                "grid h-full min-h-0 grid-rows-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-0 p-0 lg:grid-cols-[545px_minmax(0,1fr)] lg:grid-rows-1",
              )}
            >
              <section className="order-2 min-h-0 overflow-hidden p-3 sm:p-4 lg:col-start-2 lg:row-start-1">
                <div className="h-full min-h-0">
                  <PreviewFrame
                    copy={copy}
                    onPreviewTabUrlChange={setPreviewTabUrl}
                    previewMode={previewMode}
                    onPreviewModeChange={setPreviewMode}
                    site={previewSite}
                  />
                </div>
              </section>

              <section className="order-1 min-h-0 overflow-hidden lg:col-start-1 lg:row-start-1">
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
                  <div className="flex min-h-20 shrink-0 items-center justify-between px-6 py-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 cursor-pointer"
                      aria-label={copy.closeDetailView}
                    >
                      <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleOpenPreviewTab}
                        disabled={!previewTabUrl}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer"
                        aria-label={copy.openPreviewInTab}
                      >
                        <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 cursor-pointer"
                        aria-label={copy.shareReference}
                      >
                        <Share2 className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>

                  <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-0">
                    {detailState === "error" ? (
                      <div className="mb-3 rounded-[14px] border border-[var(--hero-ink)]/[0.07] bg-[var(--hero-ink)]/[0.03] px-3 py-2.5 text-[12px] leading-5 text-[var(--hero-muted)]">
                        {detailError || copy.detailLoadFailed}
                      </div>
                    ) : null}

                    {/* 标题与描述说明区域 */}
                    <div className="mb-5">
                      <h2 className="text-[20px] font-bold leading-[25px] tracking-[-0.02em] text-[var(--hero-ink)]">
                        {resolvedTitle}
                      </h2>
                      {resolvedDescription && (
                        <p className="mt-2 text-[14px] leading-5 text-[var(--hero-muted)]">
                          {resolvedDescription}
                        </p>
                      )}
                    </div>

                    {/* 操作按钮行 */}
                    <div className="mb-2.5 mt-5 flex min-h-8 items-center justify-between">
                      <span className="text-[14px] font-medium leading-5 text-[var(--hero-ink)]">
                        Prompt
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {detail?.permanentlyUnlocked && <span className="text-[12px]">已永久解锁</span>}
                        {isPromptRestricted && <button type="button" onClick={() => void requestUnlock(site.id)} className="inline-flex h-8 items-center rounded-[8px] border border-[var(--hero-border)] px-3 text-[12px]">{loginUser ? (detail?.pointsPrice && detail.pointsPrice > 0 ? `${detail.pointsPrice} 积分永久解锁` : "查看解锁方式") : "登录后积分解锁"}</button>}
                        {isPromptRestricted ? (
                          <button
                            type="button"
                            onClick={handleOpenPricing}
                            className="inline-flex h-8 items-center gap-1.5 rounded-[12px] bg-[var(--hero-ink)] px-3 text-[var(--hero-bg)] transition-transform hover:-translate-y-[0.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 cursor-pointer shadow-[0_4px_12px_rgba(17,17,17,0.08)]"
                          >
                            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                            <span className="text-[12px] font-medium leading-none">
                              {loginUser
                                ? (locale === "zh-CN" ? "升级会员解锁" : "Upgrade to unlock")
                                : (locale === "zh-CN" ? "登录解锁" : "Login to unlock")}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void writeClipboard(promptText || "", "copy-full-prompt")}
                            disabled={!hasPromptText}
                            className="inline-flex h-8 items-center gap-1.5 rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-surface)] px-3 text-[var(--hero-ink)] transition-transform hover:-translate-y-[0.5px] hover:border-[var(--hero-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                          >
                            {copiedSectionId === "copy-full-prompt" ? (
                              <Check className="h-3.5 w-3.5" strokeWidth={2} />
                            ) : (
                              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                            )}
                            <span className="text-[12px] font-medium leading-none">
                              {copiedSectionId === "copy-full-prompt"
                                ? (locale === "zh-CN" ? "已复制" : "Copied")
                                : copy.copyFullPrompt}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </section>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
      {clipboardError && <RequestErrorToast message={clipboardError} onClose={() => setClipboardError(null)} />}
    </DialogPrimitive.Root>
  );
}
