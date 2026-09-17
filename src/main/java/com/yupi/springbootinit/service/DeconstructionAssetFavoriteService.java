package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteAddRequest;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteCancelRequest;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteQueryRequest;
import com.yupi.springbootinit.model.entity.DeconstructionAssetFavorite;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.DeconstructionAssetFavoriteVO;
import java.util.List;

/**
 * 解构资产收藏服务
 */
public interface DeconstructionAssetFavoriteService extends IService<DeconstructionAssetFavorite> {

    /**
     * 添加解构资产收藏
     */
    Boolean addFavorite(DeconstructionAssetFavoriteAddRequest request, User loginUser);

    /**
     * 取消解构资产收藏
     */
    Boolean cancelFavorite(DeconstructionAssetFavoriteCancelRequest request, User loginUser);

    /**
     * 查询用户在指定作品下已收藏的 assetKey 列表（格式为 "{assetType}:{assetKey}"）
     */
    List<String> listFavoritedKeys(Long artworkId, User loginUser);

    /**
     * 分页查询当前用户的解构资产收藏
     */
    Page<DeconstructionAssetFavoriteVO> listMyFavoritesByPage(DeconstructionAssetFavoriteQueryRequest request, User loginUser);

    /**
     * 为 MCP Agent 检索用户收藏资产
     */
    List<DeconstructionAssetFavorite> listFavoritesForMcp(Long userId, String assetType, String keyword, int limit);
}