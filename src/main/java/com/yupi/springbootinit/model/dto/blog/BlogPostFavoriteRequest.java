package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogPostFavoriteRequest implements Serializable {

    private Long id;

    private Long postId;

    private static final long serialVersionUID = 1L;
}
