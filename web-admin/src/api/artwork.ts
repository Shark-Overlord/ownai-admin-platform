import request from './request';

export interface ArtworkVO {
  id: number;
  title: string;
  summary?: string;
  description?: string;
  coverUrl?: string;
  videoUrl?: string;
  promptContent?: string;
  categoryId?: number;
  category?: { id: number; name: string };
  cashPrice?: number;
  pointsPrice?: number;
  memberOnly?: number;
  status?: number;
  tagList?: { id: number; name: string }[];
  htmlUrl?: string;
  createTime?: string;
}

export interface ArtworkAddRequest {
  title: string;
  summary?: string;
  description?: string;
  coverUrl?: string;
  videoUrl?: string;
  promptContent?: string;
  categoryId?: number;
  cashPrice?: number;
  pointsPrice?: number;
  memberOnly?: number;
  status?: number;
  tagIdList?: number[];
}

export interface ArtworkUpdateRequest extends ArtworkAddRequest {
  id: number;
}

export async function listArtworkByPageForAdmin(params: any) {
  return request.post('/artwork/admin/list/page/vo', params) as Promise<any>;
}

export async function addArtwork(params: ArtworkAddRequest) {
  return request.post('/artwork/add', params) as Promise<{ data: number }>;
}

export async function updateArtwork(params: ArtworkUpdateRequest) {
  return request.post('/artwork/update', params) as Promise<{ data: boolean }>;
}

export async function deleteArtwork(params: { id: number }) {
  return request.post('/artwork/delete', params) as Promise<{ data: boolean }>;
}

export async function deleteArtworkBatch(params: { ids: number[] }) {
  return request.post('/artwork/delete/batch', params) as Promise<{ data: boolean }>;
}

export async function getArtworkVOById(id: number) {
  return request.get('/artwork/get/vo', { params: { id } }) as Promise<{ data: ArtworkVO }>;
}
