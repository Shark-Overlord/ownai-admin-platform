package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class BlogFrontPostDetailVO implements Serializable {
    private Long id;
    private String title;
    private String slug;
    private String summary;
    private String coverUrl;
    private String contentHtml;
    private Integer contentSchemaVersion;
    private BlogFrontTaxonomyVO category;
    private List<BlogFrontTaxonomyVO> tags;
    private Long bookId;
    private String bookTitle;
    private String bookSlug;
    private Long chapterId;
    private String chapterTitle;
    private Integer memberOnly;
    private Boolean canAccess;
    private Boolean favorited;
    private Integer favoriteCount;
    private String seoTitle;
    private String seoDescription;
    private Date publishedAt;
    private Long readCount;
    private Long uniqueReaderCount;
    private BlogFrontNavVO previousPost;
    private BlogFrontNavVO nextPost;

    private static final long serialVersionUID = 1L;
}
