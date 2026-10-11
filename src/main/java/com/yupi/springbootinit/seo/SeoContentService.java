package com.yupi.springbootinit.seo;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogFrontBookQueryRequest;
import com.yupi.springbootinit.model.vo.artwork.ArtworkDetailVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.model.dto.blog.BlogFrontPostQueryRequest;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontBookDetailVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontBookListVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontChapterVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontNavVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostDetailVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostOutlineVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontTaxonomyVO;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.BlogFrontService;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TimeZone;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

/**
 * Builds crawlable HTML, sitemap.xml and llms.txt for public frontend routes.
 * All data is read anonymously so member-only content never leaks.
 */
@Slf4j
@Service
public class SeoContentService {

    static final String SITE = "https://ownai.icu";
    static final String DEFAULT_IMAGE = SITE + "/images/design-everything-dark-bg.png";
    static final String SITE_TITLE = "OwnAI｜500+ 前端设计提示词、UI 源码与 Vibe Coding 资源";
    static final String SITE_DESCRIPTION = "OwnAI 为设计师和开发者提供500+前端页面、组件与交互提示词，"
            + "包含真实效果封面、会员源码和 Vibe Coding 创作资源。";
    static final String TUTORIALS_TITLE = "OwnAI 系统教程｜前端开发与 Vibe Coding 实战";
    static final String TUTORIALS_DESCRIPTION = "浏览 OwnAI 系统教程、免费文章与章节目录，"
            + "学习前端开发、智能体构建和 Vibe Coding 实战方法。";
    static final String PROMPTS_TITLE = "前端提示词库｜网页 UI、组件与交互提示词 · OwnAI";
    static final String PROMPTS_DESCRIPTION = "按页面类型与风格浏览 OwnAI 前端提示词，每条附真实渲染效果；"
            + "免费提示词可直接复制全文，会员提示词可查看效果预览与说明。";

    private static final long CATALOG_TTL_MS = 10 * 60 * 1000L;
    private static final long PAGE_TTL_MS = 5 * 60 * 1000L;
    private static final int MAX_CACHED_PAGES = 2000;
    private static final int PAGE_SIZE = 20;
    private static final int MAX_PAGES = 50;
    private static final int PROMPT_PAGE_SIZE = 100;
    private static final int PROMPT_MAX_PAGES = 30;
    private static final int HOME_POST_LIMIT = 10;
    private static final int HOME_PROMPT_LIMIT = 12;
    private static final int TUTORIALS_POST_LIMIT = 50;
    private static final int LIBRARY_FREE_LIMIT = 300;
    private static final int LIBRARY_MEMBER_LIMIT = 100;
    private static final Pattern POST_PATH = Pattern.compile("^/tutorials/posts/(\\d{1,19})$");
    private static final Pattern BOOK_PATH = Pattern.compile("^/tutorials/books/(\\d{1,19})$");
    private static final Pattern PROMPT_PATH = Pattern.compile("^/prompts/(\\d{1,19})$");
    private static final Pattern H1_OPEN = Pattern.compile("(?i)<h1(?=[\\s>])");
    private static final Pattern H1_CLOSE = Pattern.compile("(?i)</h1\\s*>");

    /** Public pages that are indexable without login, in sitemap order. */
    private static final String[][] CORE_PAGES = {
            {"/frontend-prompts", "前端提示词库",
                    "按页面类型和风格分类的网页、组件与交互提示词，附真实渲染效果，免费提示词可直接查看全文"},
            {"/ownai-design", "OwnAI Design 浏览器插件",
                    "复制网页组件结构、样式与交互信息，生成适用于 Codex、Claude 和 Cursor 的 UI 复刻提示词"},
            {"/tutorials", "系统教程", "前端开发、智能体构建和 Vibe Coding 实战教程与免费文章"},
            {"/video-backgrounds", "视频背景库", "可用于网页首屏和落地页的视频背景素材"},
            {"/traffic-tags", "自媒体流量标签", "抖音、小红书、公众号和即刻的 AI 内容流量标签、活动要求与有效期"},
            {"/pricing", "会员方案", "会员可解锁的提示词、源码范围与权益说明"},
            {"/codex-reset", "Codex 重置监控", null},
    };
    private static final String[] LEGAL_PATHS = {
            "/legal/privacy", "/legal/terms", "/legal/service-rules", "/legal/consumer"};

    @Resource
    private BlogFrontService blogFrontService;

    @Resource
    private ArtworkService artworkService;

    @Resource
    private ObjectMapper objectMapper;

    private volatile Catalog catalog;

    private final ConcurrentHashMap<String, CachedPage> pageCache = new ConcurrentHashMap<>();

    /**
     * @return the page to inject, or {@code null} when the route should fall
     * back to the untouched SPA shell (unsupported, login or member gated).
     */
    public SeoPage resolve(String rawPath) {
        String path = normalizePath(rawPath);
        if (path == null || !isRenderable(path)) {
            return null;
        }
        long now = System.currentTimeMillis();
        CachedPage cached = pageCache.get(path);
        if (cached != null && now - cached.loadedAt < PAGE_TTL_MS) {
            return cached.page;
        }
        SeoPage page = render(path);
        if (pageCache.size() >= MAX_CACHED_PAGES) {
            pageCache.clear();
        }
        pageCache.put(path, new CachedPage(page, now));
        return page;
    }

