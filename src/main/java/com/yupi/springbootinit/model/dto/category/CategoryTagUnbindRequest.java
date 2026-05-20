package com.yupi.springbootinit.model.dto.category;

import java.io.Serializable;
import lombok.Data;

@Data
public class CategoryTagUnbindRequest implements Serializable {

    private Long categoryId;

    private Long tagId;

    private static final long serialVersionUID = 1L;
}
