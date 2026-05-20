package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.tag.TagQueryRequest;
import com.yupi.springbootinit.model.entity.Tag;
import com.yupi.springbootinit.model.vo.TagVO;
import java.util.List;

public interface TagService extends IService<Tag> {

    QueryWrapper<Tag> getQueryWrapper(TagQueryRequest tagQueryRequest);

    TagVO getTagVO(Tag tag);

    List<TagVO> getTagVO(List<Tag> tagList);

    /**
     * 根据分类ID查询标签列表（通过中间表）
     */
    List<TagVO> listTagsByCategoryId(Long categoryId);
}
