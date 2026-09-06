import { getBlob, getJson, getText, postJson, RequestError } from "@/lib/request";
import {
  isSupportedArtworkCoverUrl,
  isSupportedArtworkVideoUrl,
} from "@/lib/artwork-display-rules";
import type {
  ArtworkDetailVO,
  ArtworkPreviewResponse,
  ArtworkQueryRequest,
  ArtworkVO,
  BaseResponse,
  Page,
  SiteItem,
  TagVO,
} from "@/lib/types";

const HOME_ARTWORK_QUERY: ArtworkQueryRequest = {
  current: 1,
  pageSize: 16,
};

const INVALID_COVER_HOSTNAMES = new Set(["example.com", "www.example.com"]);
const VIDEO_MEDIA_EXTENSION_PATTERN = /\.(?:mp4|webm|mov|m4v|avi|mkv)(?:$|[?#])/i;
const PREVIEW_UNAVAILABLE_MESSAGE = "Preview content is unavailable right now";
const HOME_PROMPT_ASSET_QUERY = {
  current: 1,
  pageSize: 20,
  assetType: "image_prompt",
};

export interface HomeSitePageResult {
  current: number;
  hasMore: boolean;
  items: SiteItem[];
  pages: number;
  total: number;
}

export interface PromptAssetHomeOverviewResult {
  items: SiteItem[];
  todayNewCount: number | null;
  totalCount: number | null;
}

export interface ArtworkHomeOverviewResult {
  items: SiteItem[];
  recentThreeDaysCount: number | null;
  totalCount: number | null;
}

interface ArtworkHomeOverviewItemVO {
  permanentlyUnlocked?: boolean;
  pointsPrice?: number;
  canAccess?: boolean;
  category?: {
    id?: number | string;
    name?: string;
  };
  coverUrl?: string;
  favoriteCount?: number | string;
  favorited?: boolean;
  hasSourceCode?: boolean;
  id: string;
  imageAspectRatio?: number | string;
  imageHeight?: number | string;
  imageUrl?: string;
  imageWidth?: number | string;
  memberOnly?: number;
  previewMediaUrl?: string;
  tagList?: TagVO[] | null;
  title?: string;
  videoUrl?: string;
}

interface ArtworkHomeOverviewPayload {
  recentItems?: ArtworkHomeOverviewItemVO[] | null;
  recentThreeDaysCount?: number | string;
  totalCount?: number | string;
}

type PromptAssetHomeOverviewPayload = {
  items?: PromptAssetVO[];
  latestItems?: PromptAssetResponse;
  latestList?: PromptAssetResponse;
  latestPromptAssets?: PromptAssetResponse;
  list?: PromptAssetVO[];
  promptAssetTotalCount?: number | string;
  records?: PromptAssetVO[];
  todayCount?: number | string;
  todayItems?: PromptAssetResponse;
  todayList?: PromptAssetResponse;
  todayNewPromptAssetCount?: number | string;
  todayNewCount?: number | string;
  todayPromptAssets?: PromptAssetResponse;
  total?: number | string;
  totalCount?: number | string;
  totalPromptAssetCount?: number | string;
};

function normalizePositiveInteger(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return fallback;
}

function normalizeNonNegativeInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }

  return null;
}

function getHasMoreByPage(payload: {
  current: unknown;
  pageSize: number;
  pages: unknown;
  recordCount: number;
  total: unknown;
}) {
  const current = normalizePositiveInteger(payload.current, 1);
  const total = normalizePositiveInteger(payload.total, 0);
  const pagesFromPayload = normalizePositiveInteger(payload.pages, 0);
  const computedPages =
    total > 0 ? Math.ceil(total / payload.pageSize) : pagesFromPayload;
  const pages = Math.max(pagesFromPayload, computedPages, current);

  if (total > 0) {
    return {
      current,
      pages,
      total,
      hasMore: current * payload.pageSize < total,
    };
  }

  if (pages <= current) {
    return {
      current,
      pages,
      total,
      hasMore: payload.recordCount >= payload.pageSize,
    };
  }

  return {
    current,
    pages,
    total,
    hasMore: current < pages && payload.recordCount > 0,
  };
}

