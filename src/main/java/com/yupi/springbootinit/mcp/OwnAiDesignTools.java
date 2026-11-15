package com.yupi.springbootinit.mcp;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetQueryRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.DeconstructionAssetFavorite;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.TagVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetVO;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.DeconstructionAssetFavoriteService;
import com.yupi.springbootinit.service.PromptAssetService;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * OwnAI 智能设计与解构 MCP 工具集。
 * 以「业务场景、终端设备、视觉风格、构件类型、动效特征」5 大设计语义为核心，
 * 供 WorkBuddy / Cursor / Claude Desktop 等 AI 客户端直接检索可复用的组件代码、动效配置与设计系统。
 */
@Slf4j
@Component
public class OwnAiDesignTools {

    private static final String ANONYMOUS_CODE_UPGRADE_NOTICE =
            "/* 🔒 完整组件切片与单页原型源码属 OwnAI 会员权益。请前往 https://ownai.icu/pricing 开通会员，并在 https://ownai.icu/mcp/auth?client=WorkBuddy 生成专属密钥后配置解锁。 */";
    private static final String ANONYMOUS_PROMPT_UPGRADE_NOTICE =
            "🔒 会员专属深度解构提示词，请前往 https://ownai.icu/pricing 开通会员并在 https://ownai.icu/mcp/auth?client=WorkBuddy 获取专属密钥后解锁。";

    private static final String[] ARTWORK_COMPONENT_COLUMNS = {
            "id", "title", "deviceFrame", "summary", "coverUrl",
            "isDeconstructed", "memberOnly", "promptData", "promptContent", "partsData", "htmlUrl", "updateTime"
    };

    private static final String[] ARTWORK_LIGHT_META_COLUMNS = {
            "id", "title", "deviceFrame", "summary", "coverUrl",
            "isDeconstructed", "memberOnly", "partsData", "htmlUrl", "sort", "updateTime"
    };

    private final DeconstructionAssetFavoriteService favoriteService;
    private final ArtworkService artworkService;
    private final PromptAssetService promptAssetService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OwnAiDesignTools(DeconstructionAssetFavoriteService favoriteService,
                            ArtworkService artworkService,
                            PromptAssetService promptAssetService) {
        this.favoriteService = favoriteService;
        this.artworkService = artworkService;
        this.promptAssetService = promptAssetService;
    }

    // =========================================================================
    // Tool 1: find_design_components (多维语义寻找组件切片代码与动效)
    // =========================================================================

    @Tool(description = "根据多维设计语义（业务场景、终端设备、视觉风格、构件类型、动效特征）智能查找前端切片组件与 TSX/JSX 代码。返回结果包含 coverUrl 界面设计封面截图（可使用 ![界面图](coverUrl) 直接展示）。优先匹配用户已收藏的资产，也可同时在系统已解构作品库中深度查找。")
    public List<DesignComponentResult> find_design_components(
            @ToolParam(description = "业务场景，如: 电商, 社交/聊天, SaaS仪表盘, 个人主页/博客, 内容资讯, 工具类", required = false) String scenario,
            @ToolParam(description = "终端载体: app (移动端/iOS/Android) 或 website (桌面端/Web网页)", required = false) String device,
            @ToolParam(description = "视觉风格，如: 极简, 暗黑/深色, 毛玻璃/拟态, 渐变霓虹, 纸质质感, 粗野主义", required = false) String style,
            @ToolParam(description = "构件类型，如: 导航栏/Header, 状态栏/灵动岛, 对话气泡, 输入框/胶囊, 卡片, 底部Tab, 浮层菜单", required = false) String componentType,
            @ToolParam(description = "动效特征，如: spring (弹簧回弹), micro-interaction (按压微交互), stagger (交错入场), transition (平滑展开), wave (波浪跳动)", required = false) String motionType,
            @ToolParam(description = "补充搜索关键词", required = false) String keyword,
            @ToolParam(description = "是否输出完整组件源码（默认 true；若为 false 则输出精简预览）", required = false) Boolean includeCode,
            @ToolParam(description = "数据范围: favorites (仅查我的收藏), all (全库检索包含收藏，默认 all)", required = false) String source,
            @ToolParam(description = "返回数量上限，默认 5，最大 15", required = false) Integer limit) {

        try {
            Long userId = McpUserContext.getUserId();
            boolean isMemberAuth = userId != null;
            int safeLimit = (limit == null || limit <= 0) ? 5 : Math.min(limit, 15);
            boolean fullCode = includeCode == null || includeCode;
            boolean onlyFavorites = "favorites".equalsIgnoreCase(StringUtils.trim(source));

            List<ScoredComponent> candidates = new ArrayList<>();

            // 1. 优先查用户的收藏
            if (userId != null) {
                List<DeconstructionAssetFavorite> favs = favoriteService.listFavoritesForMcp(
                        userId, "component", keyword, 50);
                if (favs != null && !favs.isEmpty()) {
                    List<Long> awIds = favs.stream()
                            .map(DeconstructionAssetFavorite::getArtworkId)
                            .filter(Objects::nonNull)
                            .distinct()
                            .collect(Collectors.toList());
                    Map<Long, Artwork> awMap = loadArtworksMapSafe(awIds);

                    for (DeconstructionAssetFavorite fav : favs) {
                        Artwork linkedArtwork = fav.getArtworkId() != null ? awMap.get(fav.getArtworkId()) : null;
                        int score = scoreComponent(fav.getTitle(), fav.getTag(), fav.getDescription(), fav.getContent(),
                                linkedArtwork != null ? linkedArtwork.getTitle() : "",
                                linkedArtwork != null ? linkedArtwork.getDeviceFrame() : "",
                                linkedArtwork != null ? linkedArtwork.getSummary() : "",
                                scenario, device, style, componentType, motionType, keyword);

                        List<MotionItem> motions = extractMotionsFromArtwork(linkedArtwork);
                        candidates.add(new ScoredComponent(
                                fav.getAssetKey() != null ? fav.getAssetKey() : String.valueOf(fav.getId()),
                                fav.getTitle(),
                                fav.getTag(),
                                resolveDeviceType(linkedArtwork != null ? linkedArtwork.getDeviceFrame() : null),
                                fullCode ? fav.getContent() : StringUtils.abbreviate(fav.getContent(), 300),
                                fav.getDescription(),
                                motions,
                                true,
                                linkedArtwork != null ? linkedArtwork.getTitle() : "我的收藏",
                                fav.getArtworkId(),
                                linkedArtwork != null ? linkedArtwork.getCoverUrl() : null,
                                score + 10
                        ));
                    }
                }
            }

            // 2. 若非仅查收藏，从平台解构作品库中补充（投影列避免拉取大体积 standaloneHtml）
            if (!onlyFavorites) {
                QueryWrapper<Artwork> qw = new QueryWrapper<>();
                qw.select(ARTWORK_COMPONENT_COLUMNS)
                        .eq("isDeconstructed", 1)
                        .eq("status", 1)
                        .orderByDesc("updateTime")
                        .last("LIMIT 40");
                List<Artwork> artworks = artworkService.list(qw);
                if (artworks != null) {
                    for (Artwork aw : artworks) {
                        if (aw == null || StringUtils.isBlank(aw.getPartsData())) {
                            continue;
                        }
                        boolean isFreeArtwork = aw.getMemberOnly() == null || aw.getMemberOnly() == 0;
                        List<MotionItem> artworkMotions = extractMotionsFromArtwork(aw);
                        try {
                            JsonNode partsNode = objectMapper.readTree(aw.getPartsData());
                            if (partsNode.isArray()) {
                                for (JsonNode part : partsNode) {
                                    String pId = part.path("id").asText();
                                    String pTitle = part.path("title").asText();
                                    String pTag = part.path("tag").asText();
                                    String pCode = part.path("code").asText();
                                    String pDesc = part.path("desc").asText();

                                    boolean alreadyIn = StringUtils.isNotBlank(pId)
                                            && candidates.stream().anyMatch(c -> Objects.equals(c.id, pId));
                                    if (alreadyIn) {
                                        continue;
                                    }

                                    int score = scoreComponent(pTitle, pTag, pDesc, pCode,
                                            aw.getTitle(), aw.getDeviceFrame(), aw.getSummary(),
                                            scenario, device, style, componentType, motionType, keyword);

                                    String exposedCode = (!isMemberAuth && !isFreeArtwork)
                                            ? ANONYMOUS_CODE_UPGRADE_NOTICE
                                            : (fullCode ? pCode : StringUtils.abbreviate(pCode, 300));

                                    candidates.add(new ScoredComponent(
                                            pId, pTitle, pTag, resolveDeviceType(aw.getDeviceFrame()),
                                            exposedCode,
                                            pDesc, artworkMotions, false, aw.getTitle(), aw.getId(), aw.getCoverUrl(), score
                                    ));
                                }
                            }
                        } catch (Exception e) {
                            log.warn("解析作品 partsData 失败: artworkId={}, error={}", aw.getId(), e.getMessage());
                        }
                    }
                }
            }

            candidates.sort(Comparator.comparingInt((ScoredComponent c) -> c.score).reversed());

            return candidates.stream().limit(safeLimit).map(c -> new DesignComponentResult(
                    c.title, c.componentType, c.device, c.code, c.desc,
                    c.matchedMotions, c.isFavorite, c.artworkTitle, c.coverUrl
            )).collect(Collectors.toList());
        } catch (Exception e) {
            log.error("find_design_components 执行异常", e);
            return Collections.emptyList();
        }
    }

