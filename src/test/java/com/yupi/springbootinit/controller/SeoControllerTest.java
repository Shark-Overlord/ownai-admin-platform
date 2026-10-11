package com.yupi.springbootinit.controller;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yupi.springbootinit.seo.SeoContentService;
import com.yupi.springbootinit.seo.SeoPage;
import com.yupi.springbootinit.seo.SeoShellTemplate;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SeoControllerTest {

    @TempDir
    Path tempDir;

    private MockMvc mockMvc;
    private SeoContentService seoContentService;
    private Path indexPath;

    @BeforeEach
    void setUp() throws IOException {
        indexPath = tempDir.resolve("index.html");
        Files.write(indexPath, ("<html><head><title>站点</title></head><body><div id=\"root\"></div></body></html>")
                .getBytes(StandardCharsets.UTF_8));
        seoContentService = Mockito.mock(SeoContentService.class);
        SeoController controller = new SeoController();
        ReflectionTestUtils.setField(controller, "seoContentService", seoContentService);
        ReflectionTestUtils.setField(controller, "seoShellTemplate", new SeoShellTemplate(indexPath.toString()));
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void rendersInjectedHtml() throws Exception {
        SeoPage page = new SeoPage();
        page.setTitle("文章 · OwnAI 教程");
        page.setBodyHtml("<article><h1>文章</h1></article>");
        when(seoContentService.resolve("/tutorials/posts/1")).thenReturn(page);

        mockMvc.perform(get("/seo/render").param("path", "/tutorials/posts/1"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/html")))
                .andExpect(header().string("Cache-Control", "no-cache"))
                .andExpect(content().string(containsString("<title>文章 · OwnAI 教程</title>")))
                .andExpect(content().string(containsString("<article><h1>文章</h1></article>")));
    }

    @Test
    void notFoundKeepsHtmlWith404() throws Exception {
        when(seoContentService.resolve(anyString())).thenReturn(SeoPage.notFound());

        mockMvc.perform(get("/seo/render").param("path", "/tutorials/posts/2"))
                .andExpect(status().isNotFound())
                .andExpect(content().string(containsString("noindex, nofollow")));
    }

    @Test
    void dataFailureStillServesTheShell() throws Exception {
        when(seoContentService.resolve(anyString())).thenThrow(new IllegalStateException("db down"));

        mockMvc.perform(get("/seo/render").param("path", "/tutorials"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("<title>站点</title>")));
    }

    @Test
    void missingShellReturns503SoNginxFallsBack() throws Exception {
        Files.delete(indexPath);

        mockMvc.perform(get("/seo/render").param("path", "/"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void llmsAndSitemapUseTextContentTypes() throws Exception {
        when(seoContentService.llmsTxt()).thenReturn("# OwnAI\n");
        when(seoContentService.sitemapXml()).thenReturn("<urlset/>");

        mockMvc.perform(get("/seo/llms.txt"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/plain")))
                .andExpect(content().string("# OwnAI\n"));
        mockMvc.perform(get("/seo/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("application/xml")));
    }

    @Test
    void sitemapFailureReturns503() throws Exception {
        when(seoContentService.sitemapXml()).thenThrow(new IllegalStateException("db down"));

        mockMvc.perform(get("/seo/sitemap.xml")).andExpect(status().isServiceUnavailable());
    }
}
