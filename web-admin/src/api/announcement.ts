import request from './request';

export interface AnnouncementVO {
  id: number;
  title: string;
  content: string;
  type: string;
  status: string;
  priority: number;
  publishTime?: string;
  expireTime?: string;
  createUserId?: number;
  createTime?: string;
  updateTime?: string;
  readStatus?: boolean;
  readTime?: string;
}

export interface AnnouncementRequest {
  id?: number;
  title?: string;
  content?: string;
  type?: string;
  status?: string;
  priority?: number;
  publishTime?: string;
  expireTime?: string;
}

export async function listAnnouncementByPage(params: any) {
  return request.post('/announcement/admin/list/page', params) as Promise<any>;
}

export async function addAnnouncement(params: AnnouncementRequest) {
  return request.post('/announcement/admin/add', params) as Promise<{ data: number }>;
}

export async function updateAnnouncement(params: AnnouncementRequest) {
  return request.post('/announcement/admin/update', params) as Promise<{ data: boolean }>;
}

export async function deleteAnnouncement(id: number) {
  return request.post('/announcement/admin/delete', { id }) as Promise<{ data: boolean }>;
}

export async function publishAnnouncement(id: number) {
  return request.post('/announcement/admin/publish', { id }) as Promise<{ data: boolean }>;
}

export async function offlineAnnouncement(id: number) {
  return request.post('/announcement/admin/offline', { id }) as Promise<{ data: boolean }>;
}
