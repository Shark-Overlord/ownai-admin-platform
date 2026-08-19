package com.yupi.springbootinit.model.vo.blog;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BlogAiSlugVO implements Serializable {
    private String slug;
    private static final long serialVersionUID = 1L;
}
