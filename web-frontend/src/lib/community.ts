import { getJson, postJson, RequestError } from "@/lib/request";

export interface CommunityTerm { id: string; name: string; postCount?: number | string }
export interface CommunityPost {
  id: string; title: string; summary: string; excerpt?: string;
  previewMediaType?: "image" | "video"; previewMediaUrl?: string;
  categoryId?: string; categoryName?: string; tags: CommunityTerm[];
  firstPublishedAt?: string; likeCount: number | string; commentCount: number | string;
  authorName?: string; authorAvatar?: string; official?: boolean | number | string;
  markdown?: string; commentsEnabled?: boolean | number; liked?: boolean;
  pinned?: boolean | number | string; version?: number | string;
}
export interface CommunityComment {
  id: string; postId: string; rootId?: string; replyToId?: string;
  content: string; authorName: string; authorAvatar?: string; replyToName?: string;
  official: boolean | number | string; createTime: string; replyCount: number | string;
}
export interface CommunityInteractionComment {
  id: string; postId: string; rootId?: string; replyToId?: string;
  content: string; postTitle: string; replyToName?: string;
  createTime: string; replyCount: number | string;
}
export interface CommunityInteractionLike {
  postId: string; postTitle: string; summary?: string; excerpt?: string;
  previewMediaType?: "image" | "video"; previewMediaUrl?: string;
  categoryName?: string; createTime: string;
  likeCount: number | string; commentCount: number | string;
}
export interface CommunityPage<T> { records: T[]; total: number | string; current: number; size: number }

export async function communityGet<T>(path: string, query?: Record<string, string>, signal?: AbortSignal) {
  const result = await getJson<T>(`/community/${path}`, { query, signal });
  if (result.code !== 0) throw new RequestError(result.message || "内容加载失败", { code: result.code });
  return result.data;
}
export async function communityPost<T>(path: string, payload: unknown, signal?: AbortSignal) {
  const result = await postJson<T>(`/community/${path}`, payload, { signal });
  if (result.code !== 0) throw new RequestError(result.message || "操作失败，请重试", { code: result.code });
  return result.data;
}
export function communityError(error: unknown) {
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) return "网络连接失败，请检查网络后重试";
  return error instanceof Error ? error.message : "暂时无法加载，请稍后重试";
}
export function safeCommunityMedia(value?: string) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
export function communityTime(value?: string) {
  if (!value) return "";
  const time = new Date(value.replace(" ", "T"));
  if (Number.isNaN(time.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - time.getTime()) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} 天前`;
  return time.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}
export function communityFlag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === "1";
}
