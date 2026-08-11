import request from './request';

export interface TrafficMetricSummary {
  pv: number;
  uv: number;
  dau: number;
  loggedInVisitors: number;
  pvChangeRate: number;
  uvChangeRate: number;
  dauChangeRate: number;
  loggedInVisitorsChangeRate: number;
}

export interface TrafficDailyMetric {
  date: string;
  pv: number;
  uv: number;
  dau: number;
  loggedInVisitors: number;
}

export interface TrafficDimensionMetric {
  name: string;
  pv: number;
  uv: number;
  dau: number;
  percentage: number;
}

export interface SiteAnalyticsOverview {
  startDate: string;
  endDate: string;
  summary: TrafficMetricSummary;
  today: TrafficMetricSummary;
  yesterday: TrafficMetricSummary;
  dailyTrend: TrafficDailyMetric[];
  topPages: TrafficDimensionMetric[];
  topSources: TrafficDimensionMetric[];
  deviceDistribution: TrafficDimensionMetric[];
}

export async function getSiteAnalyticsOverview(params: { startDate: string; endDate: string }) {
  return request.get('/site-analytics/admin/overview', { params }) as Promise<{ data: SiteAnalyticsOverview }>;
}
