import { getJson, postJson, RequestError } from "@/lib/request";

export type TutorialAccessType = "free" | "member";
export type TutorialBookSort = "default" | "latest" | "popular";
export type TutorialPostSort = "latest" | "popular";

export interface TutorialPageResult<T> {
  records: T[];
  total: string;
  current: string;
  size: string;
  pages: string;
}

export interface TutorialTaxonomy {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
}

export interface TutorialFilterItem {
  id: string;
  name: string;
  slug: string;
  count: string;
}

export interface TutorialFilters {
  categories: TutorialFilterItem[];
  tags: TutorialFilterItem[];
}

export interface TutorialOverview {
  bookCount: string;
  publishedPostCount: string;
  freeBookCount: string;
  memberBookCount: string;
}

export interface TutorialFavoriteState {
  favorited: boolean;
  favoriteCount: number;
}

export interface TutorialBookListItem extends TutorialFavoriteState {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverUrl?: string | null;
  category: TutorialTaxonomy;
  tags: TutorialTaxonomy[];
  memberOnly: 0 | 1;
  accessType: TutorialAccessType;
  canAccessAll: boolean;
  chapterCount: number;
  publishedPostCount: number;
  freePostCount: number;
  memberPostCount: number;
  updateTime: string;
}

export interface TutorialPostOutline extends TutorialFavoriteState {
  id: string;
  categoryId: string;
  bookId?: string | null;
  bookTitle?: string | null;
  bookSlug?: string | null;
  chapterId?: string | null;
  chapterTitle?: string | null;
  chapterSort?: number | null;
  title: string;
  slug: string;
  summary?: string | null;
  coverUrl?: string | null;
  tags: TutorialTaxonomy[];
  memberOnly: 0 | 1;
  canAccess: boolean;
  publishedAt: string;
  readCount: string;
  uniqueReaderCount: string;
}

export interface TutorialChapter {
  id: string;
  title: string;
  description?: string | null;
  sort: number;
  postCount: number;
  posts: TutorialPostOutline[];
}

export interface TutorialBookDetail extends TutorialBookListItem {
  introductionHtml?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  chapters: TutorialChapter[];
}

export interface TutorialPostNav {
  id: string;
  title: string;
  slug: string;
  memberOnly: 0 | 1;
  canAccess: boolean;
}

export interface TutorialPostDetail extends TutorialFavoriteState {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverUrl?: string | null;
  contentHtml: string;
  contentSchemaVersion: number;
  category: TutorialTaxonomy;
  tags: TutorialTaxonomy[];
  bookId?: string | null;
  bookTitle?: string | null;
  bookSlug?: string | null;
  chapterId?: string | null;
  chapterTitle?: string | null;
  memberOnly: 0 | 1;
  canAccess: true;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt: string;
  readCount: string;
  uniqueReaderCount: string;
  previousPost?: TutorialPostNav | null;
  nextPost?: TutorialPostNav | null;
}

export interface TutorialPostReadRequest {
  postId: string;
  visitorId: string;
  durationSeconds: number;
}

export interface TutorialPostReadResult {
  counted: boolean;
  readCount: string;
  uniqueReaderCount: string;
}

export interface TutorialBookPageParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: string;
  tagId?: string;
  accessType?: TutorialAccessType;
  sort?: TutorialBookSort;
}

export interface TutorialPostPageParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: string;
  tagId?: string;
  memberOnly?: 0 | 1;
  standaloneOnly?: boolean;
  sort?: TutorialPostSort;
}

function unwrapTutorialResponse<T>(
  result: { code: number; data: T | null; message?: string },
  fallbackMessage: string,
) {
  if (result.code !== 0 || result.data === null) {
    throw new RequestError(result.message || fallbackMessage, {
      code: result.code,
    });
  }

  return result.data;
}

export async function getTutorialOverview(signal?: AbortSignal) {
  const result = await getJson<TutorialOverview>("/blog/front/overview", {
    signal,
  });

  return unwrapTutorialResponse(result, "教程概览加载失败");
}

export async function getTutorialFilters(signal?: AbortSignal) {
  const result = await getJson<TutorialFilters>("/blog/front/filters", {
    signal,
  });

  return unwrapTutorialResponse(result, "教程筛选项加载失败");
}

export async function pageTutorialBooks(
  params: TutorialBookPageParams,
  signal?: AbortSignal,
) {
  const result = await postJson<TutorialPageResult<TutorialBookListItem>>(
    "/blog/front/books/page",
    params,
    { signal },
  );

  return unwrapTutorialResponse(result, "教程书加载失败");
}

export async function getTutorialBook(bookId: string, signal?: AbortSignal) {
  const result = await getJson<TutorialBookDetail>(
    `/blog/front/books/${encodeURIComponent(bookId)}`,
    { signal },
  );

  return unwrapTutorialResponse(result, "教程目录加载失败");
}

export async function pageTutorialPosts(
  params: TutorialPostPageParams,
  signal?: AbortSignal,
) {
  const result = await postJson<TutorialPageResult<TutorialPostOutline>>(
    "/blog/front/posts/page",
    params,
    { signal },
  );

  return unwrapTutorialResponse(result, "文章加载失败");
}

export async function getTutorialPost(postId: string, signal?: AbortSignal) {
  const result = await getJson<TutorialPostDetail>(
    `/blog/front/posts/${encodeURIComponent(postId)}`,
    { signal },
  );

  return unwrapTutorialResponse(result, "文章加载失败");
}

export async function trackTutorialPostRead(
  request: TutorialPostReadRequest,
) {
  const result = await postJson<TutorialPostReadResult>(
    "/blog/front/posts/read",
    request,
  );

  return unwrapTutorialResponse(result, "文章阅读统计失败");
}

export async function favoriteTutorialBook(bookId: string) {
  const result = await postJson<boolean>("/blog/front/books/favorite/add", {
    bookId,
  });

  return unwrapTutorialResponse(result, "收藏教程失败");
}

export async function cancelFavoriteTutorialBook(bookId: string) {
  const result = await postJson<boolean>("/blog/front/books/favorite/cancel", {
    bookId,
  });

  return unwrapTutorialResponse(result, "取消收藏失败");
}

export async function pageFavoriteTutorialBooks(
  params: TutorialBookPageParams,
  signal?: AbortSignal,
) {
  const result = await postJson<TutorialPageResult<TutorialBookListItem>>(
    "/blog/front/books/favorite/my/page",
    params,
    { signal },
  );

  return unwrapTutorialResponse(result, "收藏教程加载失败");
}

export async function favoriteTutorialPost(postId: string) {
  const result = await postJson<boolean>("/blog/front/posts/favorite/add", {
    postId,
  });

  return unwrapTutorialResponse(result, "收藏文章失败");
}

export async function cancelFavoriteTutorialPost(postId: string) {
  const result = await postJson<boolean>("/blog/front/posts/favorite/cancel", {
    postId,
  });

  return unwrapTutorialResponse(result, "取消收藏失败");
}

export async function pageFavoriteTutorialPosts(
  params: TutorialPostPageParams,
  signal?: AbortSignal,
) {
  const result = await postJson<TutorialPageResult<TutorialPostOutline>>(
    "/blog/front/posts/favorite/my/page",
    params,
    { signal },
  );

  return unwrapTutorialResponse(result, "收藏文章加载失败");
}
