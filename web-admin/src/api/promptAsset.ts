import request from './request';

export interface PromptAssetMediaVO {
  id: number;
  mediaType?: string;
  originalUrl?: string;
  localUrl?: string;
  cloudUrl?: string;
  thumbnailLocalUrl?: string;
  thumbnailCloudUrl?: string;
  sourceLocalPath?: string;
  fileHash?: string;
  cloudStorageProvider?: string;
  cloudStorageBucket?: string;
  cloudStorageRegion?: string;
  cloudStorageKey?: string;
  cloudUploadedAt?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  sort?: number;
}

export interface PromptAssetVO {
  id: number;
  assetType: string;
  categoryId?: number;
  category?: { id: number; name: string };
  title: string;
  summary?: string;
  promptContent?: string;
  promptCn?: string;
  coverUrl?: string;
  previewMediaUrl?: string;
  mediaType?: string;
  sourceName?: string;
  sourcePairId?: number;
  sourceRepoName?: string;
  sourceRepoUrl?: string;
  sourcePageUrl?: string;
  sourceCloudStorageUrl?: string;
  sourceThumbnailCloudStorageUrl?: string;
  cloudStorageProvider?: string;
  cloudStorageBucket?: string;
  cloudStorageRegion?: string;
  cloudStorageKey?: string;
  cloudUploadedAt?: string;
  visualAssetType?: string;
  scenario?: string;
  visualStyle?: string;
  qualityLevel?: string;
  selectionStatus?: string;
  license?: string;
  commercialRisk?: string;
  assetTagText?: string;
  aiTagStatus?: number;
  memberOnly?: number;
  status?: number;
  sort?: number;
  tagList?: { id: number | string; name: string }[];
  sceneTagList?: { id: number | string; name: string }[];
  assetTagList?: { id: number | string; name: string }[];
  tagIdList?: Array<number | string>;
  sceneTagIdList?: Array<number | string>;
  assetTagIdList?: Array<number | string>;
  mediaList?: PromptAssetMediaVO[];
  createTime?: string;
  updateTime?: string;
}

export interface PromptAssetImportResultVO {
  batchId: number;
  dryRun: boolean;
  status: string;
  totalCount: number;
  insertCount: number;
  updateCount: number;
  skipCount: number;
  errorCount: number;
  summary?: string;
}

export interface PromptAssetImageSyncResultVO {
  totalCount: number;
  successCount: number;
  skipCount: number;
  errorCount: number;
}

export interface PromptAssetImportBatch {
  id: number;
  sourceName?: string;
  sourceDbName?: string;
  importMode?: string;
  assetTypeFilter?: string;
  categoryId?: number;
  syncTagsToCategory?: number;
  dryRun?: number;
  status?: string;
  totalCount?: number;
  insertCount?: number;
  updateCount?: number;
  skipCount?: number;
  errorCount?: number;
  startedAt?: string;
  finishedAt?: string;
  summary?: string;
  errorMessage?: string;
}

export async function listPromptAssetByPageForAdmin(params: any) {
  return request.post('/promptAsset/admin/list/page/vo', params) as Promise<any>;
}

export async function getPromptAssetVOById(id: number) {
  return request.get('/promptAsset/admin/get/vo', { params: { id } }) as Promise<{ data: PromptAssetVO }>;
}

export async function addPromptAsset(params: Partial<PromptAssetVO>) {
  return request.post('/promptAsset/admin/add', params) as Promise<{ data: number }>;
}

export async function updatePromptAsset(params: Partial<PromptAssetVO> & { id: number }) {
  return request.post('/promptAsset/admin/update', params) as Promise<{ data: boolean }>;
}

export async function updatePromptAssetTags(params: {
  id: number;
  sceneTagIdList?: Array<number | string>;
  assetTagIdList?: Array<number | string>;
}) {
  return request.post('/promptAsset/admin/update/tags', params) as Promise<{ data: boolean }>;
}

export async function deletePromptAsset(params: { id: number }) {
  return request.post('/promptAsset/admin/delete', params) as Promise<{ data: boolean }>;
}

export async function deletePromptAssetBatch(params: { ids: number[] }) {
  return request.post('/promptAsset/admin/delete/batch', params) as Promise<{ data: boolean }>;
}

export async function publishPromptAssetBatch(params: { ids: number[] }) {
  return request.post('/promptAsset/admin/publish/batch', params) as Promise<{ data: boolean }>;
}

export async function syncPromptAssetImagesToCos(params: { ids: number[] }) {
  return request.post('/promptAsset/admin/sync/image/cos', params) as Promise<{ data: PromptAssetImageSyncResultVO }>;
}

export async function importVisualPromptDb(params: {
  file: File;
  dryRun?: boolean;
  assetType?: string;
  categoryId: number | string;
  syncTagsToCategory?: boolean;
  uploadImagesToCos?: boolean;
}) {
  const formData = new FormData();
  formData.append('file', params.file);
  if (params.dryRun !== undefined) {
    formData.append('dryRun', String(params.dryRun));
  }
  if (params.assetType) {
    formData.append('assetType', params.assetType);
  }
  formData.append('categoryId', String(params.categoryId));
  if (params.syncTagsToCategory !== undefined) {
    formData.append('syncTagsToCategory', String(params.syncTagsToCategory));
  }
  if (params.uploadImagesToCos !== undefined) {
    formData.append('uploadImagesToCos', String(params.uploadImagesToCos));
  }
  return request.post('/promptAsset/admin/import/visual-prompt-db', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
  }) as Promise<{ data: PromptAssetImportResultVO }>;
}

export async function listPromptAssetImportBatchByPage(params: any) {
  return request.post('/promptAsset/admin/import/batch/list/page', params) as Promise<any>;
}
