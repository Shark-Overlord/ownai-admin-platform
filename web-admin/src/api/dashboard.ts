import request from './request';

export interface DashboardOverview {
  user: {
    total: number;
    todayNew: number;
    plus: number;
    pro: number;
  };
  content: {
    artworkTotal: number;
    promptAssetTotal: number;
    promptAssetPublished: number;
    promptAssetUnpublished: number;
    promptFavoriteTotal: number;
  };
  commerce: {
    todayArtworkOrders: number;
    todayMemberOrders: number;
    todayOrderAmount: number;
    pendingOrders: number;
  };
  point: {
    todayGranted: number;
    todayDeducted: number;
    totalBalance: number;
  };
  imageGeneration: {
    todayTasks: number;
    pendingTasks: number;
    runningTasks: number;
    successTasks: number;
    failedTasks: number;
    timeoutPendingTasks: number;
    todayPointCost: number;
    todayApiCostCny: number;
    todayManualCostCny: number;
  };
  latestImportBatch?: {
    id?: number;
    status?: string;
    totalCount?: number;
    insertCount?: number;
    updateCount?: number;
    errorCount?: number;
    startedAt?: string;
    finishedAt?: string;
  };
}

export async function getDashboardOverview() {
  return request.get('/dashboard/admin/overview') as Promise<{ data: DashboardOverview }>;
}
