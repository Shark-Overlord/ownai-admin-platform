import request from './request';

export interface PointOverviewVO {
  pointBalance: number;
  memberLevel?: string;
  memberExpireTime?: string;
  lastCheckInDate?: string;
}

export interface PointRecord {
  id: number;
  userId?: number;
  userAccount?: string;
  userName?: string;
  changeType: string;
  changeAmount: number;
  balanceAfter: number;
  relatedType?: string;
  relatedId?: number;
  description?: string;
  createTime?: string;
}

export interface PointCheckInConfig {
  id: number;
  rewardPoints: number;
  status: number;
  description?: string;
  createTime?: string;
  updateTime?: string;
}

export interface PointAdjustRequest {
  userId: number;
  operation: 'grant' | 'deduct';
  amount: number;
  description: string;
}

export async function getMyPointOverview() {
  return request.get('/point/me') as Promise<{ data: PointOverviewVO }>;
}

export async function dailyCheckIn() {
  return request.post('/point/check-in') as Promise<{ data: { rewardPoints: number } }>;
}

export async function getCheckInStatus() {
  return request.get('/point/check-in/status') as Promise<{
    data: {
      checkedInToday: boolean;
      rewardPoints: number;
      pointBalance: number;
      lastCheckInDate?: string;
      status: number;
    };
  }>;
}

export async function listMyPointRecords(params: any) {
  return request.post('/point/record/list/page', params) as Promise<any>;
}

export async function adminAdjustPoints(params: PointAdjustRequest) {
  return request.post('/point/admin/adjust', params) as Promise<{ data: number }>;
}

export async function listAdminPointRecords(params: any) {
  return request.post('/point/admin/record/list/page', params) as Promise<any>;
}

export async function getAdminCheckInConfig() {
  return request.get('/point/admin/check-in-config') as Promise<{ data: PointCheckInConfig }>;
}

export async function updateAdminCheckInConfig(params: Partial<PointCheckInConfig>) {
  return request.post('/point/admin/check-in-config/update', params) as Promise<{ data: PointCheckInConfig }>;
}
