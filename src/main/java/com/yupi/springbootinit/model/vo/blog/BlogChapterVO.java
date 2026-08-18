package com.yupi.springbootinit.model.vo.blog;

import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class BlogChapterVO implements Serializable {
    private Long id;
    private Long bookId;
    private String title;
    private String description;
    private Integer sort;
    private Integer postCount;
    private Integer publishedPostCount;
    private List<BlogPostVO> posts;
    private Date createTime;
    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
