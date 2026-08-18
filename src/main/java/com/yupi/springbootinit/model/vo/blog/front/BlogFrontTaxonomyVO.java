package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import lombok.Data;

/**
 * 前台使用的分类、标签轻量信息，避免暴露后台状态和管理字段。
 */
@Data
public class BlogFrontTaxonomyVO implements Serializable {

    private Long id;

    private String name;

    private String slug;

    private String description;

    private String coverUrl;

    private static final long serialVersionUID = 1L;
}