    private static boolean isRenderable(String path) {
        return "/".equals(path) || "/tutorials".equals(path) || "/frontend-prompts".equals(path)
                || POST_PATH.matcher(path).matches() || BOOK_PATH.matcher(path).matches()
                || PROMPT_PATH.matcher(path).matches();
    }

    private SeoPage render(String path) {
        if ("/".equals(path)) {
            return home();
        }
        if ("/tutorials".equals(path)) {
            return tutorials();
        }
        if ("/frontend-prompts".equals(path)) {
            return promptLibrary();
        }
        Matcher matcher = POST_PATH.matcher(path);
        if (matcher.matches()) {
            Long id = parseId(matcher.group(1));
            return id == null ? SeoPage.notFound() : post(id);
        }
        matcher = BOOK_PATH.matcher(path);
        if (matcher.matches()) {
            Long id = parseId(matcher.group(1));
            return id == null ? SeoPage.notFound() : book(id);
        }
        matcher = PROMPT_PATH.matcher(path);
        if (matcher.matches()) {
            Long id = parseId(matcher.group(1));
            return id == null ? SeoPage.notFound() : prompt(id);
        }
        return null;
    }

    public String sitemapXml() {
        Catalog current = catalog();
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        Set<String> seen = new LinkedHashSet<>();
        appendUrl(xml, seen, SITE + "/", null);
        for (String[] page : CORE_PAGES) {
            appendUrl(xml, seen, SITE + page[0], null);
        }
        for (String legal : LEGAL_PATHS) {
            appendUrl(xml, seen, SITE + legal, null);
        }
        for (BlogFrontBookListVO book : current.books) {
            appendUrl(xml, seen, bookUrl(book.getId()), book.getUpdateTime());
        }
        for (BlogFrontPostOutlineVO post : current.posts) {
            appendUrl(xml, seen, postUrl(post.getId()), post.getPublishedAt());
        }
        // Member prompts are listed too: their public part (preview, description) is indexable.
        for (PromptEntry prompt : current.prompts) {
            appendUrl(xml, seen, promptUrl(prompt.id), prompt.updatedAt);
        }
        return xml.append("</urlset>\n").toString();
    }

    public String llmsTxt() {
        Catalog current = catalog();
        StringBuilder text = new StringBuilder("# OwnAI\n\n")
                .append("> ").append(SITE_DESCRIPTION).append("\n\n")
                .append("OwnAI（").append(SITE).append("）面向设计师与前端开发者，核心内容是可复用的前端页面、")
                .append("组件与交互提示词（附真实渲染效果），以及前端开发和 Vibe Coding 系统教程。")
                .append("免费提示词和免费教程文章可直接阅读全文；会员提示词公开效果预览与说明，")
                .append("完整提示词、源码与深度解构需开通会员。\n\n")
                .append("## 核心页面\n\n");
        for (String[] page : CORE_PAGES) {
            text.append("- [").append(page[1]).append("](").append(SITE).append(page[0]).append(")");
            if (page[2] != null) {
                text.append(": ").append(page[2]);
            }
            text.append('\n');
        }
        List<PromptEntry> freePrompts = current.freePrompts();
        if (!freePrompts.isEmpty()) {
            text.append("\n## 免费前端提示词\n\n");
            for (PromptEntry prompt : freePrompts) {
                appendLlmsLink(text, prompt.title, promptUrl(prompt.id), prompt.summary);
            }
        }
        if (!current.books.isEmpty()) {
            text.append("\n## 系统教程\n\n");
            for (BlogFrontBookListVO book : current.books) {
                appendLlmsLink(text, book.getTitle(), bookUrl(book.getId()), book.getSummary());
            }
        }
        if (!current.posts.isEmpty()) {
            text.append("\n## 免费文章\n\n");
            for (BlogFrontPostOutlineVO post : current.posts) {
                appendLlmsLink(text, post.getTitle(), postUrl(post.getId()), post.getSummary());
            }
        }
        text.append("\n## Optional\n\n");
        appendLlmsLink(text, "隐私政策", SITE + "/legal/privacy", null);
        appendLlmsLink(text, "服务条款", SITE + "/legal/terms", null);
        appendLlmsLink(text, "站点地图", SITE + "/sitemap.xml", null);
        return text.toString();
    }

    private SeoPage home() {
        Catalog current = catalog();
        StringBuilder body = new StringBuilder("<main><h1>").append(esc(SITE_TITLE)).append("</h1>")
                .append("<p>").append(esc(SITE_DESCRIPTION)).append("</p>")
                .append("<section><h2>站点内容</h2><ul>");
        for (String[] page : CORE_PAGES) {
            body.append("<li><a href=\"").append(page[0]).append("\">").append(esc(page[1])).append("</a>");
            if (page[2] != null) {
                body.append("：").append(esc(page[2]));
            }
            body.append("</li>");
        }
        body.append("</ul></section>");
        appendPromptList(body, "最新免费提示词", current.freePrompts(), HOME_PROMPT_LIMIT);
        appendPostList(body, "最新教程", current.posts, HOME_POST_LIMIT);
        body.append("</main>");
        SeoPage page = new SeoPage();
        // Keep the shell head: it already carries the home metadata and site JSON-LD.
        page.setBodyHtml(body.toString());
        return page;
    }

