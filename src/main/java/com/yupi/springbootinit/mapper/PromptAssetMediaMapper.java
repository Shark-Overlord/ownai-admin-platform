package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.PromptAssetMedia;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface PromptAssetMediaMapper extends BaseMapper<PromptAssetMedia> {

    @Select("SELECT * FROM prompt_asset_media WHERE promptAssetId = #{promptAssetId} AND fileHash = #{fileHash} LIMIT 1")
    PromptAssetMedia selectByAssetIdAndFileHashIncludeDeleted(@Param("promptAssetId") Long promptAssetId,
            @Param("fileHash") String fileHash);

    @Update("UPDATE prompt_asset_media SET isDelete = 0 WHERE id = #{id}")
    int restoreById(@Param("id") Long id);
}
