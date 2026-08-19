package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName("ai_task_config")
@Data
public class AiTaskConfig implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String taskCode;
    private String providerCode;
    private String taskName;
    private String systemPrompt;
    private Integer maxResultCount;
    private Integer status;
    private Date createTime;
    private Date updateTime;
    @TableLogic
    private Integer isDelete;

    private static final long serialVersionUID = 1L;
}
