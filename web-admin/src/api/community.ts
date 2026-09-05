import request from './request';

export interface CommunityTerm { id: string; name: string; description: string; sort: number; enabled: boolean | number; postCount?: number | string }
export interface PostDraft { id?: string; title: string; summary: string; coverUrl: string; categoryId?: string; tagIds: string[]; markdown: string; commentsEnabled: boolean | number }
export interface CommunityPost { id: string; version: number; status: string; firstPublishedAt?: string; hasUnpublishedChanges: boolean | number | string; draft: PostDraft; published?: PostDraft }
export interface PostRow { id: string; title: string; summary: string; categoryName?: string; tags: CommunityTerm[]; status: string; version: number; hasUnpublishedChanges: boolean | number | string; firstPublishedAt?: string; likeCount: string | number; commentCount: string | number; popularity: string | number }
export interface CommentRow { id: string; postId: string; rootId?: string; replyToId?: string; content: string; official: boolean | number; authorName: string; replyToName?: string; userId: string; postTitle: string; hidden: boolean | number; rootHidden?: boolean | number; postStatus: string; postDeleted: boolean | number; createTime: string }
export interface ReportRow { id: string; commentId: string; userId: string; postId: string; postTitle: string; content: string; hidden: boolean | number; reason: string; status: string; resolution?: string; createTime: string }
export interface CommunityPage<T> { records: T[]; total: number | string; current: number; size: number }
export async function community<T>(path: string, body?: unknown): Promise<T> {
  const response = body === undefined ? await request.get(`/community/${path}`) : await request.post(`/community/${path}`, body);
  return response.data as T;
}
export const getCommunityTerms = (kind: 'category' | 'tag') => community<CommunityTerm[]>(`admin/taxonomy/${kind}`);
