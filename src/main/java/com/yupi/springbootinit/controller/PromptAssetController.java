package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import cn.hutool.core.collection.CollUtil;
import com.yupi.springbootinit.common.BatchDeleteRequest;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.DeleteRequest;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.PageRequest;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.mapper.PromptAssetImportBatchMapper;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAddRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetFavoriteRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetQueryRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.PromptAssetImportBatch;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetImageSyncResultVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetImportResultVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetVO;
import com.yupi.springbootinit.service.PromptAssetService;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.utils.SqlUtils;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import com.yupi.springbootinit.exception.BusinessException;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/promptAsset")
@Api(tags = "PromptAsset")
public class PromptAssetController {

    @Resource
    private PromptAssetService promptAssetService;

    @Resource
    private PromptAssetImportBatchMapper promptAssetImportBatchMapper;

    @Resource
    private UserService userService;

    @PostMapping("/list/page/vo")
    @ApiOperation("Page query published prompt assets")
    public BaseResponse<Page<PromptAssetVO>> listPublishedPromptAssetVOByPage(
            @RequestBody(required = false) PromptAssetQueryRequest request,
            HttpServletRequest httpServletRequest) {
        User loginUser = userService.getLoginUserPermitNull(httpServletRequest);
        return ResultUtils.success(promptAssetService.listPublishedPromptAssetVOByPage(request, loginUser));
    }

    @GetMapping("/get/vo")
    @ApiOperation("Get published prompt asset detail")
    public BaseResponse<PromptAssetVO> getPublishedPromptAssetVO(
            @RequestParam("id") Long id,
            HttpServletRequest httpServletRequest) {
        User loginUser = userService.getLoginUserPermitNull(httpServletRequest);
        return ResultUtils.success(promptAssetService.getPublishedPromptAssetVO(id, loginUser));
    }

    @PostMapping("/favorite/add")
    @OperationLog(module = "prompt_asset", action = "favorite_prompt_asset")
    @ApiOperation("Favorite prompt asset")
    public BaseResponse<Boolean> addFavorite(
            @RequestBody PromptAssetFavoriteRequest request,
            HttpServletRequest httpServletRequest) {
        User loginUser = userService.getLoginUser(httpServletRequest);
        return ResultUtils.success(promptAssetService.addFavorite(request, loginUser));
    }

    @PostMapping("/favorite/cancel")
    @OperationLog(module = "prompt_asset", action = "cancel_favorite_prompt_asset")
    @ApiOperation("Cancel prompt asset favorite")
    public BaseResponse<Boolean> cancelFavorite(
            @RequestBody PromptAssetFavoriteRequest request,
            HttpServletRequest httpServletRequest) {
        User loginUser = userService.getLoginUser(httpServletRequest);
        return ResultUtils.success(promptAssetService.cancelFavorite(request, loginUser));
    }

    @GetMapping("/favorite/check")
    @ApiOperation("Check prompt asset favorite status")
    public BaseResponse<Boolean> checkFavorite(
            @RequestParam("promptAssetId") Long promptAssetId,
            HttpServletRequest httpServletRequest) {
        User loginUser = userService.getLoginUser(httpServletRequest);
        return ResultUtils.success(promptAssetService.isFavorited(promptAssetId, loginUser));
    }

    @PostMapping("/favorite/my/list/page")
    @ApiOperation("Page query my favorite prompt assets")
    public BaseResponse<Page<PromptAssetVO>> listMyFavoritePromptAssets(
            @RequestBody(required = false) PromptAssetQueryRequest request,
            HttpServletRequest httpServletRequest) {
        User loginUser = userService.getLoginUser(httpServletRequest);
        return ResultUtils.success(promptAssetService.listMyFavoritePromptAssetVOByPage(request, loginUser));
    }

    @PostMapping("/admin/list/page/vo")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin page query prompt assets")
    public BaseResponse<Page<PromptAssetVO>> listPromptAssetVOByPage(
            @RequestBody(required = false) PromptAssetQueryRequest request) {
        return ResultUtils.success(promptAssetService.listPromptAssetVOByPage(request));
    }

    @GetMapping("/admin/get/vo")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin get prompt asset detail")
    public BaseResponse<PromptAssetVO> getPromptAssetVO(Long id) {
        return ResultUtils.success(promptAssetService.getPromptAssetVO(id));
    }

