import { getJson } from "@/lib/request";

export type TrafficTagPlatform = "douyin" | "xiaohongshu";
export type TrafficTagStatus = "long_term" | "active" | "upcoming" | "expired";
export type TrafficTagSort = "default" | "hot" | "latest";

export interface TrafficTagItem {
  id: string;
  title: string;
  platform: TrafficTagPlatform;
  category: string;
  status: TrafficTagStatus;
  dateLabel: string;
  heat: number;
  tags: string[];
  requirements: string[];
  description: string;
  sourceUrl: string;
  sortOrder: number;
  enabled: boolean;
  sourceUpdatedTime?: string;
}

export interface TrafficTagOverview {
  items: TrafficTagItem[];
  platformCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  total: number;
}

export async function getTrafficTagOverview(filters: {
  platform?: string;
  category?: string;
  status?: string;
  sort?: TrafficTagSort;
}, signal?: AbortSignal) {
  const response = await getJson<TrafficTagOverview>("/traffic-tags/public/overview", {
    includeAuthToken: false,
    query: filters,
    signal,
  });
  if (!response.data) throw new Error(response.message || "流量标签加载失败");
  return response.data;
}
