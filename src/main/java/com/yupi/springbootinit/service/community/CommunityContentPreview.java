package com.yupi.springbootinit.service.community;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Builds the feed preview from the saved Markdown instead of a separate cover field. */
final class CommunityContentPreview {
    private static final int EXCERPT_LIMIT = 220;
    private static final Pattern VIDEO = Pattern.compile("(?is)```\\s*video\\s*\\R\\s*(\\S+)\\s*\\R?```");
    private static final Pattern IMAGE = Pattern.compile("!\\[[^\\]]*]\\(\\s*(?:<([^>]+)>|([^\\s)]+))(?:\\s+[\"'][^\"']*[\"'])?\\s*\\)");
    private static final Pattern FENCED_CODE = Pattern.compile("(?s)```.*?```");
    private static final Pattern MARKDOWN_IMAGE = Pattern.compile("!\\[[^\\]]*]\\([^)]*\\)");
    private static final Pattern MARKDOWN_LINK = Pattern.compile("\\[([^\\]]+)]\\([^)]*\\)");

    private CommunityContentPreview() { }

    static void enrich(Map<String, Object> row, boolean keepMarkdown) {
        String markdown = string(row.get("markdown"));
        String title = string(row.get("title"));
        Preview preview = inspect(markdown, title);
        row.put("excerpt", preview.excerpt);
        row.put("previewMediaType", preview.mediaType);
        row.put("previewMediaUrl", preview.mediaUrl);
        row.remove("coverUrl");
        if (!keepMarkdown) row.remove("markdown");
    }

    @SuppressWarnings("unchecked")
    static void enrichPage(Map<String, Object> page) {
        Object records = page.get("records");
        if (!(records instanceof List)) return;
        for (Map<String, Object> row : (List<Map<String, Object>>) records) enrich(row, false);
    }

    static Preview inspect(String markdown, String title) {
        String source = markdown == null ? "" : markdown;
        String mediaType = null;
        String mediaUrl = null;

        Matcher video = VIDEO.matcher(source);
        if (video.find()) {
            mediaUrl = safeMedia(video.group(1));
            if (mediaUrl != null) mediaType = "video";
        }
        if (mediaUrl == null) {
            Matcher image = IMAGE.matcher(source);
            while (image.find() && mediaUrl == null) mediaUrl = safeMedia(image.group(1) == null ? image.group(2) : image.group(1));
            if (mediaUrl != null) mediaType = "image";
        }

        String excerpt = FENCED_CODE.matcher(source).replaceAll(" ");
        excerpt = excerpt.replaceFirst("(?m)^\\s{0,3}#\\s+[^\\r\\n]+(?:\\R|$)", " ");
        excerpt = MARKDOWN_IMAGE.matcher(excerpt).replaceAll(" ");
        excerpt = MARKDOWN_LINK.matcher(excerpt).replaceAll("$1");
        excerpt = excerpt.replaceAll("(?m)^\\s{0,3}#{1,6}\\s*", "")
                .replaceAll("(?m)^\\s*(?:[-*+] |\\d+[.)] )", "")
                .replaceAll("<[^>]+>", " ")
                .replaceAll("[*_~`>#|]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        String cleanTitle = title == null ? "" : title.trim();
        if (!cleanTitle.isEmpty() && excerpt.startsWith(cleanTitle)) excerpt = excerpt.substring(cleanTitle.length()).trim();
        excerpt = truncate(excerpt, EXCERPT_LIMIT);
        return new Preview(excerpt, mediaType, mediaUrl);
    }

    private static String safeMedia(String value) {
        String candidate = value == null ? "" : value.trim();
        if (candidate.isEmpty() || candidate.indexOf('\\') >= 0) return null;
        try {
            URI uri = URI.create(candidate);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null ? candidate : null;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private static String truncate(String value, int max) {
        if (value.length() <= max) return value;
        int end = max;
        if (Character.isHighSurrogate(value.charAt(end - 1))) end--;
        return value.substring(0, end).trim() + "…";
    }

    private static String string(Object value) { return value == null ? "" : String.valueOf(value); }

    static final class Preview {
        final String excerpt;
        final String mediaType;
        final String mediaUrl;
        Preview(String excerpt, String mediaType, String mediaUrl) {
            this.excerpt = excerpt;
            this.mediaType = mediaType;
            this.mediaUrl = mediaUrl;
        }
    }
}
