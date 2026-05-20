package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "category_tag")
@Data
public class CategoryTag implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long categoryId;

    private Long tagId;

    private Integer sort;

    private Date createTime;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