interface PromptAssetMedia {
  cloudUrl?: string;
  height?: number | string;
  localUrl?: string;
  width?: number | string;
  thumbnailCloudUrl?: string;
  thumbnailHeight?: number | string;
  thumbnailLocalUrl?: string;
  thumbnailWidth?: number | string;
}

export interface PromptAssetVO {
  assetTagList?: TagVO[];
  assetTagText?: string | string[] | null;
  canAccess?: boolean;
  category?: {
    id?: number | string;
    name?: string;
  };
  categoryName?: string;
  coverUrl?: string;
  createTime?: string;
  description?: string;
  favoriteCount?: number | string;
  favorited?: boolean;
  id?: number | string;
  imageUrl?: string;
  imageHeight?: number | string;
  imageAspectRatio?: number | string;
  imageWidth?: number | string;
  isFeatured?: 0 | 1;
  mediaList?: PromptAssetMedia[];
  memberOnly?: number;
  name?: string;
  prompt?: string;
  promptCn?: string | null;
  promptContent?: string | null;
  promptText?: string | null;
  previewMediaUrl?: string;
  sceneTagList?: TagVO[];
  sort?: number;
  sourceCloudStorageUrl?: string;
  sourceThumbnailCloudStorageUrl?: string;
  summary?: string;
  tagList?: TagVO[];
  tags?: string[];
  thumbnailUrl?: string;
  thumbnailHeight?: number | string;
  thumbnailWidth?: number | string;
  title?: string;
  url?: string;
  viewCount?: number;
}

export type PromptAssetResponse = Page<PromptAssetVO> | PromptAssetVO[];
type ArtworkListPageResponse = BaseResponse<Page<ArtworkVO>> | Page<ArtworkVO>;

function normalizeArtworkImage(coverUrl?: string) {
  if (!coverUrl || VIDEO_MEDIA_EXTENSION_PATTERN.test(coverUrl.trim())) {
    return "";
  }

  try {
    const parsedUrl = new URL(coverUrl);

    if (INVALID_COVER_HOSTNAMES.has(parsedUrl.hostname)) {
      return "";
    }

    return coverUrl;
  } catch {
    return coverUrl.startsWith("/") ? coverUrl : "";
  }
}

function normalizeArtworkOverviewCover(coverUrl?: string) {
  const normalizedUrl = getTrimmedText(coverUrl);

  if (!isSupportedArtworkCoverUrl(normalizedUrl)) {
    return "";
  }

  return normalizeArtworkImage(normalizedUrl);
}

function normalizeArtworkOverviewVideo(videoUrl?: string) {
  const normalizedUrl = getTrimmedText(videoUrl);

  if (!isSupportedArtworkVideoUrl(normalizedUrl)) {
    return undefined;
  }

  return normalizedUrl;
}

function getTrimmedText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function getTagNames(tags?: TagVO[]) {
  return (
    tags
      ?.map((tag) => tag.name?.trim())
      .filter((tag): tag is string => Boolean(tag)) ?? []
  );
}

function parsePromptAssetTagTexts(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => getTrimmedText(item))
      .filter((item): item is string => Boolean(item));
  }

  const text = getTrimmedText(value);

  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => getTrimmedText(item))
        .filter((item): item is string => Boolean(item));
    }
  } catch {
    return [text];
  }

  return [];
}

function getFirstCoverImageUrl(candidates: Array<string | undefined>) {
  return candidates
    .map((candidate) => getTrimmedText(candidate))
    .find(
      (candidate) =>
        Boolean(candidate) && !VIDEO_MEDIA_EXTENSION_PATTERN.test(candidate),
    );
}

function getPromptAssetImage(asset: PromptAssetVO) {
  const media = asset.mediaList?.[0];
  const staticCoverCandidates = [
    asset.coverUrl,
    asset.imageUrl,
    asset.thumbnailUrl,
    asset.sourceThumbnailCloudStorageUrl,
    media?.thumbnailCloudUrl,
    media?.thumbnailLocalUrl,
    asset.sourceCloudStorageUrl,
    media?.cloudUrl,
    media?.localUrl,
  ];

  return normalizeArtworkImage(
    getFirstCoverImageUrl(staticCoverCandidates),
  );
}

function getPromptAssetPrompt(asset: PromptAssetVO) {
  return (
    getTrimmedText(asset.promptContent) ||
    getTrimmedText(asset.prompt) ||
    getTrimmedText(asset.promptText)
  );
}

