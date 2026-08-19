package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.constant.AiTaskConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.BlogBookMapper;
import com.yupi.springbootinit.mapper.BlogPostMapper;
import com.yupi.springbootinit.model.dto.blog.BlogAiSeoGenerateRequest;
import com.yupi.springbootinit.model.dto.blog.BlogAiSlugGenerateRequest;
import com.yupi.springbootinit.model.vo.blog.BlogAiSeoVO;
import com.yupi.springbootinit.model.vo.blog.BlogAiSlugVO;
import com.yupi.springbootinit.service.impl.BlogAiServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BlogAiServiceImplTest {

    @Mock
    private AiConfigService aiConfigService;
    @Mock
    private BlogBookMapper blogBookMapper;
    @Mock
    private BlogPostMapper blogPostMapper;
    @InjectMocks
    private BlogAiServiceImpl service;

    @Test
    void generatesNormalizedUniqueBookSlug() {
        when(aiConfigService.executeTask(eq(AiTaskConstant.BLOG_SLUG_GENERATION), any()))
                .thenReturn("```json\n{\"slug\":\" Hello, Agent World! \"}\n```");
        when(blogBookMapper.selectCount(any())).thenReturn(1L, 0L);
        BlogAiSlugGenerateRequest request = new BlogAiSlugGenerateRequest();
        request.setResourceType("book");
        request.setTitle("从零开始构建 Agent");

        BlogAiSlugVO result = service.generateSlug(request);

        assertEquals("hello-agent-world-2", result.getSlug());
    }

    @Test
    void generatesAndLimitsChineseSeoMetadata() {
        String longTitle = repeat("标题", 40);
        String longDescription = repeat("这是教程描述", 40);
        when(aiConfigService.executeTask(eq(AiTaskConstant.BLOG_SEO_GENERATION), any()))
                .thenReturn("{\"seoTitle\":\"" + longTitle + "\",\"seoDescription\":\"" + longDescription + "\"}");
        BlogAiSeoGenerateRequest request = new BlogAiSeoGenerateRequest();
        request.setResourceType("post");
        request.setTitle("代理工程入门");

        BlogAiSeoVO result = service.generateSeo(request);

        assertEquals(60, result.getSeoTitle().length());
        assertEquals(160, result.getSeoDescription().length());
    }

    @Test
    void rejectsUnsupportedResourceType() {
        BlogAiSlugGenerateRequest request = new BlogAiSlugGenerateRequest();
        request.setResourceType("chapter");
        request.setTitle("测试");
        assertThrows(BusinessException.class, () -> service.generateSlug(request));
    }

    @Test
    void rejectsMalformedAiJson() {
        when(aiConfigService.executeTask(eq(AiTaskConstant.BLOG_SLUG_GENERATION), any()))
                .thenReturn("not-json");
        BlogAiSlugGenerateRequest request = new BlogAiSlugGenerateRequest();
        request.setResourceType("post");
        request.setTitle("测试");
        assertThrows(BusinessException.class, () -> service.generateSlug(request));
    }

    private String repeat(String value, int count) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < count; i++) {
            builder.append(value);
        }
        return builder.toString();
    }
}
