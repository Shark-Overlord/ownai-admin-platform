package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.BlogBookFavorite;
import com.yupi.springbootinit.model.vo.blog.BlogFavoriteCountVO;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface BlogBookFavoriteMapper extends BaseMapper<BlogBookFavorite> {

    @Select("SELECT id, userId, bookId, createTime, updateTime, isDelete "
            + "FROM blog_book_favorite WHERE userId = #{userId} AND bookId = #{bookId} LIMIT 1")
    BlogBookFavorite selectByUserAndBookIncludingDeleted(@Param("userId") Long userId,
                                                         @Param("bookId") Long bookId);

    @Update("UPDATE blog_book_favorite SET isDelete = 0, updateTime = NOW() "
            + "WHERE userId = #{userId} AND bookId = #{bookId}")
    int restoreByUserAndBook(@Param("userId") Long userId, @Param("bookId") Long bookId);

    @Select({"<script>",
            "SELECT bookId AS targetId, COUNT(*) AS favoriteCount FROM blog_book_favorite",
            "WHERE isDelete = 0 AND bookId IN",
            "<foreach collection='bookIds' item='bookId' open='(' separator=',' close=')'>#{bookId}</foreach>",
            "GROUP BY bookId",
            "</script>"})
    List<BlogFavoriteCountVO> countByBookIds(@Param("bookIds") List<Long> bookIds);
}
