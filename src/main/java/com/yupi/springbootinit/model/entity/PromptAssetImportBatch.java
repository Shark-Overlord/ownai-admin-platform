package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "prompt_asset_import_batch")
@Data
public class PromptAssetImportBatch implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String sourceName;

    private String sourceDbName;

    private String importMode;

    private String assetTypeFilter;

    private Long categoryId;

    private Integer syncTagsToCategory;

    private Integer dryRun;

    private String status;

    private Integer totalCount;

    private Integer insertCount;

    private Integer updateCount;

    private Integer skipCount;

    private Integer errorCount;

    private Date startedAt;

    private Date finishedAt;

    private String summary;

    private String errorMessage;

    private Date createTime;

    private Date updateTime;

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
