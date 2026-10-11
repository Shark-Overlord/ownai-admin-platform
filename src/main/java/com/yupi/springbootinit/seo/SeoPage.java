package com.yupi.springbootinit.seo;

import lombok.Data;

/**
 * Server-side metadata and crawlable body for one public frontend route.
 * <p>
 * A null {@code title} keeps the shell head untouched; a null {@code bodyHtml}
 * keeps {@code #root} empty so the SPA renders its own state.
 */
@Data
public class SeoPage {

    private int status = 200;
    private String title;
    private String description;
    private String canonical;
    private String image;
    private String robots = "index, follow";
    private String type = "website";
    /** Already serialized JSON-LD; must be safe to embed inside a script tag. */
    private String jsonLd;
    /** Trusted or sanitized HTML placed inside {@code #root}. */
    private String bodyHtml;

    public static SeoPage notFound() {
        SeoPage page = new SeoPage();
        page.setStatus(404);
        page.setTitle("页面不存在 · OwnAI");
        page.setDescription("你访问的 OwnAI 页面不存在或已下线。");
        page.setRobots("noindex, nofollow");
        return page;
    }
}
