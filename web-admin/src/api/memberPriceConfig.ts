import request from './request';

export type MemberPlanType = 'month' | 'year' | 'lifetime';

export interface MemberPriceConfig {
  id: number;
  memberLevel: 'member';
  planType: MemberPlanType;
  cashPrice: number;
  currency: string;
  pointsPrice: 0;
  durationDays: number;
  description?: string;
  features?: string;
  status: number;
  createTime?: string;
  updateTime?: string;
}

export interface MemberPriceConfigUpdateRequest {
  id?: number;
  memberLevel?: 'member';
  planType?: MemberPlanType;
  cashPrice?: number;
  currency?: string;
  description?: string;
  features?: string;
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
