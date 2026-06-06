import request from './request';

export interface ImageGenerationMessageItem {
  id: number;
  userId?: number;
  conversationId?: string;
  role?: string;
  prompt?: string;
  aspectRatio?: string;
  providerCode?: string;
  providerName?: string;
  modelCode?: string;
  vendorModel?: string;
  imageSize?: string;
  vendorSize?: string;
  generationMode?: string;
  imageCount?: number;
  pointCost?: number;
  apiCostCny?: number;
  manualCostCny?: number;
  pointStatus?: string;
  startedTime?: string;
  finishedTime?: string;
  timeoutPending?: boolean;
  pendingAgeSeconds?: number;
  referenceImageUrl?: string;
  sourcePromptAssetId?: number;
  taskId?: string;
  status?: string;
  resultImageUrls?: string;
  resultImageUrlList?: string[];
  thumbnailUrls?: string[];
  requestPayload?: string;
  responsePayload?: string;
  errorMessage?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ImageGenerationDailyTrend {
  date: string;
  totalTasks: number;
  successTasks: number;
  totalImages: number;
  totalPointCost: number;
  totalApiCostCny: number;
  totalManualCostCny: number;
}

export interface ImageGenerationMonitorOverview {
  totalTasks: number;
  successTasks: number;
  failedTasks: number;
  pendingTasks: number;
  runningTasks: number;
  timeoutPendingTasks: number;
  pendingTimeoutMinutes: number;
  totalImages: number;
  totalPointCost: number;
  totalApiCostCny: number;
  totalManualCostCny: number;
  successRate: number;
  avgDurationSeconds: number;
  statusDistribution: Record<string, number>;
  dailyTrend: ImageGenerationDailyTrend[];
}

export interface ImageGenerationConversationSummary {
  conversationId: string;
  userId: number;
  messageCount: number;
  taskCount: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  runningCount: number;
  timeoutPendingCount: number;
  totalPointCost: number;
  totalApiCostCny: number;
  totalManualCostCny: number;
  firstCreateTime?: string;
  lastUpdateTime?: string;
  thumbnailUrls?: string[];
}

export interface ImageGenerationConversationDetail {
  conversationId: string;
  userId: number;
  messages: ImageGenerationMessageItem[];
}

export interface ImageGenerationProviderConfig {
  id: number;
  providerCode: string;
  providerName: string;
  baseUrl: string;
  generationPath: string;
  editPath?: string;
  authType: string;
  apiKeyLast4?: string;
  hasApiKey?: boolean;
  apiKeyMasked?: string;
  status: number;
  isDefault: number;
  timeoutSeconds: number;
  requestSchema?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ImageGenerationProviderConfigRequest {
  id?: number;
  providerCode?: string;
  providerName?: string;
  baseUrl?: string;
  generationPath?: string;
  editPath?: string;
  authType?: string;
  apiKey?: string;
  status?: number;
  isDefault?: number;
  timeoutSeconds?: number;
  requestSchema?: string;
}

export interface ImageGenerationModelConfig {
  id: number;
  providerCode: string;
  modelCode: string;
  sizeCode: string;
  aspectRatio: string;
  vendorSize: string;
  pointCost: number;
  manualPointCost: number;
  apiInputCostCny: number;
  apiOutputCostCny: number;
  apiCostCny: number;
  manualCostCny: number;
  supportsReferenceImage: number;
  status: number;
  sortOrder: number;
  description?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ImageGenerationModelConfigRequest {
  id?: number;
  providerCode?: string;
  modelCode?: string;
  sizeCode?: string;
  aspectRatio?: string;
  vendorSize?: string;
  pointCost?: number;
  manualPointCost?: number;
  apiInputCostCny?: number;
  apiOutputCostCny?: number;
  apiCostCny?: number;
  manualCostCny?: number;
  supportsReferenceImage?: number;
  status?: number;
  sortOrder?: number;
  description?: string;
}

export interface ImageGenerationProviderTestResult {
  passed: boolean;
  httpStatus?: number;
  durationMs?: number;
  message?: string;
  url?: string;
}

export interface ImageGenerationModelConfigBatchUpdateRequest {
  providerCode?: string;
  modelCode?: string;
  sizeCode?: string;
  pointCost?: number;
  manualPointCost?: number;
  apiInputCostCny?: number;
  apiOutputCostCny?: number;
  manualCostCny?: number;
  supportsReferenceImage?: number;
  status?: number;
}

export async function getImageGenerationMonitorOverview(params: any) {
  return request.post('/image/generation/admin/monitor/overview', params) as Promise<{
    data: ImageGenerationMonitorOverview;
  }>;
}

export async function listImageGenerationConversations(params: any) {
  return request.post('/image/generation/admin/conversation/list/page', params) as Promise<any>;
}

export async function getImageGenerationConversation(conversationId: string, userId: number) {
  return request.get('/image/generation/admin/conversation/get', {
    params: { conversationId, userId },
  }) as Promise<{ data: ImageGenerationConversationDetail }>;
}

export async function listImageGenerationMessages(params: any) {
  return request.post('/image/generation/admin/message/list/page', params) as Promise<any>;
}

export async function getImageGenerationMessage(id: number) {
  return request.get('/image/generation/admin/message/get/vo', { params: { id } }) as Promise<{
    data: ImageGenerationMessageItem;
  }>;
}

export async function manualCompleteImageGenerationTask(params: {
  taskId: string;
  imageUrl: string;
  note?: string;
}) {
  return request.post('/image/generation/admin/task/manual-complete', params) as Promise<{
    data: ImageGenerationMessageItem;
  }>;
}

export async function listImageGenerationProviders() {
  return request.get('/image/generation/config/admin/provider/list') as Promise<{
    data: ImageGenerationProviderConfig[];
  }>;
}

export async function addImageGenerationProvider(params: ImageGenerationProviderConfigRequest) {
  return request.post('/image/generation/config/admin/provider/add', params) as Promise<{ data: number }>;
}

export async function updateImageGenerationProvider(params: ImageGenerationProviderConfigRequest) {
  return request.post('/image/generation/config/admin/provider/update', params) as Promise<{ data: boolean }>;
}

export async function setDefaultImageGenerationProvider(id: number) {
  return request.post('/image/generation/config/admin/provider/set-default', { id }) as Promise<{ data: boolean }>;
}

export async function deleteImageGenerationProvider(id: number) {
  return request.post('/image/generation/config/admin/provider/delete', { id }) as Promise<{ data: boolean }>;
}

export async function testImageGenerationProvider(id: number) {
  return request.post('/image/generation/config/admin/provider/test', { id }) as Promise<{
    data: ImageGenerationProviderTestResult;
  }>;
}

export async function listImageGenerationModels(providerCode?: string) {
  return request.get('/image/generation/config/admin/model/list', {
    params: providerCode ? { providerCode } : {},
  }) as Promise<{ data: ImageGenerationModelConfig[] }>;
}

export async function addImageGenerationModel(params: ImageGenerationModelConfigRequest) {
  return request.post('/image/generation/config/admin/model/add', params) as Promise<{ data: number }>;
}

export async function updateImageGenerationModel(params: ImageGenerationModelConfigRequest) {
  return request.post('/image/generation/config/admin/model/update', params) as Promise<{ data: boolean }>;
}

export async function batchUpdateImageGenerationModelSize(params: ImageGenerationModelConfigBatchUpdateRequest) {
  return request.post('/image/generation/config/admin/model/batch-update-size', params) as Promise<{ data: number }>;
}
