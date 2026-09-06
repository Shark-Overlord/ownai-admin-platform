import { getBlobByUrl, getJson, postJson, RequestError } from "@/lib/request";
import type {
  CategoryVO,
  Page,
  TagVO,
  VideoBackgroundQueryRequest,
  VideoBackgroundResourceVO,
  VideoBackgroundVO,
} from "@/lib/types";

export interface VideoBackgroundCategory {
  children: VideoBackgroundCategory[];
  description?: string;
  id: string;
  name: string;
  tags: VideoBackgroundTag[];
}

export interface VideoBackgroundTag {
  description?: string;
  id: string;
  name: string;
  sort?: number;
}

export interface VideoBackgroundItem {
  canAccess?: boolean;
  category?: { id: string; name: string };
  categoryId?: string;
  coverUrl?: string;
  createTime?: string;
  durationMs?: number;
  favoriteCount: number;
  favorited?: boolean;
  fileSize?: number;
  id: string;
  memberOnly?: number;
  previewVideoUrl?: string;
  sort?: number;
  summary?: string;
  tagList: VideoBackgroundTag[];
  title: string;
  updateTime?: string;
  videoAspectRatio?: number;
  videoFormat?: string;
  videoHeight?: number;
  videoWidth?: number;
}

export interface VideoBackgroundPageResult {
  current: number;
  hasMore: boolean;
  items: VideoBackgroundItem[];
  pages: number;
  total: number;
}

export interface VideoBackgroundResource {
  downloadUrl: string;
  id: string;
  promptContent: string;
  title: string;
}

const DEFAULT_PAGE_SIZE = 20;

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getId(value: unknown) {
  const normalized = String(value ?? "").trim();

  return normalized;
}

function getNonNegativeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function getPositiveNumber(value: unknown) {
  const parsed = getNonNegativeNumber(value);

  return parsed && parsed > 0 ? parsed : undefined;
}

function getPageNumber(value: unknown, fallback: number) {
  const parsed = getPositiveNumber(value);

  return parsed ? Math.floor(parsed) : fallback;
}

function normalizeTag(tag: TagVO): VideoBackgroundTag | null {
  const id = getId(tag.id);
  const name = getText(tag.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    description: getText(tag.description) || undefined,
    sort: getNonNegativeNumber(tag.sort),
  };
}

function sortTags(left: VideoBackgroundTag, right: VideoBackgroundTag) {
  const leftSort = left.sort ?? Number.MAX_SAFE_INTEGER;
  const rightSort = right.sort ?? Number.MAX_SAFE_INTEGER;

  if (leftSort !== rightSort) {
    return leftSort - rightSort;
  }

  return left.name.localeCompare(right.name, "zh-CN");
}

function normalizeItem(item: VideoBackgroundVO): VideoBackgroundItem | null {
  const id = getId(item.id);

  if (!id) {
    return null;
  }

  const categoryId = getId(item.categoryId ?? item.category?.id);
  const categoryName = getText(item.category?.name);

  return {
    id,
    title: getText(item.title) || "未命名视频素材",
    summary: getText(item.summary) || undefined,
    coverUrl: getText(item.coverUrl) || undefined,
    previewVideoUrl: getText(item.previewVideoUrl) || undefined,
    categoryId: categoryId || undefined,
    category:
      categoryId && categoryName
        ? { id: categoryId, name: categoryName }
        : undefined,
    tagList: (item.tagList ?? [])
      .map(normalizeTag)
      .filter((tag): tag is VideoBackgroundTag => Boolean(tag))
      .sort(sortTags),
    memberOnly: Number(item.memberOnly) === 1 ? 1 : 0,
    canAccess: item.canAccess === true,
    videoWidth: getPositiveNumber(item.videoWidth),
    videoHeight: getPositiveNumber(item.videoHeight),
    videoAspectRatio: getPositiveNumber(item.videoAspectRatio),
    durationMs: getNonNegativeNumber(item.durationMs),
    fileSize: getNonNegativeNumber(item.fileSize),
    videoFormat: getText(item.videoFormat) || undefined,
    favoriteCount: Math.floor(getNonNegativeNumber(item.favoriteCount) ?? 0),
    favorited:
      typeof item.favorited === "boolean" ? item.favorited : undefined,
    sort: getNonNegativeNumber(item.sort),
    createTime: getText(item.createTime) || undefined,
    updateTime: getText(item.updateTime) || undefined,
  };
}

function normalizeCategory(category: CategoryVO): VideoBackgroundCategory | null {
  const id = getId(category.id);
  const name = getText(category.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    description: getText(category.description) || undefined,
    tags: (category.tags ?? [])
      .map(normalizeTag)
      .filter((tag): tag is VideoBackgroundTag => Boolean(tag))
      .sort(sortTags),
    children: (category.children ?? [])
      .map(normalizeCategory)
      .filter((child): child is VideoBackgroundCategory => Boolean(child)),
  };
}

function getHasMore(data: Page<VideoBackgroundVO>, current: number, pageSize: number) {
  const responseCurrent = getPageNumber(data.current, current);
  const pages = getPageNumber(data.pages, 0);
  const total = Math.floor(getNonNegativeNumber(data.total) ?? 0);
  const records = data.records ?? [];

  return {
    current: responseCurrent,
    pages,
    total,
    hasMore: pages > 0 ? responseCurrent < pages : responseCurrent * pageSize < total || records.length >= pageSize,
  };
}

