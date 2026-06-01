package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class ImageGenerationMessageVO implements Serializable {

    private Long id;

    private Long userId;

    private String conversationId;

    private String role;

    private String prompt;

    private String aspectRatio;

    private String referenceImageUrl;

    private Long sourcePromptAssetId;

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

    private String pointStatus;

    private Date startedTime;

    private Date finishedTime;

    private Boolean timeoutPending;

    private Long pendingAgeSeconds;

    private String resultImageUrls;

    private List<String> resultImageUrlList = new ArrayList<>();

    private List<String> thumbnailUrls = new ArrayList<>();

    private String requestPayload;

    private String responsePayload;

    private String errorMessage;

    private Date createTime;

    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
