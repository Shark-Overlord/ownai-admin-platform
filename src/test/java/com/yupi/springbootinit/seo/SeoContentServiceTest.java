package com.yupi.springbootinit.seo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogFrontBookQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogFrontPostQueryRequest;
import com.yupi.springbootinit.model.vo.artwork.ArtworkDetailVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontBookListVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostDetailVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostOutlineVO;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.BlogFrontService;
import java.util.Arrays;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

class SeoContentServiceTest {

    private BlogFrontService blogFrontService;
    private ArtworkService artworkService;
    private SeoContentService service;

    @BeforeEach
    void setUp() {
        blogFrontService = Mockito.mock(BlogFrontService.class);
        artworkService = Mockito.mock(ArtworkService.class);
        service = new SeoContentService();
        ReflectionTestUtils.setField(service, "blogFrontService", blogFrontService);
        ReflectionTestUtils.setField(service, "artworkService", artworkService);
        ReflectionTestUtils.setField(service, "objectMapper", new ObjectMapper());
    }

    @Test
    void publicPostRendersArticleAndStructuredData() {
        BlogFrontPostDetailVO post = new BlogFrontPostDetailVO();
        post.setId(42L);
        post.setTitle("Vibe Coding 入门");
        post.setSummary("三步写出可用的落地页提示词");
        post.setContentHtml("<h1 id=\"top\">大标题</h1><h2>第一步</h2><p>先写结构</p>");
        post.setPublishedAt(new Date(0));
        post.setUpdateTime(new Date(86_400_000L));
        when(blogFrontService.getPost(eq(42L), isNull())).thenReturn(post);

        SeoPage page = service.resolve("/tutorials/posts/42/");

        assertNotNull(page);
        assertEquals(200, page.getStatus());
        assertEquals("Vibe Coding 入门 · OwnAI 教程", page.getTitle());
        assertEquals("https://ownai.icu/tutorials/posts/42", page.getCanonical());
        assertEquals("article", page.getType());
        assertTrue(page.getBodyHtml().contains("<h1>Vibe Coding 入门</h1>"));
        assertTrue(page.getBodyHtml().contains("<p>先写结构</p>"));
        assertTrue(page.getBodyHtml().contains("<h2 id=\"top\">大标题</h2>"));
        assertEquals(page.getBodyHtml().indexOf("<h1"), page.getBodyHtml().lastIndexOf("<h1"), "single h1");
        assertTrue(page.getJsonLd().contains("\"@type\":\"Article\""));
        assertTrue(page.getJsonLd().contains("\"dateModified\":\"1970-01-02T08:00:00+08:00\""));
        assertTrue(page.getJsonLd().contains("\"@type\":\"BreadcrumbList\""));
    }

    @Test
    void renderedPagesAreCached() {
        BlogFrontPostDetailVO post = new BlogFrontPostDetailVO();
        post.setId(7L);
        post.setTitle("缓存");
        when(blogFrontService.getPost(eq(7L), isNull())).thenReturn(post);

        service.resolve("/tutorials/posts/7");
        service.resolve("/tutorials/posts/7");

        verify(blogFrontService, times(1)).getPost(eq(7L), isNull());
    }

    @Test
    void gatedPostFallsBackToShellAndMissingPostIs404() {
        when(blogFrontService.getPost(eq(1L), isNull()))
                .thenThrow(new BusinessException(ErrorCode.FORBIDDEN_ERROR, "会员专享"));
        when(blogFrontService.getPost(eq(2L), isNull()))
                .thenThrow(new BusinessException(ErrorCode.NOT_FOUND_ERROR));

        assertNull(service.resolve("/tutorials/posts/1"));
        SeoPage missing = service.resolve("/tutorials/posts/2");
        assertEquals(404, missing.getStatus());
        assertEquals("noindex, nofollow", missing.getRobots());
    }

