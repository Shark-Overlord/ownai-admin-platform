package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ImageGenerationDailyTrendVO implements Serializable {

    private String date;

    private Long totalTasks;

    private Long successTasks;

    private Long totalImages;

    private Long totalPointCost;

    private BigDecimal totalApiCostCny;

    private BigDecimal totalManualCostCny;

    private static final long serialVersionUID = 1L;
}
