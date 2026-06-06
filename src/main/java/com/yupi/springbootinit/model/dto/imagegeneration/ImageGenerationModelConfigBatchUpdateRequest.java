package com.yupi.springbootinit.model.dto.imagegeneration;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ImageGenerationModelConfigBatchUpdateRequest implements Serializable {

    private String providerCode;

    private String modelCode;

    private String sizeCode;

    private Integer pointCost;

    private Integer manualPointCost;

    private BigDecimal apiInputCostCny;

    private BigDecimal apiOutputCostCny;

    private BigDecimal manualCostCny;

    private Integer supportsReferenceImage;

    private Integer status;

    private static final long serialVersionUID = 1L;
}
