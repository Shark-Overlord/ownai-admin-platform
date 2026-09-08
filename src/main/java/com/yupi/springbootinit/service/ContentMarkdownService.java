package com.yupi.springbootinit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.vladsch.flexmark.ext.tables.TableBlock;
import com.vladsch.flexmark.ext.tables.TableCell;
import com.vladsch.flexmark.ext.tables.TableHead;
import com.vladsch.flexmark.ext.tables.TableRow;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.ast.Node;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.vladsch.flexmark.ast.*;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.utils.BlogHtmlSanitizer;
import java.util.Collections;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.StringEscapeUtils;
import org.springframework.stereotype.Service;

/** Converts the Agent-facing Markdown contract into the existing Tiptap/HTML storage contract. */
@Service
public class ContentMarkdownService {
    private final ObjectMapper objectMapper;
    private final Parser parser;
    private final HtmlRenderer renderer;

    public ContentMarkdownService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        MutableDataSet options = new MutableDataSet();
        options.set(Parser.EXTENSIONS, Collections.singletonList(TablesExtension.create()));
        this.parser = Parser.builder(options).build();
        this.renderer = HtmlRenderer.builder(options).escapeHtml(true).build();
    }

    public ConvertedContent convert(String markdown) {
        if (StringUtils.isBlank(markdown)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "markdown 正文不能为空");
        }
        if (markdown.length() > 10 * 1024 * 1024) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "markdown 正文不能超过 10MB");
        }
        Node document = parser.parse(markdown);
        ObjectNode tiptap = objectMapper.createObjectNode();
        tiptap.put("type", "doc");
        ArrayNode content = tiptap.putArray("content");
        for (Node child = document.getFirstChild(); child != null; child = child.getNext()) {
            ObjectNode converted = block(child);
            if (converted != null) content.add(converted);
        }
        if (content.isEmpty()) content.add(objectMapper.createObjectNode().put("type", "paragraph"));
        try {
            return new ConvertedContent(objectMapper.writeValueAsString(tiptap),
                    BlogHtmlSanitizer.sanitize(renderer.render(document)));
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "正文转换失败");
        }
    }

    public ConvertedContent convertTiptap(String contentJson) {
        if (StringUtils.isBlank(contentJson) || contentJson.length() > 10 * 1024 * 1024) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "contentJson 不能为空且不能超过 10MB");
        }
        try {
            com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(contentJson);
            if (!root.isObject() || !"doc".equals(root.path("type").asText()) || !root.path("content").isArray()) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "contentJson 必须是 Tiptap doc");
            }
            StringBuilder html = new StringBuilder();
            for (com.fasterxml.jackson.databind.JsonNode child : root.path("content")) renderTiptap(child, html);
            return new ConvertedContent(objectMapper.writeValueAsString(root), BlogHtmlSanitizer.sanitize(html.toString()));
        } catch (BusinessException e) { throw e; }
        catch (Exception e) { throw new BusinessException(ErrorCode.PARAMS_ERROR, "contentJson 格式不正确"); }
    }

    private void renderTiptap(com.fasterxml.jackson.databind.JsonNode node, StringBuilder html) {
        String type = node.path("type").asText();
        switch (type) {
            case "text": renderText(node, html); return;
            case "paragraph": wrap("p", node, html); return;
            case "heading":
                int level = Math.max(1, Math.min(6, node.path("attrs").path("level").asInt(2)));
                wrap("h" + level, node, html); return;
            case "bulletList": wrap("ul", node, html); return;
            case "orderedList":
                int start = node.path("attrs").path("start").asInt(1);
                html.append(start == 1 ? "<ol>" : "<ol start=\"").append(start == 1 ? "" : start).append(start == 1 ? "" : "\">");
                renderChildren(node, html); html.append("</ol>"); return;
            case "listItem": wrap("li", node, html); return;
            case "blockquote": wrap("blockquote", node, html); return;
            case "codeBlock":
                String language = node.path("attrs").path("language").asText("");
                html.append("<pre><code");
                if (StringUtils.isNotBlank(language)) html.append(" class=\"language-").append(escape(language)).append("\"");
                html.append(">"); renderChildren(node, html); html.append("</code></pre>"); return;
            case "hardBreak": html.append("<br>"); return;
            case "horizontalRule": html.append("<hr>"); return;
            case "image":
                String imageSrc = https(node.path("attrs").path("src").asText(), "图片");
                html.append("<img src=\"").append(escape(imageSrc)).append("\" alt=\"")
                        .append(escape(node.path("attrs").path("alt").asText(""))).append("\">"); return;
            case "video":
                String videoSrc = https(node.path("attrs").path("src").asText(), "视频");
                html.append("<video src=\"").append(escape(videoSrc)).append("\" controls preload=\"metadata\"></video>"); return;
            case "table": wrap("table", node, html); return;
            case "tableRow": wrap("tr", node, html); return;
            case "tableHeader": wrap("th", node, html); return;
            case "tableCell": wrap("td", node, html); return;
            default: throw new BusinessException(ErrorCode.PARAMS_ERROR, "暂不支持的 Tiptap 节点: " + type);
        }
    }

    private void renderText(com.fasterxml.jackson.databind.JsonNode node, StringBuilder html) {
        java.util.List<String> closes = new java.util.ArrayList<>();
        for (com.fasterxml.jackson.databind.JsonNode mark : node.path("marks")) {
            String type = mark.path("type").asText();
            if ("bold".equals(type)) { html.append("<strong>"); closes.add("</strong>"); }
            else if ("italic".equals(type)) { html.append("<em>"); closes.add("</em>"); }
            else if ("code".equals(type)) { html.append("<code>"); closes.add("</code>"); }
            else if ("link".equals(type)) {
                String href = safeLink(mark.path("attrs").path("href").asText());
                html.append("<a href=\"").append(escape(href)).append("\">"); closes.add("</a>");
            } else throw new BusinessException(ErrorCode.PARAMS_ERROR, "暂不支持的 Tiptap mark: " + type);
        }
        html.append(escape(node.path("text").asText("")));
        for (int i = closes.size() - 1; i >= 0; i--) html.append(closes.get(i));
    }

    private void wrap(String tag, com.fasterxml.jackson.databind.JsonNode node, StringBuilder html) {
        html.append('<').append(tag).append('>'); renderChildren(node, html); html.append("</").append(tag).append('>');
    }

    private void renderChildren(com.fasterxml.jackson.databind.JsonNode node, StringBuilder html) {
        if (!node.path("content").isArray()) return;
        for (com.fasterxml.jackson.databind.JsonNode child : node.path("content")) renderTiptap(child, html);
    }

    private String https(String value, String label) {
        if (!StringUtils.startsWith(value, "https://")) throw new BusinessException(ErrorCode.PARAMS_ERROR, label + "必须使用 HTTPS 地址");
        return value;
    }

    private String safeLink(String value) {
        if (!value.matches("https://[^\\s]+|/[^\\s]*|#[^\\s]+")) throw new BusinessException(ErrorCode.PARAMS_ERROR, "链接地址不安全");
        return value;
    }

    private String escape(String value) { return StringEscapeUtils.escapeHtml4(StringUtils.defaultString(value)); }

    private ObjectNode block(Node node) {
        if (node instanceof Heading) {
            ObjectNode result = type("heading");
            result.putObject("attrs").put("level", ((Heading) node).getLevel());
            inlineChildren(node, result);
            return result;
        }
        if (node instanceof Paragraph) {
            ObjectNode result = type("paragraph");
            inlineChildren(node, result);
            return result;
        }
        if (node instanceof BulletList || node instanceof OrderedList) {
            ObjectNode result = type(node instanceof BulletList ? "bulletList" : "orderedList");
            if (node instanceof OrderedList) result.putObject("attrs").put("start", ((OrderedList) node).getStartNumber());
            blockChildren(node, result);
            return result;
        }
        if (node instanceof ListItem) {
            ObjectNode result = type("listItem");
            blockChildren(node, result);
            return result;
        }
        if (node instanceof BlockQuote) {
            ObjectNode result = type("blockquote");
            blockChildren(node, result);
            return result;
        }
        if (node instanceof FencedCodeBlock) {
            FencedCodeBlock code = (FencedCodeBlock) node;
            String language = code.getInfo().toString().trim();
            String literal = code.getContentChars().toString().replaceFirst("\\s+$", "");
            if ("video".equalsIgnoreCase(language)) {
                String src = literal.trim();
                if (!src.matches("https://[^\\s]+")) {
                    throw new BusinessException(ErrorCode.PARAMS_ERROR, "video 代码块只能包含一个 HTTPS 地址");
                }
                ObjectNode result = type("video");
                ObjectNode attrs = result.putObject("attrs");
                attrs.put("src", src);
                attrs.put("controls", true);
                attrs.put("preload", "metadata");
                return result;
            }
            ObjectNode result = type("codeBlock");
            if (StringUtils.isNotBlank(language)) result.putObject("attrs").put("language", language);
            result.putArray("content").add(text(literal));
            return result;
        }
        if (node instanceof IndentedCodeBlock) {
            ObjectNode result = type("codeBlock");
            result.putArray("content").add(text(((IndentedCodeBlock) node).getContentChars().toString()));
            return result;
        }
        if (node instanceof ThematicBreak) return type("horizontalRule");
        if (node instanceof TableBlock) return table((TableBlock) node);
        throw new BusinessException(ErrorCode.PARAMS_ERROR,
                "暂不支持的 Markdown 结构: " + node.getClass().getSimpleName());
    }

    private ObjectNode table(TableBlock table) {
        ObjectNode result = type("table");
        ArrayNode rows = result.putArray("content");
        appendTableRows(table, rows, false);
        return result;
    }

    private void appendTableRows(Node parent, ArrayNode rows, boolean header) {
        for (Node child = parent.getFirstChild(); child != null; child = child.getNext()) {
            boolean nextHeader = header || child instanceof TableHead;
            if (child instanceof TableRow) {
                ObjectNode row = type("tableRow");
                ArrayNode cells = row.putArray("content");
                for (Node cell = child.getFirstChild(); cell != null; cell = cell.getNext()) {
                    if (!(cell instanceof TableCell)) continue;
                    ObjectNode cellNode = type(nextHeader ? "tableHeader" : "tableCell");
                    ObjectNode paragraph = type("paragraph");
                    inlineChildren(cell, paragraph);
                    cellNode.putArray("content").add(paragraph);
                    cells.add(cellNode);
                }
                rows.add(row);
            } else appendTableRows(child, rows, nextHeader);
        }
    }

    private void blockChildren(Node parent, ObjectNode result) {
        ArrayNode content = result.putArray("content");
        for (Node child = parent.getFirstChild(); child != null; child = child.getNext()) {
            ObjectNode converted = block(child);
            if (converted != null) content.add(converted);
        }
    }

    private void inlineChildren(Node parent, ObjectNode result) {
        ArrayNode content = result.putArray("content");
        appendInline(parent, content, null);
        if (content.isEmpty()) result.remove("content");
    }

    private void appendInline(Node parent, ArrayNode content, ArrayNode inheritedMarks) {
        for (Node child = parent.getFirstChild(); child != null; child = child.getNext()) {
            if (child instanceof Text) {
                ObjectNode value = text(child.getChars().toString());
                if (inheritedMarks != null && !inheritedMarks.isEmpty()) value.set("marks", inheritedMarks.deepCopy());
                content.add(value);
            } else if (child instanceof SoftLineBreak || child instanceof HardLineBreak) {
                content.add(type("hardBreak"));
            } else if (child instanceof Image) {
                Image image = (Image) child;
                String src = image.getUrl().toString();
                if (!src.matches("https://[^\\s]+")) {
                    throw new BusinessException(ErrorCode.PARAMS_ERROR, "图片必须使用 HTTPS 地址");
                }
                ObjectNode imageNode = type("image");
                ObjectNode attrs = imageNode.putObject("attrs");
                attrs.put("src", src);
                attrs.put("alt", image.getText().toString());
                if (image.getTitle().isNotNull()) attrs.put("title", image.getTitle().toString());
                content.add(imageNode);
            } else {
                ArrayNode marks = inheritedMarks == null ? objectMapper.createArrayNode() : inheritedMarks.deepCopy();
                if (child instanceof StrongEmphasis) marks.add(type("bold"));
                else if (child instanceof Emphasis) marks.add(type("italic"));
                else if (child instanceof Code) marks.add(type("code"));
                else if (child instanceof Link) {
                    Link link = (Link) child;
                    String href = link.getUrl().toString();
                    if (!href.matches("https://[^\\s]+|/[^\\s]*|#[^\\s]+")) {
                        throw new BusinessException(ErrorCode.PARAMS_ERROR, "链接必须使用 HTTPS、站内绝对路径或锚点");
                    }
                    ObjectNode mark = type("link");
                    mark.putObject("attrs").put("href", href);
                    marks.add(mark);
                } else if (!(child instanceof TextBase)) {
                    throw new BusinessException(ErrorCode.PARAMS_ERROR,
                            "暂不支持的 Markdown 行内结构: " + child.getClass().getSimpleName());
                }
                appendInline(child, content, marks);
            }
        }
    }

    private ObjectNode type(String type) {
        return objectMapper.createObjectNode().put("type", type);
    }

    private ObjectNode text(String value) {
        return type("text").put("text", value);
    }

    public static class ConvertedContent {
        private final String contentJson;
        private final String contentHtml;
        public ConvertedContent(String contentJson, String contentHtml) {
            this.contentJson = contentJson;
            this.contentHtml = contentHtml;
        }
        public String getContentJson() { return contentJson; }
        public String getContentHtml() { return contentHtml; }
    }
}
