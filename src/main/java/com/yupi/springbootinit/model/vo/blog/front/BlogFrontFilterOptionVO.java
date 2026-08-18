package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogFrontFilterOptionVO implements Serializable {
    private Long id;
    private String name;
    private String slug;
    private Long count;

    private static final long serialVersionUID = 1L;
}