    @Test
    void unsupportedPathsNeverHitTheDatabase() {
        assertNull(service.resolve("/pricing"));
        assertNull(service.resolve("/tutorials/posts/abc"));
        assertNull(service.resolve("tutorials"));
        assertNull(service.resolve("/tutorials/posts/99999999999999999999"), "20 digits never match");
        assertEquals(404, service.resolve("/tutorials/posts/9999999999999999999").getStatus(), "overflows long");
        verify(blogFrontService, never()).getPost(any(), any());
        verify(blogFrontService, never()).listPosts(any(), any());
    }

    @Test
    void sitemapAndLlmsOnlyListPublicContent() {
        BlogFrontBookListVO freeBook = book(10L, 0, "免费教程");
        BlogFrontBookListVO memberBook = book(11L, 1, "会员教程");
        when(blogFrontService.listBooks(any(BlogFrontBookQueryRequest.class), isNull()))
                .thenReturn(page(Arrays.asList(freeBook, memberBook)));
        BlogFrontPostOutlineVO free = post(100L, 0, true, null, "免费文章");
        BlogFrontPostOutlineVO inFreeBook = post(101L, 0, true, 10L, "免费书内文章");
        BlogFrontPostOutlineVO member = post(102L, 1, false, null, "会员文章");
        BlogFrontPostOutlineVO inMemberBook = post(103L, 0, false, 11L, "会员书内文章");
        when(blogFrontService.listPosts(any(BlogFrontPostQueryRequest.class), isNull()))
                .thenReturn(page(Arrays.asList(free, inFreeBook, member, inMemberBook)));

        String sitemap = service.sitemapXml();
        String llms = service.llmsTxt();

        assertTrue(sitemap.contains("<loc>https://ownai.icu/</loc>"));
        assertTrue(sitemap.contains("<loc>https://ownai.icu/tutorials/books/10</loc>"));
        assertTrue(sitemap.contains("<loc>https://ownai.icu/tutorials/posts/100</loc>"));
        assertTrue(sitemap.contains("<loc>https://ownai.icu/tutorials/posts/101</loc>"));
        assertFalse(sitemap.contains("/tutorials/books/11"));
        assertFalse(sitemap.contains("/tutorials/posts/102"));
        assertFalse(sitemap.contains("/tutorials/posts/103"));
        assertTrue(llms.startsWith("# OwnAI\n\n> "));
        assertTrue(llms.contains("- [免费文章](https://ownai.icu/tutorials/posts/100)"));
        assertFalse(llms.contains("会员文章"));
        // Catalog is cached across sitemap and llms.txt.
        verify(blogFrontService, times(1)).listPosts(any(BlogFrontPostQueryRequest.class), isNull());
    }

    @Test
    void freePromptRendersFullPromptText() {
        ArtworkDetailVO artwork = artworkDetail(5L, true, "玻璃拟态登录页");
        artwork.setPromptContent("生成一个 <glass> 登录页");
        artwork.setDescription("第一段\n\n第二段");
        when(artworkService.getPublicArtworkSnapshot(5L)).thenReturn(artwork);

        SeoPage page = service.resolve("/prompts/5");

        assertEquals("玻璃拟态登录页 · 前端提示词 · OwnAI", page.getTitle());
        assertEquals("https://ownai.icu/prompts/5", page.getCanonical());
        assertTrue(page.getBodyHtml().contains("<pre><code>生成一个 &lt;glass&gt; 登录页</code></pre>"));
        assertTrue(page.getBodyHtml().contains("<p>第一段</p><p>第二段</p>"));
        assertTrue(page.getJsonLd().contains("\"isAccessibleForFree\":true"));
    }

