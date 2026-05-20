package com.yupi.springbootinit.model.dto.category;

import java.io.Serializable;
import lombok.Data;

@Data
public class CategoryTagBindRequest implements Serializable {

    private Long categoryId;

    private Long tagId;

    private Integer sort;

    private static final long serialVersionUID = 1L;
}
