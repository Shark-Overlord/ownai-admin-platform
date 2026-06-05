import request from './request';

export interface PromptAssetAiTagConfigVO {
  id?: number;
  providerCode?: string;
  providerName?: string;
  baseUrl?: string;
  chatPath?: string;
  modelCode?: string;
  authType?: string;
  apiKeyLast4?: string;
  hasApiKey?: boolean;
  apiKeyMasked?: string;
  status?: number;
  timeoutSeconds?: number;
  maxTags?: number;
  systemPrompt?: string;
  createTime?: string;
  updateTime?: string;
}

export interface PromptAssetAiTagItemResultVO {
  id: number;
  title?: string;
  success?: boolean;
  updated?: boolean;
  assetTagList?: string[];
  errorMessage?: string;
}

export interface PromptAssetAiTagRunResultVO {
  dryRun?: boolean;
  totalCount: number;
  successCount: number;
  updateCount: number;
  skipCount: number;
  errorCount: number;
  itemList?: PromptAssetAiTagItemResultVO[];
}

export async function getPromptAssetAiTagConfig() {
  return request.get('/promptAsset/admin/ai-tagging/config') as Promise<{ data: PromptAssetAiTagConfigVO }>;
}

export async function savePromptAssetAiTagConfig(params: Partial<PromptAssetAiTagConfigVO> & { apiKey?: string }) {
  return request.post('/promptAsset/admin/ai-tagging/config/save', params) as Promise<{ data: number }>;
}

export async function runPromptAssetAiTagging(params: {
  idList?: number[];
  assetType?: string;
  categoryId?: number | string;
  status?: number;
  searchText?: string;
  limit?: number;
  dryRun?: boolean;
  overwriteExisting?: boolean;
}) {
  return request.post('/promptAsset/admin/ai-tagging/run', params, { timeout: 1800000 }) as Promise<{
    data: PromptAssetAiTagRunResultVO;
  }>;
}