    // =========================================================================
    // Tool 2: get_design_system (获取设计系统、色盘与 Motion Tokens)
    // =========================================================================

    @Tool(description = "获取设计系统规范与全局设计语言 Tokens（包含色彩色盘、排版字体、间距圆角、动效参数体系以及完整的 UI 生成 System Prompt）。支持按场景、设备、视觉风格或模糊关键词检索，无需记忆具体数字 ID。")
    public DesignSystemSpec get_design_system(
            @ToolParam(description = "业务场景，如: 电商, 社交, SaaS, 移动端设计", required = false) String scenario,
            @ToolParam(description = "设备类型: app (移动端) 或 website (桌面端)", required = false) String device,
            @ToolParam(description = "视觉风格，如: 极简, 暗黑, 纸质质感, 赛博朋克, 玻璃拟态", required = false) String style,
            @ToolParam(description = "模糊作品名称或关键词，如: Claude, 灵动岛, 极简播放器", required = false) String keyword) {

        try {
            boolean isMemberAuth = McpUserContext.get() != null;
            Artwork target = findBestMatchingArtworkForSystem(scenario, device, style, keyword, !isMemberAuth);

            if (target == null) {
                return buildDefaultDesignSystemSpec(scenario, device, style, keyword);
            }

            JsonNode promptData = null;
            try {
                if (StringUtils.isNotBlank(target.getPromptData())) {
                    promptData = objectMapper.readTree(target.getPromptData());
                }
            } catch (Exception ignored) {
            }

            Map<String, String> colors = new LinkedHashMap<>();
            List<MotionItem> motionTokens = new ArrayList<>(extractMotionsFromArtwork(target));
            String typography = "Inter, -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; Heading: 20px-28px SemiBold (tracking -0.02em); Body: 14px-15px Regular (line-height 1.6)";
            String layout = "Container Padding: 16px/24px; Card Radius: 16px-22px (平滑连续圆角); Surface Shadow: 0 8px 32px rgba(0,0,0,0.12); Grid Gap: 12px-16px";

            if (promptData != null) {
                JsonNode colorsNode = promptData.path("colors");
                if (colorsNode.isObject()) {
                    colorsNode.fieldNames().forEachRemaining(fn -> colors.put(fn, colorsNode.path(fn).asText()));
                }
                if (promptData.hasNonNull("typography")) {
                    typography = promptData.path("typography").isTextual()
                            ? promptData.path("typography").asText()
                            : promptData.path("typography").toString();
                }
                if (promptData.hasNonNull("layout")) {
                    layout = promptData.path("layout").isTextual()
                            ? promptData.path("layout").asText()
                            : promptData.path("layout").toString();
                }
            }

            if (colors.isEmpty()) {
                populateFallbackPalette(colors, style, target.getSummary());
            }
            if (motionTokens.isEmpty()) {
                motionTokens.add(new MotionItem(
                        "主容器弹簧过渡",
                        "面板与浮层平滑阻尼入场",
                        "type: 'spring', stiffness: 360, damping: 26"
                ));
                motionTokens.add(new MotionItem(
                        "触觉微交互反馈",
                        "按钮与卡片点击缩放回弹",
                        "cubic-bezier(0.22, 1, 0.36, 1) 160ms, active:scale-[0.97]"
                ));
            }

            boolean isFreeArtwork = target.getMemberOnly() == null || target.getMemberOnly() == 0;
            String resolvedDevice = resolveDeviceType(target.getDeviceFrame());

            String promptContent;
            String sourceZipUrl;
            if (isMemberAuth) {
                promptContent = StringUtils.isNotBlank(target.getDeconstructedPrompt())
                        ? target.getDeconstructedPrompt()
                        : (promptData != null && promptData.hasNonNull("rawMarkdown")
                                ? promptData.path("rawMarkdown").asText()
                                : StringUtils.defaultIfBlank(target.getPromptContent(),
                                        synthesizeDesignSystemPrompt(target.getTitle(), resolvedDevice, target.getSummary(), colors, typography, layout, motionTokens)));
                sourceZipUrl = target.getSourceZipUrl();
            } else {
                promptContent = (isFreeArtwork && StringUtils.isNotBlank(target.getPromptContent()))
                        ? target.getPromptContent()
                        : synthesizeDesignSystemPrompt(target.getTitle(), resolvedDevice, target.getSummary(), colors, typography, layout, motionTokens);
                sourceZipUrl = null;
            }

            return new DesignSystemSpec(
                    target.getTitle(),
                    resolvedDevice,
                    colors,
                    typography,
                    layout,
                    motionTokens,
                    promptContent,
                    sourceZipUrl,
                    Integer.valueOf(1).equals(target.getIsDeconstructed()),
                    target.getCoverUrl()
            );
        } catch (Exception e) {
            log.error("get_design_system 执行异常", e);
            return buildDefaultDesignSystemSpec(scenario, device, style, keyword);
        }
    }

    // =========================================================================
    // Tool 3: find_motion_presets (专搜交互微动效与动画参数预设)
    // =========================================================================

