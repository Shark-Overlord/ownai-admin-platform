import request from './request';

export type BlogId = string | number;

export interface BlogCategoryVO {
  id: BlogId;
  name: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  sort: number;
  status: 'enabled' | 'disabled';
  postCount?: number;
  createTime?: string;
  updateTime?: string;
}

export interface BlogTagVO {
  id: BlogId;
  name: string;
  slug: string;
  description?: string;
  sort: number;
  status: 'enabled' | 'disabled';
  postCount?: number;
  createTime?: string;
  updateTime?: string;
}

export interface BlogPostVO {
  id: BlogId;
  authorId: BlogId;
  categoryId: BlogId;
  category?: BlogCategoryVO;
  bookId?: BlogId;
  bookTitle?: string;
  bookSlug?: string;
  chapterId?: BlogId;
  chapterTitle?: string;
  chapterSort?: number;
  previousPost?: BlogPostNavVO;
  nextPost?: BlogPostNavVO;
  tags: BlogTagVO[];
  title: string;
  slug: string;
  summary?: string;
  coverUrl?: string;
  contentJson?: string;
  contentHtml?: string;
  contentSchemaVersion: number;
  status: 'draft' | 'published' | 'offline';
  visibility: 'public' | 'login' | 'admin';
  memberOnly: 0 | 1;
  canAccess?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  version: number;
  createTime?: string;
  updateTime?: string;
}

export interface BlogPostNavVO {
  id: BlogId;
  title: string;
  slug: string;
}

export interface BlogChapterVO {
  id: BlogId;
  bookId: BlogId;
  title: string;
  description?: string;
  sort: number;
  postCount: number;
  publishedPostCount: number;
  posts?: BlogPostVO[];
  createTime?: string;
  updateTime?: string;
}

export interface BlogBookVO {
  id: BlogId;
  authorId: BlogId;
  categoryId: BlogId;
  category?: BlogCategoryVO;
  title: string;
  slug: string;
  summary?: string;
  coverUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  memberOnly: 0 | 1;
  status: 'enabled' | 'disabled';
  sort: number;
  chapterCount: number;
  postCount: number;
  publishedPostCount: number;
  chapters?: BlogChapterVO[];
  createTime?: string;
  updateTime?: string;
}

