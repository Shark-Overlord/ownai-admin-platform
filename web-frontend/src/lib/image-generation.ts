import { getJson, postJson, RequestError, uploadFile } from "@/lib/request";

export type ImageGenerationAspectRatio =
  | "1:1"
  | "3:4"
  | "4:3"
  | "9:16"
  | "16:9";

export type ImageGenerationImageSize =
  | "1k"
  | "2k"
  | "4k";

export type ImageGenerationMode = "api" | "manual";

export interface ImageGenerationCreateRequest {
  generationMode: ImageGenerationMode;
  imageCount: number;
  imageSize: ImageGenerationImageSize;
  modelCode: string;
  conversationId?: string;
  prompt: string;
  aspectRatio: ImageGenerationAspectRatio;
  referenceImageUrl?: string;
  sourcePromptAssetId?: string | number;
}

export interface ImageGenerationQuoteRequest {
  aspectRatio: ImageGenerationAspectRatio;
  generationMode?: ImageGenerationMode;
  imageCount?: number;
  imageSize?: ImageGenerationImageSize;
  modelCode?: string;
  providerCode?: string;
  referenceImageUrl?: string;
}

export interface ImageGenerationQuoteResponse {
  aspectRatio: ImageGenerationAspectRatio;
  enough: boolean;
  generationMode: ImageGenerationMode;
  imageCount: number;
  imageSize: ImageGenerationImageSize;
  modelCode: string;
  pointBalance: number;
  pointCost: number;
  providerCode: string;
  providerName: string;
  unitPointCost: number;
  vendorSize: string;
}

export interface ImageGenerationCreateResponse {
  conversationId: string;
  messageId?: string | number;
  assistantMessageId?: string | number;
  taskId?: string | number;
  status: ImageGenerationTaskStatus;
  aspectRatio?: ImageGenerationAspectRatio | string;
  apiCostCny?: number;
  manualCostCny?: number;
  generationMode?: ImageGenerationMode | string;
  imageCount?: number;
  imageSize?: ImageGenerationImageSize | string;
  modelCode?: string;
  pointCost?: number;
  providerCode?: string;
  vendorSize?: string;
  [key: string]: unknown;
}

export type ImageGenerationMessageRole = "user" | "assistant" | "system";

export type ImageGenerationTaskStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | string;

export interface ImageGenerationConversationMessage {
  id?: string | number;
  messageId?: string | number;
  conversationId?: string;
  role?: ImageGenerationMessageRole | string;
  prompt?: string;
  aspectRatio?: ImageGenerationAspectRatio | string;
  apiCostCny?: number;
  manualCostCny?: number;
  generationMode?: ImageGenerationMode | string;
  imageCount?: number;
  imageSize?: ImageGenerationImageSize | string;
  modelCode?: string;
  pointCost?: number;
  providerCode?: string;
  referenceImageUrl?: string;
  resultImageUrlList?: string[] | string | null;
  sourcePromptAssetId?: string | number;
  taskId?: string | number;
  status?: ImageGenerationTaskStatus;
  resultImageUrls?: string[] | string | null;
  thumbnailUrls?: string[] | string | null;
  vendorSize?: string;
  errorMessage?: string | null;
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export interface ImageGenerationConversation {
  id?: string | number;
  conversationId?: string;
  messages?: ImageGenerationConversationMessage[];
  [key: string]: unknown;
}

export interface ImageGenerationConversationSummary {
  conversationId: string;
  userId?: string | number;
  messageCount?: number;
  taskCount?: number;
  successCount?: number;
  failedCount?: number;
  pendingCount?: number;
  runningCount?: number;
  totalPointCost?: number;
  totalApiCostCny?: number;
  firstCreateTime?: string;
  lastUpdateTime?: string;
  thumbnailUrls?: string[];
  [key: string]: unknown;
}

export interface ImageGenerationModelConfig {
  id?: string | number;
  providerCode?: string;
  modelCode?: string;
  sizeCode?: ImageGenerationImageSize | string;
  aspectRatio?: ImageGenerationAspectRatio | string;
  vendorSize?: string;
  pointCost?: number;
  manualPointCost?: number;
  status?: number;
  sortOrder?: number;
  [key: string]: unknown;
}

interface ImageGenerationRequestOptions {
  signal?: AbortSignal;
}

export async function uploadImageGenerationReference(
  file: File,
  options?: ImageGenerationRequestOptions,
) {
  const result = await uploadFile<string>("/file/upload", file, {
    query: {
      biz: "artwork_cover",
    },
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "参考图上传失败", {
      code: result.code,
    });
  }

  if (!result.data) {
    throw new RequestError("参考图上传接口未返回图片地址");
  }

  return result.data;
}

export async function createImageGenerationTask(
  payload: ImageGenerationCreateRequest,
  options?: ImageGenerationRequestOptions,
) {
  const result = await postJson<ImageGenerationCreateResponse>(
    "/image/generation/create",
    payload,
    {
      signal: options?.signal,
    },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "生成任务提交失败", {
      code: result.code,
    });
  }

  return result.data;
}

export async function getImageGenerationQuote(
  payload: ImageGenerationQuoteRequest,
  options?: ImageGenerationRequestOptions,
) {
  const result = await postJson<ImageGenerationQuoteResponse>(
    "/image/generation/config/quote",
    payload,
    {
      signal: options?.signal,
    },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "图片生成报价查询失败", {
      code: result.code,
    });
  }

  if (!result.data) {
    throw new RequestError("图片生成报价接口未返回数据");
  }

  return result.data;
}

export async function getCurrentImageGenerationConversation(
  options?: ImageGenerationRequestOptions,
) {
  const result = await getJson<ImageGenerationConversation | null>(
    "/image/generation/conversation/current",
    {
      signal: options?.signal,
    },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "当前会话查询失败", {
      code: result.code,
    });
  }

  return result.data ?? null;
}

export async function getImageGenerationConversation(
  conversationId: string,
  options?: ImageGenerationRequestOptions,
) {
  const result = await getJson<ImageGenerationConversation | null>(
    "/image/generation/conversation/get",
    {
      query: {
        conversationId,
      },
      signal: options?.signal,
    },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "会话结果同步失败", {
      code: result.code,
    });
  }

  return result.data ?? null;
}

export async function listImageGenerationConversations(
  payload: {
    current?: number;
    pageSize?: number;
    status?: string;
    searchText?: string;
  } = {},
  options?: ImageGenerationRequestOptions,
) {
  const result = await postJson<{
    records?: ImageGenerationConversationSummary[];
    total?: number;
    current?: number;
    pageSize?: number;
  }>("/image/generation/conversation/list/page", payload, {
    signal: options?.signal,
  });

  if (result.code !== 0) {
    throw new RequestError(result.message || "历史会话查询失败", {
      code: result.code,
    });
  }

  return result.data;
}

export async function listImageGenerationModelConfigs(
  options?: ImageGenerationRequestOptions,
) {
  const result = await getJson<ImageGenerationModelConfig[]>(
    "/image/generation/config/admin/model/list",
    {
      signal: options?.signal,
    },
  );

  if (result.code !== 0) {
    throw new RequestError(result.message || "图片生成配置查询失败", {
      code: result.code,
    });
  }

  return result.data ?? [];
}
