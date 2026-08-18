package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogCategorySaveRequest implements Serializable {

    private Long id;
    private String name;
    private String slug;
    private String description;
    private String coverUrl;
    private Integer sort;
    private String status;

    private static final long serialVersionUID = 1L;
}