export function normalizePromptAssetToSiteItem(
  asset: PromptAssetVO,
  index: number,
): SiteItem {
  const siteId = getTrimmedText(asset.id) || String(index + 1);
  const promptText = getPromptAssetPrompt(asset);
  const isPromptLocked =
    asset.memberOnly === 1 && asset.canAccess !== true;
  const sceneTags = getTagNames(asset.sceneTagList);
  const assetTags = getTagNames(asset.assetTagList);
  const assetTagTexts = parsePromptAssetTagTexts(asset.assetTagText);
  const legacyTags = getTagNames(asset.tagList);
  const inlineTags =
    asset.tags?.filter((tag): tag is string => Boolean(tag?.trim())) ?? [];
  const media = asset.mediaList?.[0];
  const imageWidth =
    getNumericValue(asset.imageWidth) ||
    getNumericValue(asset.thumbnailWidth) ||
    getNumericValue(media?.width) ||
    getNumericValue(media?.thumbnailWidth);
  const imageHeight =
    getNumericValue(asset.imageHeight) ||
    getNumericValue(asset.thumbnailHeight) ||
    getNumericValue(media?.height) ||
    getNumericValue(media?.thumbnailHeight);
  const imageAspectRatio =
    getNumericValue(asset.imageAspectRatio) ||
    (imageWidth && imageHeight ? imageWidth / imageHeight : undefined);

  return {
    id: siteId,
    title:
      getTrimmedText(asset.title) ||
      getTrimmedText(asset.name) ||
      "Untitled prompt asset",
    description:
      getTrimmedText(asset.summary) ||
      getTrimmedText(asset.description) ||
      (isPromptLocked
        ? "会员专享提示词，解锁后可查看完整内容"
        : promptText),
    category:
      getTrimmedText(asset.category?.name) ||
      getTrimmedText(asset.categoryName) ||
      "图像提示词",
    sourceType: "promptAsset",
    memberOnly: asset.memberOnly,
    canAccess: asset.canAccess,
    favoriteCount: normalizeNonNegativeInteger(asset.favoriteCount) ?? 0,
    favorited:
      typeof asset.favorited === "boolean" ? asset.favorited : undefined,
    tags: [...sceneTags, ...assetTags, ...legacyTags, ...inlineTags],
    assetTags,
    assetTagTexts,
    sceneTags,
    image: getPromptAssetImage(asset),
    imageAspectRatio,
    imageHeight,
    imageWidth,
    isFeatured: asset.isFeatured === 1,
    url: asset.url || undefined,
    prompt: !isPromptLocked && promptText ? promptText : undefined,
    createdAt: asset.createTime || undefined,
    sort: asset.sort ?? 0,
    viewCount: asset.viewCount ?? 0,
  };
}

function extractPromptAssetRecords(data: PromptAssetResponse | null | undefined) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  return data.records ?? [];
}

export function normalizeArtworkToSiteItem(artwork: ArtworkVO): SiteItem {
  const imageWidth = getNumericValue(artwork.imageWidth);
  const imageHeight = getNumericValue(artwork.imageHeight);
  const imageAspectRatio =
    getNumericValue(artwork.imageAspectRatio) ||
    (imageWidth && imageHeight ? imageWidth / imageHeight : undefined);
  const tagNames =
    artwork.tagList
      ?.map((tag) => tag.name?.trim())
      .filter((tag): tag is string => Boolean(tag)) ?? [];

  return {
    id: String(artwork.id),
    title: artwork.title?.trim() || "Untitled reference",
    description: artwork.summary?.trim() || artwork.description?.trim() || "",
    category: tagNames[0] || artwork.category?.name?.trim() || "Uncategorized",
    sourceType: "artwork",
    memberOnly: artwork.memberOnly,
    canAccess: artwork.canAccess ?? artwork.canAccessPrompt,
    permanentlyUnlocked: artwork.permanentlyUnlocked,
    pointsPrice: artwork.pointsPrice,
    favoriteCount: normalizeNonNegativeInteger(artwork.favoriteCount) ?? 0,
    favorited:
      typeof artwork.favorited === "boolean" ? artwork.favorited : undefined,
    hasSourceCode: artwork.hasSourceCode === true,
    tags: tagNames,
    image: normalizeArtworkImage(
      getFirstCoverImageUrl([artwork.coverUrl, artwork.imageUrl]),
    ),
    imageAspectRatio,
    imageHeight,
    imageWidth,
    url: artwork.htmlUrl || undefined,
    videoUrl: artwork.videoUrl || undefined,
    prompt: artwork.promptContent?.trim() || undefined,
    createdAt: artwork.createTime || undefined,
    sort: artwork.sort ?? 0,
    viewCount: artwork.viewCount ?? 0,
  };
}

