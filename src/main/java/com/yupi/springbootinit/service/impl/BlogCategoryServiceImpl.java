package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.BlogCategoryMapper;
import com.yupi.springbootinit.mapper.BlogBookMapper;
import com.yupi.springbootinit.mapper.BlogPostMapper;
import com.yupi.springbootinit.model.dto.blog.BlogCategorySaveRequest;
import com.yupi.springbootinit.model.entity.BlogCategory;
import com.yupi.springbootinit.model.entity.BlogBook;
import com.yupi.springbootinit.model.entity.BlogPost;
import com.yupi.springbootinit.model.vo.blog.BlogCategoryVO;
import com.yupi.springbootinit.service.BlogCategoryService;
import java.util.List;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Service
public class BlogCategoryServiceImpl extends ServiceImpl<BlogCategoryMapper, BlogCategory>
        implements BlogCategoryService {

    private static final String STATUS_ENABLED = "enabled";
    private static final String STATUS_DISABLED = "disabled";

    @Resource
    private BlogPostMapper blogPostMapper;

    @Resource
    private BlogBookMapper blogBookMapper;

    @Override
    public Long saveCategory(BlogCategorySaveRequest request) {
        validate(request);
        Long id = request.getId();
        QueryWrapper<BlogCategory> duplicate = new QueryWrapper<BlogCategory>()
                .eq("isDelete", 0)
                .and(w -> w.eq("name", request.getName().trim()).or().eq("slug", request.getSlug().trim()));
        duplicate.ne(id != null, "id", id);
        ThrowUtils.throwIf(this.count(duplicate) > 0, ErrorCode.PARAMS_ERROR, "博客分类名称或 slug 已存在");
        BlogCategory category = new BlogCategory();
        BeanUtils.copyProperties(request, category);
        category.setName(request.getName().trim());
        category.setSlug(request.getSlug().trim().toLowerCase());
        category.setStatus(StringUtils.defaultIfBlank(request.getStatus(), STATUS_ENABLED));
        category.setSort(request.getSort() == null ? 0 : request.getSort());
        boolean result = id == null ? this.save(category) : this.updateById(category);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return category.getId();
    }

    @Override
    public Boolean deleteCategory(Long id) {
        BlogCategory category = getValid(id);
        long postCount = blogPostMapper.selectCount(new QueryWrapper<BlogPost>()
                .eq("categoryId", category.getId()).eq("isDelete", 0));
        ThrowUtils.throwIf(postCount > 0, ErrorCode.OPERATION_ERROR, "分类下仍有文章，不能删除");
        long bookCount = blogBookMapper.selectCount(new QueryWrapper<BlogBook>()
                .eq("categoryId", category.getId()).eq("isDelete", 0));
        ThrowUtils.throwIf(bookCount > 0, ErrorCode.OPERATION_ERROR, "分类仍被教程书使用，不能删除");
        return this.removeById(category.getId());
    }

    @Override
    public List<BlogCategoryVO> listCategories(boolean admin) {
        QueryWrapper<BlogCategory> wrapper = new QueryWrapper<BlogCategory>()
                .eq("isDelete", 0)
                .eq(!admin, "status", STATUS_ENABLED)
                .orderByAsc("sort").orderByAsc("id");
        return this.list(wrapper).stream().map(item -> {
            BlogCategoryVO vo = new BlogCategoryVO();
            BeanUtils.copyProperties(item, vo);
            vo.setPostCount(blogPostMapper.selectCount(new QueryWrapper<BlogPost>()
                    .eq("categoryId", item.getId())
                    .eq("isDelete", 0)
                    .eq(!admin, "status", "published")));
            return vo;
        }).collect(Collectors.toList());
    }

    private BlogCategory getValid(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        BlogCategory category = this.getById(id);
        ThrowUtils.throwIf(category == null, ErrorCode.NOT_FOUND_ERROR);
        return category;
    }

    private void validate(BlogCategorySaveRequest request) {
        if (request == null || StringUtils.isBlank(request.getName()) || request.getName().trim().length() > 100) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "分类名称不能为空且不能超过 100 字");
        }
        validateSlug(request.getSlug());
        String status = StringUtils.defaultIfBlank(request.getStatus(), STATUS_ENABLED);
        if (!STATUS_ENABLED.equals(status) && !STATUS_DISABLED.equals(status)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "分类状态不合法");
        }
    }

    private void validateSlug(String slug) {
        if (StringUtils.isBlank(slug) || slug.length() > 100
                || !slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "slug 仅支持小写字母、数字和中划线");
        }
    }
}
