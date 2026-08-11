package com.yupi.springbootinit.job.cycle;

import com.yupi.springbootinit.service.SiteAnalyticsService;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SiteAnalyticsAggregationJob {

    @Resource
    private SiteAnalyticsService siteAnalyticsService;

    @Scheduled(cron = "${site.analytics.aggregate-cron:0 */5 * * * ?}")
    public void aggregateRecentDays() {
        try {
            siteAnalyticsService.aggregateRecentDays();
        } catch (Exception e) {
            log.error("Failed to aggregate site analytics", e);
        }
    }

    @Scheduled(cron = "${site.analytics.cleanup-cron:0 30 3 * * ?}")
    public void cleanupExpiredEvents() {
        try {
            siteAnalyticsService.cleanupExpiredEvents();
        } catch (Exception e) {
            log.error("Failed to cleanup expired site analytics events", e);
        }
    }
}
