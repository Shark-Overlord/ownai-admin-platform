package com.yupi.springbootinit.model.vo.blog;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class BlogTagVO implements Serializable {

    private Long id;
    private String name;
    private String slug;
    private String description;
    private Integer sort;
    private String status;
    private Long postCount;
    private Date createTime;
    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
