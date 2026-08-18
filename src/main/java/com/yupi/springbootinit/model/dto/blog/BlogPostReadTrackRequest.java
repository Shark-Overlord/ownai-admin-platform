package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogPostReadTrackRequest implements Serializable {

    private Long postId;

    private String visitorId;

    private Integer durationSeconds;

    private static final long serialVersionUID = 1L;
}
