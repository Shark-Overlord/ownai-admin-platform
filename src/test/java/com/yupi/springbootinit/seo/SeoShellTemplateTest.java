package com.yupi.springbootinit.seo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class SeoShellTemplateTest {

    private static final String SHELL = "<!doctype html>\n<html lang=\"zh-CN\">\n  <head>\n"
            + "    <meta charset=\"UTF-8\" />\n"
            + "    <meta\n      name=\"description\"\n      content=\"站点描述\"\n    />\n"
            + "    <meta name=\"robots\" content=\"index, follow\" />\n"
            + "    <link rel=\"canonical\" href=\"https://ownai.icu/\" />\n"
            + "    <meta property=\"og:site_name\" content=\"OwnAI\" />\n"
            + "    <meta property=\"og:title\" content=\"站点标题\" />\n"
            + "    <meta name=\"twitter:image\" content=\"https://ownai.icu/a.png\" />\n"
            + "    <title>站点标题</title>\n"
            + "    <script id=\"site-structured-data\" type=\"application/ld+json\">{}</script>\n"
            + "    <script type=\"module\" crossorigin src=\"/assets/index-abc.js\"></script>\n"
            + "  </head>\n  <body>\n"
            + "    <h1 style=\"position:absolute\">\n      OwnAI 站点标题\n    </h1>\n"
            + "    <div id=\"root\"></div>\n  </body>\n</html>\n";

    @Test
    void injectReplacesRouteMetadataAndRoot() {
        SeoPage page = new SeoPage();
        page.setTitle("文章 <标题> · OwnAI 教程");
        page.setDescription("文章 \"摘要\"");
        page.setCanonical("https://ownai.icu/tutorials/posts/1");
        page.setImage("https://ownai.icu/cover.png");
        page.setType("article");
        page.setJsonLd("{\"headline\":\"x<\\/script>\"}");
        page.setBodyHtml("<article><h1>文章</h1><p>正文</p></article>");

        String html = SeoShellTemplate.inject(SHELL, page);

        assertEquals(1, count(html, "<title>"));
        assertTrue(html.contains("<title>文章 &lt;标题&gt; · OwnAI 教程</title>"));
        assertEquals(1, count(html, "name=\"description\""));
        assertTrue(html.contains("content=\"文章 &quot;摘要&quot;\""));
        assertFalse(html.contains("站点描述"));
        assertEquals(1, count(html, "rel=\"canonical\""));
        assertTrue(html.contains("href=\"https://ownai.icu/tutorials/posts/1\""));
        assertTrue(html.contains("property=\"og:type\" content=\"article\""));
        assertTrue(html.contains("property=\"og:site_name\""), "site-wide og tags stay");
        assertTrue(html.contains("id=\"site-structured-data\""), "site JSON-LD stays");
        assertTrue(html.contains("<script id=\"ssr-structured-data\" type=\"application/ld+json\">"));
        assertTrue(html.contains("/assets/index-abc.js"), "asset tags stay");
        assertFalse(html.contains("OwnAI 站点标题"), "shell h1 dropped when route has its own h1");
        assertTrue(html.contains("<div id=\"root\"><div data-ssr-fallback=\"\""));
        assertTrue(html.contains("<p>正文</p></article></div></div>"));
        assertTrue(html.indexOf("ssr-structured-data") < html.indexOf("</head>"));
    }

    @Test
    void bodyOnlyPageKeepsShellHead() {
        SeoPage page = new SeoPage();
        page.setBodyHtml("<main><p>首页</p></main>");

        String html = SeoShellTemplate.inject(SHELL, page);

        assertTrue(html.contains("<title>站点标题</title>"));
        assertTrue(html.contains("站点描述"));
        assertTrue(html.contains("OwnAI 站点标题"), "no route h1, keep shell h1");
        assertTrue(html.contains("<main><p>首页</p></main>"));
    }

    @Test
    void notFoundPageKeepsRootEmpty() {
        String html = SeoShellTemplate.inject(SHELL, SeoPage.notFound());

        assertTrue(html.contains("name=\"robots\" content=\"noindex, nofollow\""));
        assertEquals(1, count(html, "name=\"robots\""));
        assertTrue(html.contains(SeoShellTemplate.ROOT_PLACEHOLDER));
    }

    private static int count(String source, String needle) {
        int count = 0;
        for (int index = source.indexOf(needle); index >= 0; index = source.indexOf(needle, index + 1)) {
            count++;
        }
        return count;
    }
}
