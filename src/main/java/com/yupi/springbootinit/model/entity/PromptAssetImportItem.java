package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "prompt_asset_import_item")
@Data
public class PromptAssetImportItem implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long batchId;

    private Long sourcePairId;

    private String syncKey;

    private Long targetAssetId;

    private String action;

    private String status;

    private String message;

    private Date createTime;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
