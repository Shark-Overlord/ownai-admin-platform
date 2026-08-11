package com.yupi.springbootinit.service;

import com.yupi.springbootinit.model.dto.analytics.PageViewTrackRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.analytics.SiteAnalyticsOverviewVO;
import java.time.LocalDate;

public interface SiteAnalyticsService {

    boolean trackPageView(PageViewTrackRequest request, User loginUser, String userAgent);

    SiteAnalyticsOverviewVO getOverview(LocalDate startDate, LocalDate endDate);

    SiteAnalyticsOverviewVO.MetricSummary getTodayMetrics();

    void aggregateRecentDays();

    void cleanupExpiredEvents();
}
