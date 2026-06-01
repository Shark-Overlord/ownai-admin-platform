package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class ImageGenerationConversationSummaryVO implements Serializable {

    private String conversationId;

    private Long userId;

    private Long messageCount;

    private Long taskCount;

    private Long successCount;

    private Long failedCount;

    private Long pendingCount;

    private Long runningCount;

    private Long timeoutPendingCount;

    private Long totalPointCost;

    private BigDecimal totalApiCostCny;

    private BigDecimal totalManualCostCny;

    private Date firstCreateTime;

    private Date lastUpdateTime;

    private List<String> thumbnailUrls = new ArrayList<>();

    private static final long serialVersionUID = 1L;
}
