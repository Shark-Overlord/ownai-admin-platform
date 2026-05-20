package com.yupi.springbootinit.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.mapper.CategoryTagMapper;
import com.yupi.springbootinit.mapper.TagMapper;
import com.yupi.springbootinit.model.dto.tag.TagQueryRequest;
import com.yupi.springbootinit.model.entity.CategoryTag;
import com.yupi.springbootinit.model.entity.Tag;
import com.yupi.springbootinit.model.vo.TagVO;
import com.yupi.springbootinit.service.TagService;
import com.yupi.springbootinit.utils.SqlUtils;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Service
public class TagServiceImpl extends ServiceImpl<TagMapper, Tag> implements TagService {

    @javax.annotation.Resource
    private CategoryTagMapper categoryTagMapper;

    @Override
    public QueryWrapper<Tag> getQueryWrapper(TagQueryRequest tagQueryRequest) {
        QueryWrapper<Tag> queryWrapper = new QueryWrapper<>();
        if (tagQueryRequest == null) {
            return queryWrapper.orderByDesc("sort", "id");
        }
        queryWrapper.like(StringUtils.isNotBlank(tagQueryRequest.getName()), "name", tagQueryRequest.getName());
        String sortField = tagQueryRequest.getSortField();
        String sortOrder = tagQueryRequest.getSortOrder();
        queryWrapper.orderBy(SqlUtils.validSortField(sortField),
                CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
        queryWrapper.orderByDesc("sort", "id");
        return queryWrapper;
    }

    @Override
    public TagVO getTagVO(Tag tag) {
        if (tag == null) {
            return null;
        }
        TagVO tagVO = new TagVO();
        BeanUtils.copyProperties(tag, tagVO);
        return tagVO;
    }

    @Override
    public List<TagVO> getTagVO(List<Tag> tagList) {
        if (CollUtil.isEmpty(tagList)) {
            return new ArrayList<>();
        }
        return tagList.stream().map(this::getTagVO).collect(Collectors.toList());
    }

    @Override
    public List<TagVO> listTagsByCategoryId(Long categoryId) {
        if (categoryId == null) {
            return new ArrayList<>();
        }
        List<Tag> tagList = ((TagMapper) baseMapper).selectTagsByCategoryId(categoryId);
        return getTagVO(tagList);
    }
}
