package com.yupi.springbootinit.utils;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class BlogHtmlSanitizerTest {

    @Test
    void removesExecutableContentAndKeepsSupportedMedia() {
        String html = "<p onclick=\"alert(1)\">hello</p>"
                + "<script>alert(1)</script>"
                + "<img src=\"https://cdn.example.com/a.png\" onerror=\"alert(1)\">"
                + "<video src=\"https://cdn.example.com/a.mp4\" controls></video>";

        String sanitized = BlogHtmlSanitizer.sanitize(html);

        assertTrue(sanitized.contains("hello"));
        assertTrue(sanitized.contains("https://cdn.example.com/a.png"));
        assertTrue(sanitized.contains("https://cdn.example.com/a.mp4"));
        assertFalse(sanitized.contains("script"));
        assertFalse(sanitized.contains("onclick"));
        assertFalse(sanitized.contains("onerror"));
    }

    @Test
    void rejectsInsecureMediaUrls() {
        String sanitized = BlogHtmlSanitizer.sanitize("<img src=\"http://example.com/a.png\">"
                + "<video src=\"javascript:alert(1)\"></video>");

        assertFalse(sanitized.contains("http://"));
        assertFalse(sanitized.contains("javascript:"));
    }

    @Test
    void keepsSafeTextColorAndRejectsOtherInlineStyles() {
        String sanitized = BlogHtmlSanitizer.sanitize(
                "<p><span style=\"color: rgb(22, 119, 255)\">蓝色文字</span>"
                        + "<span style=\"color: red; background: url(javascript:alert(1))\">危险文字</span></p>");

        assertTrue(sanitized.contains("style=\"color: rgb(22, 119, 255)\""), sanitized);
        assertTrue(sanitized.contains("蓝色文字"));
        assertTrue(sanitized.contains("危险文字"));
        assertFalse(sanitized.contains("background"));
        assertFalse(sanitized.contains("javascript"));
    }
}
