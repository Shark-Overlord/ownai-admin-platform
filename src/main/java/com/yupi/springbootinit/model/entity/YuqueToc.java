package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "yuque_toc")
@Data
public class YuqueToc implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long bookId;

    private Long docId;

    private Long parentId;

    private String title;

    private String slug;

    private Integer depth;

    private Integer sort;

    private Date createTime;

    private Date updateTime;

    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
