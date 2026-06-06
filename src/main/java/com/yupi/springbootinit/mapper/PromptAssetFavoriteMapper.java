package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.PromptAssetFavorite;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface PromptAssetFavoriteMapper extends BaseMapper<PromptAssetFavorite> {

    @Select("SELECT id, userId, promptAssetId, createTime, updateTime, isDelete "
            + "FROM prompt_asset_favorite "
            + "WHERE userId = #{userId} AND promptAssetId = #{promptAssetId} "
            + "LIMIT 1")
    PromptAssetFavorite selectByUserAndAssetIncludingDeleted(@Param("userId") Long userId,
                                                             @Param("promptAssetId") Long promptAssetId);

    @Update("UPDATE prompt_asset_favorite "
            + "SET isDelete = 0, updateTime = NOW() "
            + "WHERE userId = #{userId} AND promptAssetId = #{promptAssetId}")
    int restoreByUserAndAsset(@Param("userId") Long userId,
                              @Param("promptAssetId") Long promptAssetId);
}
