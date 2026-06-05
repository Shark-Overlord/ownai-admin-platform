package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class ImageGenerationMonitorOverviewVO implements Serializable {

    private Long totalTasks;

    private Long successTasks;

    private Long failedTasks;

    private Long pendingTasks;

    private Long runningTasks;

    private Long timeoutPendingTasks;

    private Integer pendingTimeoutMinutes;

    private Long totalImages;

    private Long totalPointCost;

    private BigDecimal totalApiCostCny;

    private BigDecimal totalManualCostCny;

    private BigDecimal successRate;

    private BigDecimal avgDurationSeconds;

    private Map<String, Long> statusDistribution = new LinkedHashMap<>();

    private List<ImageGenerationDailyTrendVO> dailyTrend = new ArrayList<>();

    private static final long serialVersionUID = 1L;
}