async function listVideoBackgroundPage(
  path: "/videoBackground/list/page/vo" | "/videoBackground/favorite/my/list/page",
  options: Omit<VideoBackgroundQueryRequest, "current" | "pageSize"> & {
    current?: number;
    pageSize?: number;
    signal?: AbortSignal;
  },
): Promise<VideoBackgroundPageResult> {
  const current = options.current ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const query: VideoBackgroundQueryRequest = {
    current,
    pageSize,
    ...(options.searchText?.trim() ? { searchText: options.searchText.trim() } : {}),
    ...(options.categoryId ? { categoryId: String(options.categoryId) } : {}),
    ...(options.tagIdList?.length ? { tagIdList: options.tagIdList.map(String) } : {}),
    ...(options.memberOnly === 1 ? { memberOnly: 1 } : {}),
    ...(options.sortField ? { sortField: options.sortField } : {}),
    ...(options.sortOrder ? { sortOrder: options.sortOrder } : {}),
  };
  const result = await postJson<Page<VideoBackgroundVO>>(path, query, {
    signal: options.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "视频素材加载失败", {
      code: result.code,
    });
  }

  const data = result.data ?? {};
  const pageState = getHasMore(data, current, pageSize);

  return {
    ...pageState,
    items: (data.records ?? [])
      .map(normalizeItem)
      .filter((item): item is VideoBackgroundItem => Boolean(item)),
  };
}

export async function listVideoBackgroundCategories(options?: { signal?: AbortSignal }) {
  const result = await getJson<CategoryVO[]>("/category/tree", {
    includeAuthToken: false,
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "分类加载失败", { code: result.code });
  }

  return (result.data ?? [])
    .map(normalizeCategory)
    .filter((category): category is VideoBackgroundCategory => Boolean(category))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

export async function listVideoBackgroundTags(
  categoryId: string,
  options?: { signal?: AbortSignal },
) {
  const result = await getJson<TagVO[]>("/category/tags", {
    includeAuthToken: false,
    query: { categoryId },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "标签加载失败", { code: result.code });
  }

  return (result.data ?? [])
    .map(normalizeTag)
    .filter((tag): tag is VideoBackgroundTag => Boolean(tag))
    .sort(sortTags);
}

export function listVideoBackgrounds(options: Parameters<typeof listVideoBackgroundPage>[1]) {
  return listVideoBackgroundPage("/videoBackground/list/page/vo", options);
}

export function listMyVideoBackgroundFavorites(options: Parameters<typeof listVideoBackgroundPage>[1]) {
  return listVideoBackgroundPage("/videoBackground/favorite/my/list/page", options);
}

async function mutateFavorite(
  path: "/videoBackground/favorite/add" | "/videoBackground/favorite/cancel",
  videoBackgroundId: string,
) {
  const result = await postJson<boolean>(path, { videoBackgroundId: String(videoBackgroundId) });

  if (result.code !== 0) {
    throw new RequestError(result.message || "收藏操作失败", { code: result.code });
  }

  return result.data === true;
}

export function addVideoBackgroundFavorite(videoBackgroundId: string) {
  return mutateFavorite("/videoBackground/favorite/add", videoBackgroundId);
}

export function cancelVideoBackgroundFavorite(videoBackgroundId: string) {
  return mutateFavorite("/videoBackground/favorite/cancel", videoBackgroundId);
}

export async function checkVideoBackgroundFavorite(
  videoBackgroundId: string,
  options?: { signal?: AbortSignal },
) {
  const result = await getJson<boolean>("/videoBackground/favorite/check", {
    query: { videoBackgroundId: String(videoBackgroundId) },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "收藏状态查询失败", { code: result.code });
  }

  return result.data === true;
}

export async function getVideoBackgroundResource(videoBackgroundId: string) {
  const result = await getJson<VideoBackgroundResourceVO>("/videoBackground/resource/get", {
    query: { id: String(videoBackgroundId) },
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "素材资源加载失败", { code: result.code });
  }

  const data = result.data;
  const downloadUrl = getText(data?.downloadUrl);

  if (!downloadUrl) {
    throw new RequestError("素材下载地址不可用");
  }

  return {
    id: getId(data?.id) || String(videoBackgroundId),
    title: getText(data?.title) || "视频素材",
    promptContent: getText(data?.promptContent),
    downloadUrl,
  } satisfies VideoBackgroundResource;
}

function getSafeDownloadName(title: string, videoFormat?: string) {
  const safeTitle = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const extension = getText(videoFormat).replace(/^\./, "") || "mp4";

  return `${safeTitle || "video-background"}.${extension}`;
}

function getDownloadFileName(contentDisposition: string | null, fallback: string) {
  const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);

  return filenameMatch?.[1]?.trim() || fallback;
}

export async function downloadVideoBackgroundSource(
  downloadUrl: string,
  item: Pick<VideoBackgroundItem, "title" | "videoFormat">,
) {
  const { blob, contentDisposition } = await getBlobByUrl(downloadUrl);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  try {
    link.href = objectUrl;
    link.download = getDownloadFileName(
      contentDisposition,
      getSafeDownloadName(item.title, item.videoFormat),
    );
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