    @Tool(description = "专门检索交互微动效与动画参数预设（Motion Presets）。支持检索弹簧阻尼、微交互按压、交错入场、卡片悬停、抽屉模态等参数，提供开箱即用的 Framer Motion 参数配置、Tailwind 动画类与 CSS 缓动曲线。")
    public List<MotionPresetResult> find_motion_presets(
            @ToolParam(description = "动效交互意图，如: 灵动岛弹性展开, 按钮按压微交互, 模态框升起, 列表交错飞入, 卡片悬停浮起, 抽屉收缩") String motionIntent,
            @ToolParam(description = "技术栈偏好: framer-motion (React 默认首选), tailwind-css, css-bezier", required = false) String techStack,
            @ToolParam(description = "设备类型: app 或 website", required = false) String device) {

        try {
            String intent = StringUtils.trimToEmpty(motionIntent).toLowerCase(Locale.ROOT);
            List<MotionPresetResult> results = new ArrayList<>();
            Set<String> seenLabels = new HashSet<>();

            // 1. 扫描解构作品库中的实际动效参数（轻量列投影）
            QueryWrapper<Artwork> qw = new QueryWrapper<>();
            qw.select("id", "title", "deviceFrame", "promptData", "promptContent", "updateTime")
                    .eq("isDeconstructed", 1)
                    .eq("status", 1)
                    .orderByDesc("updateTime")
                    .last("LIMIT 25");
            List<Artwork> artworks = artworkService.list(qw);
            List<String> intentTokens = tokenizeQuery(intent);

            if (artworks != null) {
                for (Artwork aw : artworks) {
                    List<MotionItem> list = extractMotionsFromArtwork(aw);
                    for (MotionItem mi : list) {
                        String hay = (mi.label + " " + mi.desc + " " + mi.token).toLowerCase(Locale.ROOT);
                        boolean match = StringUtils.isBlank(intent)
                                || hay.contains(intent)
                                || intentTokens.stream().anyMatch(hay::contains);
                        if (match && seenLabels.add(mi.label + "@" + aw.getTitle())) {
                            results.add(buildMotionResult(mi.label, mi.desc, mi.token, aw.getTitle()));
                        }
                    }
                }
            }

            // 2. 内置高阶交互微动效标准库匹配
            if (matchesAny(intent, "弹簧", "spring", "灵动岛", "island", "展开", "expand", "胶囊", "pill", "bouncy")) {
                results.add(new MotionPresetResult(
                        "iOS 弹簧弹性展开 (Spring Dynamic Expansion)",
                        "适用于灵动岛、动态胶囊栏、浮动工具条等具有物理质量与回弹质感的形态展开",
                        "type: 'spring', stiffness: 380, damping: 24, mass: 0.8",
                        "layout transition={{ type: 'spring', stiffness: 380, damping: 24, mass: 0.8 }}",
                        "transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                        "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        "OwnAI iOS Motion System"
                ));
            }
            if (matchesAny(intent, "按压", "微交互", "点击", "按钮", "tap", "press", "click", "button", "tactile")) {
                results.add(new MotionPresetResult(
                        "触觉级按压回弹微交互 (Tactile Press Feedback)",
                        "按钮、胶囊操作项、卡片点击时的瞬时下沉与高光释放",
                        "whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 520, damping: 28 }}",
                        "whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 520, damping: 28 }}",
                        "active:scale-[0.96] hover:brightness-105 transition-all duration-150 ease-out",
                        "cubic-bezier(0.2, 0, 0, 1)",
                        "OwnAI Component Standard"
                ));
            }
            if (matchesAny(intent, "交错", "入场", "列表", "网格", "瀑布", "stagger", "list", "grid", "cascade", "reveal")) {
                results.add(new MotionPresetResult(
                        "列表级联交错入场 (Staggered Cascade Reveal)",
                        "仪表盘指标卡、Bento Grid 或消息列表按序号依次平滑上浮渐显",
                        "staggerChildren: 0.06, delayChildren: 0.04, y: 12 -> 0",
                        "variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }} item={{ hidden: { opacity: 0, y: 12, filter: 'blur(4px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } } }}",
                        "animate-in fade-in slide-in-from-bottom-3 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        "cubic-bezier(0.22, 1, 0.36, 1)",
                        "OwnAI Motion Library"
                ));
            }
            if (matchesAny(intent, "悬停", "浮起", "卡片", "阴影", "hover", "card", "float", "elevate")) {
                results.add(new MotionPresetResult(
                        "Bento 卡片悬停悬浮与光晕追踪 (Card Elevation & Glow)",
                        "桌面端 SaaS 卡片或作品封面悬停时的轻微抬升与边框提亮",
                        "y: -4, scale: 1.01, duration: 0.22, ease: [0.22, 1, 0.36, 1]",
                        "whileHover={{ y: -4, scale: 1.008 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}",
                        "hover:-translate-y-1 hover:shadow-xl hover:border-white/20 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        "cubic-bezier(0.22, 1, 0.36, 1)",
                        "OwnAI Web Showcase Standard"
                ));
            }
            if (matchesAny(intent, "模态", "弹窗", "抽屉", "底部", "modal", "dialog", "drawer", "sheet", "popover")) {
                results.add(new MotionPresetResult(
                        "丝滑模态框与底部抽屉升起 (Sheet & Modal Detent)",
                        "移动端 Bottom Sheet 或桌面 Command Palette 的无过冲阻尼弹出",
                        "type: 'spring', stiffness: 420, damping: 34, mass: 0.9",
                        "initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}",
                        "transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        "cubic-bezier(0.32, 0.72, 0, 1)",
                        "OwnAI Sheet Physics"
                ));
            }
            if (matchesAny(intent, "呼吸", "波浪", "加载", "骨架", "光效", "wave", "pulse", "shimmer", "loading", "skeleton")) {
                results.add(new MotionPresetResult(
                        "AI 生成态流光呼吸波浪 (Ambient Pulse & Shimmer)",
                        "适用于 AI 思考中状态指示器、语音波形或骨架屏柔和光泽扫过",
                        "opacity: [0.45, 1, 0.45], scale: [0.98, 1.02, 0.98], duration: 2.2, repeat: Infinity",
                        "animate={{ opacity: [0.45, 1, 0.45], scale: [0.98, 1.02, 0.98] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}",
                        "animate-pulse transition-opacity duration-700 ease-in-out",
                        "cubic-bezier(0.4, 0, 0.6, 1)",
                        "OwnAI AI-Native UI Kit"
                ));
            }

            // 3. 兜底保障：任何自然语言动效描述绝不返回空列表
            if (results.isEmpty()) {
                results.add(new MotionPresetResult(
                        "通用自然阻尼平滑过渡 (Natural Quintic Out)",
                        "适用于绝大多数现代 UI 面板切换、状态展开与元素位移的黄金缓动曲线",
                        "duration: 0.28, ease: [0.22, 1, 0.36, 1]",
                        "initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}",
                        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        "cubic-bezier(0.22, 1, 0.36, 1)",
                        "OwnAI Motion Foundation"
                ));
                results.add(new MotionPresetResult(
                        "高响应物理弹簧反馈 (Snappy UI Spring)",
                        "适用于交互控件切换、胶囊滑块滑动（Sliding Pill）与浮层锚定",
                        "type: 'spring', stiffness: 400, damping: 28, mass: 0.8",
                        "layout transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }}",
                        "transition-transform duration-250 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                        "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                        "OwnAI Motion Foundation"
                ));
                results.add(new MotionPresetResult(
                        "触觉微按压缩放 (Micro-Tap Scale)",
                        "可交互按钮与卡片的瞬时按压反馈",
                        "whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}",
                        "whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12, ease: 'easeOut' }}",
                        "active:scale-[0.97] transition-transform duration-150 ease-out",
                        "cubic-bezier(0.2, 0, 0, 1)",
                        "OwnAI Motion Foundation"
                ));
            }

            return results.stream().limit(5).collect(Collectors.toList());
        } catch (Exception e) {
            log.error("find_motion_presets 执行异常", e);
            return Collections.emptyList();
        }
    }

    // =========================================================================
    // Tool 4: find_design_artworks (【第一步】按场景与设备推荐 5 个作品供挑选，支持换一批)
    // =========================================================================

