import request from './request';
import type { MemberPlanType } from './memberPriceConfig';

export interface MemberOrderVO {
  id: number;
  orderNo: string;
  userId: number;
  userName?: string;
  memberLevel: 'member';
  planType: MemberPlanType;
  durationDays?: number;
  orderType: 'cash' | 'admin_grant';
  orderStatus: 'pending' | 'completed' | 'cancelled' | 'expired' | 'failed';
  orderAmount?: number;
  amountMinor?: number;
  currency?: string;
  paymentChannel?: string;
  failureReason?: string;
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
  planType: MemberPlanType;
  description?: string;
}) {
  return request.post('/member/grant', params) as Promise<{ data: any }>;
}
