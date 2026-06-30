package com.yupi.springbootinit.model.dto.yuque;

import java.io.Serializable;
import lombok.Data;

@Data
public class YuqueDocUpdateRequest implements Serializable {

    private Long id;

    private String title;

    private String description;

    private String coverUrl;

    private String visibility;

    private String status;

    private static final long serialVersionUID = 1L;
}
