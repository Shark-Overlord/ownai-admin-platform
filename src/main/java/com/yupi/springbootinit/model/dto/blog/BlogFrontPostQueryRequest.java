package com.yupi.springbootinit.model.dto.blog;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class BlogFrontPostQueryRequest extends PageRequest implements Serializable {

    private String keyword;
    private Long categoryId;
    private Long tagId;
    private Integer memberOnly;
    /** Defaults to true so this endpoint lists independent articles. */
    private Boolean standaloneOnly = true;
    /** latest, popular */
    private String sort;

    private static final long serialVersionUID = 1L;
}
