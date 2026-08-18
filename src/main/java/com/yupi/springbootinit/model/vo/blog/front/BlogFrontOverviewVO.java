package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogFrontOverviewVO implements Serializable {
    private Long bookCount;
    private Long publishedPostCount;
    private Long freeBookCount;
    private Long memberBookCount;

    private static final long serialVersionUID = 1L;
}