function isArtworkPagePayload(value: unknown): value is Page<ArtworkVO> {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray((value as Page<ArtworkVO>).records),
  );
}

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function injectPreviewBase(html: string, responseUrl: string) {
  const trimmed = html.trim();

  if (!trimmed) {
    return "";
  }

  if (/<base\s/i.test(trimmed)) {
    return trimmed;
  }

  const headContent = [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<base href="${escapeHtmlAttribute(responseUrl)}" />`,
  ].join("");
  const headMarkup = `<head>${headContent}</head>`;

  if (/<head(\s[^>]*)?>/i.test(trimmed)) {
    return trimmed.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${headContent}`);
  }

  if (/<body(\s[^>]*)?>/i.test(trimmed)) {
    return trimmed.replace(/<body(\s[^>]*)?>/i, `${headMarkup}$&`);
  }

  if (/<html(\s[^>]*)?>/i.test(trimmed)) {
    return trimmed.replace(/<html(\s[^>]*)?>/i, `$&${headMarkup}`);
  }

  return `<!doctype html><html>${headMarkup}<body>${trimmed}</body></html>`;
}

function normalizePreviewPayload(payload: unknown): ArtworkPreviewResponse {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const data = payload as {
    html?: unknown;
    previewUrl?: unknown;
  };
  const html =
    typeof data.html === "string" && data.html.trim() ? data.html.trim() : undefined;
  const previewUrl =
    typeof data.previewUrl === "string" && data.previewUrl.trim()
      ? data.previewUrl.trim()
      : undefined;

  return {
    html,
    previewUrl,
  };
}

function resolvePreviewUrl(previewUrl: string, responseUrl: string) {
  try {
    return new URL(previewUrl, responseUrl).toString();
  } catch {
    return previewUrl;
  }
}

function parsePreviewJsonPayload(
  text: string,
  responseUrl: string,
): ArtworkPreviewResponse {
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new RequestError("Unable to parse preview response");
  }

  const baseResponse = payload as BaseResponse<unknown> | null;

  if (
    baseResponse &&
    typeof baseResponse === "object" &&
    typeof baseResponse.code === "number"
  ) {
    if (baseResponse.code !== 0) {
      throw new RequestError(
        baseResponse.message || PREVIEW_UNAVAILABLE_MESSAGE,
        { code: baseResponse.code },
      );
    }

    const normalized = normalizePreviewPayload(baseResponse.data);

    if (normalized.previewUrl) {
      return {
        previewUrl: resolvePreviewUrl(normalized.previewUrl, responseUrl),
      };
    }

    if (normalized.html) {
      return {
        html: injectPreviewBase(normalized.html, responseUrl),
      };
    }

    throw new RequestError(PREVIEW_UNAVAILABLE_MESSAGE);
  }

  const normalized = normalizePreviewPayload(payload);

  if (normalized.previewUrl) {
    return {
      previewUrl: resolvePreviewUrl(normalized.previewUrl, responseUrl),
    };
  }

  if (normalized.html) {
    return {
      html: injectPreviewBase(normalized.html, responseUrl),
    };
  }

  throw new RequestError(PREVIEW_UNAVAILABLE_MESSAGE);
}

