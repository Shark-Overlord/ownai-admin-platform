package com.yupi.springbootinit.model.vo.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogPostNavVO implements Serializable {
    private Long id;
    private String title;
    private String slug;

    private static final long serialVersionUID = 1L;
}
