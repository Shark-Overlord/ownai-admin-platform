package com.yupi.springbootinit.seo;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/**
 * Reads the deployed web-frontend index.html and injects route metadata plus
 * crawlable HTML. The file is re-read whenever a release replaces it.
 */
@Component
public class SeoShellTemplate {

    static final String ROOT_PLACEHOLDER = "<div id=\"root\"></div>";

    private static final Pattern TITLE = Pattern.compile("(?is)<title>.*?</title>\\s*");
    private static final Pattern ROUTE_META = Pattern.compile(
            "(?is)<meta\\s[^>]*?(?:name|property)=\"(?:description|robots|og:type|og:title|og:description"
                    + "|og:url|og:image|twitter:card|twitter:title|twitter:description|twitter:image)\"[^>]*>\\s*");
    private static final Pattern CANONICAL = Pattern.compile("(?is)<link\\s[^>]*?rel=\"canonical\"[^>]*>\\s*");
    /** The shell carries one visually hidden site heading; drop it when the route supplies its own h1. */
    private static final Pattern SHELL_HEADING = Pattern.compile("(?is)<h1\\b[^>]*>.*?</h1>\\s*");

    private final Path indexPath;
    private volatile String cachedShell;
    private volatile long cachedModifiedAt = Long.MIN_VALUE;

    public SeoShellTemplate(@Value("${ownai.seo.index-path:/www/wwwroot/ownai/index.html}") String indexPath) {
        this.indexPath = Paths.get(indexPath);
    }

    public String load() throws IOException {
        long modifiedAt = Files.getLastModifiedTime(indexPath).toMillis();
        String shell = cachedShell;
        if (shell == null || modifiedAt != cachedModifiedAt) {
            shell = new String(Files.readAllBytes(indexPath), StandardCharsets.UTF_8);
            if (!shell.contains(ROOT_PLACEHOLDER) || !shell.contains("</head>")) {
                throw new IOException("Unexpected frontend shell: " + indexPath);
            }
            cachedShell = shell;
            cachedModifiedAt = modifiedAt;
        }
        return shell;
    }

    public String render(SeoPage page) throws IOException {
        return inject(load(), page);
    }

    public static String inject(String shell, SeoPage page) {
        String html = shell;
        boolean hasBody = StringUtils.isNotBlank(page.getBodyHtml());
        if (page.getTitle() != null) {
            html = TITLE.matcher(html).replaceAll("");
            html = ROUTE_META.matcher(html).replaceAll("");
            html = CANONICAL.matcher(html).replaceAll("");
            html = replaceFirstLiteral(html, "</head>", buildHead(page, hasBody) + "  </head>");
        }
        if (hasBody) {
            if (page.getBodyHtml().contains("<h1")) {
                html = SHELL_HEADING.matcher(html).replaceFirst("");
            }
            html = replaceFirstLiteral(html, ROOT_PLACEHOLDER,
                    "<div id=\"root\"><div data-ssr-fallback=\"\" style=\"max-width:760px;margin:0 auto;"
                            + "padding:48px 20px;font-size:15px;line-height:1.8\">"
                            + page.getBodyHtml() + "</div></div>");
        }
        return html;
    }

    private static String buildHead(SeoPage page, boolean hasBody) {
        StringBuilder head = new StringBuilder();
        String title = esc(page.getTitle());
        String description = esc(page.getDescription());
        head.append("  <title>").append(title).append("</title>\n");
        appendMeta(head, "name", "description", description);
        appendMeta(head, "name", "robots", esc(page.getRobots()));
        if (StringUtils.isNotBlank(page.getCanonical())) {
            head.append("    <link rel=\"canonical\" href=\"").append(esc(page.getCanonical())).append("\" />\n");
        }
        appendMeta(head, "property", "og:type", esc(page.getType()));
        appendMeta(head, "property", "og:title", title);
        appendMeta(head, "property", "og:description", description);
        appendMeta(head, "property", "og:url", esc(page.getCanonical()));
        appendMeta(head, "property", "og:image", esc(page.getImage()));
        appendMeta(head, "name", "twitter:card", page.getImage() == null ? null : "summary_large_image");
        appendMeta(head, "name", "twitter:title", title);
        appendMeta(head, "name", "twitter:description", description);
        appendMeta(head, "name", "twitter:image", esc(page.getImage()));
        if (StringUtils.isNotBlank(page.getJsonLd())) {
            head.append("    <script id=\"ssr-structured-data\" type=\"application/ld+json\">")
                    .append(page.getJsonLd()).append("</script>\n");
        }
        if (hasBody) {
            head.append("    <style id=\"ssr-fallback-style\">[data-ssr-fallback] img{max-width:100%;height:auto}"
                    + "[data-ssr-fallback] pre{overflow:auto}</style>\n");
        }
        return head.toString();
    }

    private static void appendMeta(StringBuilder head, String attribute, String key, String content) {
        if (StringUtils.isBlank(content)) {
            return;
        }
        head.append("    <meta ").append(attribute).append("=\"").append(key)
                .append("\" content=\"").append(content).append("\" />\n");
    }

    private static String replaceFirstLiteral(String source, String target, String replacement) {
        int index = source.indexOf(target);
        if (index < 0) {
            return source;
        }
        return source.substring(0, index) + replacement + source.substring(index + target.length());
    }

    static String esc(String value) {
        return value == null ? null : HtmlUtils.htmlEscape(value, StandardCharsets.UTF_8.name());
    }
}
