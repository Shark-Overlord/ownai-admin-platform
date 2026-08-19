package com.yupi.springbootinit.model.vo.blog.front;

import java.io.Serializable;
import java.util.List;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class BlogFrontBookDetailVO extends BlogFrontBookListVO implements Serializable {
    private String introductionHtml;
    private String seoTitle;
    private String seoDescription;
    private List<BlogFrontChapterVO> chapters;

    private static final long serialVersionUID = 1L;
}
