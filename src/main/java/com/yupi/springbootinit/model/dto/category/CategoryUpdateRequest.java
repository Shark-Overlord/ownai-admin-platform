package com.yupi.springbootinit.model.dto.category;

import java.io.Serializable;
import lombok.Data;

@Data
public class CategoryUpdateRequest implements Serializable {

    private Long id;

    private String name;

    private String description;

    private Integer sort;

    private static final long serialVersionUID = 1L;
}
