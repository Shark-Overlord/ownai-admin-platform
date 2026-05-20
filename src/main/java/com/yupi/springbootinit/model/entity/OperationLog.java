package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "operation_log")
@Data
public class OperationLog implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long userId;

    private String module;

    private String action;

    private String requestMethod;

    private String requestUri;

    private String requestParams;

    private Integer status;

    private String errorMessage;

    private Long costTime;

    private Date createTime;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
