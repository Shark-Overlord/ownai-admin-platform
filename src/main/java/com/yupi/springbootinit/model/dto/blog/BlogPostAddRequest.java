package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class BlogPostAddRequest implements Serializable {

    private Long categoryId;
    private Long chapterId;
    private List<Long> tagIds;
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

    private static final long serialVersionUID = 1L;
}
