package com.yupi.springbootinit.model.vo;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class TagVO implements Serializable {

    private Long id;

    private String name;

    private String description;

    private Integer sort;

    private Date createTime;

    private static final long serialVersionUID = 1L;
}
