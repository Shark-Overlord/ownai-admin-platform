import request from './request';

export interface MemberOrderVO {
  id: number;
  orderNo: string;
  memberLevel: 'plus' | 'pro';
  planType?: string;
  durationDays?: number;
  orderType: 'cash' | 'points' | 'admin_grant';
  orderStatus: 'pending' | 'completed' | 'cancelled';
  orderAmount?: number;
  pointsAmount?: number;
  paymentChannel?: string;
  payTime?: string;
  finishTime?: string;
  createTime?: string;
}

export async function listAllMemberOrders(params: any) {
  return request.post('/member/order/list/page', params) as Promise<any>;
}

export async function adminCancelMemberOrder(params: { orderNo: string }) {
  return request.post('/member/admin/cancel', params) as Promise<{ data: boolean }>;
}

export async function adminGrantMember(params: {
  userId: number;
  memberLevel: 'plus' | 'pro';
  planType: 'month' | 'year';
  durationDays: number;
  description?: string;
}) {
  return request.post('/member/grant', params) as Promise<{ data: any }>;
}