    private SeoPage tutorials() {
        Catalog current = catalog();
        String url = SITE + "/tutorials";
        StringBuilder body = new StringBuilder();
        body.append(breadcrumbHtml(Collections.singletonList(new String[]{"教程", url})));
        body.append("<main><h1>OwnAI 系统教程</h1><p>").append(esc(TUTORIALS_DESCRIPTION)).append("</p>");
        if (!current.books.isEmpty()) {
            body.append("<section><h2>系统教程</h2><ul>");
            for (BlogFrontBookListVO book : current.books) {
                body.append("<li><a href=\"").append(bookUrl(book.getId())).append("\">")
                        .append(esc(book.getTitle())).append("</a>");
                if (StringUtils.isNotBlank(book.getSummary())) {
                    body.append("：").append(esc(abbreviate(book.getSummary(), 160)));
                }
                body.append("</li>");
            }
            body.append("</ul></section>");
        }
        appendPostList(body, "最新免费文章", current.posts, TUTORIALS_POST_LIMIT);
        body.append("</main>");

        Map<String, Object> collection = node("CollectionPage");
        collection.put("name", "OwnAI 系统教程");
        collection.put("url", url);
        collection.put("description", TUTORIALS_DESCRIPTION);
        collection.put("inLanguage", "zh-CN");
        collection.put("isPartOf", Collections.singletonMap("@id", SITE + "/#website"));
        List<Map<String, Object>> items = new ArrayList<>();
        int position = 1;
        for (BlogFrontBookListVO book : current.books) {
            Map<String, Object> item = node("ListItem");
            item.put("position", position++);
            item.put("url", bookUrl(book.getId()));
            item.put("name", book.getTitle());
            items.add(item);
        }
        if (!items.isEmpty()) {
            Map<String, Object> list = node("ItemList");
            list.put("itemListElement", items);
            collection.put("mainEntity", list);
        }

        SeoPage page = basePage(TUTORIALS_TITLE, TUTORIALS_DESCRIPTION, url, DEFAULT_IMAGE);
        page.setJsonLd(graph(collection, breadcrumbLd(Collections.singletonList(new String[]{"教程", url}))));
        page.setBodyHtml(body.toString());
        return page;
    }

    private SeoPage post(Long id) {
        BlogFrontPostDetailVO post;
        try {
            post = blogFrontService.getPost(id, null);
        } catch (BusinessException e) {
            return fallbackFor(e);
        }
        // getPost(null user) only returns fully public posts; gated ones throw above.
        String url = postUrl(post.getId());
        String description = firstNonBlank(post.getSeoDescription(), post.getSummary(), post.getTitle());
        String image = StringUtils.defaultIfBlank(post.getCoverUrl(), DEFAULT_IMAGE);
        List<String[]> crumbs = new ArrayList<>();
        crumbs.add(new String[]{"教程", SITE + "/tutorials"});
        if (post.getBookId() != null && StringUtils.isNotBlank(post.getBookTitle())) {
            crumbs.add(new String[]{post.getBookTitle(), bookUrl(post.getBookId())});
        }
        crumbs.add(new String[]{post.getTitle(), url});

        StringBuilder body = new StringBuilder(breadcrumbHtml(crumbs));
        body.append("<article><h1>").append(esc(post.getTitle())).append("</h1><p>");
        List<String> metaParts = new ArrayList<>();
        if (post.getPublishedAt() != null) {
            metaParts.add("<time datetime=\"" + isoDate(post.getPublishedAt()) + "\">发布于 "
                    + displayDate(post.getPublishedAt()) + "</time>");
        }
        if (post.getUpdateTime() != null) {
            metaParts.add("<time datetime=\"" + isoDate(post.getUpdateTime()) + "\">更新于 "
                    + displayDate(post.getUpdateTime()) + "</time>");
        }
        if (post.getCategory() != null && StringUtils.isNotBlank(post.getCategory().getName())) {
            metaParts.add("分类：" + esc(post.getCategory().getName()));
        }
        List<String> tagNames = tagNames(post.getTags());
        if (!tagNames.isEmpty()) {
            metaParts.add("标签：" + esc(String.join("、", tagNames)));
        }
        body.append(String.join(" · ", metaParts)).append("</p>");
        if (StringUtils.isNotBlank(post.getSummary())) {
            body.append("<p><strong>摘要：</strong>").append(esc(post.getSummary())).append("</p>");
        }
        body.append(demoteH1(post.getContentHtml())).append("</article>");
        appendAdjacent(body, post.getPreviousPost(), post.getNextPost());

        Map<String, Object> article = node("Article");
        article.put("headline", post.getTitle());
        article.put("description", description);
        article.put("image", image);
        article.put("url", url);
        article.put("mainEntityOfPage", url);
        article.put("inLanguage", "zh-CN");
        putIfNotNull(article, "datePublished", post.getPublishedAt() == null ? null : isoDate(post.getPublishedAt()));
        putIfNotNull(article, "dateModified", post.getUpdateTime() == null ? null : isoDate(post.getUpdateTime()));
        if (post.getCategory() != null) {
            putIfNotNull(article, "articleSection", post.getCategory().getName());
        }
        if (!tagNames.isEmpty()) {
            article.put("keywords", String.join(",", tagNames));
        }
        article.put("author", organization());
        article.put("publisher", organization());
        if (post.getBookId() != null) {
            Map<String, Object> book = node("Course");
            book.put("@id", bookUrl(post.getBookId()));
            putIfNotNull(book, "name", post.getBookTitle());
            article.put("isPartOf", book);
        }

        SeoPage page = basePage(firstNonBlank(post.getSeoTitle(), post.getTitle()) + " · OwnAI 教程",
                description, url, image);
        page.setType("article");
        page.setJsonLd(graph(article, breadcrumbLd(crumbs)));
        page.setBodyHtml(body.toString());
        return page;
    }

