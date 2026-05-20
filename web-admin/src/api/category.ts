import request from './request';

export interface CategoryVO {
  id: string;
  parentId?: string;
  name: string;
  description?: string;
  sort?: number;
  createTime?: string;
  children?: CategoryVO[];
  tags?: TagItem[];
}

export interface TagItem {
  id: string;
  name: string;
  description?: string;
}

export async function listCategory() {
  return request.get('/category/list') as Promise<{ data: CategoryVO[] }>;
}

export async function listCategoryByPage(params: any) {
  return request.post('/category/list/page', params) as Promise<any>;
}

export async function getCategoryVOById(id: string) {
  return request.get('/category/get/vo', { params: { id } }) as Promise<{ data: CategoryVO }>;
}

export async function addCategory(params: any) {
  return request.post('/category/add', params) as Promise<{ data: number }>;
}

export async function updateCategory(params: any) {
  return request.post('/category/update', params) as Promise<{ data: boolean }>;
}

export async function deleteCategory(params: { id: string }) {
  return request.post('/category/delete', params) as Promise<{ data: boolean }>;
}

export async function getCategoryTree() {
  return request.get('/category/tree') as Promise<{ data: CategoryVO[] }>;
}

export async function listTagsByCategory(categoryId: string) {
  return request.get('/category/tags', { params: { categoryId } }) as Promise<{ data: TagItem[] }>;
}

export async function bindTagToCategory(params: { categoryId: string; tagId: string; sort?: number }) {
  return request.post('/category/tag/bind', params) as Promise<{ data: boolean }>;
}

export async function addTagToCategory(params: { categoryId: string; tagName: string; sort?: number }) {
  return request.post('/category/tag/add', params) as Promise<{ data: boolean }>;
}

export async function unbindTagFromCategory(params: { categoryId: string; tagId: string }) {
  return request.post('/category/tag/unbind', params) as Promise<{ data: boolean }>;
}
