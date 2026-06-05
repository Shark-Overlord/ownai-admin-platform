package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.PromptAsset;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface PromptAssetMapper extends BaseMapper<PromptAsset> {

    @Select("SELECT * FROM prompt_asset WHERE syncKey = #{syncKey} LIMIT 1")
    PromptAsset selectBySyncKeyIncludeDeleted(@Param("syncKey") String syncKey);

    @Update("UPDATE prompt_asset SET isDelete = 0, updateTime = NOW() WHERE id = #{id}")
    int restoreById(@Param("id") Long id);
}
