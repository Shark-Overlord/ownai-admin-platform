package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName("blog_post")
@Data
public class BlogPost implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long authorId;
    private Long categoryId;
    private Long chapterId;
    private Integer chapterSort;
    private String title;
    private String slug;
    private String summary;
    private String coverUrl;
    private String contentJson;
    private String contentHtml;
    private Integer contentSchemaVersion;
    private String status;
    private String visibility;
    private Integer memberOnly;
    private String seoTitle;
    private String seoDescription;
    private Date publishedAt;
    private Integer version;
    private Date createTime;
    private Date updateTime;

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
