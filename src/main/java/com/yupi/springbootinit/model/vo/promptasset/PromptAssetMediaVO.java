package com.yupi.springbootinit.model.vo.promptasset;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class PromptAssetMediaVO implements Serializable {

    private Long id;

    private Long promptAssetId;

    private String mediaType;

    private String originalUrl;

    private String localUrl;

    private String cloudUrl;

    private String thumbnailLocalUrl;

    private String thumbnailCloudUrl;

    private String sourceLocalPath;

    private String fileHash;

    private String cloudStorageProvider;

    private String cloudStorageBucket;

    private String cloudStorageRegion;

    private String cloudStorageKey;

    private String cloudUploadedAt;

    private Integer width;

    private Integer height;

    private Long fileSize;

    private Integer sort;

    private Date createTime;

    private static final long serialVersionUID = 1L;
}
