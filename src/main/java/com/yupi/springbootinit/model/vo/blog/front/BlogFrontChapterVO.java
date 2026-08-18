package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class BlogFrontChapterVO implements Serializable {
    private Long id;
    private String title;
    private String description;
    private Integer sort;
    private Integer postCount;
    private List<BlogFrontPostOutlineVO> posts;

    private static final long serialVersionUID = 1L;
}
