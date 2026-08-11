package com.yupi.springbootinit.model.vo.analytics;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class SiteAnalyticsOverviewVO implements Serializable {

    private LocalDate startDate;

    private LocalDate endDate;

    private MetricSummary summary = new MetricSummary();

    private MetricSummary today = new MetricSummary();

    private MetricSummary yesterday = new MetricSummary();

    private List<DailyMetric> dailyTrend = new ArrayList<>();

    private List<DimensionMetric> topPages = new ArrayList<>();

    private List<DimensionMetric> topSources = new ArrayList<>();

    private List<DimensionMetric> deviceDistribution = new ArrayList<>();

    @Data
    public static class MetricSummary implements Serializable {

        private Long pv = 0L;

        private Long uv = 0L;

        private Long dau = 0L;

        private Long loggedInVisitors = 0L;

        private Double pvChangeRate = 0D;

        private Double uvChangeRate = 0D;

        private Double dauChangeRate = 0D;

        private Double loggedInVisitorsChangeRate = 0D;

        private static final long serialVersionUID = 1L;
    }

    @Data
    public static class DailyMetric implements Serializable {

        private LocalDate date;

        private Long pv = 0L;

        private Long uv = 0L;

        private Long dau = 0L;

        private Long loggedInVisitors = 0L;

        private static final long serialVersionUID = 1L;
    }

    @Data
    public static class DimensionMetric implements Serializable {

        private String name;

        private Long pv = 0L;

        private Long uv = 0L;

        private Long dau = 0L;

        private Double percentage = 0D;

        private static final long serialVersionUID = 1L;
    }

    private static final long serialVersionUID = 1L;
}
