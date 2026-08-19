package com.yupi.springbootinit.service;

import com.yupi.springbootinit.model.dto.blog.BlogAiSeoGenerateRequest;
import com.yupi.springbootinit.model.dto.blog.BlogAiSlugGenerateRequest;
import com.yupi.springbootinit.model.vo.blog.BlogAiSeoVO;
import com.yupi.springbootinit.model.vo.blog.BlogAiSlugVO;

public interface BlogAiService {
    BlogAiSlugVO generateSlug(BlogAiSlugGenerateRequest request);
    BlogAiSeoVO generateSeo(BlogAiSeoGenerateRequest request);
}
