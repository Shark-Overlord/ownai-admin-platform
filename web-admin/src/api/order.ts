import request from './request';

export interface OrderVO {
  id: number;
  orderNo: string;
  artworkTitle?: string;
  artworkCoverUrl?: string;
  orderType: 'cash' | 'points';
  orderStatus: 'pending' | 'completed' | 'cancelled';
  orderAmount?: number;
  pointsAmount?: number;
  paymentChannel?: string;
  payTime?: string;
  finishTime?: string;
  createTime?: string;
}

export async function listAllOrders(params: any) {
  return request.post('/order/list/page', params) as Promise<any>;
}

export async function adminCancelOrder(params: { orderNo: string }) {
  return request.post('/order/admin/cancel', params) as Promise<{ data: boolean }>;
}