    private SeoPage book(Long id) {
        BlogFrontBookDetailVO book;
        try {
            book = blogFrontService.getBook(id, null);
        } catch (BusinessException e) {
            return fallbackFor(e);
        }
        boolean isPublic = Objects.equals(book.getMemberOnly(), 0);
        String url = bookUrl(book.getId());
        String description = firstNonBlank(book.getSeoDescription(), book.getSummary(), book.getTitle());
        String image = StringUtils.defaultIfBlank(book.getCoverUrl(), DEFAULT_IMAGE);
        List<String[]> crumbs = new ArrayList<>();
        crumbs.add(new String[]{"教程", SITE + "/tutorials"});
        crumbs.add(new String[]{book.getTitle(), url});

        StringBuilder body = new StringBuilder(breadcrumbHtml(crumbs));
        body.append("<main><h1>").append(esc(book.getTitle())).append("</h1><p>")
                .append(nullToZero(book.getChapterCount())).append(" 章 · ")
                .append(nullToZero(book.getPublishedPostCount())).append(" 篇文章");
        if (book.getUpdateTime() != null) {
            body.append(" · <time datetime=\"").append(isoDate(book.getUpdateTime())).append("\">更新于 ")
                    .append(displayDate(book.getUpdateTime())).append("</time>");
        }
        body.append(isPublic ? " · 免费" : " · 会员专享").append("</p>");
        if (StringUtils.isNotBlank(book.getIntroductionHtml())) {
            body.append(demoteH1(book.getIntroductionHtml()));
        } else if (StringUtils.isNotBlank(book.getSummary())) {
            body.append("<p>").append(esc(book.getSummary())).append("</p>");
        }
        if (book.getChapters() != null) {
            for (BlogFrontChapterVO chapter : book.getChapters()) {
                body.append("<section><h2>").append(esc(chapter.getTitle())).append("</h2>");
                if (StringUtils.isNotBlank(chapter.getDescription())) {
                    body.append("<p>").append(esc(chapter.getDescription())).append("</p>");
                }
                if (chapter.getPosts() != null && !chapter.getPosts().isEmpty()) {
                    body.append("<ol>");
                    for (BlogFrontPostOutlineVO post : chapter.getPosts()) {
                        body.append("<li><a href=\"").append(postUrl(post.getId())).append("\">")
                                .append(esc(post.getTitle())).append("</a>");
                        if (!Boolean.TRUE.equals(post.getCanAccess())) {
                            body.append("（会员）");
                        }
                        body.append("</li>");
                    }
                    body.append("</ol>");
                }
                body.append("</section>");
            }
        }
        body.append("</main>");

        SeoPage page = basePage(firstNonBlank(book.getSeoTitle(), book.getTitle()) + " · OwnAI 教程",
                description, url, image);
        if (isPublic) {
            Map<String, Object> course = node("Course");
            course.put("@id", url);
            course.put("name", book.getTitle());
            course.put("description", description);
            course.put("url", url);
            course.put("image", image);
            course.put("inLanguage", "zh-CN");
            course.put("provider", organization());
            Map<String, Object> instance = node("CourseInstance");
            instance.put("courseMode", "online");
            instance.put("courseWorkload", nullToZero(book.getChapterCount()) + " 章，"
                    + nullToZero(book.getPublishedPostCount()) + " 篇文章");
            course.put("hasCourseInstance", instance);
            page.setJsonLd(graph(course, breadcrumbLd(crumbs)));
        } else {
            page.setRobots("noindex, nofollow");
        }
        page.setBodyHtml(body.toString());
        return page;
    }

