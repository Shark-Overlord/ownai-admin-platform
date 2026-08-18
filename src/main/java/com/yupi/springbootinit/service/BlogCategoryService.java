package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.blog.BlogCategorySaveRequest;
import com.yupi.springbootinit.model.entity.BlogCategory;
import com.yupi.springbootinit.model.vo.blog.BlogCategoryVO;
import java.util.List;

public interface BlogCategoryService extends IService<BlogCategory> {

    Long saveCategory(BlogCategorySaveRequest request);

    Boolean deleteCategory(Long id);

    List<BlogCategoryVO> listCategories(boolean admin);
}
