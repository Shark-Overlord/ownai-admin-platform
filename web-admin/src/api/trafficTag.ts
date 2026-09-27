import request from './request';

export interface TrafficTagVO {
  id: string;
  title: string;
  platform: string;
  category: string;
  status: string;
  dateLabel: string;
  heat: number;
  tags: string[];
  requirements: string[];
  description: string;
  sourceUrl: string;
  sortOrder: number;
  enabled: boolean;
  sourceUpdatedTime?: string;
  createTime?: string;
  updateTime?: string;
}

export interface TrafficTagRequest extends Partial<Omit<TrafficTagVO, 'createTime' | 'updateTime'>> {}

export function listTrafficTags(params: Record<string, unknown>) {
  return request.post('/traffic-tags/admin/list/page', params) as Promise<any>;
}

export function addTrafficTag(params: TrafficTagRequest) {
  return request.post('/traffic-tags/admin/add', params) as Promise<{ data: string }>;
}

export function updateTrafficTag(params: TrafficTagRequest) {
  return request.post('/traffic-tags/admin/update', params) as Promise<{ data: boolean }>;
}

export function deleteTrafficTag(id: string) {
  return request.post('/traffic-tags/admin/delete', { id }) as Promise<{ data: boolean }>;
}
