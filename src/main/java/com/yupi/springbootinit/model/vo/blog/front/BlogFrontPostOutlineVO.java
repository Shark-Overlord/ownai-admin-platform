package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class BlogFrontPostOutlineVO implements Serializable {
    private Long id;
    private Long categoryId;
    private Long bookId;
    private String bookTitle;
    private String bookSlug;
    private Long chapterId;
    private String chapterTitle;
    private Integer chapterSort;
    private String title;
    private String slug;
    private String summary;
    private String coverUrl;
    private List<BlogFrontTaxonomyVO> tags;
    private Integer memberOnly;
    private Boolean canAccess;
    private Boolean favorited;
    private Integer favoriteCount;
    private Date publishedAt;
    private Long readCount;
    private Long uniqueReaderCount;

    private static final long serialVersionUID = 1L;
}
