package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName("blog_post_revision")
@Data
public class BlogPostRevision implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long postId;
    private Integer revisionNo;
    private String title;
    private String summary;
    private String coverUrl;
    private String contentJson;
    private String contentHtml;
    private Long createdBy;
    private Date createTime;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
