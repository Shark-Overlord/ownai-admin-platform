package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "prompt_asset_media")
@Data
public class PromptAssetMedia implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
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

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
