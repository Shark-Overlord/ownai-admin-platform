package com.yupi.springbootinit.model.vo.blog;

import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class BlogBookVO implements Serializable {
    private Long id;
    private Long authorId;
    private Long categoryId;
    private BlogCategoryVO category;
    private String title;
    private String slug;
    private String summary;
    private String coverUrl;
    private String seoTitle;
    private String seoDescription;
    private Integer memberOnly;
    private String status;
    private Integer sort;
    private Integer chapterCount;
    private Integer postCount;
    private Integer publishedPostCount;
    private List<BlogChapterVO> chapters;
    private Date createTime;
    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
