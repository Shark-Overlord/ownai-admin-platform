package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.yupi.springbootinit.model.dto.analytics.PageViewTrackRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.analytics.SiteAnalyticsOverviewVO;
import com.yupi.springbootinit.service.impl.SiteAnalyticsServiceImpl;
import com.yupi.springbootinit.utils.AnalyticsBotDetector;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.util.ReflectionTestUtils;

class SiteAnalyticsUnitTest {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

    private JdbcTemplate db;

    private SiteAnalyticsServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        db = new JdbcTemplate(new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER;DATABASE_TO_LOWER=TRUE",
                "sa", ""));
        String schema = new String(Files.readAllBytes(Paths.get("sql/site_analytics.sql")), StandardCharsets.UTF_8);
        for (String statement : schema.replaceAll("(?m)^--.*$", "").split(";")) {
            if (!statement.trim().isEmpty()) {
                db.execute(statement);
            }
        }
        db.execute("CREATE TABLE blog_book(id BIGINT PRIMARY KEY, title VARCHAR(100), slug VARCHAR(100), memberOnly INT DEFAULT 0, status VARCHAR(20), isDelete INT DEFAULT 0, updateTime DATETIME)");
        db.execute("CREATE TABLE blog_chapter(id BIGINT PRIMARY KEY, bookId BIGINT, title VARCHAR(100), isDelete INT DEFAULT 0)");
        db.execute("CREATE TABLE blog_post(id BIGINT PRIMARY KEY, chapterId BIGINT, title VARCHAR(100), slug VARCHAR(100), memberOnly INT DEFAULT 0, status VARCHAR(20), isDelete INT DEFAULT 0, updateTime DATETIME)");
        db.execute("CREATE TABLE blog_post_read_event(id BIGINT PRIMARY KEY, postId BIGINT, bookId BIGINT, readerKey VARCHAR(100))");
        db.execute("CREATE TABLE blog_book_favorite(id BIGINT PRIMARY KEY, bookId BIGINT, isDelete INT DEFAULT 0)");
        db.execute("CREATE TABLE blog_post_favorite(id BIGINT PRIMARY KEY, postId BIGINT, isDelete INT DEFAULT 0)");

        service = new SiteAnalyticsServiceImpl(db);
        ReflectionTestUtils.setField(service, "hashSecret", "unit-test-secret");
    }

    @Test
    void shouldFilterBotUserAgentsAndAllowBrowsers() {
        assertTrue(AnalyticsBotDetector.isBotUserAgent(null));
        assertTrue(AnalyticsBotDetector.isBotUserAgent(""));
        assertTrue(AnalyticsBotDetector.isBotUserAgent("curl/8.0"));
        assertTrue(AnalyticsBotDetector.isBotUserAgent(
                "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"));
        assertTrue(AnalyticsBotDetector.isBotUserAgent(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/148.0.0.0 Safari/537.36"));
        assertFalse(AnalyticsBotDetector.isBotUserAgent("Mozilla/5.0 Chrome/120"));
        assertFalse(AnalyticsBotDetector.isBotUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/132.0.0.0 Safari/537.36"));

        PageViewTrackRequest req = new PageViewTrackRequest();
        req.setVisitorId("visitor_1234567890_abcdef");
        req.setPagePath("/#/prompts/1001");
        assertFalse(service.trackPageView(req, null, "Mozilla/5.0 (compatible; GPTBot/1.2)"));
        assertEquals(0, db.queryForObject("SELECT COUNT(1) FROM site_visit_event", Integer.class));
    }

    @Test
    void shouldDeduplicateMultiDayVisitorsAndGroupPromptDetailRoutes() {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        Timestamp fiveDaysAgo = Timestamp.from(today.minusDays(5).atTime(12, 0).atZone(BUSINESS_ZONE).toInstant());
        Timestamp todayNoon = Timestamp.from(today.atTime(12, 0).atZone(BUSINESS_ZONE).toInstant());

        // Same visitor + same logged-in user visiting 5 days ago and today across two prompt detail pages
        db.update("INSERT INTO site_visit_event (id, visitorHash, userId, pagePath, sourceName, deviceType, browserName, eventTime, createTime) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                1L, "hash_same_visitor", 42L, "/#/prompts/1001", "direct", "desktop", "Chrome", fiveDaysAgo, fiveDaysAgo);
        db.update("INSERT INTO site_visit_event (id, visitorHash, userId, pagePath, sourceName, deviceType, browserName, eventTime, createTime) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                2L, "hash_same_visitor", 42L, "/#/prompts/1002", "direct", "desktop", "Chrome", todayNoon, todayNoon);

        // Populate daily table for 5 days ago to ensure 7-day summary/dimensions do not double-count daily UV/DAU
        db.update("INSERT INTO site_analytics_daily (statDate, pv, uv, dau, loggedInVisitors, createTime, updateTime) "
                + "VALUES (?, 1, 1, 1, 1, NOW(), NOW())", java.sql.Date.valueOf(today.minusDays(5)));
        db.update("INSERT INTO site_analytics_dimension_daily (statDate, dimensionType, dimensionValue, pv, uv, dau, createTime, updateTime) "
                + "VALUES (?, 'device', 'desktop', 1, 1, 1, NOW(), NOW())", java.sql.Date.valueOf(today.minusDays(5)));

        SiteAnalyticsOverviewVO overview = service.getOverview(today.minusDays(6), today);
        assertEquals(2L, overview.getSummary().getPv());
        assertEquals(1L, overview.getSummary().getUv());
        assertEquals(1L, overview.getSummary().getDau());
        assertEquals(1L, overview.getSummary().getLoggedInVisitors());

        assertEquals(1, overview.getTopPages().size());
        assertEquals("/#/prompts/:id", overview.getTopPages().get(0).getName());
        assertEquals(2L, overview.getTopPages().get(0).getPv());
        assertEquals(1L, overview.getTopPages().get(0).getUv());
        assertEquals(1L, overview.getTopPages().get(0).getDau());

        assertEquals(1, overview.getDeviceDistribution().size());
        assertEquals(2L, overview.getDeviceDistribution().get(0).getPv());
        assertEquals(1L, overview.getDeviceDistribution().get(0).getUv());
        assertEquals(1L, overview.getDeviceDistribution().get(0).getDau());
    }
}
