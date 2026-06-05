package com.yupi.springbootinit.model.vo.dashboard;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import lombok.Data;

@Data
public class DashboardOverviewVO implements Serializable {

    private UserStats user = new UserStats();

    private ContentStats content = new ContentStats();

    private CommerceStats commerce = new CommerceStats();

    private PointStats point = new PointStats();

    private ImageGenerationStats imageGeneration = new ImageGenerationStats();

    private LatestImportBatch latestImportBatch;

    @Data
    public static class UserStats implements Serializable {

        private Long total = 0L;

        private Long todayNew = 0L;

        private Long plus = 0L;

        private Long pro = 0L;

        private static final long serialVersionUID = 1L;
    }

    @Data
    public static class ContentStats implements Serializable {

        private Long artworkTotal = 0L;

        private Long promptAssetTotal = 0L;

        private Long promptAssetPublished = 0L;

        private Long promptAssetUnpublished = 0L;

        private Long promptFavoriteTotal = 0L;

        private static final long serialVersionUID = 1L;
    }

    @Data
    public static class CommerceStats implements Serializable {

        private Long todayArtworkOrders = 0L;

        private Long todayMemberOrders = 0L;

        private BigDecimal todayOrderAmount = BigDecimal.ZERO;

        private Long pendingOrders = 0L;

        private static final long serialVersionUID = 1L;
    }

    @Data
    public static class PointStats implements Serializable {

        private Long todayGranted = 0L;

        private Long todayDeducted = 0L;

        private Long totalBalance = 0L;

        private static final long serialVersionUID = 1L;
    }

    @Data
    public static class ImageGenerationStats implements Serializable {

        private Long todayTasks = 0L;

        private Long pendingTasks = 0L;

        private Long runningTasks = 0L;

        private Long successTasks = 0L;

        private Long failedTasks = 0L;

        private Long timeoutPendingTasks = 0L;

        private Long todayPointCost = 0L;

        private BigDecimal todayApiCostCny = BigDecimal.ZERO;

        private BigDecimal todayManualCostCny = BigDecimal.ZERO;

        private static final long serialVersionUID = 1L;
    }

    @Data
    public static class LatestImportBatch implements Serializable {

        private Long id;

        private String status;

        private Integer totalCount;

        private Integer insertCount;

        private Integer updateCount;

        private Integer errorCount;

        private Date startedAt;

        private Date finishedAt;

        private static final long serialVersionUID = 1L;
    }

    private static final long serialVersionUID = 1L;
}
