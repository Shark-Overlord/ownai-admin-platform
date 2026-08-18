package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogPostReadResultVO implements Serializable {

    private Boolean counted;

    private Long readCount;

    private Long uniqueReaderCount;

    private static final long serialVersionUID = 1L;
}
