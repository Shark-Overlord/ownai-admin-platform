package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "prompt_asset_favorite")
@Data
public class PromptAssetFavorite implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long userId;

    private Long promptAssetId;

    private Date createTime;

    private Date updateTime;

    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
