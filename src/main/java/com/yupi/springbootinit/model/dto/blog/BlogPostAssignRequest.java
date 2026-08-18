package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogPostAssignRequest implements Serializable {

    private Long postId;
    private Long chapterId;

    private static final long serialVersionUID = 1L;
}