    @PostMapping("/admin/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "prompt_asset", action = "add_prompt_asset")
    @ApiOperation("Admin add prompt asset")
    public BaseResponse<Long> addPromptAsset(@RequestBody PromptAssetAddRequest request) {
        return ResultUtils.success(promptAssetService.addPromptAsset(request));
    }

    @PostMapping("/admin/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "prompt_asset", action = "update_prompt_asset")
    @ApiOperation("Admin update prompt asset")
    public BaseResponse<Boolean> updatePromptAsset(@RequestBody PromptAssetUpdateRequest request) {
        return ResultUtils.success(promptAssetService.updatePromptAsset(request));
    }

    @PostMapping("/admin/update/tags")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "prompt_asset", action = "update_prompt_asset_tags")
    @ApiOperation("Admin update prompt asset tags")
    public BaseResponse<Boolean> updatePromptAssetTags(@RequestBody PromptAssetUpdateRequest request) {
        return ResultUtils.success(promptAssetService.updatePromptAssetTags(request));
    }

    @PostMapping("/admin/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "prompt_asset", action = "delete_prompt_asset")
    @ApiOperation("Admin delete prompt asset")
    public BaseResponse<Boolean> deletePromptAsset(@RequestBody DeleteRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(promptAssetService.deletePromptAsset(request.getId()));
    }

    @PostMapping("/admin/delete/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "prompt_asset", action = "batch_delete_prompt_asset")
    @ApiOperation("Admin batch delete prompt assets")
    public BaseResponse<Boolean> deletePromptAssetBatch(@RequestBody BatchDeleteRequest request) {
        if (request == null || CollUtil.isEmpty(request.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(promptAssetService.deletePromptAssetBatch(request.getIds()));
    }

    @PostMapping("/admin/publish/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "prompt_asset", action = "batch_publish_prompt_asset")
    @ApiOperation("Admin batch publish prompt assets")
    public BaseResponse<Boolean> publishPromptAssetBatch(@RequestBody BatchDeleteRequest request) {
        if (request == null || CollUtil.isEmpty(request.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(promptAssetService.publishPromptAssetBatch(request.getIds()));
    }

    @PostMapping("/admin/sync/image/cos")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "prompt_asset", action = "sync_prompt_asset_image_cos")
    @ApiOperation("Admin sync prompt asset images to COS")
    public BaseResponse<PromptAssetImageSyncResultVO> syncImagesToCos(@RequestBody BatchDeleteRequest request) {
        if (request == null || CollUtil.isEmpty(request.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(promptAssetService.syncImagesToCos(request.getIds()));
    }

    @PostMapping("/admin/import/visual-prompt-db")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "prompt_asset", action = "import_visual_prompt_db")
    @ApiOperation("Import visual_prompt_library SQLite database")
    public BaseResponse<PromptAssetImportResultVO> importVisualPromptDb(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "dryRun", required = false, defaultValue = "true") Boolean dryRun,
            @RequestParam(value = "assetType", required = false) String assetType,
            @RequestParam(value = "categoryId") Long categoryId,
            @RequestParam(value = "syncTagsToCategory", required = false, defaultValue = "true") Boolean syncTagsToCategory,
            @RequestParam(value = "uploadImagesToCos", required = false, defaultValue = "false") Boolean uploadImagesToCos) {
        return ResultUtils.success(promptAssetService.importVisualPromptLibrary(
                file, dryRun, assetType, categoryId, syncTagsToCategory, uploadImagesToCos));
    }

    @PostMapping("/admin/import/batch/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin page query prompt asset import batches")
    public BaseResponse<Page<PromptAssetImportBatch>> listImportBatchByPage(
            @RequestBody(required = false) PageRequest request) {
        PageRequest safeRequest = request == null ? new PageRequest() : request;
        QueryWrapper<PromptAssetImportBatch> queryWrapper = new QueryWrapper<>();
        String sortField = safeRequest.getSortField();
        String sortOrder = safeRequest.getSortOrder();
        queryWrapper.orderBy(StringUtils.isNotBlank(sortField) && SqlUtils.validSortField(sortField),
                CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
        queryWrapper.orderByDesc("startedAt", "id");
        Page<PromptAssetImportBatch> page = promptAssetImportBatchMapper.selectPage(
                new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), queryWrapper);
        return ResultUtils.success(page);
    }
}
