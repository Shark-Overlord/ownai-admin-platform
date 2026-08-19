package com.yupi.springbootinit.model.vo.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogAiSeoVO implements Serializable {
    private String seoTitle;
    private String seoDescription;
    private static final long serialVersionUID = 1L;
}
