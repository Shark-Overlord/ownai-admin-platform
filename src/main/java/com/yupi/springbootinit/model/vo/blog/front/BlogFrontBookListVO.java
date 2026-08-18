package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class BlogFrontBookListVO implements Serializable {
    private Long id;
    private String title;
    private String slug;
    private String summary;
    private String coverUrl;
    private BlogFrontTaxonomyVO category;
    private List<BlogFrontTaxonomyVO> tags;
    private Integer memberOnly;
    private String accessType;
    private Boolean canAccessAll;
    private Integer chapterCount;
    private Integer publishedPostCount;
    private Integer freePostCount;
    private Integer memberPostCount;
    private Boolean favorited;
    private Integer favoriteCount;
    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
