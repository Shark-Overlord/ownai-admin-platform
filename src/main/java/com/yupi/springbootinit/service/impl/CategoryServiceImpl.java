package com.yupi.springbootinit.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.mapper.CategoryMapper;
import com.yupi.springbootinit.model.dto.category.CategoryQueryRequest;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.model.vo.TagVO;
import com.yupi.springbootinit.service.CategoryService;
import com.yupi.springbootinit.service.TagService;
import com.yupi.springbootinit.utils.SqlUtils;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Service
public class CategoryServiceImpl extends ServiceImpl<CategoryMapper, Category> implements CategoryService {

    @javax.annotation.Resource
    private TagService tagService;

    @Override
    public QueryWrapper<Category> getQueryWrapper(CategoryQueryRequest categoryQueryRequest) {
        QueryWrapper<Category> queryWrapper = new QueryWrapper<>();
        if (categoryQueryRequest == null) {
            return queryWrapper.orderByDesc("sort", "id");
        }
        queryWrapper.like(StringUtils.isNotBlank(categoryQueryRequest.getName()), "name", categoryQueryRequest.getName());
        String sortField = categoryQueryRequest.getSortField();
        String sortOrder = categoryQueryRequest.getSortOrder();
        queryWrapper.orderBy(SqlUtils.validSortField(sortField),
                CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
        queryWrapper.orderByDesc("sort", "id");
        return queryWrapper;
    }

    @Override
    public CategoryVO getCategoryVO(Category category) {
        if (category == null) {
            return null;
        }
        CategoryVO categoryVO = new CategoryVO();
        BeanUtils.copyProperties(category, categoryVO);
        return categoryVO;
    }

    @Override
    public List<CategoryVO> getCategoryVO(List<Category> categoryList) {
        if (CollUtil.isEmpty(categoryList)) {
            return new ArrayList<>();
        }
        return categoryList.stream().map(this::getCategoryVO).collect(Collectors.toList());
    }

    @Override
    public List<CategoryVO> buildCategoryTreeWithTags() {
        List<Category> allCategories = this.list(new QueryWrapper<Category>().eq("isDelete", 0).orderByAsc("sort", "id"));
        if (CollUtil.isEmpty(allCategories)) {
            return new ArrayList<>();
        }
        List<CategoryVO> voList = getCategoryVO(allCategories);
        // 查询每个分类下的标签
        for (CategoryVO vo : voList) {
            List<TagVO> tags = tagService.listTagsByCategoryId(vo.getId());
            vo.setTags(tags);
        }
        return voList;
    }
}
