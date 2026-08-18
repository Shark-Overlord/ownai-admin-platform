package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class BlogPostBatchRequest implements Serializable {

    private List<Long> ids;
    private Integer memberOnly;

    private static final long serialVersionUID = 1L;
}
