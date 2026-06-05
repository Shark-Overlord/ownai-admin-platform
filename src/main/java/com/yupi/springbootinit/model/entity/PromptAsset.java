package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "prompt_asset")
@Data
public class PromptAsset implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String assetType;

    private Long categoryId;

    private String title;

    private String summary;

    private String promptContent;

    private String promptCn;

    private String coverUrl;

    private String previewMediaUrl;

    private String mediaType;

    private String sourceName;

    private Long sourcePairId;

    private Long sourceRepoId;

    private String sourceRepoName;

    private String sourceRepoUrl;

    private String sourcePageUrl;

    private String sourceImageOriginalUrl;

    private String sourceImageLocalPath;

    private String sourceImageHash;

    private String sourceCloudStorageUrl;

    private String sourceThumbnailLocalPath;

    private String sourceThumbnailCloudStorageUrl;

    private String cloudStorageProvider;

    private String cloudStorageBucket;

    private String cloudStorageRegion;

    private String cloudStorageKey;

    private String cloudUploadedAt;

    private String visualAssetType;

    private String scenario;

    private String visualStyle;

    private String qualityLevel;

    private String selectionStatus;

    private String license;

    private String commercialRisk;

    private String assetTagText;

    private Integer aiTagStatus;

    private Integer memberOnly;

    private Integer status;

    private Integer sort;

    private String syncKey;

    private String sourceCreatedAt;

    private String sourceUpdatedAt;

    private Date createTime;

    private Date updateTime;

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
