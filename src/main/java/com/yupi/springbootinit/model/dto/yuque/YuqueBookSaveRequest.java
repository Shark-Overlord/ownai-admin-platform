package com.yupi.springbootinit.model.dto.yuque;

import java.io.Serializable;
import lombok.Data;

@Data
public class YuqueBookSaveRequest implements Serializable {

    private Long id;

    private String namespace;

    private String slug;

    private String name;

    private String description;

    private String visibility;

    private String status;

    private static final long serialVersionUID = 1L;
}
