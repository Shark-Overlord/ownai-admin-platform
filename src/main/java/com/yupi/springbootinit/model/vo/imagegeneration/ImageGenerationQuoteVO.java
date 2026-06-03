package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageGenerationQuoteVO implements Serializable {

    private String providerCode;

    private String providerName;

    private String modelCode;

    private String imageSize;

    private String aspectRatio;

    private String vendorSize;

    private String generationMode;

    private Integer imageCount;

    private Integer unitPointCost;

    private Integer pointCost;

    private Integer pointBalance;

    private Boolean enough;

    private static final long serialVersionUID = 1L;
}
