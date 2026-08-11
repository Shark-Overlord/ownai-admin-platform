package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.analytics.PageViewTrackRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.analytics.SiteAnalyticsOverviewVO;
import com.yupi.springbootinit.service.SiteAnalyticsService;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SiteAnalyticsServiceImpl implements SiteAnalyticsService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

    private static final Pattern VISITOR_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{16,128}$");

    private static final long DEDUP_WINDOW_MILLIS = 5_000L;

    private static final long RATE_LIMIT_WINDOW_MILLIS = 60_000L;

    private static final int MAX_VISITOR_EVENTS_PER_MINUTE = 60;

    private static final int MAX_REPORT_DAYS = 366;

    private final JdbcTemplate jdbcTemplate;

    @Value("${site.analytics.hash-secret:ownai-site-analytics-local}")
    private String hashSecret;

    public SiteAnalyticsServiceImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public boolean trackPageView(PageViewTrackRequest request, User loginUser, String userAgent) {
        if (request == null || StringUtils.isBlank(request.getVisitorId())
                || !VISITOR_ID_PATTERN.matcher(request.getVisitorId().trim()).matches()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Invalid visitorId");
        }
        String pagePath = normalizePagePath(request.getPagePath());
        String visitorHash = hashVisitorId(request.getVisitorId().trim());
        Long userId = loginUser == null ? null : loginUser.getId();
        Timestamp now = new Timestamp(System.currentTimeMillis());
        Timestamp dedupStart = new Timestamp(now.getTime() - DEDUP_WINDOW_MILLIS);
        Timestamp rateLimitStart = new Timestamp(now.getTime() - RATE_LIMIT_WINDOW_MILLIS);
        Integer recentEventCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM site_visit_event WHERE visitorHash = ? AND eventTime >= ?",
                Integer.class, visitorHash, rateLimitStart);
        if (recentEventCount != null && recentEventCount >= MAX_VISITOR_EVENTS_PER_MINUTE) {
            return false;
        }
        Integer duplicateCount;
        if (userId == null) {
            duplicateCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM site_visit_event WHERE visitorHash = ? AND pagePath = ? "
                            + "AND userId IS NULL AND eventTime >= ?",
                    Integer.class, visitorHash, pagePath, dedupStart);
        } else {
            duplicateCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM site_visit_event WHERE visitorHash = ? AND pagePath = ? "
                            + "AND userId = ? AND eventTime >= ?",
                    Integer.class, visitorHash, pagePath, userId, dedupStart);
        }
        if (duplicateCount != null && duplicateCount > 0) {
            return false;
        }

        String referrerDomain = normalizeReferrerDomain(request.getReferrer());
        String utmSource = normalizeText(request.getUtmSource(), 100);
        String utmMedium = normalizeText(request.getUtmMedium(), 100);
        String utmCampaign = normalizeText(request.getUtmCampaign(), 150);
        String sourceName = StringUtils.defaultIfBlank(utmSource,
                StringUtils.defaultIfBlank(referrerDomain, "direct"));
        String deviceType = resolveDeviceType(userAgent);
        String browserName = resolveBrowserName(userAgent);

        jdbcTemplate.update("INSERT INTO site_visit_event "
                        + "(id, visitorHash, userId, pagePath, sourceName, referrerDomain, utmSource, utmMedium, "
                        + "utmCampaign, deviceType, browserName, eventTime, createTime) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                IdWorker.getId(), visitorHash, userId, pagePath, sourceName, referrerDomain, utmSource,
                utmMedium, utmCampaign, deviceType, browserName, now, now);
        return true;
    }

    @Override
    public SiteAnalyticsOverviewVO getOverview(LocalDate requestedStartDate, LocalDate requestedEndDate) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate endDate = requestedEndDate == null || requestedEndDate.isAfter(today) ? today : requestedEndDate;
        LocalDate startDate = requestedStartDate == null ? endDate.minusDays(6) : requestedStartDate;
        if (startDate.isAfter(endDate)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "startDate must not be after endDate");
        }
        long rangeDays = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
        if (rangeDays > MAX_REPORT_DAYS) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Date range cannot exceed 366 days");
        }

        Map<LocalDate, SiteAnalyticsOverviewVO.DailyMetric> dailyMetrics = queryDailyMetrics(startDate, endDate);
        SiteAnalyticsOverviewVO.MetricSummary summary = summarize(dailyMetrics.values());
        LocalDate previousEnd = startDate.minusDays(1);
        LocalDate previousStart = previousEnd.minusDays(rangeDays - 1);
        SiteAnalyticsOverviewVO.MetricSummary previousSummary = summarize(
                queryDailyMetrics(previousStart, previousEnd).values());
        applyChangeRates(summary, previousSummary);

        SiteAnalyticsOverviewVO overview = new SiteAnalyticsOverviewVO();
        overview.setStartDate(startDate);
        overview.setEndDate(endDate);
        overview.setSummary(summary);
        SiteAnalyticsOverviewVO.MetricSummary todaySummary = summarize(queryDailyMetrics(today, today).values());
        SiteAnalyticsOverviewVO.MetricSummary yesterdaySummary = summarize(
                queryDailyMetrics(today.minusDays(1), today.minusDays(1)).values());
        applyChangeRates(todaySummary, yesterdaySummary);
        overview.setToday(todaySummary);
        overview.setYesterday(yesterdaySummary);
        overview.setDailyTrend(new ArrayList<>(dailyMetrics.values()));
        overview.setTopPages(queryDimensions("page", startDate, endDate, 10));
        overview.setTopSources(queryDimensions("source", startDate, endDate, 10));
        overview.setDeviceDistribution(queryDimensions("device", startDate, endDate, 20));
        return overview;
    }

    @Override
    public SiteAnalyticsOverviewVO.MetricSummary getTodayMetrics() {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        return summarize(queryDailyMetrics(today, today).values());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void aggregateRecentDays() {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        for (int daysAgo = 0; daysAgo < 3; daysAgo++) {
            aggregateDate(today.minusDays(daysAgo));
        }
    }

    @Override
    public void cleanupExpiredEvents() {
        LocalDate cutoffDate = LocalDate.now(BUSINESS_ZONE).minusDays(90);
        jdbcTemplate.update("DELETE FROM site_visit_event WHERE eventTime < ?", startOfDay(cutoffDate));
    }

    private void aggregateDate(LocalDate date) {
        Timestamp start = startOfDay(date);
        Timestamp end = startOfDay(date.plusDays(1));
        java.sql.Date sqlDate = java.sql.Date.valueOf(date);
        jdbcTemplate.update("DELETE FROM site_analytics_daily WHERE statDate = ?", sqlDate);
        int inserted = jdbcTemplate.update("INSERT INTO site_analytics_daily "
                        + "(statDate, pv, uv, dau, loggedInVisitors, createTime, updateTime) "
                        + "SELECT ?, COUNT(1), COUNT(DISTINCT visitorHash), "
                        + "COUNT(DISTINCT CASE WHEN userId IS NOT NULL THEN userId END), "
                        + "COUNT(DISTINCT CASE WHEN userId IS NOT NULL THEN visitorHash END), NOW(), NOW() "
                        + "FROM site_visit_event WHERE eventTime >= ? AND eventTime < ? HAVING COUNT(1) > 0",
                sqlDate, start, end);
        if (inserted == 0) {
            jdbcTemplate.update("INSERT INTO site_analytics_daily "
                            + "(statDate, pv, uv, dau, loggedInVisitors, createTime, updateTime) "
                            + "VALUES (?, 0, 0, 0, 0, NOW(), NOW())",
                    sqlDate);
        }

        jdbcTemplate.update("DELETE FROM site_analytics_dimension_daily WHERE statDate = ?", sqlDate);
        aggregateDimension(sqlDate, start, end, "page", "pagePath");
        aggregateDimension(sqlDate, start, end, "source", "sourceName");
        aggregateDimension(sqlDate, start, end, "device", "deviceType");
    }

    private void aggregateDimension(java.sql.Date date, Timestamp start, Timestamp end,
            String dimensionType, String columnName) {
        jdbcTemplate.update("INSERT INTO site_analytics_dimension_daily "
                        + "(statDate, dimensionType, dimensionValue, pv, uv, dau, createTime, updateTime) "
                        + "SELECT ?, ?, " + columnName + ", COUNT(1), COUNT(DISTINCT visitorHash), "
                        + "COUNT(DISTINCT CASE WHEN userId IS NOT NULL THEN userId END), NOW(), NOW() "
                        + "FROM site_visit_event WHERE eventTime >= ? AND eventTime < ? "
                        + "GROUP BY " + columnName,
                date, dimensionType, start, end);
    }

    private Map<LocalDate, SiteAnalyticsOverviewVO.DailyMetric> queryDailyMetrics(LocalDate startDate,
            LocalDate endDate) {
        Map<LocalDate, SiteAnalyticsOverviewVO.DailyMetric> result = new LinkedHashMap<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            SiteAnalyticsOverviewVO.DailyMetric metric = new SiteAnalyticsOverviewVO.DailyMetric();
            metric.setDate(date);
            result.put(date, metric);
        }

        LocalDate liveCutoff = LocalDate.now(BUSINESS_ZONE).minusDays(2);
        LocalDate historicalEnd = min(endDate, liveCutoff.minusDays(1));
        if (!startDate.isAfter(historicalEnd)) {
            jdbcTemplate.query("SELECT statDate, pv, uv, dau, loggedInVisitors FROM site_analytics_daily "
                            + "WHERE statDate >= ? AND statDate <= ? ORDER BY statDate",
                    (RowCallbackHandler) row -> mergeDailyMetric(result, row.getDate("statDate").toLocalDate(), row.getLong("pv"),
                            row.getLong("uv"), row.getLong("dau"), row.getLong("loggedInVisitors")),
                    java.sql.Date.valueOf(startDate), java.sql.Date.valueOf(historicalEnd));
        }

        LocalDate rawStart = max(startDate, liveCutoff);
        if (!rawStart.isAfter(endDate)) {
            jdbcTemplate.query("SELECT DATE(eventTime) AS statDate, COUNT(1) AS pv, "
                            + "COUNT(DISTINCT visitorHash) AS uv, "
                            + "COUNT(DISTINCT CASE WHEN userId IS NOT NULL THEN userId END) AS dau, "
                            + "COUNT(DISTINCT CASE WHEN userId IS NOT NULL THEN visitorHash END) AS loggedInVisitors "
                            + "FROM site_visit_event WHERE eventTime >= ? AND eventTime < ? GROUP BY DATE(eventTime) "
                            + "ORDER BY statDate",
                    (RowCallbackHandler) row -> mergeDailyMetric(result, row.getDate("statDate").toLocalDate(), row.getLong("pv"),
                            row.getLong("uv"), row.getLong("dau"), row.getLong("loggedInVisitors")),
                    startOfDay(rawStart), startOfDay(endDate.plusDays(1)));
        }
        return result;
    }

    private void mergeDailyMetric(Map<LocalDate, SiteAnalyticsOverviewVO.DailyMetric> result, LocalDate date,
            long pv, long uv, long dau, long loggedInVisitors) {
        SiteAnalyticsOverviewVO.DailyMetric metric = result.get(date);
        if (metric == null) {
            return;
        }
        metric.setPv(pv);
        metric.setUv(uv);
        metric.setDau(dau);
        metric.setLoggedInVisitors(loggedInVisitors);
    }

    private List<SiteAnalyticsOverviewVO.DimensionMetric> queryDimensions(String dimensionType,
            LocalDate startDate, LocalDate endDate, int limit) {
        Map<String, long[]> values = new HashMap<>();
        LocalDate liveCutoff = LocalDate.now(BUSINESS_ZONE).minusDays(2);
        LocalDate historicalEnd = min(endDate, liveCutoff.minusDays(1));
        if (!startDate.isAfter(historicalEnd)) {
            jdbcTemplate.query("SELECT dimensionValue, SUM(pv) AS pv, SUM(uv) AS uv, SUM(dau) AS dau "
                            + "FROM site_analytics_dimension_daily WHERE dimensionType = ? "
                            + "AND statDate >= ? AND statDate <= ? GROUP BY dimensionValue",
                    (RowCallbackHandler) row -> mergeDimension(values, row.getString("dimensionValue"), row.getLong("pv"),
                            row.getLong("uv"), row.getLong("dau")),
                    dimensionType, java.sql.Date.valueOf(startDate), java.sql.Date.valueOf(historicalEnd));
        }

        LocalDate rawStart = max(startDate, liveCutoff);
        if (!rawStart.isAfter(endDate)) {
            String column = resolveDimensionColumn(dimensionType);
            jdbcTemplate.query("SELECT " + column + " AS dimensionValue, COUNT(1) AS pv, "
                            + "COUNT(DISTINCT visitorHash) AS uv, "
                            + "COUNT(DISTINCT CASE WHEN userId IS NOT NULL THEN userId END) AS dau "
                            + "FROM site_visit_event WHERE eventTime >= ? AND eventTime < ? GROUP BY " + column,
                    (RowCallbackHandler) row -> mergeDimension(values, row.getString("dimensionValue"), row.getLong("pv"),
                            row.getLong("uv"), row.getLong("dau")),
                    startOfDay(rawStart), startOfDay(endDate.plusDays(1)));
        }

        long totalPv = values.values().stream().mapToLong(item -> item[0]).sum();
        List<SiteAnalyticsOverviewVO.DimensionMetric> metrics = new ArrayList<>();
        values.forEach((name, counts) -> {
            SiteAnalyticsOverviewVO.DimensionMetric metric = new SiteAnalyticsOverviewVO.DimensionMetric();
            metric.setName(StringUtils.defaultIfBlank(name, "unknown"));
            metric.setPv(counts[0]);
            metric.setUv(counts[1]);
            metric.setDau(counts[2]);
            metric.setPercentage(totalPv == 0 ? 0D : round(counts[0] * 100D / totalPv));
            metrics.add(metric);
        });
        metrics.sort(Comparator.comparing(SiteAnalyticsOverviewVO.DimensionMetric::getPv).reversed());
        return metrics.size() > limit ? new ArrayList<>(metrics.subList(0, limit)) : metrics;
    }

    private void mergeDimension(Map<String, long[]> values, String name, long pv, long uv, long dau) {
        long[] target = values.computeIfAbsent(StringUtils.defaultIfBlank(name, "unknown"), key -> new long[3]);
        target[0] += pv;
        target[1] += uv;
        target[2] += dau;
    }

    private String resolveDimensionColumn(String dimensionType) {
        if ("page".equals(dimensionType)) {
            return "pagePath";
        }
        if ("source".equals(dimensionType)) {
            return "sourceName";
        }
        if ("device".equals(dimensionType)) {
            return "deviceType";
        }
        throw new BusinessException(ErrorCode.PARAMS_ERROR, "Unsupported analytics dimension");
    }

    private SiteAnalyticsOverviewVO.MetricSummary summarize(
            java.util.Collection<SiteAnalyticsOverviewVO.DailyMetric> dailyMetrics) {
        SiteAnalyticsOverviewVO.MetricSummary summary = new SiteAnalyticsOverviewVO.MetricSummary();
        summary.setPv(dailyMetrics.stream().mapToLong(SiteAnalyticsOverviewVO.DailyMetric::getPv).sum());
        summary.setUv(dailyMetrics.stream().mapToLong(SiteAnalyticsOverviewVO.DailyMetric::getUv).sum());
        summary.setDau(dailyMetrics.stream().mapToLong(SiteAnalyticsOverviewVO.DailyMetric::getDau).sum());
        summary.setLoggedInVisitors(dailyMetrics.stream()
                .mapToLong(SiteAnalyticsOverviewVO.DailyMetric::getLoggedInVisitors).sum());
        return summary;
    }

    private void applyChangeRates(SiteAnalyticsOverviewVO.MetricSummary current,
            SiteAnalyticsOverviewVO.MetricSummary previous) {
        current.setPvChangeRate(changeRate(current.getPv(), previous.getPv()));
        current.setUvChangeRate(changeRate(current.getUv(), previous.getUv()));
        current.setDauChangeRate(changeRate(current.getDau(), previous.getDau()));
        current.setLoggedInVisitorsChangeRate(
                changeRate(current.getLoggedInVisitors(), previous.getLoggedInVisitors()));
    }

    private double changeRate(long current, long previous) {
        if (previous == 0) {
            return current == 0 ? 0D : 100D;
        }
        return round((current - previous) * 100D / previous);
    }

    private double round(double value) {
        return Math.round(value * 10D) / 10D;
    }

    private String normalizePagePath(String value) {
        String pagePath = StringUtils.trimToEmpty(value);
        int queryIndex = pagePath.indexOf('?');
        if (queryIndex >= 0) {
            pagePath = pagePath.substring(0, queryIndex);
        }
        if (StringUtils.isBlank(pagePath) || pagePath.length() > 255 || !pagePath.startsWith("/")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Invalid pagePath");
        }
        return pagePath;
    }

    private String normalizeReferrerDomain(String value) {
        String normalized = normalizeText(value, 255);
        if (StringUtils.isBlank(normalized)) {
            return null;
        }
        try {
            URI uri = normalized.contains("://") ? URI.create(normalized) : URI.create("https://" + normalized);
            String host = StringUtils.lowerCase(uri.getHost(), Locale.ROOT);
            if (StringUtils.isBlank(host) || host.equals("localhost") || host.endsWith("ownai.icu")) {
                return null;
            }
            return host.length() > 255 ? host.substring(0, 255) : host;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private String normalizeText(String value, int maxLength) {
        String normalized = StringUtils.trimToNull(value);
        if (normalized == null) {
            return null;
        }
        return normalized.length() > maxLength ? normalized.substring(0, maxLength) : normalized;
    }

    private String resolveDeviceType(String userAgent) {
        String normalized = StringUtils.defaultString(userAgent).toLowerCase(Locale.ROOT);
        if (normalized.contains("ipad") || normalized.contains("tablet")) {
            return "tablet";
        }
        if (normalized.contains("mobile") || normalized.contains("iphone") || normalized.contains("android")) {
            return "mobile";
        }
        return StringUtils.isBlank(normalized) ? "other" : "desktop";
    }

    private String resolveBrowserName(String userAgent) {
        String normalized = StringUtils.defaultString(userAgent).toLowerCase(Locale.ROOT);
        if (normalized.contains("edg/")) {
            return "Edge";
        }
        if (normalized.contains("firefox/")) {
            return "Firefox";
        }
        if (normalized.contains("chrome/") || normalized.contains("crios/")) {
            return "Chrome";
        }
        if (normalized.contains("safari/")) {
            return "Safari";
        }
        return "Other";
    }

    private String hashVisitorId(String visitorId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hashSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(visitorId.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                builder.append(String.format("%02x", item & 0xff));
            }
            return builder.toString();
        } catch (GeneralSecurityException e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Unable to protect visitor identifier");
        }
    }

    private Timestamp startOfDay(LocalDate date) {
        return Timestamp.from(date.atStartOfDay(BUSINESS_ZONE).toInstant());
    }

    private LocalDate min(LocalDate first, LocalDate second) {
        return first.isBefore(second) ? first : second;
    }

    private LocalDate max(LocalDate first, LocalDate second) {
        return first.isAfter(second) ? first : second;
    }
}
