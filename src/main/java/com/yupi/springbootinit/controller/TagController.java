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
import com.yupi.springbootinit.model.dto.tag.TagAddRequest;
import com.yupi.springbootinit.model.dto.tag.TagQueryRequest;
import com.yupi.springbootinit.model.dto.tag.TagUpdateRequest;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yupi.springbootinit.model.entity.Tag;
import com.yupi.springbootinit.model.vo.TagVO;
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
import org.springframework.web.bind.annotation.RestController;

/**
 * 标签接口 Tag Controller
 */
@RestController
@RequestMapping("/tag")
@Api(tags = "Tag")
public class TagController {

    @Resource
    private TagService tagService;

    /**
     * 管理员添加标签 Admin add tag
     */
    @PostMapping("/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "tag", action = "add_tag")
    @ApiOperation("管理员添加标签 Admin add tag")
    public BaseResponse<Long> addTag(@RequestBody TagAddRequest tagAddRequest) {
        if (tagAddRequest == null || org.apache.commons.lang3.StringUtils.isBlank(tagAddRequest.getName())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String name = tagAddRequest.getName().trim();
        Tag tag = new Tag();
        BeanUtils.copyProperties(tagAddRequest, tag);
        tag.setName(name);
        boolean result = tagService.save(tag);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(tag.getId());
    }

    /**
     * 管理员删除标签 Admin delete tag
     */
    @PostMapping("/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "tag", action = "delete_tag")
    @ApiOperation("管理员删除标签 Admin delete tag")
    public BaseResponse<Boolean> deleteTag(@RequestBody DeleteRequest deleteRequest) {
        if (deleteRequest == null || deleteRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        boolean result = tagService.removeById(deleteRequest.getId());
        return ResultUtils.success(result);
    }

    /**
     * 管理员更新标签 Admin update tag
     */
    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "tag", action = "update_tag")
    @ApiOperation("管理员更新标签 Admin update tag")
    public BaseResponse<Boolean> updateTag(@RequestBody TagUpdateRequest tagUpdateRequest) {
        if (tagUpdateRequest == null || tagUpdateRequest.getId() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Tag tag = new Tag();
        BeanUtils.copyProperties(tagUpdateRequest, tag);
        boolean result = tagService.updateById(tag);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(true);
    }

    /**
     * 获取标签详情 Get tag detail
     */
    @GetMapping("/get/vo")
    @ApiOperation("获取标签详情 Get tag detail")
    public BaseResponse<TagVO> getTagVOById(long id) {
        if (id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Tag tag = tagService.getById(id);
        ThrowUtils.throwIf(tag == null, ErrorCode.NOT_FOUND_ERROR);
        return ResultUtils.success(tagService.getTagVO(tag));
    }

    /**
     * 获取所有标签列表 List all tags
     */
    @GetMapping("/list")
    @ApiOperation("获取所有标签列表 List all tags")
    public BaseResponse<List<TagVO>> listTag() {
        List<Tag> tagList = tagService.list(tagService.getQueryWrapper(new TagQueryRequest()));
        return ResultUtils.success(tagService.getTagVO(tagList));
    }

    /**
     * 管理员分页查询标签 Admin page query tags
     */
    @PostMapping("/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("管理员分页查询标签 Admin page query tags")
    public BaseResponse<Page<TagVO>> listTagByPage(@RequestBody TagQueryRequest tagQueryRequest) {
        TagQueryRequest safeRequest = tagQueryRequest == null ? new TagQueryRequest() : tagQueryRequest;
        Page<Tag> tagPage = tagService.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()),
                tagService.getQueryWrapper(safeRequest));
        Page<TagVO> tagVOPage = new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(), tagPage.getTotal());
        tagVOPage.setRecords(tagService.getTagVO(tagPage.getRecords()));
        return ResultUtils.success(tagVOPage);
    }
}
