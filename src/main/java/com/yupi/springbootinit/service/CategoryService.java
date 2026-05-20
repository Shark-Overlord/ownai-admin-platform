package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.category.CategoryQueryRequest;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.vo.CategoryVO;
import java.util.List;

public interface CategoryService extends IService<Category> {

    QueryWrapper<Category> getQueryWrapper(CategoryQueryRequest categoryQueryRequest);

    CategoryVO getCategoryVO(Category category);

    List<CategoryVO> getCategoryVO(List<Category> categoryList);

    /**
     * 构建分类树（包含标签）
     */
    List<CategoryVO> buildCategoryTreeWithTags();
}
