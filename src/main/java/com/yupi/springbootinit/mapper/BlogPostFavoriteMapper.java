package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.BlogPostFavorite;
import com.yupi.springbootinit.model.vo.blog.BlogFavoriteCountVO;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface BlogPostFavoriteMapper extends BaseMapper<BlogPostFavorite> {

    @Select("SELECT id, userId, postId, createTime, updateTime, isDelete "
            + "FROM blog_post_favorite WHERE userId = #{userId} AND postId = #{postId} LIMIT 1")
    BlogPostFavorite selectByUserAndPostIncludingDeleted(@Param("userId") Long userId,
                                                         @Param("postId") Long postId);

    @Update("UPDATE blog_post_favorite SET isDelete = 0, updateTime = NOW() "
            + "WHERE userId = #{userId} AND postId = #{postId}")
    int restoreByUserAndPost(@Param("userId") Long userId, @Param("postId") Long postId);

    @Select({"<script>",
            "SELECT postId AS targetId, COUNT(*) AS favoriteCount FROM blog_post_favorite",
            "WHERE isDelete = 0 AND postId IN",
            "<foreach collection='postIds' item='postId' open='(' separator=',' close=')'>#{postId}</foreach>",
            "GROUP BY postId",
            "</script>"})
    List<BlogFavoriteCountVO> countByPostIds(@Param("postIds") List<Long> postIds);
}
