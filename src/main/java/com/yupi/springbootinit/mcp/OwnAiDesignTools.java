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
import java.util.HashSet;
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
        List<Long> ids = voPage.getRecords().stream().map(ArtworkVO::getId).filter(Objects::nonNull).collect(Collectors.toList());
        Map<Long, Artwork> rawMap = ids.isEmpty() ? Collections.emptyMap() :
                artworkService.listByIds(ids).stream().collect(Collectors.toMap(Artwork::getId, a -> a, (k1, k2) -> k1));

        List<ArtworkSearchResult> results = new ArrayList<>();
        for (ArtworkVO vo : voPage.getRecords()) {
            if (vo.getTitle() != null && excludedSet.contains(vo.getTitle().trim().toLowerCase(Locale.ROOT))) {
                continue;
            }
            Artwork raw = rawMap.get(vo.getId());
            List<String> components = extractComponentTitles(raw);
            boolean hasProto = raw != null && StringUtils.isNotBlank(raw.getStandaloneHtml());

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
                break;
            }
        }

        return results;
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

        QueryWrapper<Artwork> qw = new QueryWrapper<>();
        qw.eq("status", 1);
        qw.and(w -> w.like("title", artworkTitle.trim())
                .or().like("summary", artworkTitle.trim()));
        qw.orderByDesc("isDeconstructed").orderByDesc("updateTime").last("LIMIT 1");

        Artwork target = artworkService.getOne(qw);
        if (target == null) {
            return null;
        }

        List<ComponentCodeItem> componentList = new ArrayList<>();
        if (StringUtils.isNotBlank(target.getPartsData())) {
            try {
                JsonNode partsNode = objectMapper.readTree(target.getPartsData());
                if (partsNode.isArray()) {
                    for (JsonNode p : partsNode) {
                        componentList.add(new ComponentCodeItem(
                                p.path("title").asText(),
                                p.path("tag").asText(),
                                p.path("code").asText(),
                                p.path("desc").asText()
                        ));
                    }
                }
            } catch (Exception e) {
                log.warn("解析作品 partsData 失败: title={}, error={}", target.getTitle(), e.getMessage());
            }
        }

        return new ArtworkCodeResult(
                target.getTitle(),
                resolveDeviceType(target.getDeviceFrame()),
                target.getSummary(),
                target.getStandaloneHtml(),
                componentList,
                target.getDeconstructedPrompt(),
                target.getCoverUrl()
        );
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
        } catch (Exception ignored) {}
        return titles;
    }

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
