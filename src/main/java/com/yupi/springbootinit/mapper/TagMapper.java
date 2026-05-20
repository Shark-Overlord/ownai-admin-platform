package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.Tag;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface TagMapper extends BaseMapper<Tag> {

    @Select("SELECT t.* FROM tag t INNER JOIN category_tag ct ON t.id = ct.tagId WHERE ct.categoryId = #{categoryId} AND t.isDelete = 0 ORDER BY ct.sort, ct.id")
    List<Tag> selectTagsByCategoryId(@Param("categoryId") Long categoryId);
}
