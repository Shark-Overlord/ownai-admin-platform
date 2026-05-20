package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.DeleteRequest;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.model.dto.category.CategoryAddRequest;
import com.yupi.springbootinit.model.dto.category.CategoryQueryRequest;
import com.yupi.springbootinit.model.dto.category.CategoryTagAddRequest;
import com.yupi.springbootinit.model.dto.category.CategoryTagBindRequest;
import com.yupi.springbootinit.model.dto.category.CategoryTagUnbindRequest;
import com.yupi.springbootinit.model.dto.category.CategoryUpdateRequest;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.entity.CategoryTag;
import com.yupi.springbootinit.model.entity.Tag;
import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.mapper.CategoryTagMapper;
import com.yupi.springbootinit.service.CategoryService;
import com.yupi.springbootinit.service.TagService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.List;
import javax.annotation.Resource;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 分类接口 Category Controller
 */
@RestController
@RequestMapping("/category")
@Api(tags = "Category")
public class CategoryController {

    @Resource
    private CategoryService categoryService;

    @Resource
    private TagService tagService;

    @Resource
    private CategoryTagMapper categoryTagMapper;

    /**
     * 管理员添加分类 Admin add category
     */
    @PostMapping("/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "category", action = "add_category")
    @ApiOperation("管理员添加分类 Admin add category")
    public BaseResponse<Long> addCategory(@RequestBody CategoryAddRequest categoryAddRequest) {
        if (categoryAddRequest == null || org.apache.commons.lang3.StringUtils.isBlank(categoryAddRequest.getName())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String name = categoryAddRequest.getName().trim();
        // 检查同名未删除分类是否存在
        Category exist = categoryService.getOne(new QueryWrapper<Category>()
                .eq("name", name).eq("isDelete", 0).last("LIMIT 1"));
        if (exist != null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "分类名称已存在");
        }
        Category category = new Category();
        BeanUtils.copyProperties(categoryAddRequest, category);
        category.setName(name);
        boolean result = categoryService.save(category);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(category.getId());
    }

    /**
     * 管理员删除分类 Admin delete category
     */
    @PostMapping("/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "category", action = "delete_category")
    @ApiOperation("管理员删除分类 Admin delete category")
    public BaseResponse<Boolean> deleteCategory(@RequestBody DeleteRequest deleteRequest) {
        if (deleteRequest == null || deleteRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Long categoryId = deleteRequest.getId();
        // 1. 查出该分类下所有关联的标签ID
        List<CategoryTag> categoryTagList = categoryTagMapper.selectList(
                new QueryWrapper<CategoryTag>().eq("categoryId", categoryId));
        // 2. 删除分类与标签的关联
        categoryTagMapper.delete(new QueryWrapper<CategoryTag>().eq("categoryId", categoryId));
        // 3. 检查这些标签是否还被其他分类使用，无引用则彻底删除
        if (categoryTagList != null && !categoryTagList.isEmpty()) {
            for (CategoryTag ct : categoryTagList) {
                Long count = categoryTagMapper.selectCount(
                        new QueryWrapper<CategoryTag>().eq("tagId", ct.getTagId()));
                if (count == null || count == 0) {
                    tagService.removeById(ct.getTagId());
                }
            }
        }
        // 4. 删除分类本身
        boolean result = categoryService.removeById(categoryId);
        return ResultUtils.success(result);
    }

    /**
     * 管理员更新分类 Admin update category
     */
    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "category", action = "update_category")
    @ApiOperation("管理员更新分类 Admin update category")
    public BaseResponse<Boolean> updateCategory(@RequestBody CategoryUpdateRequest categoryUpdateRequest) {
        if (categoryUpdateRequest == null || categoryUpdateRequest.getId() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        if (org.apache.commons.lang3.StringUtils.isNotBlank(categoryUpdateRequest.getName())) {
            String name = categoryUpdateRequest.getName().trim();
            Category exist = categoryService.getOne(new QueryWrapper<Category>()
                    .eq("name", name).eq("isDelete", 0).ne("id", categoryUpdateRequest.getId()).last("LIMIT 1"));
            if (exist != null) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "分类名称已存在");
            }
        }
        Category category = new Category();
        BeanUtils.copyProperties(categoryUpdateRequest, category);
        boolean result = categoryService.updateById(category);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(true);
    }

    /**
     * 获取分类详情 Get category detail
     */
    @GetMapping("/get/vo")
    @ApiOperation("获取分类详情 Get category detail")
    public BaseResponse<CategoryVO> getCategoryVOById(long id) {
        if (id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Category category = categoryService.getById(id);
        ThrowUtils.throwIf(category == null, ErrorCode.NOT_FOUND_ERROR);
        return ResultUtils.success(categoryService.getCategoryVO(category));
    }

    /**
     * 获取所有分类列表 List all categories
     */
    @GetMapping("/list")
    @ApiOperation("获取所有分类列表 List all categories")
    public BaseResponse<List<CategoryVO>> listCategory() {
        List<Category> categoryList = categoryService.list(categoryService.getQueryWrapper(new CategoryQueryRequest()));
        return ResultUtils.success(categoryService.getCategoryVO(categoryList));
    }

    /**
     * 管理员分页查询分类 Admin page query categories
     */
    @PostMapping("/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("管理员分页查询分类 Admin page query categories")
    public BaseResponse<Page<CategoryVO>> listCategoryByPage(@RequestBody CategoryQueryRequest categoryQueryRequest) {
        CategoryQueryRequest safeRequest = categoryQueryRequest == null ? new CategoryQueryRequest() : categoryQueryRequest;
        Page<Category> categoryPage = categoryService.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()),
                categoryService.getQueryWrapper(safeRequest));
        Page<CategoryVO> categoryVOPage = new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(),
                categoryPage.getTotal());
        categoryVOPage.setRecords(categoryService.getCategoryVO(categoryPage.getRecords()));
        return ResultUtils.success(categoryVOPage);
    }