    private SeoPage promptLibrary() {
        Catalog current = catalog();
        String url = SITE + "/frontend-prompts";
        List<String[]> crumbs = Collections.singletonList(new String[]{"前端提示词库", url});
        List<PromptEntry> freePrompts = current.freePrompts();
        List<PromptEntry> memberPrompts = current.prompts.stream().filter(prompt -> !prompt.free)
                .collect(Collectors.toList());
        StringBuilder body = new StringBuilder(breadcrumbHtml(crumbs));
        body.append("<main><h1>OwnAI 前端提示词库</h1><p>").append(esc(PROMPTS_DESCRIPTION)).append("</p>")
                .append("<p>共 ").append(current.prompts.size()).append(" 条提示词，其中 ")
                .append(freePrompts.size()).append(" 条免费公开全文。</p>");
        appendPromptList(body, "免费提示词", freePrompts, LIBRARY_FREE_LIMIT);
        appendPromptList(body, "会员提示词", memberPrompts, LIBRARY_MEMBER_LIMIT);
        body.append("<p><a href=\"/pricing\">查看会员方案</a></p></main>");

        Map<String, Object> collection = node("CollectionPage");
        collection.put("@id", url);
        collection.put("name", "OwnAI 前端提示词库");
        collection.put("url", url);
        collection.put("description", PROMPTS_DESCRIPTION);
        collection.put("inLanguage", "zh-CN");
        collection.put("isPartOf", Collections.singletonMap("@id", SITE + "/#website"));
        List<Map<String, Object>> items = new ArrayList<>();
        for (PromptEntry prompt : freePrompts.subList(0, Math.min(100, freePrompts.size()))) {
            Map<String, Object> item = node("ListItem");
            item.put("position", items.size() + 1);
            item.put("url", promptUrl(prompt.id));
            item.put("name", prompt.title);
            items.add(item);
        }
        if (!items.isEmpty()) {
            Map<String, Object> list = node("ItemList");
            list.put("itemListElement", items);
            collection.put("mainEntity", list);
        }

        SeoPage page = basePage(PROMPTS_TITLE, PROMPTS_DESCRIPTION, url, DEFAULT_IMAGE);
        page.setJsonLd(graph(collection, breadcrumbLd(crumbs)));
        page.setBodyHtml(body.toString());
        return page;
    }

    private SeoPage prompt(Long id) {
        ArtworkDetailVO artwork;
        try {
            artwork = artworkService.getPublicArtworkSnapshot(id);
        } catch (BusinessException e) {
            // Missing, deleted and offline artworks are all "not public" for crawlers.
            if (e.getCode() == ErrorCode.NO_AUTH_ERROR.getCode()) {
                return SeoPage.notFound();
            }
            return fallbackFor(e);
        }
        boolean free = Boolean.TRUE.equals(artwork.getCanAccessPrompt());
        String url = promptUrl(artwork.getId());
        String title = StringUtils.defaultIfBlank(StringUtils.trim(artwork.getTitle()), "未命名提示词");
        String description = abbreviate(firstNonBlank(artwork.getSummary(), artwork.getDescription(),
                title + " 的前端界面提示词与真实渲染效果"), 160);
        String image = StringUtils.defaultIfBlank(artwork.getCoverUrl(), DEFAULT_IMAGE);
        String category = artwork.getCategory() == null ? null : StringUtils.trimToNull(artwork.getCategory().getName());
        List<String> tags = artwork.getTagList() == null ? Collections.<String>emptyList()
                : artwork.getTagList().stream().map(tag -> StringUtils.trimToNull(tag.getName()))
                        .filter(Objects::nonNull).collect(Collectors.toList());
        Date updatedAt = artwork.getUpdateTime() != null ? artwork.getUpdateTime() : artwork.getCreateTime();
        List<String[]> crumbs = new ArrayList<>();
        crumbs.add(new String[]{"前端提示词库", SITE + "/frontend-prompts"});
        crumbs.add(new String[]{title, url});

        StringBuilder body = new StringBuilder(breadcrumbHtml(crumbs));
        body.append("<article><h1>").append(esc(title)).append("</h1><p>");
        List<String> metaParts = new ArrayList<>();
        if (category != null) {
            metaParts.add("分类：" + esc(category));
        }
        if (!tags.isEmpty()) {
            metaParts.add("标签：" + esc(String.join("、", tags)));
        }
        metaParts.add(free ? "免费" : "会员专享");
        if (updatedAt != null) {
            metaParts.add("<time datetime=\"" + isoDate(updatedAt) + "\">更新于 " + displayDate(updatedAt) + "</time>");
        }
        body.append(String.join(" · ", metaParts)).append("</p>");
        if (StringUtils.isNotBlank(artwork.getCoverUrl())) {
            body.append("<figure><img src=\"").append(esc(artwork.getCoverUrl())).append("\" alt=\"")
                    .append(esc(title)).append(" 渲染效果\" loading=\"lazy\" /><figcaption>")
                    .append(esc(title)).append(" 的真实渲染效果</figcaption></figure>");
        }
        if (StringUtils.isNotBlank(artwork.getSummary())) {
            body.append("<p>").append(esc(artwork.getSummary().trim())).append("</p>");
        }
        if (StringUtils.isNotBlank(artwork.getDescription())
                && !StringUtils.equals(StringUtils.trim(artwork.getDescription()), StringUtils.trim(artwork.getSummary()))) {
            body.append(paragraphs(artwork.getDescription()));
        }
        if (free && StringUtils.isNotBlank(artwork.getPromptContent())) {
            body.append("<h2>提示词全文</h2><pre><code>").append(esc(artwork.getPromptContent()))
                    .append("</code></pre>");
        } else {
            body.append("<section><h2>完整提示词</h2><p>该提示词为会员内容。开通会员后可复制完整提示词");
            if (Boolean.TRUE.equals(artwork.getHasSourceCode())) {
                body.append("、下载源码");
            }
            if (Integer.valueOf(1).equals(artwork.getIsDeconstructed())) {
                body.append("并查看深度解构");
            }
            body.append("；也可以使用积分永久解锁单条提示词。</p><p><a href=\"/pricing\">查看会员方案</a></p></section>");
        }
        body.append("</article><p><a href=\"/frontend-prompts\">浏览更多前端提示词</a></p>");

        Map<String, Object> work = node("CreativeWork");
        work.put("@id", url);
        work.put("name", title);
        work.put("description", description);
        work.put("image", image);
        work.put("url", url);
        work.put("inLanguage", "zh-CN");
        work.put("isAccessibleForFree", free);
        putIfNotNull(work, "genre", category);
        if (!tags.isEmpty()) {
            work.put("keywords", String.join(",", tags));
        }
        putIfNotNull(work, "dateCreated", artwork.getCreateTime() == null ? null : isoDate(artwork.getCreateTime()));
        putIfNotNull(work, "dateModified", updatedAt == null ? null : isoDate(updatedAt));
        work.put("author", organization());
        work.put("publisher", organization());
        work.put("isPartOf", Collections.singletonMap("@id", SITE + "/frontend-prompts"));

        SeoPage page = basePage(title + " · 前端提示词 · OwnAI", description, url, image);
        page.setType("article");
        page.setJsonLd(graph(work, breadcrumbLd(crumbs)));
        page.setBodyHtml(body.toString());
        return page;
    }

