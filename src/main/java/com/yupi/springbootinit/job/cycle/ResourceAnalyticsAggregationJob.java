package com.yupi.springbootinit.job.cycle;

import com.yupi.springbootinit.service.ResourceAnalyticsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ResourceAnalyticsAggregationJob {
    private final ResourceAnalyticsService analytics;
    public ResourceAnalyticsAggregationJob(ResourceAnalyticsService analytics) {this.analytics=analytics;}
    @Scheduled(initialDelay=10000,fixedDelay=300000)
    public void aggregate() {
        try {analytics.aggregate();} catch(Exception e) {log.error("Resource analytics aggregation failed",e);}
    }
}
