package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.exception.BusinessException;
import org.junit.jupiter.api.Test;

class ContentMarkdownServiceTest {

    private final ContentMarkdownService service = new ContentMarkdownService(new ObjectMapper());

    @Test
    void convertsSupportedChineseMarkdownToTiptapAndSafeHtml() {
        String markdown = "# 中文标题\n\n- 第一项\n- 第二项\n\n"
                + "| 名称 | 值 |\n| --- | --- |\n| A | 1 |\n\n"
                + "```java\nSystem.out.println(\"ok\");\n```\n\n"
                + "![图](https://cdn.example.com/a.png)";

        ContentMarkdownService.ConvertedContent converted = service.convert(markdown);

        assertTrue(converted.getContentJson().contains("\"type\":\"heading\""));
        assertTrue(converted.getContentJson().contains("\"type\":\"table\""));
        assertTrue(converted.getContentJson().contains("中文标题"));
        assertTrue(converted.getContentHtml().contains("<table>"));
        assertTrue(converted.getContentHtml().contains("https://cdn.example.com/a.png"));
    }

    @Test
    void convertsVideoConventionAndRejectsUnsafeMedia() {
        ContentMarkdownService.ConvertedContent converted = service.convert("```video\nhttps://cdn.example.com/a.mp4\n```");
        assertTrue(converted.getContentJson().contains("\"type\":\"video\""));
        assertThrows(BusinessException.class, () -> service.convert("![bad](http://example.com/a.png)"));
    }

    @Test
    void rawHtmlCannotBecomeExecutableHtml() {
        assertThrows(BusinessException.class, () -> service.convert("<script>alert(1)</script>"));
        assertFalse(service.convert("正文").getContentHtml().contains("script"));
    }

    @Test
    void rendersValidatedTiptapAndRejectsUnknownNodes() {
        String json = "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":["
                + "{\"type\":\"text\",\"text\":\"链接\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"https://ownai.icu\"}}]}]}]}";
        ContentMarkdownService.ConvertedContent converted = service.convertTiptap(json);
        assertTrue(converted.getContentHtml().contains("https://ownai.icu"));
        assertThrows(BusinessException.class, () -> service.convertTiptap(
                "{\"type\":\"doc\",\"content\":[{\"type\":\"iframe\"}]}"));
    }
}