    private SeoPage fallbackFor(BusinessException e) {
        if (e.getCode() == ErrorCode.NOT_FOUND_ERROR.getCode() || e.getCode() == ErrorCode.PARAMS_ERROR.getCode()) {
            return SeoPage.notFound();
        }
        // Login or membership gated: let the SPA explain the access state.
        return null;
    }

    private Catalog catalog() {
        Catalog current = catalog;
        if (current != null && System.currentTimeMillis() - current.loadedAt < CATALOG_TTL_MS) {
            return current;
        }
        synchronized (this) {
            current = catalog;
            if (current != null && System.currentTimeMillis() - current.loadedAt < CATALOG_TTL_MS) {
                return current;
            }
            catalog = loadCatalog();
            return catalog;
        }
    }

    private Catalog loadCatalog() {
        List<BlogFrontBookListVO> allBooks = pageAll(pageNo -> {
            BlogFrontBookQueryRequest request = new BlogFrontBookQueryRequest();
            request.setCurrent(pageNo);
            request.setPageSize(PAGE_SIZE);
            return blogFrontService.listBooks(request, null);
        });
        List<BlogFrontPostOutlineVO> allPosts = pageAll(pageNo -> {
            BlogFrontPostQueryRequest request = new BlogFrontPostQueryRequest();
            request.setCurrent(pageNo);
            request.setPageSize(PAGE_SIZE);
            request.setStandaloneOnly(false);
            return blogFrontService.listPosts(request, null);
        });
        List<BlogFrontBookListVO> publicBooks = allBooks.stream()
                .filter(book -> Objects.equals(book.getMemberOnly(), 0))
                .collect(Collectors.toList());
        Set<Long> publicBookIds = publicBooks.stream().map(BlogFrontBookListVO::getId).collect(Collectors.toSet());
        List<BlogFrontPostOutlineVO> publicPosts = allPosts.stream()
                .filter(post -> Objects.equals(post.getMemberOnly(), 0) && Boolean.TRUE.equals(post.getCanAccess()))
                .filter(post -> post.getBookId() == null || publicBookIds.contains(post.getBookId()))
                .collect(Collectors.toList());
        // Anonymous listing: only published artworks; promptContent is dropped right away.
        List<PromptEntry> prompts = pageAll(pageNo -> {
            ArtworkQueryRequest request = new ArtworkQueryRequest();
            request.setCurrent(pageNo);
            request.setPageSize(PROMPT_PAGE_SIZE);
            return artworkService.listArtworkVOByPage(request, null, false);
        }, PROMPT_MAX_PAGES).stream()
                .filter(artwork -> artwork != null && artwork.getId() != null)
                .map(PromptEntry::of)
                .collect(Collectors.toMap(prompt -> prompt.id, prompt -> prompt, (a, b) -> a, LinkedHashMap::new))
                .values().stream()
                .sorted(Comparator.comparing((PromptEntry prompt) -> prompt.createdAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
        return new Catalog(publicBooks, publicPosts, prompts, System.currentTimeMillis());
    }

    private static <T> List<T> pageAll(Function<Integer, Page<T>> loader) {
        return pageAll(loader, MAX_PAGES);
    }

    private static <T> List<T> pageAll(Function<Integer, Page<T>> loader, int maxPages) {
        List<T> records = new ArrayList<>();
        long pages = 1;
        for (int current = 1; current <= pages && current <= maxPages; current++) {
            Page<T> page = loader.apply(current);
            if (page == null || page.getRecords() == null) {
                break;
            }
            records.addAll(page.getRecords());
            pages = Math.max(1, page.getPages());
        }
        return records;
    }

    private SeoPage basePage(String title, String description, String canonical, String image) {
        SeoPage page = new SeoPage();
        page.setTitle(title);
        page.setDescription(description);
        page.setCanonical(canonical);
        page.setImage(image);
        return page;
    }

    private void appendPostList(StringBuilder body, String heading, List<BlogFrontPostOutlineVO> posts, int limit) {
        if (posts.isEmpty()) {
            return;
        }
        body.append("<section><h2>").append(esc(heading)).append("</h2><ul>");
        for (BlogFrontPostOutlineVO post : posts.subList(0, Math.min(limit, posts.size()))) {
            body.append("<li><a href=\"").append(postUrl(post.getId())).append("\">")
                    .append(esc(post.getTitle())).append("</a>");
            if (StringUtils.isNotBlank(post.getSummary())) {
                body.append("：").append(esc(abbreviate(post.getSummary(), 120)));
            }
            body.append("</li>");
        }
        body.append("</ul></section>");
    }

    private void appendPromptList(StringBuilder body, String heading, List<PromptEntry> prompts, int limit) {
        if (prompts.isEmpty()) {
            return;
        }
        body.append("<section><h2>").append(esc(heading)).append("</h2><ul>");
        for (PromptEntry prompt : prompts.subList(0, Math.min(limit, prompts.size()))) {
            body.append("<li><a href=\"").append(esc(promptUrl(prompt.id).substring(SITE.length()))).append("\">")
                    .append(esc(prompt.title)).append("</a>");
            if (StringUtils.isNotBlank(prompt.summary)) {
                body.append("：").append(esc(abbreviate(prompt.summary, 120)));
            }
            body.append("</li>");
        }
        body.append("</ul></section>");
    }

    /** Plain-text field to escaped paragraphs; blank lines separate paragraphs. */
    private static String paragraphs(String text) {
        StringBuilder html = new StringBuilder();
        for (String block : text.trim().split("\\r?\\n\\s*\\r?\\n")) {
            if (StringUtils.isBlank(block)) {
                continue;
            }
            html.append("<p>").append(esc(block.trim()).replaceAll("\\r?\\n", "<br />")).append("</p>");
        }
        return html.toString();
    }

    private void appendAdjacent(StringBuilder body, BlogFrontNavVO previous, BlogFrontNavVO next) {
        if (previous == null && next == null) {
            return;
        }
        body.append("<nav aria-label=\"相邻文章\"><ul>");
        if (previous != null) {
            body.append("<li>上一篇：<a href=\"").append(postUrl(previous.getId())).append("\">")
                    .append(esc(previous.getTitle())).append("</a></li>");
        }
        if (next != null) {
            body.append("<li>下一篇：<a href=\"").append(postUrl(next.getId())).append("\">")
                    .append(esc(next.getTitle())).append("</a></li>");
        }
        body.append("</ul></nav>");
    }

    private String breadcrumbHtml(List<String[]> crumbs) {
        StringBuilder html = new StringBuilder("<nav aria-label=\"面包屑\"><a href=\"/\">OwnAI</a>");
        for (int i = 0; i < crumbs.size(); i++) {
            String[] crumb = crumbs.get(i);
            html.append(" / ");
            if (i == crumbs.size() - 1) {
                html.append("<span aria-current=\"page\">").append(esc(crumb[0])).append("</span>");
            } else {
                html.append("<a href=\"").append(esc(crumb[1].substring(SITE.length()))).append("\">")
                        .append(esc(crumb[0])).append("</a>");
            }
        }
        return html.append("</nav>").toString();
    }

    private Map<String, Object> breadcrumbLd(List<String[]> crumbs) {
        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> home = node("ListItem");
        home.put("position", 1);
        home.put("name", "OwnAI");
        home.put("item", SITE + "/");
        items.add(home);
        for (String[] crumb : crumbs) {
            Map<String, Object> item = node("ListItem");
            item.put("position", items.size() + 1);
            item.put("name", crumb[0]);
            item.put("item", crumb[1]);
            items.add(item);
        }
        Map<String, Object> list = node("BreadcrumbList");
        list.put("itemListElement", items);
        return list;
    }

    @SafeVarargs
    private final String graph(Map<String, Object>... nodes) {
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("@context", "https://schema.org");
        List<Map<String, Object>> list = new ArrayList<>();
        Collections.addAll(list, nodes);
        root.put("@graph", list);
        try {
            // "</" would terminate the surrounding script element.
            return objectMapper.writeValueAsString(root).replace("</", "<\\/");
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize SEO structured data", e);
            return null;
        }
    }

    private static Map<String, Object> node(String type) {
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("@type", type);
        return node;
    }

    private static Map<String, Object> organization() {
        Map<String, Object> organization = node("Organization");
        organization.put("@id", SITE + "/#organization");
        organization.put("name", "OwnAI");
        organization.put("url", SITE + "/");
        organization.put("logo", SITE + "/images/ownai-logo.png");
        return organization;
    }

    private static void putIfNotNull(Map<String, Object> map, String key, Object value) {
        if (value != null) {
            map.put(key, value);
        }
    }

    private static void appendUrl(StringBuilder xml, Set<String> seen, String url, Date lastModified) {
        if (!seen.add(url)) {
            return;
        }
        xml.append("  <url>\n    <loc>").append(esc(url)).append("</loc>\n");
        if (lastModified != null) {
            xml.append("    <lastmod>").append(isoDate(lastModified)).append("</lastmod>\n");
        }
        xml.append("  </url>\n");
    }

    private static void appendLlmsLink(StringBuilder text, String title, String url, String note) {
        text.append("- [").append(singleLine(title).replace("]", "\\]")).append("](").append(url).append(")");
        if (StringUtils.isNotBlank(note)) {
            text.append(": ").append(abbreviate(singleLine(note), 160));
        }
        text.append('\n');
    }

    private static List<String> tagNames(List<BlogFrontTaxonomyVO> tags) {
        if (tags == null) {
            return Collections.emptyList();
        }
        return tags.stream().map(BlogFrontTaxonomyVO::getName).filter(StringUtils::isNotBlank)
                .collect(Collectors.toList());
    }

    static String normalizePath(String rawPath) {
        if (StringUtils.isBlank(rawPath) || rawPath.length() > 200 || rawPath.charAt(0) != '/') {
            return null;
        }
        String path = rawPath;
        int query = path.indexOf('?');
        if (query >= 0) {
            path = path.substring(0, query);
        }
        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path;
    }

    private static Long parseId(String value) {
        try {
            long id = Long.parseLong(value);
            return id > 0 ? id : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String postUrl(Long id) {
        return SITE + "/tutorials/posts/" + id;
    }

    private static String bookUrl(Long id) {
        return SITE + "/tutorials/books/" + id;
    }

    private static String promptUrl(Long id) {
        return SITE + "/prompts/" + id;
    }

    private static String isoDate(Date date) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");
        format.setTimeZone(TimeZone.getTimeZone("Asia/Shanghai"));
        return format.format(date);
    }

    private static String displayDate(Date date) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd");
        format.setTimeZone(TimeZone.getTimeZone("Asia/Shanghai"));
        return format.format(date);
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.isNotBlank(value)) {
                return value.trim();
            }
        }
        return "";
    }

