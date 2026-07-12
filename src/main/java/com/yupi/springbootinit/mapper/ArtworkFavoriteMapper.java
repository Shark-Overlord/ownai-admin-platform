package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.ArtworkFavorite;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface ArtworkFavoriteMapper extends BaseMapper<ArtworkFavorite> {

    @Select("SELECT id, userId, artworkId, createTime, updateTime, isDelete "
            + "FROM artwork_favorite "
            + "WHERE userId = #{userId} AND artworkId = #{artworkId} "
            + "LIMIT 1")
    ArtworkFavorite selectByUserAndArtworkIncludingDeleted(@Param("userId") Long userId,
                                                           @Param("artworkId") Long artworkId);

    @Update("UPDATE artwork_favorite "
            + "SET isDelete = 0, updateTime = NOW() "
            + "WHERE userId = #{userId} AND artworkId = #{artworkId}")
    int restoreByUserAndArtwork(@Param("userId") Long userId,
                                @Param("artworkId") Long artworkId);
}
