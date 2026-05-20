import request from './request';

export interface OperationLogItem {
  id: number;
  userId?: number;
  module?: string;
  action?: string;
  requestMethod?: string;
  requestUri?: string;
  requestParams?: string;
  status: number;
  errorMessage?: string;
  costTime?: number;
  createTime?: string;
}

export async function listOperationLogs(params: any) {
  return request.post('/operation-log/list/page', params) as Promise<any>;
}
