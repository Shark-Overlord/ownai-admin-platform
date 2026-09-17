package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.DeconstructionAssetFavorite;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 解构资产收藏 Mapper
 */
public interface DeconstructionAssetFavoriteMapper extends BaseMapper<DeconstructionAssetFavorite> {

    @Select("SELECT * FROM deconstruction_asset_favorite WHERE userId = #{userId} AND artworkId = #{artworkId} AND assetType = #{assetType} AND assetKey = #{assetKey} LIMIT 1")
    DeconstructionAssetFavorite selectIncludingDeleted(@Param("userId") Long userId,
                                                      @Param("artworkId") Long artworkId,
                                                      @Param("assetType") String assetType,
                                                      @Param("assetKey") String assetKey);
}