    /**
     * 获取分类树（含标签） Get category tree with tags
     */
    @GetMapping("/tree")
    @ApiOperation("获取分类树（含标签） Get category tree with tags")
    public BaseResponse<List<CategoryVO>> getCategoryTree() {
        return ResultUtils.success(categoryService.buildCategoryTreeWithTags());
    }

    /**
     * 获取分类下的标签 List tags by category
     */
    @GetMapping("/tags")
    @ApiOperation("获取分类下的标签 List tags by category")
    public BaseResponse<List<com.yupi.springbootinit.model.vo.TagVO>> listTagsByCategory(@RequestParam Long categoryId) {
        if (categoryId == null || categoryId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(tagService.listTagsByCategoryId(categoryId));
    }

    /**
     * 管理员绑定标签到分类 Admin bind tag to category
     */
    @PostMapping("/tag/bind")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "category", action = "bind_tag")
    @ApiOperation("绑定标签到分类 Bind tag to category")
    public BaseResponse<Boolean> bindTag(@RequestBody CategoryTagBindRequest bindRequest) {
        if (bindRequest == null || bindRequest.getCategoryId() == null || bindRequest.getTagId() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        CategoryTag exist = categoryTagMapper.selectOne(new QueryWrapper<CategoryTag>()
                .eq("categoryId", bindRequest.getCategoryId())
                .eq("tagId", bindRequest.getTagId()));
        if (exist != null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "该标签已绑定到此分类");
        }
        CategoryTag categoryTag = new CategoryTag();
        categoryTag.setCategoryId(bindRequest.getCategoryId());
        categoryTag.setTagId(bindRequest.getTagId());
        categoryTag.setSort(bindRequest.getSort() != null ? bindRequest.getSort() : 0);
        boolean result = categoryTagMapper.insert(categoryTag) > 0;
        return ResultUtils.success(result);
    }

    /**
     * 管理员直接添加标签名到分类（自动创建或复用）
     */
    @PostMapping("/tag/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "category", action = "add_tag_to_category")
    @ApiOperation("添加标签到分类（每次新建独立标签）Add tag to category")
    public BaseResponse<Boolean> addTagToCategory(@RequestBody CategoryTagAddRequest addRequest) {
        if (addRequest == null || addRequest.getCategoryId() == null
                || org.apache.commons.lang3.StringUtils.isBlank(addRequest.getTagName())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String tagName = addRequest.getTagName().trim();
        // 检查同一分类下是否已有同名未删除标签
        java.util.List<CategoryTag> existingBindings = categoryTagMapper.selectList(
                new QueryWrapper<CategoryTag>().eq("categoryId", addRequest.getCategoryId()));
        if (!existingBindings.isEmpty()) {
            java.util.List<Long> tagIds = existingBindings.stream().map(CategoryTag::getTagId).collect(java.util.stream.Collectors.toList());
            java.util.List<Tag> existingTags = tagService.listByIds(tagIds);
            boolean hasSameName = existingTags.stream()
                    .anyMatch(t -> tagName.equals(t.getName()) && (t.getIsDelete() == null || t.getIsDelete() == 0));
            if (hasSameName) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "该分类下已存在同名标签");
            }
        }
        // 直接新建标签（不同分类下同名也是独立记录）
        Tag tag = new Tag();
        tag.setName(tagName);
        tag.setSort(0);
        boolean saveResult = tagService.save(tag);
        ThrowUtils.throwIf(!saveResult, ErrorCode.OPERATION_ERROR, "标签创建失败");
        // 绑定到分类
        CategoryTag categoryTag = new CategoryTag();
        categoryTag.setCategoryId(addRequest.getCategoryId());
        categoryTag.setTagId(tag.getId());
        categoryTag.setSort(addRequest.getSort() != null ? addRequest.getSort() : 0);
        boolean result = categoryTagMapper.insert(categoryTag) > 0;
        return ResultUtils.success(result);
    }

    /**
     * 管理员解绑标签 Admin unbind tag from category
     */
    @PostMapping("/tag/unbind")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "category", action = "unbind_tag")
    @ApiOperation("解绑标签从分类（无引用则同步删除标签）Unbind tag from category")
    public BaseResponse<Boolean> unbindTag(@RequestBody CategoryTagUnbindRequest unbindRequest) {
        if (unbindRequest == null || unbindRequest.getCategoryId() == null || unbindRequest.getTagId() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        // 1. 解绑关系
        boolean result = categoryTagMapper.delete(new QueryWrapper<CategoryTag>()
                .eq("categoryId", unbindRequest.getCategoryId())
                .eq("tagId", unbindRequest.getTagId())) > 0;
        // 2. 检查该标签是否还被其他分类使用
        Long count = categoryTagMapper.selectCount(
                new QueryWrapper<CategoryTag>().eq("tagId", unbindRequest.getTagId()));
        if (count == null || count == 0) {
            // 没有任何分类使用，同步删除标签
            tagService.removeById(unbindRequest.getTagId());
        }
        return ResultUtils.success(result);
    }
}
