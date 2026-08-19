import request from './request';

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