    @Tool(description = "【第一步：推荐设计作品】按场景、设备与风格推荐 5 个候选设计作品供用户挑选预览（包含作品名、封面截图、设计摘要与构件列表，不返回源码）。AI 必须使用 ![作品名](coverUrl) 向用户呈现图片。若用户表示不满意、要求「换一批」或「看其他」，必须将 page 自增并传入 excludeTitles 重新检索，绝不返回重复内容。当用户选中某个作品后，请调用 get_artwork_code 工具获取该作品的具体前端源码。")
    public List<ArtworkSearchResult> find_design_artworks(
            @ToolParam(description = "业务场景，如: 电商, 社交/聊天, SaaS仪表盘, 官网, 音乐, 个人博客", required = false) String scenario,
            @ToolParam(description = "设备载体: app (移动端) 或 website (网页端)", required = false) String device,
            @ToolParam(description = "视觉风格: 极简, 暗黑, 玻璃拟态, 渐变霓虹, 粗野主义", required = false) String style,
            @ToolParam(description = "自由搜索词", required = false) String keyword,
            @ToolParam(description = "页码/批次（默认 1。当用户说「换一批」、「看其他的」时，请递增此参数为 2、3 等）", required = false) Integer page,
            @ToolParam(description = "需要排除的作品名称列表（逗号分隔。避免重复推荐用户已看过的作品）", required = false) String excludeTitles,
            @ToolParam(description = "返回条数，默认 5", required = false) Integer limit) {

        try {
            User user = McpUserContext.get();
            int safeLimit = (limit == null || limit <= 0) ? 5 : Math.min(limit, 10);
            int currentPage = (page == null || page <= 0) ? 1 : page;

            Set<String> excludedSet = new HashSet<>();
            if (StringUtils.isNotBlank(excludeTitles)) {
                for (String t : excludeTitles.split("[,，|]")) {
                    if (StringUtils.isNotBlank(t)) {
                        excludedSet.add(t.trim().toLowerCase(Locale.ROOT));
                    }
                }
            }

            ArtworkQueryRequest queryRequest = new ArtworkQueryRequest();
            String text = StringUtils.defaultIfBlank(keyword, StringUtils.defaultIfBlank(scenario, style));
            queryRequest.setSearchText(StringUtils.trimToNull(text));
            queryRequest.setCurrent(currentPage);
            queryRequest.setPageSize(safeLimit + excludedSet.size());

            Page<ArtworkVO> voPage = artworkService.listArtworkVOByPage(queryRequest, user, false);
            List<ArtworkVO> primaryRecords = (voPage != null && voPage.getRecords() != null)
                    ? voPage.getRecords()
                    : Collections.emptyList();

            List<ArtworkSearchResult> results = new ArrayList<>();
            Set<String> addedTitles = new HashSet<>();

            if (!primaryRecords.isEmpty()) {
                List<Long> ids = primaryRecords.stream()
                        .map(ArtworkVO::getId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                Map<Long, Artwork> rawMap = loadArtworksMapSafe(ids);

                for (ArtworkVO vo : primaryRecords) {
                    if (vo == null || StringUtils.isBlank(vo.getTitle())) {
                        continue;
                    }
                    String lowerTitle = vo.getTitle().trim().toLowerCase(Locale.ROOT);
                    if (excludedSet.contains(lowerTitle) || !addedTitles.add(lowerTitle)) {
                        continue;
                    }
                    Artwork raw = rawMap.get(vo.getId());
                    List<String> components = extractComponentTitles(raw);
                    boolean hasProto = raw != null && (StringUtils.isNotBlank(raw.getStandaloneHtml())
                            || StringUtils.isNotBlank(raw.getHtmlUrl()));

                    results.add(new ArtworkSearchResult(
                            vo.getTitle(),
                            resolveDeviceType(vo.getDeviceFrame()),
                            vo.getSummary(),
                            vo.getCoverUrl(),
                            vo.getIsDeconstructed() != null && vo.getIsDeconstructed() == 1,
                            components,
                            hasProto
                    ));
                    if (results.size() >= safeLimit) {
                        return results;
                    }
                }
            }

            // 当 LLM 传入多词组合短语（如 "暗黑极简风格的 SaaS 仪表盘"）导致单字段 LIKE 未命中时，
            // 采用多维分词打分检索已发布作品，严格遵守 excludedSet 去重规则
            if (results.isEmpty() && primaryRecords.isEmpty()) {
                QueryWrapper<Artwork> fallbackQw = new QueryWrapper<>();
                fallbackQw.select(ARTWORK_LIGHT_META_COLUMNS)
                        .eq("status", 1);
                applyDeviceFilter(fallbackQw, device);
                fallbackQw.orderByDesc("isDeconstructed")
                        .orderByDesc("sort")
                        .orderByDesc("updateTime")
                        .last("LIMIT 60");

                List<Artwork> pool = artworkService.list(fallbackQw);
                if ((pool == null || pool.isEmpty()) && StringUtils.isNotBlank(device)) {
                    pool = artworkService.list(new QueryWrapper<Artwork>()
                            .select(ARTWORK_LIGHT_META_COLUMNS)
                            .eq("status", 1)
                            .orderByDesc("isDeconstructed")
                            .orderByDesc("sort")
                            .orderByDesc("updateTime")
                            .last("LIMIT 60"));
                }

                if (pool != null && !pool.isEmpty()) {
                    List<String> tokens = expandSemanticTokens(scenario, style, keyword);
                    List<Artwork> ranked = new ArrayList<>(pool);
                    ranked.sort((a, b) -> Integer.compare(
                            scoreArtworkForSearch(b, tokens, device),
                            scoreArtworkForSearch(a, tokens, device)
                    ));

                    int skipOffset = Math.max(0, (currentPage - 1) * safeLimit);
                    int validSeen = 0;
                    for (Artwork aw : ranked) {
                        if (aw == null || StringUtils.isBlank(aw.getTitle())) {
                            continue;
                        }
                        String lowerTitle = aw.getTitle().trim().toLowerCase(Locale.ROOT);
                        if (excludedSet.contains(lowerTitle) || addedTitles.contains(lowerTitle)) {
                            continue;
                        }
                        if (validSeen++ < skipOffset) {
                            continue;
                        }
                        addedTitles.add(lowerTitle);
                        results.add(new ArtworkSearchResult(
                                aw.getTitle(),
                                resolveDeviceType(aw.getDeviceFrame()),
                                aw.getSummary(),
                                aw.getCoverUrl(),
                                Integer.valueOf(1).equals(aw.getIsDeconstructed()),
                                extractComponentTitles(aw),
                                StringUtils.isNotBlank(aw.getHtmlUrl()) || Integer.valueOf(1).equals(aw.getIsDeconstructed())
                        ));
                        if (results.size() >= safeLimit) {
                            break;
                        }
                    }
                }
            }

            return results;
        } catch (Exception e) {
            log.error("find_design_artworks 执行异常", e);
            return Collections.emptyList();
        }
    }

    // =========================================================================
    // Tool 5: get_artwork_code (【第二步】用户挑选作品后，按需精准拉取前端原型与切片源码)
    // =========================================================================

    @Tool(description = "【第二步：获取前端源码】用户在推荐列表中挑选了某个作品后，调用此工具获取该作品的完整前端原型源码（可独立运行的单页 HTML/Tailwind）以及各个细粒度组件切片 TSX 源码。AI 获取后可直接在用户本地工程中写入文件或重构落地。")
    public ArtworkCodeResult get_artwork_code(
            @ToolParam(description = "用户选中的作品名称或关键词，例如：Claude iOS 聊天客户端、Bio Age Dashboard") String artworkTitle,
            @ToolParam(description = "代码提取偏好: all (默认全部), prototype (优先完整单页独立原型), components (优先切片组件代码)", required = false) String codeType) {

        if (StringUtils.isBlank(artworkTitle)) {
            return null;
        }

        try {
            String trimmedTitle = artworkTitle.trim();
            QueryWrapper<Artwork> qw = new QueryWrapper<>();
            qw.eq("status", 1);
            qw.and(w -> w.like("title", trimmedTitle)
                    .or().like("summary", trimmedTitle));
            qw.orderByDesc("isDeconstructed").orderByDesc("updateTime").last("LIMIT 1");

            Artwork target = artworkService.getOne(qw);

            // 若长标题/中英混合词未直接 LIKE 命中，分词匹配最佳已解构作品
            if (target == null) {
                List<String> tokens = expandSemanticTokens(null, null, trimmedTitle);
                List<Artwork> candidates = artworkService.list(new QueryWrapper<Artwork>()
                        .select("id", "title", "deviceFrame", "summary", "isDeconstructed", "sort", "updateTime")
                        .eq("status", 1)
                        .orderByDesc("isDeconstructed")
                        .orderByDesc("updateTime")
                        .last("LIMIT 50"));
                if (candidates != null && !candidates.isEmpty()) {
                    Artwork bestMeta = candidates.stream()
                            .max(Comparator.comparingInt(a -> scoreArtworkForSearch(a, tokens, null)))
                            .orElse(null);
                    if (bestMeta != null && bestMeta.getId() != null) {
                        target = artworkService.getById(bestMeta.getId());
                        if (target == null) {
                            target = bestMeta;
                        }
                    }
                }
            }

            if (target == null) {
                return null;
            }

            boolean isMemberAuth = McpUserContext.get() != null;
            boolean isFreeArtwork = target.getMemberOnly() == null || target.getMemberOnly() == 0;
            boolean canAccessFullCode = isMemberAuth || isFreeArtwork;

            List<ComponentCodeItem> componentList = new ArrayList<>();
            if (StringUtils.isNotBlank(target.getPartsData())) {
                try {
                    JsonNode partsNode = objectMapper.readTree(target.getPartsData());
                    if (partsNode.isArray()) {
                        for (JsonNode p : partsNode) {
                            componentList.add(new ComponentCodeItem(
                                    p.path("title").asText(),
                                    p.path("tag").asText(),
                                    canAccessFullCode ? p.path("code").asText() : ANONYMOUS_CODE_UPGRADE_NOTICE,
                                    p.path("desc").asText()
                            ));
                        }
                    }
                } catch (Exception e) {
                    log.warn("解析作品 partsData 失败: title={}, error={}", target.getTitle(), e.getMessage());
                }
            }

            String prototypeHtml;
            if (!canAccessFullCode) {
                prototypeHtml = ANONYMOUS_CODE_UPGRADE_NOTICE;
            } else if (StringUtils.isNotBlank(target.getStandaloneHtml())) {
                prototypeHtml = target.getStandaloneHtml();
            } else if (StringUtils.isNotBlank(target.getHtmlUrl())) {
                prototypeHtml = "<!-- OwnAI Hosted Standalone Prototype: " + target.getHtmlUrl() + " -->\n"
                        + buildSynthesizedPrototypeShell(target, componentList);
            } else {
                prototypeHtml = buildSynthesizedPrototypeShell(target, componentList);
            }

            String designSpec;
            if (canAccessFullCode) {
                designSpec = StringUtils.firstNonBlank(
                        target.getDeconstructedPrompt(),
                        target.getPromptContent(),
                        target.getSummary()
                );
            } else {
                designSpec = ANONYMOUS_PROMPT_UPGRADE_NOTICE;
            }

            return new ArtworkCodeResult(
                    target.getTitle(),
                    resolveDeviceType(target.getDeviceFrame()),
                    target.getSummary(),
                    prototypeHtml,
                    componentList,
                    designSpec,
                    target.getCoverUrl()
            );
        } catch (Exception e) {
            log.error("get_artwork_code 执行异常: artworkTitle={}", artworkTitle, e);
            return null;
        }
    }

    // =========================================================================
    // Tool 6: find_prompts_for_creation (按视觉风格与用途搜提示词模板)
    // =========================================================================

    @Tool(description = "按视觉风格、应用场景与目标工具检索高品质提示词模板（包含前端 UI 生成规范以及 Midjourney / FLUX 视觉生图 Prompt）。返回结果包含 coverUrl 视觉效果图（可使用 ![效果图](coverUrl) 直接展示）。")
    public List<PromptTemplateResult> find_prompts_for_creation(
            @ToolParam(description = "视觉风格，如: 极简扁平, 3D质感, 深色科技, 纸质质感, 赛博朋克", required = false) String visualStyle,
            @ToolParam(description = "应用场景，如: 产品海报, App界面, 网页Hero, 商业插画, 封面", required = false) String scenario,
            @ToolParam(description = "自由关键词", required = false) String keyword,
            @ToolParam(description = "目标工具: frontend-ui (代码生成), midjourney, flux, dall-e", required = false) String targetTool,
            @ToolParam(description = "返回条数，默认 5", required = false) Integer limit) {

        try {
            User user = McpUserContext.get();
            boolean isMemberAuth = user != null;
            int safeLimit = (limit == null || limit <= 0) ? 5 : Math.min(limit, 20);

            List<String> candidateQueries = new ArrayList<>();
            String primaryText = StringUtils.defaultIfBlank(keyword, StringUtils.defaultIfBlank(visualStyle, scenario));
            if (StringUtils.isNotBlank(primaryText)) {
                candidateQueries.add(primaryText.trim());
            }
            for (String token : expandSemanticTokens(scenario, visualStyle, keyword)) {
                if (token.length() >= 2 && !candidateQueries.contains(token)) {
                    candidateQueries.add(token);
                }
            }
            // 最后兜底：全量公开精选提示词
            candidateQueries.add(null);

            List<PromptTemplateResult> collected = new ArrayList<>();
            Set<String> seenTitles = new HashSet<>();

            for (String qText : candidateQueries) {
                PromptAssetQueryRequest queryRequest = new PromptAssetQueryRequest();
                queryRequest.setSearchText(StringUtils.trimToNull(qText));
                queryRequest.setCurrent(1);
                queryRequest.setPageSize(safeLimit);
                // 匿名访问时优先检索公开免费提示词（memberOnly=0），确保返回 100% 真实完整可用内容
                if (!isMemberAuth) {
                    queryRequest.setMemberOnly(0);
                }

                Page<PromptAssetVO> page = promptAssetService.listPublishedPromptAssetVOByPage(queryRequest, user);
                if (page != null && page.getRecords() != null) {
                    for (PromptAssetVO vo : page.getRecords()) {
                        if (vo == null || StringUtils.isBlank(vo.getTitle())) {
                            continue;
                        }
                        if (!isMemberAuth && StringUtils.isBlank(vo.getPromptContent())) {
                            continue;
                        }
                        if (!seenTitles.add(vo.getTitle().trim().toLowerCase(Locale.ROOT))) {
                            continue;
                        }
                        String tags = vo.getTagList() != null && !vo.getTagList().isEmpty()
                                ? vo.getTagList().stream().map(TagVO::getName).filter(Objects::nonNull).collect(Collectors.joining(","))
                                : vo.getAssetTagText();
                        boolean lockedForCaller = !isMemberAuth && Integer.valueOf(1).equals(vo.getMemberOnly());
                        String promptOut = lockedForCaller
                                ? ANONYMOUS_PROMPT_UPGRADE_NOTICE
                                : vo.getPromptContent();
                        collected.add(new PromptTemplateResult(
                                vo.getTitle(),
                                vo.getSummary(),
                                promptOut,
                                lockedForCaller ? null : vo.getPromptCn(),
                                vo.getCoverUrl(),
                                tags
                        ));
                        if (collected.size() >= safeLimit) {
                            return collected;
                        }
                    }
                }
            }

            // 若数据库提示词表在指定条件下仍为空，使用内置高质量前端 UI 与视觉标准模板兜底
            if (collected.isEmpty()) {
                collected.addAll(buildCuratedPromptFallbacks(visualStyle, scenario, targetTool, safeLimit));
            }

            return collected;
        } catch (Exception e) {
            log.error("find_prompts_for_creation 执行异常", e);
            return buildCuratedPromptFallbacks(visualStyle, scenario, targetTool, 3);
        }
    }

    // =========================================================================
    // 个人收藏快捷工具（当账号暂无收藏时智能回退平台精选组件，避免空结果）
    // =========================================================================

    @Tool(description = "搜索当前用户收藏的设计资产；若当前账号暂无匹配收藏，则自动补充平台精选已解构组件供直接使用。")
    public List<DesignComponentResult> search_my_favorites(
            @ToolParam(description = "资产类型过滤：prompt / component / icon / media", required = false) String assetType,
            @ToolParam(description = "搜索关键词", required = false) String keyword,
            @ToolParam(description = "返回条数上限，默认 5", required = false) Integer limit) {
        List<DesignComponentResult> favResults = find_design_components(
                null, null, null, null, null, keyword, true, "favorites", limit);
        if (favResults != null && !favResults.isEmpty()) {
            return favResults;
        }
        return find_design_components(null, null, null, null, null, keyword, true, "all", limit);
    }

    @Tool(description = "获取指定收藏资产的完整内容（支持按资产标题或关键词检索；若个人收藏未命中则智能匹配平台解构组件）。")
    public DesignComponentResult get_favorite_detail(
            @ToolParam(description = "收藏资产标题或关键词") String keyword) {
        Long userId = McpUserContext.getUserId();
        if (userId != null && StringUtils.isNotBlank(keyword)) {
            List<DeconstructionAssetFavorite> favs = favoriteService.listFavoritesForMcp(userId, null, keyword, 1);
            if (favs != null && !favs.isEmpty()) {
                DeconstructionAssetFavorite fav = favs.get(0);
                Artwork linkedAw = fav.getArtworkId() != null ? artworkService.getById(fav.getArtworkId()) : null;
                return new DesignComponentResult(
                        fav.getTitle(),
                        fav.getTag(),
                        resolveDeviceType(linkedAw != null ? linkedAw.getDeviceFrame() : null),
                        fav.getContent(),
                        fav.getDescription(),
                        extractMotionsFromArtwork(linkedAw),
                        true,
                        linkedAw != null ? linkedAw.getTitle() : "我的收藏",
                        linkedAw != null ? linkedAw.getCoverUrl() : null
                );
            }
        }
        List<DesignComponentResult> fallback = find_design_components(
                null, null, null, null, null, keyword, true, "all", 1);
        return (fallback != null && !fallback.isEmpty()) ? fallback.get(0) : null;
    }

    // =========================================================================
    // 内部多维打分、分词降级与兜底合成算法
    // =========================================================================

    private Map<Long, Artwork> loadArtworksMapSafe(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Artwork> list = artworkService.listByIds(ids);
        if (list == null || list.isEmpty()) {
            return Collections.emptyMap();
        }
        return list.stream()
                .filter(Objects::nonNull)
                .filter(a -> a.getId() != null)
                .collect(Collectors.toMap(Artwork::getId, a -> a, (k1, k2) -> k1));
    }

    private Artwork findBestMatchingArtworkForSystem(String scenario, String device, String style,
                                                     String keyword, boolean preferFree) {
        String text = StringUtils.defaultIfBlank(keyword, StringUtils.defaultIfBlank(scenario, style));

        if (StringUtils.isNotBlank(text)) {
            QueryWrapper<Artwork> qw = new QueryWrapper<>();
            qw.eq("status", 1);
            applyDeviceFilter(qw, device);
            qw.and(w -> w.like("title", text)
                    .or().like("summary", text)
                    .or().like("promptContent", text)
                    .or().like("deconstructedPrompt", text));
            if (preferFree) {
                qw.orderByAsc("memberOnly");
            }
            qw.orderByDesc("isDeconstructed").orderByDesc("updateTime").last("LIMIT 1");
            Artwork exact = artworkService.getOne(qw);
            if (exact != null) {
                return exact;
            }
        }

        // 多词拆分打分检索
        List<Artwork> candidates = artworkService.list(new QueryWrapper<Artwork>()
                .select(ARTWORK_COMPONENT_COLUMNS)
                .eq("status", 1)
                .orderByDesc("isDeconstructed")
                .orderByDesc("updateTime")
                .last("LIMIT 40"));
        if (candidates != null && !candidates.isEmpty()) {
            List<String> tokens = expandSemanticTokens(scenario, style, keyword);
            return candidates.stream()
                    .max(Comparator.comparingInt(a -> scoreArtworkForSearch(a, tokens, device)
                            + (preferFree && (a.getMemberOnly() == null || a.getMemberOnly() == 0) ? 3 : 0)
                            + (Integer.valueOf(1).equals(a.getIsDeconstructed()) ? 4 : 0)))
                    .orElse(candidates.get(0));
        }

        return artworkService.getOne(new QueryWrapper<Artwork>()
                .eq("status", 1)
                .orderByDesc("isDeconstructed")
                .orderByDesc("sort")
                .last("LIMIT 1"));
    }

    private void applyDeviceFilter(QueryWrapper<Artwork> qw, String device) {
        if (StringUtils.isBlank(device)) {
            return;
        }
        String normDevice = device.trim().toLowerCase(Locale.ROOT);
        if (normDevice.contains("app") || normDevice.contains("ios")
                || normDevice.contains("mobile") || normDevice.contains("移动") || normDevice.contains("手机")) {
            qw.in("deviceFrame", Arrays.asList("app", "iphone"));
        } else if (normDevice.contains("web") || normDevice.contains("desktop")
                || normDevice.contains("网页") || normDevice.contains("桌面")) {
            qw.eq("deviceFrame", "website");
        }
    }

    private List<String> tokenizeQuery(String raw) {
        if (StringUtils.isBlank(raw)) {
            return Collections.emptyList();
        }
        String cleaned = raw.toLowerCase(Locale.ROOT)
                .replaceAll("(风格|的|设计|作品|界面|截图|参考|推荐|模板|区域|类似|一套|给我)", " ");
        String[] parts = cleaned.split("[\\s,，、/|\\-_]+");
        List<String> tokens = new ArrayList<>();
        for (String p : parts) {
            String t = p.trim();
            if (t.length() >= 2) {
                tokens.add(t);
            }
        }
        return tokens;
    }

    private List<String> expandSemanticTokens(String scenario, String style, String keyword) {
        Set<String> set = new LinkedHashSet<>();
        for (String src : Arrays.asList(keyword, scenario, style)) {
            set.addAll(tokenizeQuery(src));
        }
        String merged = (StringUtils.defaultString(scenario) + " "
                + StringUtils.defaultString(style) + " "
                + StringUtils.defaultString(keyword)).toLowerCase(Locale.ROOT);

        if (matchesAny(merged, "saas", "仪表盘", "看板", "后台", "数据", "dashboard", "analytics")) {
            set.addAll(Arrays.asList("saas", "dashboard", "仪表盘", "看板", "数据"));
        }
        if (matchesAny(merged, "暗黑", "深色", "夜间", "dark")) {
            set.addAll(Arrays.asList("暗黑", "深色", "dark"));
        }
        if (matchesAny(merged, "极简", "简约", "干净", "minimal", "clean")) {
            set.addAll(Arrays.asList("极简", "简约", "minimal"));
        }
        if (matchesAny(merged, "社交", "聊天", "对话", "消息", "chat", "ai", "assistant")) {
            set.addAll(Arrays.asList("聊天", "对话", "社交", "chat", "ai"));
        }
        if (matchesAny(merged, "电商", "商城", "购物", "商品", "shop", "commerce", "store")) {
            set.addAll(Arrays.asList("电商", "购物", "商品", "shop"));
        }
        if (matchesAny(merged, "官网", "落地页", "首屏", "hero", "landing")) {
            set.addAll(Arrays.asList("官网", "hero", "landing", "网页"));
        }
        if (matchesAny(merged, "音乐", "播客", "播放", "music", "player", "audio")) {
            set.addAll(Arrays.asList("音乐", "播放", "player", "audio"));
        }
        return new ArrayList<>(set);
    }

    private int scoreArtworkForSearch(Artwork aw, List<String> tokens, String device) {
        if (aw == null) {
            return 0;
        }
        int score = Integer.valueOf(1).equals(aw.getIsDeconstructed()) ? 5 : 0;
        String hay = (StringUtils.defaultString(aw.getTitle()) + " "
                + StringUtils.defaultString(aw.getSummary())).toLowerCase(Locale.ROOT);

        if (StringUtils.isNotBlank(device)) {
            String targetDev = resolveDeviceType(device);
            String awDev = resolveDeviceType(aw.getDeviceFrame());
            if (Objects.equals(targetDev, awDev)) {
                score += 6;
            }
        }
        if (tokens != null) {
            for (String tk : tokens) {
                if (StringUtils.isNotBlank(tk) && hay.contains(tk)) {
                    score += 4;
                }
            }
        }
        return score;
    }

    private boolean matchesAny(String text, String... keywords) {
        if (StringUtils.isBlank(text)) {
            return false;
        }
        for (String kw : keywords) {
            if (text.contains(kw)) {
                return true;
            }
        }
        return false;
    }

    private void populateFallbackPalette(Map<String, String> colors, String style, String summary) {
        String hint = (StringUtils.defaultString(style) + " " + StringUtils.defaultString(summary)).toLowerCase(Locale.ROOT);
        if (matchesAny(hint, "暗黑", "深色", "赛博", "霓虹", "dark", "cyber")) {
            colors.put("background", "#0B0C10");
            colors.put("surface", "#14161D");
            colors.put("border", "rgba(255, 255, 255, 0.08)");
            colors.put("textPrimary", "#F4F5F8");
            colors.put("textSecondary", "#8E95A5");
            colors.put("accent", "#6366F1");
        } else {
            colors.put("background", "#FAF9F6");
            colors.put("surface", "#FFFFFF");
            colors.put("border", "rgba(15, 23, 42, 0.08)");
            colors.put("textPrimary", "#111827");
            colors.put("textSecondary", "#6B7280");
            colors.put("accent", "#18181B");
        }
    }

    private String synthesizeDesignSystemPrompt(String title, String device, String summary,
                                                Map<String, String> colors, String typography,
                                                String layout, List<MotionItem> motions) {
        StringBuilder sb = new StringBuilder();
        sb.append("# UI Design System Specification — ").append(StringUtils.defaultIfBlank(title, "OwnAI Curated UI")).append("\n\n");
        sb.append("- **Target Platform**: ").append("app".equals(device) ? "Mobile App (iOS / Android, 390px viewport)" : "Responsive Web Application (1440px desktop + 390px mobile)").append("\n");
        if (StringUtils.isNotBlank(summary)) {
            sb.append("- **Design Direction**: ").append(summary).append("\n");
        }
        sb.append("\n## 1. Color Tokens\n");
        colors.forEach((k, v) -> sb.append("- `").append(k).append("`: `").append(v).append("`\n"));
        sb.append("\n## 2. Typography Scale\n- ").append(typography).append("\n");
        sb.append("\n## 3. Layout & Geometry\n- ").append(layout).append("\n");
        if (motions != null && !motions.isEmpty()) {
            sb.append("\n## 4. Motion & Micro-interactions\n");
            for (MotionItem m : motions) {
                sb.append("- **").append(m.label()).append("** (").append(m.desc()).append("): `").append(m.token()).append("`\n");
            }
        }
        sb.append("\n## 5. Implementation Guardrails\n");
        sb.append("- Use semantic HTML5 landmarks, crisp 1px hairline borders, tabular numerals (`tabular-nums`) for metrics, and smooth spring/quintic transitions without layout shift.\n");
        return sb.toString();
    }

    private DesignSystemSpec buildDefaultDesignSystemSpec(String scenario, String device, String style, String keyword) {
        String resolvedDevice = StringUtils.isNotBlank(device) ? resolveDeviceType(device) : "website";
        Map<String, String> colors = new LinkedHashMap<>();
        populateFallbackPalette(colors, style, keyword);
        String typography = "Inter, -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; Heading: 24px SemiBold (-0.02em); Body: 14px Regular (1.6)";
        String layout = "Max Width: 1280px; Padding: 24px; Card Radius: 16px; Hairline Border: 1px solid rgba(255,255,255,0.08)";
        List<MotionItem> motions = List.of(
                new MotionItem("面板入场缓动", "容器与卡片自然上浮渐显", "cubic-bezier(0.22, 1, 0.36, 1) 260ms"),
                new MotionItem("控件按压微交互", "按钮触觉缩放反馈", "type: 'spring', stiffness: 480, damping: 28")
        );
        String title = StringUtils.defaultIfBlank(keyword, StringUtils.defaultIfBlank(scenario, "OwnAI Modern Minimal Design System"));
        String prompt = synthesizeDesignSystemPrompt(title, resolvedDevice, style, colors, typography, layout, motions);
        return new DesignSystemSpec(title, resolvedDevice, colors, typography, layout, motions, prompt, null, true, null);
    }

    private String buildSynthesizedPrototypeShell(Artwork target, List<ComponentCodeItem> components) {
        String title = StringUtils.defaultIfBlank(target.getTitle(), "OwnAI Prototype");
        String summary = StringUtils.defaultIfBlank(target.getSummary(), "");
        String compNames = components.stream().map(ComponentCodeItem::title).filter(StringUtils::isNotBlank).collect(Collectors.joining(" / "));
        return "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n"
                + "  <meta charset=\"UTF-8\" />\n"
                + "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n"
                + "  <title>" + title + "</title>\n"
                + "  <script src=\"https://cdn.tailwindcss.com\"></script>\n"
                + "</head>\n<body class=\"min-h-screen bg-zinc-950 text-zinc-100 antialiased p-6\">\n"
                + "  <!-- Summary: " + summary + " | Components: " + compNames + " -->\n"
                + "  <main id=\"app\" class=\"max-w-5xl mx-auto space-y-6\">\n"
                + "    <h1 class=\"text-2xl font-semibold tracking-tight\">" + title + "</h1>\n"
                + "    <p class=\"text-sm text-zinc-400\">" + summary + "</p>\n"
                + "  </main>\n</body>\n</html>";
    }

    private List<PromptTemplateResult> buildCuratedPromptFallbacks(String visualStyle, String scenario,
                                                                   String targetTool, int limit) {
        String styleHint = StringUtils.defaultIfBlank(visualStyle, "暗黑极简科技质感");
        String sceneHint = StringUtils.defaultIfBlank(scenario, "SaaS 仪表盘与网页 Hero 首屏");
        List<PromptTemplateResult> list = new ArrayList<>();
        list.add(new PromptTemplateResult(
                "高质感网页 Hero 首屏与 Bento 特性网格 UI 生成规范",
                "适用于 " + sceneHint + " 的现代前端界面生成提示词模板",
                "Design and implement a high-craft " + styleHint + " hero section and Bento feature grid for " + sceneHint
                        + ". Use a deep obsidian background (#0B0C10), elevated matte cards (#14161D) with 1px subtle inner borders (rgba(255,255,255,0.08)), tight geometric typography (tracking -0.025em), tabular metrics, and quintic-out micro-interactions (cubic-bezier(0.22, 1, 0.36, 1)). Provide responsive desktop (1440px) and mobile (390px) layouts.",
                "构建一套「" + styleHint + "」风格的「" + sceneHint + "」高完成度前端界面：采用深曜石底色 (#0B0C10) 与微光抬升卡片 (#14161D)，搭配 1px 半透明高光描边、等宽数字指标 (`tabular-nums`) 与 `cubic-bezier(0.22, 1, 0.36, 1)` 阻尼动效，同时适配 1440px 桌面端与 390px 移动端。",
                null,
                "UI设计,Hero首屏,BentoGrid,极简科技"
        ));
        list.add(new PromptTemplateResult(
                "移动端 iOS 级灵动胶囊交互界面设计提示词",
                "适用于工具类、AI 助手与效率类 App 界面的高保真 UI 规范",
                "Create a tactile mobile app interface (390x844 viewport) featuring a floating Dynamic Island status capsule, glassmorphic bottom action bar (backdrop-blur-xl), crisp hierarchy, and spring-physics state transitions (stiffness: 380, damping: 24).",
                "设计一套 390×844 视口的移动端高质感 App 界面：包含顶部动态弹簧胶囊状态栏、毛玻璃底部悬浮操作栏（`backdrop-blur-xl`）、清晰的信息层级与物理弹簧交互过渡（`stiffness: 380, damping: 24`）。",
                null,
                "App界面,移动端UI,灵动岛,微交互"
        ));
        return list.stream().limit(Math.max(1, limit)).collect(Collectors.toList());
    }

    private int scoreComponent(String title, String tag, String desc, String code,
                               String awTitle, String awDevice, String awSummary,
                               String scenario, String device, String style,
                               String componentType, String motionType, String keyword) {
        int score = 0;
        String allText = String.format("%s %s %s %s %s",
                StringUtils.defaultString(title),
                StringUtils.defaultString(tag),
                StringUtils.defaultString(desc),
                StringUtils.defaultString(awTitle),
                StringUtils.defaultString(awSummary)).toLowerCase(Locale.ROOT);

        if (StringUtils.isNotBlank(device)) {
            String normDev = device.toLowerCase(Locale.ROOT);
            String normAwDev = StringUtils.defaultString(awDevice).toLowerCase(Locale.ROOT);
            if ((normDev.contains("app") || normDev.contains("ios") || normDev.contains("mobile") || normDev.contains("移动"))
                    && (normAwDev.equals("app") || normAwDev.contains("iphone") || allText.contains("ios") || allText.contains("app") || allText.contains("灵动岛"))) {
                score += 5;
            } else if ((normDev.contains("web") || normDev.contains("网页") || normDev.contains("桌面"))
                    && (normAwDev.contains("website") || allText.contains("web") || allText.contains("网页"))) {
                score += 5;
            }
        }

        if (StringUtils.isNotBlank(componentType)) {
            String normComp = componentType.toLowerCase(Locale.ROOT);
            if (allText.contains(normComp) || StringUtils.containsIgnoreCase(tag, normComp)) {
                score += 6;
            } else if (normComp.contains("状态栏") && (allText.contains("statusbar") || allText.contains("灵动岛"))) {
                score += 6;
            } else if (normComp.contains("输入") && (allText.contains("input") || allText.contains("capsule") || allText.contains("胶囊"))) {
                score += 6;
            } else if (normComp.contains("气泡") && (allText.contains("chat") || allText.contains("message") || allText.contains("对话"))) {
                score += 6;
            } else if (normComp.contains("菜单") && (allText.contains("menu") || allText.contains("context"))) {
                score += 6;
            } else if (normComp.contains("导航") && (allText.contains("nav") || allText.contains("header") || allText.contains("sidebar"))) {
                score += 6;
            } else if (normComp.contains("卡片") && (allText.contains("card") || allText.contains("bento") || allText.contains("widget"))) {
                score += 6;
            }
        }

        if (StringUtils.isNotBlank(scenario)) {
            for (String tk : expandSemanticTokens(scenario, null, null)) {
                if (allText.contains(tk)) {
                    score += 3;
                }
            }
        }

        if (StringUtils.isNotBlank(style)) {
            for (String tk : expandSemanticTokens(null, style, null)) {
                if (allText.contains(tk)) {
                    score += 2;
                }
            }
        }

        if (StringUtils.isNotBlank(motionType)) {
            String normMotion = motionType.toLowerCase(Locale.ROOT);
            String codeText = StringUtils.defaultString(code).toLowerCase(Locale.ROOT);
            if (allText.contains(normMotion) || codeText.contains(normMotion)
                    || codeText.contains("framer-motion") || codeText.contains("transition") || codeText.contains("animate")) {
                score += 4;
            }
        }

        if (StringUtils.isNotBlank(keyword)) {
            for (String tk : tokenizeQuery(keyword)) {
                if (allText.contains(tk)) {
                    score += 3;
                }
            }
        }

        return score;
    }

    private List<MotionItem> extractMotionsFromArtwork(Artwork artwork) {
        if (artwork == null) {
            return Collections.emptyList();
        }
        List<MotionItem> list = new ArrayList<>();
        if (StringUtils.isNotBlank(artwork.getPromptData())) {
            try {
                JsonNode root = objectMapper.readTree(artwork.getPromptData());
                JsonNode motionsNode = root.path("motions");
                if (motionsNode.isArray()) {
                    for (JsonNode m : motionsNode) {
                        list.add(new MotionItem(
                                m.path("label").asText(),
                                m.path("desc").asText(),
                                m.path("token").asText()
                        ));
                    }
                    if (!list.isEmpty()) {
                        return list;
                    }
                }
            } catch (Exception ignored) {
            }
        }
        if (StringUtils.isNotBlank(artwork.getPromptContent())) {
            String pc = artwork.getPromptContent();
            if (pc.contains("cubic-bezier") || pc.contains("动效规范") || pc.contains("transition")) {
                String token = "cubic-bezier(0.22, 1, 0.36, 1) 150ms-250ms";
                list.add(new MotionItem("交互动效规范", "源自作品设计系统", token));
            }
        }
        return list;
    }

    private MotionPresetResult buildMotionResult(String label, String desc, String token, String sourceTitle) {
        String safeToken = StringUtils.defaultString(token);
        String framerSnippet;
        String tailwindSnippet;
        String bezier = "cubic-bezier(0.22, 1, 0.36, 1)";

        if (safeToken.contains("scale-")) {
            framerSnippet = "whileTap={{ scale: 0.95 }} transition={{ duration: 0.15 }}";
            tailwindSnippet = safeToken;
        } else if (safeToken.contains("cubic-bezier")) {
            framerSnippet = "transition={{ ease: [0.175, 0.885, 0.32, 1.275], duration: 0.3 }}";
            tailwindSnippet = "transition-all duration-300 ease-out";
            bezier = safeToken;
        } else {
            framerSnippet = "transition={{ type: 'spring', stiffness: 350, damping: 25 }}";
            tailwindSnippet = "transition-all duration-200 ease-out";
        }

        return new MotionPresetResult(
                label, desc, safeToken, framerSnippet, tailwindSnippet, bezier, sourceTitle
        );
    }

    String resolveDeviceType(String deviceFrame) {
        if (deviceFrame == null) {
            return "app";
        }
        String lower = deviceFrame.trim().toLowerCase(Locale.ROOT);
        if ("app".equals(lower) || lower.contains("iphone") || lower.contains("ios")
                || lower.contains("android") || lower.contains("mobile") || lower.contains("移动")) {
            return "app";
        }
        return "website";
    }

    private List<String> extractComponentTitles(Artwork aw) {
        if (aw == null || StringUtils.isBlank(aw.getPartsData())) {
            return Collections.emptyList();
        }
        List<String> titles = new ArrayList<>();
        try {
            JsonNode parts = objectMapper.readTree(aw.getPartsData());
            if (parts.isArray()) {
                for (JsonNode p : parts) {
                    String title = p.path("title").asText();
                    if (StringUtils.isNotBlank(title)) {
                        titles.add(title);
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return titles;
    }

    // =========================================================================
    // DTO / Record 返回值定义
    // =========================================================================

    private static class ScoredComponent {
        String id;
        String title;
        String componentType;
        String device;
        String code;
        String desc;
        List<MotionItem> matchedMotions;
        boolean isFavorite;
        String artworkTitle;
        Long artworkId;
        String coverUrl;
        int score;

        ScoredComponent(String id, String title, String componentType, String device,
                        String code, String desc, List<MotionItem> matchedMotions,
                        boolean isFavorite, String artworkTitle, Long artworkId, String coverUrl, int score) {
            this.id = id;
            this.title = title;
            this.componentType = componentType;
            this.device = device;
            this.code = code;
            this.desc = desc;
            this.matchedMotions = matchedMotions;
            this.isFavorite = isFavorite;
            this.artworkTitle = artworkTitle;
            this.artworkId = artworkId;
            this.coverUrl = coverUrl;
            this.score = score;
        }
    }

    public record MotionItem(String label, String desc, String token) implements Serializable {}

    public record DesignComponentResult(
            String title,
            String componentType,
            String device,
            String code,
            String desc,
            List<MotionItem> matchedMotions,
            boolean isFavorite,
            String artworkTitle,
            String coverUrl
    ) implements Serializable {}

    public record DesignSystemSpec(
            String title,
            String device,
            Map<String, String> colorPalette,
            String typography,
            String layout,
            List<MotionItem> motionTokens,
            String systemPrompt,
            String sourceZipUrl,
            boolean isDeconstructed,
            String coverUrl
    ) implements Serializable {}

    public record MotionPresetResult(
            String label,
            String desc,
            String token,
            String framerMotionSnippet,
            String tailwindSnippet,
            String cssBezier,
            String sourceArtwork
    ) implements Serializable {}

    public record ArtworkSearchResult(
            String title,
            String device,
            String summary,
            String coverUrl,
            boolean isDeconstructed,
            List<String> availableComponents,
            boolean hasPrototypeSource
    ) implements Serializable {}

    public record ComponentCodeItem(
            String title,
            String tag,
            String code,
            String desc
    ) implements Serializable {}

    public record ArtworkCodeResult(
            String title,
            String device,
            String summary,
            String prototypeHtml,
            List<ComponentCodeItem> components,
            String designSpec,
            String coverUrl
    ) implements Serializable {}

    public record PromptTemplateResult(
            String title,
            String summary,
            String promptContent,
            String promptCn,
            String coverUrl,
            String tags
    ) implements Serializable {}
}
