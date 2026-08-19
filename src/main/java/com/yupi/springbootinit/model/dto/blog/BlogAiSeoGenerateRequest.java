package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogAiSeoGenerateRequest implements Serializable {
    private String resourceType;
    private String title;
    private String summary;
    private String contentText;
    private static final long serialVersionUID = 1L;
}
