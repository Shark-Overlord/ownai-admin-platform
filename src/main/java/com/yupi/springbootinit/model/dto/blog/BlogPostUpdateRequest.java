package com.yupi.springbootinit.model.dto.blog;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class BlogPostUpdateRequest extends BlogPostAddRequest {

    private Long id;
    private Integer version;

    private static final long serialVersionUID = 1L;
}
