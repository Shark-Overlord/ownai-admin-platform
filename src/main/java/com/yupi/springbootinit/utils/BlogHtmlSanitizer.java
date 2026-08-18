package com.yupi.springbootinit.utils;

import java.util.regex.Pattern;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;

public final class BlogHtmlSanitizer {

    private static final PolicyFactory POLICY = new HtmlPolicyBuilder()
            .allowElements("p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i",
                    "u", "s", "blockquote", "ul", "ol", "li", "pre", "code", "a", "img", "figure",
                    "figcaption", "hr", "table", "thead", "tbody", "tr", "th", "td", "video", "source",
                    "span")
            .allowWithoutAttributes("p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b",
                    "em", "i", "u", "s", "blockquote", "ul", "ol", "li", "pre", "code", "figure",
                    "figcaption", "hr", "table", "thead", "tbody", "tr", "th", "td", "span")
            .allowUrlProtocols("https")
            .allowAttributes("href", "title", "target", "rel").onElements("a")
            .allowAttributes("src", "alt", "title", "width", "height").onElements("img")
            .allowAttributes("class").matching(Pattern.compile("(?:language-)?[a-zA-Z0-9_-]+"))
                    .onElements("pre", "code", "span")
            .allowAttributes("src", "poster", "controls", "preload", "width", "height").onElements("video")
            .allowAttributes("src", "type").onElements("source")
            .allowAttributes("colspan", "rowspan").onElements("th", "td")
            .toFactory();

    private BlogHtmlSanitizer() {
    }

    public static String sanitize(String html) {
        return html == null ? "" : POLICY.sanitize(html);
    }
}
