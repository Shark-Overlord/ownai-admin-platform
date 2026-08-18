package com.yupi.springbootinit.model.dto.blog;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class BlogBookQueryRequest extends PageRequest implements Serializable {

    private String keyword;
    private Long categoryId;
    private String status;

    private static final long serialVersionUID = 1L;
}
