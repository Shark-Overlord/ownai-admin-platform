package com.yupi.springbootinit.model.vo.yuque;

import java.io.Serializable;
import lombok.Data;

@Data
public class YuqueTocVO implements Serializable {

    private Long id;

    private Long docId;

    private Long parentId;

    private String title;

    private String slug;

    private Integer depth;

    private Integer sort;

    private static final long serialVersionUID = 1L;
}
