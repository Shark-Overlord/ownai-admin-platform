package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogBookSaveRequest implements Serializable {

    private Long id;
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

    private static final long serialVersionUID = 1L;
}
