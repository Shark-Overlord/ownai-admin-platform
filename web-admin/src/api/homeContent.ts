import request from './request';

export interface HomeVideoConfig {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  alt: string;
  sort: number;
  enabled: boolean;
}

export interface HomeCourseItemConfig {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  coverAlt: string;
  statusText: string;
  targetPath: string;
  sort: number;
  enabled: boolean;
}

export interface HomeContentConfig {
  hero: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    description: string;
    videoList: HomeVideoConfig[];
  };
  design: {
    enabled: boolean;
    title: string;
    description: string;
    ctaText: string;
    ctaPath: string;
    demoVideoUrl: string;
    demoVideoPosterUrl?: string;
  };
  course: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    description: string;
    ctaText: string;
    ctaPath: string;
    footerTitle: string;
    footerDescription: string;
    itemList: HomeCourseItemConfig[];
  };
}

export async function getHomeContentConfig() {
  return request.get('/home/admin/config') as Promise<{ data: HomeContentConfig }>;
}

export async function updateHomeContentConfig(params: HomeContentConfig) {
  return request.post('/home/admin/config/update', params) as Promise<{ data: boolean }>;
}
