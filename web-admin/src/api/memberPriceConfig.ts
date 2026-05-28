import request from './request';

export interface MemberPriceConfig {
  id: number;
  memberLevel: string;
  planType: string;
  cashPrice: number;
  pointsPrice: number;
  durationDays: number;
  description?: string;
  status: number;
  createTime?: string;
  updateTime?: string;
}

export interface MemberPriceConfigUpdateRequest {
  id?: number;
  memberLevel?: string;
  planType?: string;
  cashPrice?: number;
  pointsPrice?: number;
  durationDays?: number;
  description?: string;
  status?: number;
}

export async function listMemberPriceConfigs() {
  return request.get('/member-price-config/list') as Promise<{ data: MemberPriceConfig[] }>;
}

export async function updateMemberPriceConfig(params: MemberPriceConfigUpdateRequest) {
  return request.post('/member-price-config/update', params) as Promise<{ data: boolean }>;
}

export async function addMemberPriceConfig(params: MemberPriceConfigUpdateRequest) {
  return request.post('/member-price-config/add', params) as Promise<{ data: number }>;
}
