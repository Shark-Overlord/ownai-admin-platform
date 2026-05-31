package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ImageGenerationCreateVO implements Serializable {

    private String conversationId;

    private Long messageId;

    private Long assistantMessageId;

    private String taskId;

    private String status;

    private String providerCode;

    private String providerName;

    private String modelCode;

    private String vendorModel;

    private String imageSize;

    private String vendorSize;

    private Integer imageCount;

    private Integer pointCost;

    private BigDecimal apiCostCny;

    private static final long serialVersionUID = 1L;
}
