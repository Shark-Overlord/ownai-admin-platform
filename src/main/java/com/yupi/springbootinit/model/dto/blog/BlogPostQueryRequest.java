package com.yupi.springbootinit.model.dto.blog;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class BlogPostQueryRequest extends PageRequest implements Serializable {

    private String keyword;
    private Long categoryId;
    private Long bookId;
    private Long chapterId;
    private Boolean standaloneOnly;
    private Long tagId;
    private String status;
    private String visibility;
    private Integer memberOnly;

    private static final long serialVersionUID = 1L;
}
