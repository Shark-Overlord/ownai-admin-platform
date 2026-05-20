package com.yupi.springbootinit.model.dto.tag;

import java.io.Serializable;
import lombok.Data;

@Data
public class TagAddRequest implements Serializable {

    private String name;

    private String description;

    private Integer sort;

    private static final long serialVersionUID = 1L;
}
