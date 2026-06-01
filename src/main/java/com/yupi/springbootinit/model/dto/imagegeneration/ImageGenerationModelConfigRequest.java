package com.yupi.springbootinit.model.dto.imagegeneration;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ImageGenerationModelConfigRequest implements Serializable {

    private Long id;

    private String providerCode;

    private String modelCode;

    private String sizeCode;

    private String aspectRatio;

    private String vendorSize;

    private Integer pointCost;

    private Integer manualPointCost;

    private BigDecimal apiInputCostCny;

    private BigDecimal apiOutputCostCny;

    private BigDecimal apiCostCny;

    private BigDecimal manualCostCny;

    private Integer supportsReferenceImage;

    private Integer status;

    private Integer sortOrder;

    private String description;

    private static final long serialVersionUID = 1L;
}