    @Test
    void memberPromptNeverRendersPromptText() {
        ArtworkDetailVO artwork = artworkDetail(6L, false, "会员仪表盘");
        // Defensive: even if a caller leaks the text, locked prompts must not render it.
        artwork.setPromptContent("SECRET PROMPT");
        artwork.setHasSourceCode(true);
        when(artworkService.getPublicArtworkSnapshot(6L)).thenReturn(artwork);

        SeoPage page = service.resolve("/prompts/6");

        assertFalse(page.getBodyHtml().contains("SECRET PROMPT"));
        assertTrue(page.getBodyHtml().contains("会员内容"));
        assertTrue(page.getBodyHtml().contains("下载源码"));
        assertTrue(page.getJsonLd().contains("\"isAccessibleForFree\":false"));
    }

    @Test
    void offlinePromptIs404() {
        when(artworkService.getPublicArtworkSnapshot(7L))
                .thenThrow(new BusinessException(ErrorCode.NO_AUTH_ERROR, "作品未发布"));

        assertEquals(404, service.resolve("/prompts/7").getStatus());
    }

    @Test
    void sitemapListsAllPromptsButLlmsOnlyFreeOnes() {
        ArtworkVO free = artwork(20L, true, "免费卡片");
        free.setCreateTime(new Date(2_000L));
        free.setPromptContent("FREE TEXT");
        ArtworkVO member = artwork(21L, false, "会员卡片");
        member.setCreateTime(new Date(1_000L));
        when(artworkService.listArtworkVOByPage(any(ArtworkQueryRequest.class), isNull(), eq(false)))
                .thenReturn(page(Arrays.asList(member, free)));

        String sitemap = service.sitemapXml();
        String llms = service.llmsTxt();
        SeoPage library = service.resolve("/frontend-prompts");

        assertTrue(sitemap.contains("<loc>https://ownai.icu/prompts/20</loc>"));
        assertTrue(sitemap.contains("<loc>https://ownai.icu/prompts/21</loc>"));
        assertTrue(sitemap.contains("<loc>https://ownai.icu/frontend-prompts</loc>"));
        assertTrue(llms.contains("- [免费卡片](https://ownai.icu/prompts/20)"));
        assertFalse(llms.contains("会员卡片"));
        assertFalse(llms.contains("FREE TEXT"));
        assertTrue(library.getBodyHtml().contains("共 2 条提示词，其中 1 条免费公开全文"));
        assertTrue(library.getBodyHtml().indexOf("/prompts/20") < library.getBodyHtml().indexOf("/prompts/21"));
    }

    private static ArtworkVO artwork(Long id, boolean free, String title) {
        ArtworkVO artwork = new ArtworkVO();
        artwork.setId(id);
        artwork.setTitle(title);
        artwork.setMemberOnly(free ? 0 : 1);
        artwork.setCanAccessPrompt(free);
        return artwork;
    }

    private static ArtworkDetailVO artworkDetail(Long id, boolean free, String title) {
        ArtworkDetailVO artwork = new ArtworkDetailVO();
        artwork.setId(id);
        artwork.setTitle(title);
        artwork.setSummary(title + "摘要");
        artwork.setMemberOnly(free ? 0 : 1);
        artwork.setCanAccessPrompt(free);
        return artwork;
    }

    private static BlogFrontBookListVO book(Long id, int memberOnly, String title) {
        BlogFrontBookListVO book = new BlogFrontBookListVO();
        book.setId(id);
        book.setMemberOnly(memberOnly);
        book.setTitle(title);
        return book;
    }

    private static BlogFrontPostOutlineVO post(Long id, int memberOnly, boolean canAccess, Long bookId, String title) {
        BlogFrontPostOutlineVO post = new BlogFrontPostOutlineVO();
        post.setId(id);
        post.setMemberOnly(memberOnly);
        post.setCanAccess(canAccess);
        post.setBookId(bookId);
        post.setTitle(title);
        return post;
    }

    private static <T> Page<T> page(java.util.List<T> records) {
        Page<T> page = new Page<>(1, 20, records.size());
        page.setRecords(records);
        return page;
    }
}
