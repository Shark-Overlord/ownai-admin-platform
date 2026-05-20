package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "point_record")
@Data
public class PointRecord implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long userId;

    private String changeType;

    private Integer changeAmount;

    private Integer balanceAfter;

    private String relatedType;

    private Long relatedId;

    private String description;

    private Date createTime;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
