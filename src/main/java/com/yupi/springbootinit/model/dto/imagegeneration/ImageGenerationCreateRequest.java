package com.yupi.springbootinit.model.dto.imagegeneration;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageGenerationCreateRequest implements Serializable {

    private String conversationId;

    private String prompt;

    private String aspectRatio;

    private String providerCode;

    private String modelCode;

    private String imageSize;

    private Integer imageCount;

    private String generationMode;

    private String referenceImageUrl;

    private Long sourcePromptAssetId;

    private static final long serialVersionUID = 1L;
}
