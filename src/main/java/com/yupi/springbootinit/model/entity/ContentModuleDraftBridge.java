package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
@TableName("content_module_draft_bridge")
public class ContentModuleDraftBridge implements Serializable {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String resourceType;
    private Long targetId;
    private Long draftId;
    private String baseVersion;
    private String originalUniqueValue;
    private Long createUserId;
    private Date createTime;
    private Date updateTime;
    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
