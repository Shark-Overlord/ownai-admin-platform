import request from './request';

export interface PointOverviewVO {
  pointBalance: number;
  memberLevel?: string;
  memberExpireTime?: string;
  lastCheckInDate?: string;
}

export interface PointRecord {
  id: number;
  changeType: string;
  changeAmount: number;
  balanceAfter: number;
  relatedType?: string;
  description?: string;
  createTime?: string;
}

export async function getMyPointOverview() {
  return request.get('/point/me') as Promise<{ data: PointOverviewVO }>;
}

export async function dailyCheckIn() {
  return request.post('/point/check-in') as Promise<{ data: { rewardPoints: number } }>;
}

export async function listMyPointRecords(params: any) {
  return request.post('/point/record/list/page', params) as Promise<any>;
}
