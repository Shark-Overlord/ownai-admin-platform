package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.yupi.springbootinit.model.dto.analytics.PageViewTrackRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.analytics.SiteAnalyticsOverviewVO;
import java.time.LocalDate;
import java.util.UUID;
import javax.annotation.Resource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=file:./sql/site_analytics.sql",
        "spring.task.scheduling.enabled=false"
})
@ActiveProfiles("local")
@Transactional
@EnabledIfEnvironmentVariable(named = "RUN_LOCAL_ANALYTICS_INTEGRATION_TESTS", matches = "true")
class SiteAnalyticsServiceTest {

    @Resource
    private SiteAnalyticsService siteAnalyticsService;

    @Test
    void shouldTrackAnonymousAndAuthenticatedTrafficWithoutDoubleCounting() {
        SiteAnalyticsOverviewVO.MetricSummary before = siteAnalyticsService.getTodayMetrics();
        String anonymousVisitor = UUID.randomUUID().toString();
        String authenticatedVisitor = UUID.randomUUID().toString();
        String pagePrefix = "/#/analytics-test-" + UUID.randomUUID();

        PageViewTrackRequest anonymous = request(anonymousVisitor, pagePrefix + "-home");
        assertTrue(siteAnalyticsService.trackPageView(anonymous, null, "Mozilla/5.0 Chrome/120"));
        assertFalse(siteAnalyticsService.trackPageView(anonymous, null, "Mozilla/5.0 Chrome/120"));

        User user = new User();
        user.setId(Math.abs(UUID.randomUUID().getMostSignificantBits()));
        assertTrue(siteAnalyticsService.trackPageView(
                request(anonymousVisitor, pagePrefix + "-library"), user, "Mozilla/5.0 Chrome/120"));
        assertTrue(siteAnalyticsService.trackPageView(
                request(authenticatedVisitor, pagePrefix + "-profile"), user, "Mozilla/5.0 Mobile Safari/605"));

        SiteAnalyticsOverviewVO overview = siteAnalyticsService.getOverview(LocalDate.now(), LocalDate.now());
        SiteAnalyticsOverviewVO.MetricSummary after = overview.getSummary();
        assertEquals(before.getPv() + 3, after.getPv());
        assertEquals(before.getUv() + 2, after.getUv());
        assertEquals(before.getDau() + 1, after.getDau());
        assertEquals(before.getLoggedInVisitors() + 2, after.getLoggedInVisitors());
        assertTrue(overview.getTopPages().stream().anyMatch(item -> item.getName().startsWith(pagePrefix)));
        assertTrue(overview.getDeviceDistribution().stream().anyMatch(item -> "mobile".equals(item.getName())));
    }

    @Test
    void shouldRateLimitOneVisitorAfterSixtyEventsPerMinute() {
        String visitorId = UUID.randomUUID().toString();
        String pagePrefix = "/#/analytics-rate-test-" + UUID.randomUUID();
        for (int index = 0; index < 60; index++) {
            assertTrue(siteAnalyticsService.trackPageView(
                    request(visitorId, pagePrefix + "-" + index), null, "Mozilla/5.0 Chrome/120"));
        }
        assertFalse(siteAnalyticsService.trackPageView(
                request(visitorId, pagePrefix + "-blocked"), null, "Mozilla/5.0 Chrome/120"));
    }

    private PageViewTrackRequest request(String visitorId, String pagePath) {
        PageViewTrackRequest request = new PageViewTrackRequest();
        request.setVisitorId(visitorId);
        request.setPagePath(pagePath);
        request.setReferrer("search.example.com");
        request.setUtmSource("integration-test");
        return request;
    }
}
