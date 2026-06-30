import request from './request';

export interface YuqueBookVO {
  id: number;
  namespace: string;
  slug: string;
  name: string;
  description?: string;
  visibility: 'public' | 'login' | 'admin';
  status: 'online' | 'offline';
  lastSyncAt?: string;
}

export interface YuqueTocVO {
  id: number;
  docId?: number;
  parentId?: number;
  title: string;
  slug: string;
  depth: number;
  sort: number;
}

export interface YuqueBookSaveRequest {
  id?: number;
  namespace: string;
  slug: string;
  name: string;
  description?: string;
  visibility?: string;
  status?: string;
}

export async function listYuqueBooks() {
  return request.get('/docs/books') as Promise<{ data: YuqueBookVO[] }>;
}

export async function saveYuqueBook(params: YuqueBookSaveRequest) {
  return request.post('/docs/admin/books', params) as Promise<{ data: number }>;
}

export async function deleteYuqueBook(id: number) {
  return request.post('/docs/admin/books/delete', { id }) as Promise<{ data: boolean }>;
}

export async function syncYuqueBook(bookId: number) {
  return request.post('/docs/admin/sync', { bookId }) as Promise<{ data: boolean }>;
}

export async function syncAllYuqueBooks() {
  return request.post('/docs/admin/sync/all') as Promise<{ data: boolean }>;
}

export async function listYuqueToc(bookSlug: string) {
  return request.get(`/docs/books/${encodeURIComponent(bookSlug)}/toc`) as Promise<{ data: YuqueTocVO[] }>;
}
