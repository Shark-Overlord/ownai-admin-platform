package com.yupi.springbootinit.model.dto.category;

import java.io.Serializable;
import lombok.Data;

@Data
public class CategoryTagAddRequest implements Serializable {

    private Long categoryId;

    private String tagName;

    private Integer sort;

    private static final long serialVersionUID = 1L;
}