export interface BlogPostSaveRequest {
  id?: BlogId;
  version?: number;
  categoryId: BlogId;
  chapterId?: BlogId;
  tagIds: BlogId[];
  title: string;
  slug: string;
  summary?: string;
  coverUrl?: string;
  contentJson: string;
  contentHtml: string;
  contentSchemaVersion: number;
  visibility: string;
  memberOnly?: 0 | 1 | boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface BlogPostQuery {
  current?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: BlogId;
  bookId?: BlogId;
  chapterId?: BlogId;
  standaloneOnly?: boolean;
  tagId?: BlogId;
  status?: string;
  visibility?: string;
  memberOnly?: 0 | 1;
}

export interface BlogBookQuery {
  current?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: BlogId;
  status?: string;
}

export interface BlogBookSaveRequest {
  id?: BlogId;
  categoryId: BlogId;
  title: string;
  slug: string;
  summary?: string;
  coverUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  memberOnly?: 0 | 1;
  status: 'enabled' | 'disabled';
  sort?: number;
}

export interface PageData<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

export async function listBlogPosts(params: BlogPostQuery) {
  return request.post('/blog/admin/posts/list/page', params) as Promise<{ data: PageData<BlogPostVO> }>;
}

export async function getBlogPost(id: BlogId) {
  return request.get('/blog/admin/posts/get', { params: { id } }) as Promise<{ data: BlogPostVO }>;
}

export async function addBlogPost(params: BlogPostSaveRequest) {
  return request.post('/blog/admin/posts/add', params) as Promise<{ data: BlogId }>;
}

export async function updateBlogPost(params: BlogPostSaveRequest) {
  return request.post('/blog/admin/posts/update', params) as Promise<{ data: boolean }>;
}

export async function deleteBlogPost(id: BlogId) {
  return request.post('/blog/admin/posts/delete', { id }) as Promise<{ data: boolean }>;
}

export async function publishBlogPost(id: BlogId) {
  return request.post('/blog/admin/posts/publish', { id }) as Promise<{ data: boolean }>;
}

export async function batchPublishBlogPosts(ids: BlogId[]) {
  return request.post('/blog/admin/posts/batch/publish', { ids }) as Promise<{ data: number }>;
}

export async function batchDeleteBlogPosts(ids: BlogId[]) {
  return request.post('/blog/admin/posts/batch/delete', { ids }) as Promise<{ data: number }>;
}

export async function batchSetBlogPostMemberOnly(ids: BlogId[], memberOnly: 0 | 1) {
  return request.post('/blog/admin/posts/batch/member-only', { ids, memberOnly }) as Promise<{ data: number }>;
}

export async function offlineBlogPost(id: BlogId) {
  return request.post('/blog/admin/posts/offline', { id }) as Promise<{ data: boolean }>;
}

export async function listBlogBooks(params: BlogBookQuery) {
  return request.post('/blog/admin/books/list/page', params) as Promise<{ data: PageData<BlogBookVO> }>;
}

export async function getBlogBook(id: BlogId) {
  return request.get('/blog/admin/books/get', { params: { id } }) as Promise<{ data: BlogBookVO }>;
}

export async function saveBlogBook(params: BlogBookSaveRequest) {
  return request.post('/blog/admin/books/save', params) as Promise<{ data: BlogId }>;
}

export async function deleteBlogBook(id: BlogId) {
  return request.post('/blog/admin/books/delete', { id }) as Promise<{ data: boolean }>;
}

export async function saveBlogChapter(params: { id?: BlogId; bookId: BlogId; title: string; description?: string; sort?: number }) {
  return request.post('/blog/admin/chapters/save', params) as Promise<{ data: BlogId }>;
}

export async function listBlogChapters(bookId?: BlogId) {
  return request.get('/blog/admin/chapters', { params: { bookId } }) as Promise<{ data: BlogChapterVO[] }>;
}

export async function deleteBlogChapter(id: BlogId) {
  return request.post('/blog/admin/chapters/delete', { id }) as Promise<{ data: boolean }>;
}

export async function reorderBlogOutline(bookId: BlogId, chapters: Array<{ chapterId: BlogId; postIds: BlogId[] }>) {
  return request.post('/blog/admin/books/outline/reorder', { bookId, chapters }) as Promise<{ data: boolean }>;
}

export async function assignBlogPost(postId: BlogId, chapterId?: BlogId) {
  return request.post('/blog/admin/posts/assign', { postId, chapterId }) as Promise<{ data: boolean }>;
}

export async function listBlogCategories() {
  return request.get('/blog/admin/categories') as Promise<{ data: BlogCategoryVO[] }>;
}

export async function saveBlogCategory(params: Partial<BlogCategoryVO>) {
  return request.post('/blog/admin/categories/save', params) as Promise<{ data: BlogId }>;
}

export async function deleteBlogCategory(id: BlogId) {
  return request.post('/blog/admin/categories/delete', { id }) as Promise<{ data: boolean }>;
}

export async function listBlogTags() {
  return request.get('/blog/admin/tags') as Promise<{ data: BlogTagVO[] }>;
}

export async function saveBlogTag(params: Partial<BlogTagVO>) {
  return request.post('/blog/admin/tags/save', params) as Promise<{ data: BlogId }>;
}

export async function deleteBlogTag(id: BlogId) {
  return request.post('/blog/admin/tags/delete', { id }) as Promise<{ data: boolean }>;
}

export async function uploadBlogMedia(file: File, type: 'image' | 'video') {
  const formData = new FormData();
  formData.append('file', file);
  return request.post(`/file/upload?biz=${type === 'image' ? 'blog_image' : 'blog_video'}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 10 * 60 * 1000,
  }) as Promise<{ data: string }>;
}
