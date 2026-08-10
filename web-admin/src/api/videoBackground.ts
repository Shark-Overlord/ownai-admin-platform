import request from './request';

export interface VideoBackgroundVO {
  id: number;
  title: string;
  summary?: string;
  promptContent?: string;
  coverUrl?: string;
  previewVideoUrl?: string;
  sourceVideoUrl?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  tagList?: { id: string; name: string }[];
  memberOnly?: number;
  status?: number;
  videoWidth?: number;
  videoHeight?: number;
  durationMs?: number;
  fileSize?: number;
  videoFormat?: string;
  sort?: number;
  createTime?: string;
  updateTime?: string;
}

export interface VideoBackgroundPayload {
  title: string;
  summary?: string;
  promptContent?: string;
  coverUrl?: string;
  previewVideoUrl?: string;
  sourceVideoUrl?: string;
  categoryId?: string;
  tagIdList?: string[];
  memberOnly?: number;
  status?: number;
  videoWidth?: number;
  videoHeight?: number;
  durationMs?: number;
  fileSize?: number;
  videoFormat?: string;
  sort?: number;
}

export const listVideoBackgroundByPageForAdmin = (params: any) =>
  request.post('/videoBackground/admin/list/page/vo', params) as Promise<any>;
export const addVideoBackground = (params: VideoBackgroundPayload) =>
  request.post('/videoBackground/add', params) as Promise<{ data: number }>;
export const updateVideoBackground = (params: VideoBackgroundPayload & { id: number }) =>
  request.post('/videoBackground/update', params) as Promise<{ data: boolean }>;
export const deleteVideoBackground = (params: { id: number }) =>
  request.post('/videoBackground/delete', params) as Promise<{ data: boolean }>;
export const deleteVideoBackgroundBatch = (params: { ids: number[] }) =>
  request.post('/videoBackground/delete/batch', params) as Promise<{ data: boolean }>;
export const publishVideoBackgroundBatch = (params: { ids: number[] }) =>
  request.post('/videoBackground/publish/batch', params) as Promise<{ data: boolean }>;
export const offlineVideoBackgroundBatch = (params: { ids: number[] }) =>
  request.post('/videoBackground/offline/batch', params) as Promise<{ data: boolean }>;
export const updateVideoBackgroundMemberOnlyBatch = (params: { ids: number[]; memberOnly: 0 | 1 }) =>
  request.post('/videoBackground/member-only/batch', params) as Promise<{ data: boolean }>;
