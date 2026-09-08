package com.yupi.springbootinit.model.vo.blog;

import com.yupi.springbootinit.model.vo.NativeDraftAwareVO;
import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class BlogPostVO implements Serializable, NativeDraftAwareVO {

    private Long id;
    private Long authorId;
    private Long categoryId;
    private BlogCategoryVO category;
    private Long bookId;
    private String bookTitle;
    private String bookSlug;
    private Long chapterId;
    private String chapterTitle;
    private Integer chapterSort;
    private BlogPostNavVO previousPost;
    private BlogPostNavVO nextPost;
    private List<BlogTagVO> tags;
    private String title;
    private String slug;
    private String summary;
    private String coverUrl;
    private String contentJson;
    private String contentHtml;
    private Integer contentSchemaVersion;
    private String status;
    private Boolean hasUnpublishedChanges;
    private Long unpublishedDraftId;
    private Long replacesResourceId;
    private String visibility;
    private Integer memberOnly;
    private Boolean canAccess;
    private String seoTitle;
    private String seoDescription;
    private Date publishedAt;
    private Integer version;
    private Date createTime;
    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
