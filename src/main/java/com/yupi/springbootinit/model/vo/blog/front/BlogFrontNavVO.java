package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogFrontNavVO implements Serializable {
    private Long id;
    private String title;
    private String slug;
    private Integer memberOnly;
    private Boolean canAccess;

    private static final long serialVersionUID = 1L;
}
