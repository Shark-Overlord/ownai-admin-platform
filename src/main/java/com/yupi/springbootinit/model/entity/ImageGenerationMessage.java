package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import lombok.Data;

@TableName(value = "image_generation_message")
@Data
public class ImageGenerationMessage implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
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

    private String generationMode;

    private Integer imageCount;

    private Integer pointCost;

    private BigDecimal apiCostCny;

    private BigDecimal manualCostCny;

    private String pointStatus;

    private Date startedTime;

    private Date finishedTime;

    private String resultImageUrls;

    private String requestPayload;

    private String responsePayload;

    private String errorMessage;

    private Date createTime;

    private Date updateTime;

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
