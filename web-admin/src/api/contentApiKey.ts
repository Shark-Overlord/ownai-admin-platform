import request from './request';

export interface ContentApiKeyVO {
  id: number;
  keyName: string;
  keyPrefix: string;
  scopes: string;
  scopeList: string[];
  status: number;
  expireTime?: string;
  lastUsedTime?: string;
  lastUsedIp?: string;
  remark?: string;
  createUserId?: number;
  createTime?: string;
  updateTime?: string;
}

export interface ContentApiKeyCreateVO extends ContentApiKeyVO {
  plainKey: string;
}

export interface ContentApiKeyRequest {
  id?: number;
  keyName?: string;
  scopes?: string[];
  status?: number;
  expireTime?: string;
  remark?: string;
}

export async function listContentApiKeyByPage(params: any) {
  return request.post('/content-api-key/admin/list/page', params) as Promise<any>;
}

export async function addContentApiKey(params: ContentApiKeyRequest) {
  return request.post('/content-api-key/admin/add', params) as Promise<{ data: ContentApiKeyCreateVO }>;
}

export async function updateContentApiKey(params: ContentApiKeyRequest) {
  return request.post('/content-api-key/admin/update', params) as Promise<{ data: boolean }>;
}

export async function deleteContentApiKey(id: number) {
  return request.post('/content-api-key/admin/delete', { id }) as Promise<{ data: boolean }>;
}