    /** Editor content may contain h1; the route title must remain the only h1. */
    static String demoteH1(String html) {
        if (html == null) {
            return "";
        }
        return H1_OPEN.matcher(H1_CLOSE.matcher(html).replaceAll("</h2>")).replaceAll("<h2");
    }

    private static String singleLine(String value) {
        return value == null ? "" : value.replaceAll("\\s+", " ").trim();
    }

    private static String abbreviate(String value, int maxLength) {
        String line = singleLine(value);
        return line.length() <= maxLength ? line : line.substring(0, maxLength - 1) + "…";
    }

    private static int nullToZero(Integer value) {
        return value == null ? 0 : value;
    }

    private static String esc(String value) {
        return value == null ? "" : SeoShellTemplate.esc(value);
    }

    private static final class Catalog {
        private final List<BlogFrontBookListVO> books;
        private final List<BlogFrontPostOutlineVO> posts;
        private final List<PromptEntry> prompts;
        private final List<PromptEntry> freePrompts;
        private final long loadedAt;

        private Catalog(List<BlogFrontBookListVO> books, List<BlogFrontPostOutlineVO> posts,
                List<PromptEntry> prompts, long loadedAt) {
            this.books = books;
            this.posts = posts;
            this.prompts = prompts;
            this.freePrompts = prompts.stream().filter(prompt -> prompt.free).collect(Collectors.toList());
            this.loadedAt = loadedAt;
        }

