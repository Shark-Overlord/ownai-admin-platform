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
import com.yupi.springbootinit.model.vo.artwork.ArtworkDeconstructionVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetVO;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.DeconstructionAssetFavoriteService;
import com.yupi.springbootinit.service.PromptAssetService;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * OwnAI 智能设计与解构 MCP 工具集。
 * 以「业务场景、终端设备、视觉风格、构件类型、动效特征」5 大设计语义为核心，
 * 供 Cursor / Claude Desktop 等 AI 客户端直接检索可复用的组件代码、动效配置与设计系统。
 */
@Slf4j
@Component
public class OwnAiDesignTools {

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

        Long userId = McpUserContext.getUserId();
        int safeLimit = (limit == null || limit <= 0) ? 5 : Math.min(limit, 15);
        boolean fullCode = includeCode == null || includeCode;
        boolean onlyFavorites = "favorites".equalsIgnoreCase(StringUtils.trim(source));

        List<ScoredComponent> candidates = new ArrayList<>();

        // 1. 优先查用户的收藏
        if (userId != null) {
            List<DeconstructionAssetFavorite> favs = favoriteService.listFavoritesForMcp(
                    userId, "component", keyword, 50);
            List<Long> awIds = favs.stream().map(DeconstructionAssetFavorite::getArtworkId).filter(Objects::nonNull).distinct().collect(Collectors.toList());
            Map<Long, Artwork> awMap = awIds.isEmpty() ? Collections.emptyMap() :
                    artworkService.listByIds(awIds).stream().collect(Collectors.toMap(Artwork::getId, a -> a, (k1, k2) -> k1));

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
                        score + 10 // 收藏加权
                ));
            }
        }

        // 2. 若非仅查收藏，从平台解构作品库中补充
        if (!onlyFavorites) {
            QueryWrapper<Artwork> qw = new QueryWrapper<>();
            qw.eq("isDeconstructed", 1).eq("status", 1).orderByDesc("updateTime").last("LIMIT 15");
            List<Artwork> artworks = artworkService.list(qw);
            for (Artwork aw : artworks) {
                if (StringUtils.isBlank(aw.getPartsData())) continue;
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

                            // 查重：避免收藏里已有的重复添加
                            boolean alreadyIn = candidates.stream().anyMatch(c -> Objects.equals(c.id, pId));
                            if (alreadyIn) continue;

                            int score = scoreComponent(pTitle, pTag, pDesc, pCode,
                                    aw.getTitle(), aw.getDeviceFrame(), aw.getSummary(),
                                    scenario, device, style, componentType, motionType, keyword);

                            candidates.add(new ScoredComponent(
                                    pId, pTitle, pTag, resolveDeviceType(aw.getDeviceFrame()),
                                    fullCode ? pCode : StringUtils.abbreviate(pCode, 300),
                                    pDesc, artworkMotions, false, aw.getTitle(), aw.getId(), aw.getCoverUrl(), score
                            ));
                        }
                    }
                } catch (Exception e) {
                    log.warn("解析作品 partsData 失败: artworkId={}, error={}", aw.getId(), e.getMessage());
                }
            }
        }

        // 3. 按多维匹配打分降序排列，取 Top N（默认 5 条）
        candidates.sort(Comparator.comparingInt((ScoredComponent c) -> c.score).reversed());

        return candidates.stream().limit(safeLimit).map(c -> new DesignComponentResult(
                c.title, c.componentType, c.device, c.code, c.desc, c.matchedMotions, c.isFavorite, c.artworkTitle, c.coverUrl
        )).collect(Collectors.toList());
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

        QueryWrapper<Artwork> qw = new QueryWrapper<>();
        qw.eq("status", 1);

        String text = StringUtils.defaultIfBlank(keyword, StringUtils.defaultIfBlank(scenario, style));
        if (StringUtils.isNotBlank(text)) {
            qw.and(w -> w.like("title", text)
                    .or().like("summary", text)
                    .or().like("promptContent", text)
                    .or().like("deconstructedPrompt", text));
        }
        if (StringUtils.isNotBlank(device)) {
            String normDevice = device.trim().toLowerCase(Locale.ROOT);
            if (normDevice.contains("app") || normDevice.contains("ios") || normDevice.contains("mobile")) {
                qw.eq("deviceFrame", "iphone");
            } else if (normDevice.contains("web")) {
                qw.eq("deviceFrame", "website");
            }
        }
        // 优先匹配已深度解构的，其次按更新时间
        qw.orderByDesc("isDeconstructed").orderByDesc("updateTime").last("LIMIT 1");
        Artwork target = artworkService.getOne(qw);

        if (target == null) {
            target = artworkService.getOne(new QueryWrapper<Artwork>()
                    .eq("status", 1).orderByDesc("isDeconstructed").orderByDesc("sort").last("LIMIT 1"));
        }
        if (target == null) {
            return null;
        }

        JsonNode promptData = null;
        try {
            if (StringUtils.isNotBlank(target.getPromptData())) {
                promptData = objectMapper.readTree(target.getPromptData());
            }
        } catch (Exception ignored) {}

        Map<String, String> colors = new HashMap<>();
        List<MotionItem> motionTokens = extractMotionsFromArtwork(target);
        String typography = "Inter, -apple-system, BlinkMacSystemFont, sans-serif; Heading: 20px-28px SemiBold; Body: 14px-15px Regular";
        String layout = "Padding: 16px/20px; Radius: 16px-22px (Squircle/平滑圆角); Shadow: 0 8px 32px rgba(0,0,0,0.12)";

        if (promptData != null) {
            JsonNode colorsNode = promptData.path("colors");
            if (colorsNode.isObject()) {
                colorsNode.fieldNames().forEachRemaining(fn -> colors.put(fn, colorsNode.path(fn).asText()));
            }
            if (promptData.hasNonNull("typography")) {
                typography = promptData.path("typography").toString();
            }
            if (promptData.hasNonNull("layout")) {
                layout = promptData.path("layout").toString();
            }
        }

        String promptContent = StringUtils.isNotBlank(target.getDeconstructedPrompt())
                ? target.getDeconstructedPrompt()
                : (promptData != null && promptData.hasNonNull("rawMarkdown")
                        ? promptData.path("rawMarkdown").asText()
                        : target.getPromptContent());

        return new DesignSystemSpec(
                target.getTitle(),
                resolveDeviceType(target.getDeviceFrame()),
                colors,
                typography,
                layout,
                motionTokens,
                promptContent,
                target.getSourceZipUrl(),
                Integer.valueOf(1).equals(target.getIsDeconstructed()),
                target.getCoverUrl()
        );
    }

    // =========================================================================
    // Tool 3: find_motion_presets (专搜交互微动效与动画参数预设)
    // =========================================================================

    @Tool(description = "专门检索交互微动效与动画参数预设（Motion Presets）。支持检索弹簧阻尼、微交互按压、交错入场、流体流动等参数，提供开箱即用的 Framer Motion 参数配置、Tailwind 动画类与 CSS 缓动曲线。")
    public List<MotionPresetResult> find_motion_presets(
            @ToolParam(description = "动效交互意图，如: 灵动岛弹性展开, 按钮按压微交互, 模态框升起, 列表交错飞入, 呼吸波浪, 抽屉收缩") String motionIntent,
            @ToolParam(description = "技术栈偏好: framer-motion (React 默认首选), tailwind-css, css-bezier", required = false) String techStack,
            @ToolParam(description = "设备类型: app 或 website", required = false) String device) {

        String intent = StringUtils.trimToEmpty(motionIntent).toLowerCase(Locale.ROOT);
        List<MotionPresetResult> results = new ArrayList<>();

        // 1. 扫描解构作品库中的实际真实动效参数
        QueryWrapper<Artwork> qw = new QueryWrapper<>();
        qw.eq("isDeconstructed", 1).eq("status", 1).last("LIMIT 10");
        List<Artwork> artworks = artworkService.list(qw);
        for (Artwork aw : artworks) {
            List<MotionItem> list = extractMotionsFromArtwork(aw);
            for (MotionItem mi : list) {
                boolean match = StringUtils.isBlank(intent)
                        || mi.label.toLowerCase(Locale.ROOT).contains(intent)
                        || mi.desc.toLowerCase(Locale.ROOT).contains(intent)
                        || mi.token.toLowerCase(Locale.ROOT).contains(intent);
                if (match) {
                    results.add(buildMotionResult(mi.label, mi.desc, mi.token, aw.getTitle()));
                }
            }
        }

        // 2. 内置行业标准 Mobbin / iOS 级高阶预设补充
        if (intent.contains("弹簧") || intent.contains("spring") || intent.contains("灵动岛") || intent.contains("展开")) {
            results.add(new MotionPresetResult(
                    "iOS 弹簧弹性展开 (Spring Bouncy)",
                    "适用于灵动岛、胶囊栏、模态框等具有物理弹性质感的展开动效",
                    "type: 'spring', stiffness: 380, damping: 22, mass: 0.8",
                    "transition={{ type: 'spring', stiffness: 380, damping: 22, mass: 0.8 }}",
                    "transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                    "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    "Mobbin iOS Design System"
            ));
        }
        if (intent.contains("按压") || intent.contains("微交互") || intent.contains("点击") || intent.contains("tap") || intent.contains("button")) {
            results.add(new MotionPresetResult(
                    "轻量按压缩放微交互 (Micro-interaction Press)",
                    "按钮、切片卡片点击时的触觉反馈缩放与高亮",
                    "whileTap={{ scale: 0.96 }} transition={{ duration: 0.12 }}",
                    "whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.01 }} transition={{ duration: 0.15, ease: 'easeOut' }}",
                    "active:scale-95 hover:brightness-105 transition-transform duration-150 ease-out",
                    "cubic-bezier(0.2, 0, 0, 1)",
                    "OwnAI Component Standard"
            ));
        }
        if (intent.contains("交错") || intent.contains("入场") || intent.contains("列表") || intent.contains("stagger")) {
            results.add(new MotionPresetResult(
                    "列表级联交错飞入 (Stagger Fade-In)",
                    "列表项、网格卡片按序号依次平滑向上浮现",
                    "staggerChildren: 0.08, delayChildren: 0.05",
                    "variants={{ visible: { transition: { staggerChildren: 0.08 } } }} itemVariants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}",
                    "opacity-0 translate-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300",
                    "cubic-bezier(0.22, 1, 0.36, 1)",
                    "OwnAI Motion Library"
            ));
        }

        return results.stream().limit(5).collect(Collectors.toList());
    }

    // =========================================================================
    // Tool 4: find_design_artworks (按场景与设备搜设计作品案例)
    // =========================================================================

    @Tool(description = "按业务场景、终端设备载体与视觉风格检索 OwnAI 平台界面设计作品案例库。返回结果包含 coverUrl 界面设计封面截图（可使用 ![界面图](coverUrl) 直接向用户展示视觉效果）。")
    public List<ArtworkSearchResult> find_design_artworks(
            @ToolParam(description = "业务场景，如: 电商, 社交, 仪表盘, 官网, 音乐", required = false) String scenario,
            @ToolParam(description = "设备载体: app (移动端) 或 website (网页端)", required = false) String device,
            @ToolParam(description = "视觉风格: 极简, 暗黑, 玻璃拟态, 渐变, 扁平", required = false) String style,
            @ToolParam(description = "自由搜索词", required = false) String keyword,
            @ToolParam(description = "返回条数，默认 5", required = false) Integer limit) {

        User user = McpUserContext.get();
        int safeLimit = (limit == null || limit <= 0) ? 5 : Math.min(limit, 20);

        ArtworkQueryRequest queryRequest = new ArtworkQueryRequest();
        String text = StringUtils.defaultIfBlank(keyword, StringUtils.defaultIfBlank(scenario, style));
        queryRequest.setSearchText(StringUtils.trimToNull(text));
        queryRequest.setCurrent(1);
        queryRequest.setPageSize(safeLimit);

        Page<ArtworkVO> page = artworkService.listArtworkVOByPage(queryRequest, user, false);
        List<Long> ids = page.getRecords().stream().map(ArtworkVO::getId).filter(Objects::nonNull).collect(Collectors.toList());
        Map<Long, Artwork> rawMap = ids.isEmpty() ? Collections.emptyMap() :
                artworkService.listByIds(ids).stream().collect(Collectors.toMap(Artwork::getId, a -> a, (k1, k2) -> k1));

        return page.getRecords().stream().map(vo -> {
            Artwork raw = rawMap.get(vo.getId());
            return new ArtworkSearchResult(
                    vo.getTitle(),
                    resolveDeviceType(vo.getDeviceFrame()),
                    vo.getSummary(),
                    vo.getCoverUrl(),
                    vo.getIsDeconstructed() != null && vo.getIsDeconstructed() == 1,
                    raw != null ? raw.getSourceZipUrl() : null
            );
        }).collect(Collectors.toList());
    }

    // =========================================================================
    // Tool 5: find_prompts_for_creation (按视觉风格与用途搜提示词模板)
    // =========================================================================

    @Tool(description = "按视觉风格、应用场景与目标工具检索高品质提示词模板（包含前端 UI 生成规范以及 Midjourney / FLUX 视觉生图 Prompt）。返回结果包含 coverUrl 视觉效果图（可使用 ![效果图](coverUrl) 直接展示）。")
    public List<PromptTemplateResult> find_prompts_for_creation(
            @ToolParam(description = "视觉风格，如: 极简扁平, 3D质感, 深色科技, 纸质质感, 赛博朋克", required = false) String visualStyle,
            @ToolParam(description = "应用场景，如: 产品海报, App界面, 网页Hero, 商业插画, 封面", required = false) String scenario,
            @ToolParam(description = "自由关键词", required = false) String keyword,
            @ToolParam(description = "目标工具: frontend-ui (代码生成), midjourney, flux, dall-e", required = false) String targetTool,
            @ToolParam(description = "返回条数，默认 5", required = false) Integer limit) {

        User user = McpUserContext.get();
        int safeLimit = (limit == null || limit <= 0) ? 5 : Math.min(limit, 20);

        PromptAssetQueryRequest queryRequest = new PromptAssetQueryRequest();
        String text = StringUtils.defaultIfBlank(keyword, StringUtils.defaultIfBlank(visualStyle, scenario));
        queryRequest.setSearchText(StringUtils.trimToNull(text));
        queryRequest.setCurrent(1);
        queryRequest.setPageSize(safeLimit);

        Page<PromptAssetVO> page = promptAssetService.listPublishedPromptAssetVOByPage(queryRequest, user);
        return page.getRecords().stream().map(vo -> {
            String tags = vo.getTagList() != null
                    ? vo.getTagList().stream().map(com.yupi.springbootinit.model.vo.TagVO::getName).collect(Collectors.joining(","))
                    : vo.getAssetTagText();
            return new PromptTemplateResult(
                    vo.getTitle(),
                    vo.getSummary(),
                    vo.getPromptContent(),
                    vo.getPromptCn(),
                    vo.getCoverUrl(),
                    tags
            );
        }).collect(Collectors.toList());
    }

    // =========================================================================
    // 兼容原版别名工具（避免已有老接口中断）
    // =========================================================================

    @Tool(description = "搜索当前用户收藏的设计资产（兼容别名）。")
    public List<DesignComponentResult> search_my_favorites(
            @ToolParam(description = "资产类型过滤：prompt / component / icon / media", required = false) String assetType,
            @ToolParam(description = "搜索关键词", required = false) String keyword,
            @ToolParam(description = "返回条数上限，默认 5", required = false) Integer limit) {
        return find_design_components(null, null, null, null, null, keyword, true, "favorites", limit);
    }

    @Tool(description = "获取指定收藏资产的完整内容（兼容别名，支持按资产标题或关键词检索）。")
    public DesignComponentResult get_favorite_detail(
            @ToolParam(description = "收藏资产标题或关键词") String keyword) {
        Long userId = McpUserContext.getUserId();
        if (userId == null || StringUtils.isBlank(keyword)) return null;
        List<DeconstructionAssetFavorite> favs = favoriteService.listFavoritesForMcp(userId, null, keyword, 1);
        if (favs.isEmpty()) return null;
        DeconstructionAssetFavorite fav = favs.get(0);
        Artwork linkedAw = fav.getArtworkId() != null ? artworkService.getById(fav.getArtworkId()) : null;
        return new DesignComponentResult(
                fav.getTitle(), fav.getTag(), resolveDeviceType(linkedAw != null ? linkedAw.getDeviceFrame() : null),
                fav.getContent(), fav.getDescription(),
                Collections.emptyList(), true, linkedAw != null ? linkedAw.getTitle() : "我的收藏",
                linkedAw != null ? linkedAw.getCoverUrl() : null
        );
    }

    // =========================================================================
    // 内部多维打分与动效解析算法
    // =========================================================================

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

        // 1. 设备匹配 (权重 5)
        if (StringUtils.isNotBlank(device)) {
            String normDev = device.toLowerCase(Locale.ROOT);
            String normAwDev = StringUtils.defaultString(awDevice).toLowerCase(Locale.ROOT);
            if ((normDev.contains("app") || normDev.contains("ios") || normDev.contains("mobile"))
                    && (normAwDev.contains("iphone") || allText.contains("ios") || allText.contains("app") || allText.contains("灵动岛"))) {
                score += 5;
            } else if (normDev.contains("web") && (normAwDev.contains("website") || allText.contains("web") || allText.contains("网页"))) {
                score += 5;
            }
        }

        // 2. 构件类型匹配 (权重 6)
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
            }
        }

        // 3. 业务场景匹配 (权重 4)
        if (StringUtils.isNotBlank(scenario)) {
            String normScen = scenario.toLowerCase(Locale.ROOT);
            if (allText.contains(normScen)) {
                score += 4;
            }
        }

        // 4. 视觉风格匹配 (权重 3)
        if (StringUtils.isNotBlank(style)) {
            String normStyle = style.toLowerCase(Locale.ROOT);
            if (allText.contains(normStyle)) {
                score += 3;
            }
        }

        // 5. 动效匹配 (权重 4)
        if (StringUtils.isNotBlank(motionType)) {
            String normMotion = motionType.toLowerCase(Locale.ROOT);
            String codeText = StringUtils.defaultString(code).toLowerCase(Locale.ROOT);
            if (allText.contains(normMotion) || codeText.contains(normMotion)
                    || codeText.contains("framer-motion") || codeText.contains("transition") || codeText.contains("animate")) {
                score += 4;
            }
        }

        // 6. 自由关键词匹配 (权重 3)
        if (StringUtils.isNotBlank(keyword)) {
            String normKw = keyword.toLowerCase(Locale.ROOT);
            if (allText.contains(normKw)) {
                score += 3;
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
            } catch (Exception ignored) {}
        }
        // 从老作品的 promptContent 中提取动效特征规范
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
        String framerSnippet;
        String tailwindSnippet;
        String bezier = "cubic-bezier(0.22, 1, 0.36, 1)";

        if (token.contains("scale-")) {
            framerSnippet = "whileTap={{ scale: 0.95 }} transition={{ duration: 0.15 }}";
            tailwindSnippet = token;
        } else if (token.contains("cubic-bezier")) {
            framerSnippet = "transition={{ ease: [0.175, 0.885, 0.32, 1.275], duration: 0.3 }}";
            tailwindSnippet = "transition-all duration-300 ease-out";
            bezier = token;
        } else {
            framerSnippet = "transition={{ type: 'spring', stiffness: 350, damping: 25 }}";
            tailwindSnippet = "transition-all duration-200 ease-out";
        }

        return new MotionPresetResult(
                label, desc, token, framerSnippet, tailwindSnippet, bezier, sourceTitle
        );
    }

    private String resolveDeviceType(String deviceFrame) {
        if (deviceFrame == null) return "app";
        String lower = deviceFrame.toLowerCase(Locale.ROOT);
        if (lower.contains("iphone") || lower.contains("android") || lower.contains("mobile")) {
            return "app";
        }
        return "website";
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
            String sourceZipUrl
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