export async function listHomeArtworks(options?: {
  categoryId?: string | number | null;
  current?: number;
  pageSize?: number;
  searchText?: string;
  signal?: AbortSignal;
  tagIdList?: Array<string | number>;
}) {
  const searchText = options?.searchText?.trim();
  const query: ArtworkQueryRequest = {
    ...HOME_ARTWORK_QUERY,
    ...(options?.current ? { current: options.current } : {}),
    ...(options?.pageSize ? { pageSize: options.pageSize } : {}),
    ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
    ...(options?.tagIdList?.length ? { tagIdList: options.tagIdList } : {}),
    ...(searchText ? { searchText } : {}),
  };

  try {
    const result = await postJson<Page<ArtworkVO>>(
      "/artwork/list/page/vo",
      query,
      { signal: options?.signal },
    ) as unknown as ArtworkListPageResponse;

    const pageData = isArtworkPagePayload(result) ? result : result.data;

    if (!isArtworkPagePayload(result) && result.code !== 0) {
      throw new RequestError(result.message || "Unable to load references", {
        code: result.code,
      });
    }

    const items = (pageData?.records ?? []).map(normalizeArtworkToSiteItem);
    const pageState = getHasMoreByPage({
      current: pageData?.current,
      pages: pageData?.pages,
      total: pageData?.total,
      pageSize: query.pageSize,
      recordCount: items.length,
    });

    return {
      current: pageState.current,
      pages: pageState.pages,
      total: pageState.total,
      items,
      hasMore: pageState.hasMore,
    } satisfies HomeSitePageResult;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw error;
  }
}

export async function listHomePromptAssets(options: {
  categoryId?: string | number;
  current?: number;
  isFeatured?: "1";
  pageSize?: number;
  sceneTagIdList?: string[];
  searchText?: string;
  signal?: AbortSignal;
}) {
  const searchText = options.searchText?.trim();
  const current = options.current ?? HOME_PROMPT_ASSET_QUERY.current;
  const pageSize = options.pageSize ?? HOME_PROMPT_ASSET_QUERY.pageSize;
  const result = await postJson<PromptAssetResponse>(
    "/promptAsset/list/page/vo",
    {
      ...HOME_PROMPT_ASSET_QUERY,
      current,
      pageSize,
      ...(options.categoryId !== undefined ? { categoryId: options.categoryId } : {}),
      ...(options.isFeatured !== undefined ? { isFeatured: options.isFeatured } : {}),
      ...(searchText ? { searchText } : {}),
      ...(options.sceneTagIdList?.length ? { sceneTagIdList: options.sceneTagIdList } : {}),
    },
    { signal: options.signal },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "Unable to load prompt assets", {
      code: result.code,
    });
  }

  const records = extractPromptAssetRecords(result.data);
  const pageState = getHasMoreByPage({
    current: !Array.isArray(result.data) ? result.data?.current : current,
    pages: !Array.isArray(result.data) ? result.data?.pages : current,
    total: !Array.isArray(result.data) ? result.data?.total : records.length,
    pageSize,
    recordCount: records.length,
  });

  return {
    current: pageState.current,
    pages: pageState.pages,
    total: pageState.total,
    items: records.map(normalizePromptAssetToSiteItem),
    hasMore: pageState.hasMore,
  } satisfies HomeSitePageResult;
}

export async function getPromptAssetPromptContent(
  promptAssetId: number | string,
  options?: { signal?: AbortSignal },
) {
  const result = await getJson<PromptAssetVO | string>("/promptAsset/get/vo", {
    query: { id: promptAssetId },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "提示词加载失败", {
      code: result.code,
    });
  }

  const promptContent =
    typeof result.data === "string"
      ? result.data.trim()
      : getPromptAssetPrompt(result.data);

  if (!promptContent) {
    throw new RequestError("提示词内容为空");
  }

  return promptContent;
}

export async function getArtworkPromptContent(
  artworkId: number | string,
  options?: { signal?: AbortSignal },
) {
  const result = await getJson<string>("/artwork/get/vo", {
    query: { id: artworkId },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "提示词加载失败", {
      code: result.code,
    });
  }

  const promptContent = result.data;

  if (typeof promptContent !== "string" || !promptContent.trim()) {
    throw new RequestError("提示词内容为空");
  }

  return promptContent;
}