        private List<PromptEntry> freePrompts() {
            return freePrompts;
        }
    }

    /** Lightweight projection of a published artwork; never holds prompt text. */
    private static final class PromptEntry {
        private final Long id;
        private final String title;
        private final String summary;
        private final boolean free;
        private final Date createdAt;
        private final Date updatedAt;

        private PromptEntry(Long id, String title, String summary, boolean free, Date createdAt, Date updatedAt) {
            this.id = id;
            this.title = title;
            this.summary = summary;
            this.free = free;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }

        private static PromptEntry of(ArtworkVO artwork) {
            // Anonymous listing: canAccessPrompt is true only for memberOnly=0.
            return new PromptEntry(artwork.getId(),
                    StringUtils.defaultIfBlank(StringUtils.trim(artwork.getTitle()), "未命名提示词"),
                    StringUtils.trimToNull(artwork.getSummary()),
                    Boolean.TRUE.equals(artwork.getCanAccessPrompt()),
                    artwork.getCreateTime(),
                    artwork.getUpdateTime() != null ? artwork.getUpdateTime() : artwork.getCreateTime());
        }
    }

    private static final class CachedPage {
        /** Null means "serve the untouched shell" and is cached as well. */
        private final SeoPage page;
        private final long loadedAt;

        private CachedPage(SeoPage page, long loadedAt) {
            this.page = page;
            this.loadedAt = loadedAt;
        }
    }
}
