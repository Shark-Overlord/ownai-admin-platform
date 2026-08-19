package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogAiSlugGenerateRequest implements Serializable {
    private String resourceType;
    private String title;
    private Long excludeId;
    private static final long serialVersionUID = 1L;
}