export async function getArtworkHomeOverview(options?: { signal?: AbortSignal }) {
  const result = await getJson<ArtworkHomeOverviewPayload>(
    "/artwork/home/overview",
    { signal: options?.signal },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "首页概览加载失败", {
      code: result.code,
    });
  }

  const data = result.data;
  const items = (data?.recentItems ?? []).map((item) => {
    const imageWidth = getNumericValue(item.imageWidth);
    const imageHeight = getNumericValue(item.imageHeight);
    const imageAspectRatio =
      getNumericValue(item.imageAspectRatio) ||
      (imageWidth && imageHeight ? imageWidth / imageHeight : undefined);
    const tagNames =
      item.tagList
        ?.map((tag) => getTrimmedText(tag.name))
        .filter((tag): tag is string => Boolean(tag)) ?? [];

    return {
      id: String(item.id),
      title: getTrimmedText(item.title) || "未命名作品",
      description: "最近更新的前端组件提示词",
      category:
        tagNames[0] || getTrimmedText(item.category?.name) || "前端组件",
      sourceType: "artwork" as const,
      memberOnly: item.memberOnly,
      canAccess: item.canAccess,
      permanentlyUnlocked: item.permanentlyUnlocked,
      pointsPrice: item.pointsPrice,
      favoriteCount: normalizeNonNegativeInteger(item.favoriteCount) ?? 0,
      favorited:
        typeof item.favorited === "boolean" ? item.favorited : undefined,
      hasSourceCode: item.hasSourceCode === true,
      tags: tagNames,
      image: normalizeArtworkOverviewCover(
        getFirstCoverImageUrl([item.coverUrl, item.imageUrl]),
      ),
      imageAspectRatio,
      imageHeight,
      imageWidth,
      videoUrl: normalizeArtworkOverviewVideo(item.videoUrl),
    };
  });

  return {
    totalCount: normalizeNonNegativeInteger(data?.totalCount),
    recentThreeDaysCount: normalizeNonNegativeInteger(data?.recentThreeDaysCount),
    items,
  } satisfies ArtworkHomeOverviewResult;
}

function getSafeSourceArchiveName(title?: string) {
  const normalizedTitle = title?.trim() || "artwork";
  const safeTitle = normalizedTitle
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return `${safeTitle || "artwork"}-source.zip`;
}

export async function downloadArtworkSource(
  artworkId: string,
  artworkTitle?: string,
) {
  const { blob } = await getBlob("/artwork/source/download", {
    query: { id: String(artworkId) },
  });
  const sourceBlob =
    blob.type === "application/zip"
      ? blob
      : new Blob([blob], { type: "application/zip" });
  const objectUrl = URL.createObjectURL(sourceBlob);
  const link = document.createElement("a");

  try {
    link.href = objectUrl;
    link.download = getSafeSourceArchiveName(artworkTitle);
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

export async function getPromptAssetHomeOverview(options?: { signal?: AbortSignal }) {
  const result = await getJson<PromptAssetHomeOverviewPayload>(
    "/promptAsset/home/overview",
    { signal: options?.signal },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "Unable to load prompt asset overview", {
      code: result.code,
    });
  }

  const data = result.data ?? {};
  const rawItems =
    data.todayPromptAssets ??
    data.todayItems ??
    data.todayList ??
    data.latestPromptAssets ??
    data.latestItems ??
    data.latestList ??
    data.items ??
    data.records ??
    data.list ??
    [];
  const records = extractPromptAssetRecords(rawItems);

  return {
    totalCount: normalizeNonNegativeInteger(
      data.totalCount ?? data.totalPromptAssetCount ?? data.promptAssetTotalCount ?? data.total,
    ),
    todayNewCount: normalizeNonNegativeInteger(
      data.todayNewCount ?? data.todayNewPromptAssetCount ?? data.todayCount,
    ),
    items: records.map(normalizePromptAssetToSiteItem),
  } satisfies PromptAssetHomeOverviewResult;
}

export async function getArtworkPreview(
  artworkId: number | string,
  options?: { signal?: AbortSignal },
) {
  const response = await getText(`/artwork/preview/${artworkId}`, {
    signal: options?.signal,
  });
  const contentType = response.contentType?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    return parsePreviewJsonPayload(response.text, response.responseUrl);
  }

  if (!response.text.trim()) {
    throw new RequestError(PREVIEW_UNAVAILABLE_MESSAGE);
  }

  return {
    html: injectPreviewBase(response.text, response.responseUrl),
  };
}

export async function getArtworkDetail(
  artworkId: number | string,
  options?: { signal?: AbortSignal },
) {
  const result = await getJson<ArtworkDetailVO | null>("/artwork/detail", {
    query: {
      id: artworkId,
    },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "Unable to load artwork detail", {
      code: result.code,
    });
  }

  if (!result.data) {
    throw new RequestError("Artwork detail is unavailable right now");
  }

  return result.data;
}
