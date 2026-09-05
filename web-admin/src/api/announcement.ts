import request from './request';

export interface AnnouncementVO {
  targetType?: string;
  targetId?: string;
  publicVisible?: boolean;
  popupEnabled?: boolean;
  summary?: string;
  actionLabel?: string;
  actionPath?: string;

  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  priority: number;
  publishTime?: string | null;
  expireTime?: string | null;
  createUserId?: number;
  createTime?: string;
  updateTime?: string;
  readStatus?: boolean;
  readTime?: string;
}

export interface AnnouncementRequest {
  publicVisible?: boolean;
  popupEnabled?: boolean;
  summary?: string;
  actionLabel?: string;
  actionPath?: string;

  id?: string;
  title?: string;
  content?: string;
  type?: string;
  status?: string;
  priority?: number;
  publishTime?: string | null;
  expireTime?: string | null;
}

export async function listAnnouncementByPage(params: any) {
  return request.post('/announcement/admin/list/page', params) as Promise<any>;
}

export async function addAnnouncement(params: AnnouncementRequest) {
  return request.post('/announcement/admin/add', params) as Promise<{ data: string }>;
}

export async function updateAnnouncement(params: AnnouncementRequest) {
  return request.post('/announcement/admin/update', params) as Promise<{ data: boolean }>;
}

export async function deleteAnnouncement(id: string) {
  return request.post('/announcement/admin/delete', { id }) as Promise<{ data: boolean }>;
}

export async function publishAnnouncement(id: string) {
  return request.post('/announcement/admin/publish', { id }) as Promise<{ data: boolean }>;
}

export async function offlineAnnouncement(id: string) {
  return request.post('/announcement/admin/offline', { id }) as Promise<{ data: boolean }>;
}
