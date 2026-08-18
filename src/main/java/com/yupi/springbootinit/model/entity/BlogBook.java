package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName("blog_book")
@Data
public class BlogBook implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long authorId;
    private Long categoryId;
    private String title;
    private String slug;
    private String summary;
    private String coverUrl;
    private String seoTitle;
    private String seoDescription;
    private Integer memberOnly;
    private String status;
    private Integer sort;
    private Date createTime;
    private Date updateTime;

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
