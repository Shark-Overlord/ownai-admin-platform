import request from './request';

export type AiTaskCode = 'prompt_asset_tagging' | 'blog_slug_generation' | 'blog_seo_generation';

export interface AiProviderConfigVO {
  id?: number | string;
  providerCode: string;
  providerName: string;
  baseUrl: string;
  chatPath: string;
  modelCode: string;
  authType: string;
  apiKeyLast4?: string;
  hasApiKey?: boolean;
  apiKeyUsable?: boolean;
  apiKeyMasked?: string;
  status: number;
  timeoutSeconds: number;
}

export interface AiTaskConfigVO {
  id?: number | string;
  taskCode: AiTaskCode;
  providerCode: string;
  taskName: string;
  systemPrompt: string;
  maxResultCount: number;
  status: number;
}

export interface AiSystemConfigVO {
  provider: AiProviderConfigVO;
  tasks: AiTaskConfigVO[];
}

export async function getAiSystemConfig() {
  return request.get('/admin/ai/config') as Promise<{ data: AiSystemConfigVO }>;
}

export async function saveAiProviderConfig(params: Partial<AiProviderConfigVO> & { apiKey?: string }) {
  return request.post('/admin/ai/config/provider/save', params) as Promise<{ data: number | string }>;
}

export async function saveAiTaskConfig(params: AiTaskConfigVO) {
  return request.post('/admin/ai/config/task/save', params) as Promise<{ data: number | string }>;
}
