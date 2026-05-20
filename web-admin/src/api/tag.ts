import request from './request';

export interface TagVO {
  id: string;
  name: string;
  description?: string;
  sort?: number;
  createTime?: string;
}

export async function listTag() {
  return request.get('/tag/list') as Promise<{ data: TagVO[] }>;
}

export async function listTagByPage(params: any) {
  return request.post('/tag/list/page', params) as Promise<any>;
}

export async function getTagVOById(id: string) {
  return request.get('/tag/get/vo', { params: { id } }) as Promise<{ data: TagVO }>;
}

export async function addTag(params: any) {
  return request.post('/tag/add', params) as Promise<{ data: number }>;
}

export async function updateTag(params: any) {
  return request.post('/tag/update', params) as Promise<{ data: boolean }>;
}

export async function deleteTag(params: { id: string }) {
  return request.post('/tag/delete', params) as Promise<{ data: boolean }>;
}
