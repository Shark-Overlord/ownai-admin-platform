package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class BlogFrontFiltersVO implements Serializable {
    private List<BlogFrontFilterOptionVO> categories;
    private List<BlogFrontFilterOptionVO> tags;

    private static final long serialVersionUID = 1L;
}
