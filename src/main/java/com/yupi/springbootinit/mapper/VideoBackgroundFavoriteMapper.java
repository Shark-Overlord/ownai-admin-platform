package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.VideoBackgroundFavorite;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface VideoBackgroundFavoriteMapper extends BaseMapper<VideoBackgroundFavorite> {

    @Select("SELECT id, userId, videoBackgroundId, createTime, updateTime, isDelete "
            + "FROM video_background_favorite "
            + "WHERE userId = #{userId} AND videoBackgroundId = #{videoBackgroundId} "
            + "LIMIT 1")
    VideoBackgroundFavorite selectByUserAndVideoIncludingDeleted(@Param("userId") Long userId,
                                                                  @Param("videoBackgroundId") Long videoBackgroundId);

    @Update("UPDATE video_background_favorite "
            + "SET isDelete = 0, updateTime = NOW() "
            + "WHERE userId = #{userId} AND videoBackgroundId = #{videoBackgroundId}")
    int restoreByUserAndVideo(@Param("userId") Long userId,
                              @Param("videoBackgroundId") Long videoBackgroundId);
}
