package com.yupi.springbootinit.mcp;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * OwnAI 设计资产 MCP 工具集。
 * 供 Claude Desktop、Cursor 等 AI 客户端调用，帮助用户完成界面设计与图片生成。
 * 每个工具自动从 McpUserContext 获取当前已鉴权的用户身份。
 */
@Slf4j
@Component
public class OwnAiDesignTools {

    private final DeconstructionAssetFavoriteService favoriteService;
    private final ArtworkService artworkService;
    private final PromptAssetService promptAssetService;

    public OwnAiDesignTools(DeconstructionAssetFavoriteService favoriteService,
                            ArtworkService artworkService,
                            PromptAssetService promptAssetService) {
        this.favoriteService = favoriteService;
        this.artworkService = artworkService;
        this.promptAssetService = promptAssetService;
    }

    // ==================== Tool 1: 搜索我的收藏 ====================

    @Tool(description = "搜索当前用户收藏的设计资产。支持按类型过滤（prompt=设计规范提示词, component=组件代码, icon=图标SVG, media=图片视频）和关键词搜索。返回标题、类型、标签和内容摘要。")
    public List<FavoriteItem> search_my_favorites(
            @ToolParam(description = "资产类型过滤：prompt / component / icon / media，为空则搜索全部", required = false) String assetType,
            @ToolParam(description = "搜索关键词，在标题、标签、描述、内容中模糊匹配", required = false) String keyword,
            @ToolParam(description = "返回条数上限，默认 20，最大 50", required = false) Integer limit) {

        Long userId = McpUserContext.getUserId();
        if (userId == null) {
            return Collections.emptyList();
        }
        int safeLimit = (limit == null || limit <= 0) ? 20 : Math.min(limit, 50);
        List<DeconstructionAssetFavorite> favorites = favoriteService.listFavoritesForMcp(
                userId, assetType, keyword, safeLimit);
        return favorites.stream().map(f -> new FavoriteItem(
                f.getId(),
                f.getAssetType(),
                f.getAssetKey(),
                f.getTitle(),
                f.getTag(),
                f.getDescription(),
                StringUtils.abbreviate(f.getContent(), 300),
                f.getArtworkId()
        )).collect(Collectors.toList());
    }

    // ==================== Tool 2: 获取收藏详情 ====================

    @Tool(description = "获取指定收藏资产的完整内容。输入收藏 ID，返回完整的 Markdown 提示词、TSX 组件源码、SVG 图标代码或媒体 URL。")
    public FavoriteDetail get_favorite_detail(
            @ToolParam(description = "收藏记录 ID") Long favoriteId) {

        Long userId = McpUserContext.getUserId();
        if (userId == null || favoriteId == null) {
            return null;
        }
        DeconstructionAssetFavorite fav = favoriteService.getById(favoriteId);
        if (fav == null || fav.getIsDelete() != null && fav.getIsDelete() == 1) {
            return null;
        }
        // 只能查自己的收藏
        if (!fav.getUserId().equals(userId)) {
            return null;
        }
        return new FavoriteDetail(
                fav.getId(),
                fav.getAssetType(),
                fav.getAssetKey(),
                fav.getTitle(),
                fav.getTag(),
                fav.getDescription(),
                fav.getContent(),
                fav.getMetaData(),
                fav.getArtworkId()
        );
    }

    // ==================== Tool 3: 搜索作品库 ====================

    @Tool(description = "搜索 OwnAI 平台的界面设计作品库。支持关键词搜索，返回作品标题、简介、封面 URL、是否已解构。仅返回公开或用户有权访问的作品。")
    public List<ArtworkItem> search_artworks(
            @ToolParam(description = "搜索关键词，匹配作品标题和简介") String keyword,
            @ToolParam(description = "返回条数上限，默认 10，最大 20", required = false) Integer limit) {

        User user = McpUserContext.get();
        if (user == null) {
            return Collections.emptyList();
        }
        int safeLimit = (limit == null || limit <= 0) ? 10 : Math.min(limit, 20);

        ArtworkQueryRequest queryRequest = new ArtworkQueryRequest();
        queryRequest.setSearchText(StringUtils.trimToNull(keyword));
        queryRequest.setCurrent(1);
        queryRequest.setPageSize(safeLimit);

        Page<ArtworkVO> page = artworkService.listArtworkVOByPage(queryRequest, user, false);
        return page.getRecords().stream().map(vo -> new ArtworkItem(
                vo.getId(),
                vo.getTitle(),
                vo.getSummary(),
                vo.getCoverUrl(),
                vo.getIsDeconstructed() != null && vo.getIsDeconstructed() == 1
        )).collect(Collectors.toList());
    }

    // ==================== Tool 4: 获取作品解构数据 ====================

    @Tool(description = "获取指定作品的完整解构数据，包含设计规范提示词、零件切片列表（含组件代码）和图标资产列表。用于获取完整的设计参考上下文。")
    public ArtworkDeconstructionVO get_artwork_deconstruction(
            @ToolParam(description = "作品 ID") Long artworkId) {

        User user = McpUserContext.get();
        if (user == null || artworkId == null) {
            return null;
        }
        try {
            return artworkService.getArtworkDeconstruction(artworkId, user, false);
        } catch (Exception e) {
            log.warn("MCP get_artwork_deconstruction 失败: artworkId={}, error={}", artworkId, e.getMessage());
            return null;
        }
    }

    // ==================== Tool 5: 搜索 Prompt 资产库 ====================

    @Tool(description = "搜索 OwnAI Prompt 资产库，查找界面设计和图片生成的提示词模板。返回标题、摘要描述、提示词内容和标签。")
    public List<PromptItem> search_prompt_assets(
            @ToolParam(description = "搜索关键词，匹配标题和提示词内容") String keyword,
            @ToolParam(description = "返回条数上限，默认 10，最大 20", required = false) Integer limit) {

        User user = McpUserContext.get();
        if (user == null) {
            return Collections.emptyList();
        }
        int safeLimit = (limit == null || limit <= 0) ? 10 : Math.min(limit, 20);

        PromptAssetQueryRequest queryRequest = new PromptAssetQueryRequest();
        queryRequest.setSearchText(StringUtils.trimToNull(keyword));
        queryRequest.setCurrent(1);
        queryRequest.setPageSize(safeLimit);

        Page<PromptAssetVO> page = promptAssetService.listPublishedPromptAssetVOByPage(queryRequest, user);
        return page.getRecords().stream().map(vo -> {
            String tags = vo.getTagList() != null
                    ? vo.getTagList().stream().map(com.yupi.springbootinit.model.vo.TagVO::getName).collect(Collectors.joining(","))
                    : vo.getAssetTagText();
            return new PromptItem(
                    vo.getId(),
                    vo.getTitle(),
                    vo.getSummary(),
                    vo.getPromptContent(),
                    vo.getCoverUrl(),
                    tags
            );
        }).collect(Collectors.toList());
    }

    // ==================== 返回 Record 定义 ====================

    public record FavoriteItem(Long id, String assetType, String assetKey, String title,
                               String tag, String description, String contentPreview, Long artworkId) {}

    public record FavoriteDetail(Long id, String assetType, String assetKey, String title,
                                 String tag, String description, String content,
                                 String metaData, Long artworkId) {}

    public record ArtworkItem(Long id, String title, String summary, String coverUrl,
                              boolean isDeconstructed) {}

    public record PromptItem(Long id, String title, String summary, String promptContent,
                             String coverUrl, String tags) {}
}
