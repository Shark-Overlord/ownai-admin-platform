package com.yupi.springbootinit.model.vo.promptasset;

import com.yupi.springbootinit.model.vo.TagVO;
import com.yupi.springbootinit.model.vo.CategoryVO;
import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class PromptAssetVO implements Serializable {

    private Long id;

    private String assetType;

    private Long categoryId;

    private CategoryVO category;

    private String title;

    private String summary;

    private String promptContent;

    private String promptCn;

    private String coverUrl;

    private String previewMediaUrl;

    private String mediaType;

    private String sourceName;

    private Long sourcePairId;

    private String sourceRepoName;

    private String sourceRepoUrl;

    private String sourcePageUrl;

    private String sourceCloudStorageUrl;

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

    private Integer memberOnly;

    private Integer status;

    private Integer sort;

    private List<PromptAssetMediaVO> mediaList;

    private List<TagVO> tagList;

    private Date createTime;

    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
