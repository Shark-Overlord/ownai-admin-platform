package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.seo.SeoContentService;
import com.yupi.springbootinit.seo.SeoPage;
import com.yupi.springbootinit.seo.SeoShellTemplate;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Crawler-facing endpoints proxied by Nginx for public web-frontend routes.
 * <p>
 * Every failure answers 503 instead of the usual BaseResponse JSON, so Nginx
 * can fall back to the static index.html / sitemap.xml / llms.txt.
 */
@Slf4j
@RestController
@RequestMapping("/seo")
public class SeoController {

    private static final MediaType TEXT_HTML_UTF8 = MediaType.parseMediaType("text/html;charset=UTF-8");
    private static final MediaType TEXT_PLAIN_UTF8 = MediaType.parseMediaType("text/plain;charset=UTF-8");
    private static final MediaType XML_UTF8 = MediaType.parseMediaType("application/xml;charset=UTF-8");

    @Resource
    private SeoContentService seoContentService;

    @Resource
    private SeoShellTemplate seoShellTemplate;

    @GetMapping("/render")
    public ResponseEntity<String> render(@RequestParam("path") String path) {
        String shell;
        try {
            shell = seoShellTemplate.load();
        } catch (Exception e) {
            log.error("SEO shell unavailable", e);
            return unavailable();
        }
        SeoPage page = null;
        try {
            page = seoContentService.resolve(path);
        } catch (RuntimeException e) {
            log.warn("SEO render failed for path {}", path, e);
        }
        if (page == null) {
            return html(HttpStatus.OK, shell);
        }
        return html(HttpStatus.valueOf(page.getStatus()), SeoShellTemplate.inject(shell, page));
    }

    @GetMapping("/sitemap.xml")
    public ResponseEntity<String> sitemap() {
        try {
            return ResponseEntity.ok().contentType(XML_UTF8)
                    .cacheControl(CacheControl.noCache())
                    .body(seoContentService.sitemapXml());
        } catch (RuntimeException e) {
            log.warn("Dynamic sitemap failed", e);
            return unavailable();
        }
    }

    @GetMapping("/llms.txt")
    public ResponseEntity<String> llms() {
        try {
            return ResponseEntity.ok().contentType(TEXT_PLAIN_UTF8)
                    .cacheControl(CacheControl.noCache())
                    .body(seoContentService.llmsTxt());
        } catch (RuntimeException e) {
            log.warn("Dynamic llms.txt failed", e);
            return unavailable();
        }
    }

    private static ResponseEntity<String> html(HttpStatus status, String body) {
        // HTML references hashed assets that are deleted on release; never let browsers keep it.
        return ResponseEntity.status(status).contentType(TEXT_HTML_UTF8)
                .cacheControl(CacheControl.noCache())
                .body(body);
    }

    private static ResponseEntity<String> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .cacheControl(CacheControl.noStore())
                .contentType(TEXT_PLAIN_UTF8)
                .body("unavailable");
    }
}
