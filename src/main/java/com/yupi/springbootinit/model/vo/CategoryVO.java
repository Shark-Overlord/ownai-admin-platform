package com.yupi.springbootinit.model.vo;

import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class CategoryVO implements Serializable {

    private Long id;

    private Long parentId;

    private String name;

    private String description;

    private Integer sort;

    private Date createTime;

    private List<CategoryVO> children;

    private List<TagVO> tags;

    private static final long serialVersionUID = 1L;
}
