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

export interface TutorialContentSummary {
  bookCount: number;
  postCount: number;
  effectiveReadCount: number;
  uniqueReaderCount: number;
  bookFavoriteCount: number;
  postFavoriteCount: number;
}

export interface TutorialBookMetric {
  id: string;
  title: string;
  slug: string;
  memberOnly: 0 | 1;
  chapterCount: number;
  postCount: number;
  effectiveReadCount: number;
  uniqueReaderCount: number;
  favoriteCount: number;
}

export interface TutorialPostMetric {
  id: string;
  title: string;
  slug: string;
  memberOnly: 0 | 1;
  effectiveReadCount: number;
  uniqueReaderCount: number;
  favoriteCount: number;
  bookId?: string;
  bookTitle?: string;
  chapterId?: string;
  chapterTitle?: string;
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
  tutorialContentSummary: TutorialContentSummary;
  tutorialBooks: TutorialBookMetric[];
  tutorialPosts: TutorialPostMetric[];
}

export async function getSiteAnalyticsOverview(params: { startDate: string; endDate: string }) {
  return request.get('/site-analytics/admin/overview', { params }) as Promise<{ data: SiteAnalyticsOverview }>;
}
