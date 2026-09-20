package com.yupi.springbootinit.controller;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.BatchDeleteRequest;
import com.yupi.springbootinit.common.DeleteRequest;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.PublicContentAntiCrawlerManager;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundAddRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundBatchMemberOnlyRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundFavoriteRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundQueryRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.videobackground.VideoBackgroundResourceVO;
import com.yupi.springbootinit.model.vo.videobackground.VideoBackgroundVO;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.service.VideoBackgroundService;
import com.yupi.springbootinit.service.ContentDraftPublishService;
import com.yupi.springbootinit.service.ContentModuleDraftBridgeService;
import com.yupi.springbootinit.service.ContentExternalService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.IOException;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/videoBackground")
@Api(tags = "Video Background")
public class VideoBackgroundController {
    @Resource
    private com.yupi.springbootinit.service.ResourceDownloadService resourceDownloadService;

    @Resource
    private VideoBackgroundService videoBackgroundService;
    @Resource
    private ContentDraftPublishService contentDraftPublishService;
    @Resource
    private ContentModuleDraftBridgeService contentModuleDraftBridgeService;
    @Resource
    private UserService userService;
    @Resource
    private PublicContentAntiCrawlerManager publicContentAntiCrawlerManager;

    @PostMapping("/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "add")
    public BaseResponse<Long> add(@RequestBody VideoBackgroundAddRequest request, HttpServletRequest servletRequest) {
        return ResultUtils.success(videoBackgroundService.addVideoBackground(request,
                userService.getLoginUser(servletRequest)));
    }

    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "update")
    public BaseResponse<Boolean> update(@RequestBody VideoBackgroundUpdateRequest request,
            HttpServletRequest servletRequest) {
        if (request != null && contentModuleDraftBridgeService.findByDraft(
                com.yupi.springbootinit.service.ContentExternalService.VIDEO_BACKGROUND, request.getId()) != null) {
            request.setStatus(0);
        }
        return ResultUtils.success(videoBackgroundService.updateVideoBackground(request,
                userService.getLoginUser(servletRequest)));
    }

    @PostMapping("/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "delete")
    @Transactional(rollbackFor = Exception.class)
    public BaseResponse<Boolean> delete(@RequestBody DeleteRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        boolean deleted = videoBackgroundService.deleteVideoBackground(request.getId());
        if (deleted) contentModuleDraftBridgeService.removeByResources(
                ContentExternalService.VIDEO_BACKGROUND, java.util.Collections.singletonList(request.getId()));
        return ResultUtils.success(deleted);
    }

    @PostMapping("/delete/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "batch_delete")
    @Transactional(rollbackFor = Exception.class)
    public BaseResponse<Boolean> deleteBatch(@RequestBody BatchDeleteRequest request) {
        if (request == null || CollUtil.isEmpty(request.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        for (Long id : request.getIds()) {
            videoBackgroundService.deleteVideoBackground(id);
        }
        contentModuleDraftBridgeService.removeByResources(ContentExternalService.VIDEO_BACKGROUND, request.getIds());
        return ResultUtils.success(true);
    }

    @PostMapping("/publish/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "batch_publish")
    public BaseResponse<Boolean> publishBatch(@RequestBody BatchDeleteRequest request,
            HttpServletRequest servletRequest) {
        if (request == null || CollUtil.isEmpty(request.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(contentDraftPublishService.publishVideoBackgrounds(request.getIds(),
                userService.getLoginUser(servletRequest)));
    }

    @PostMapping("/offline/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "batch_offline")
    public BaseResponse<Boolean> offlineBatch(@RequestBody BatchDeleteRequest request) {
        if (request == null || CollUtil.isEmpty(request.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(videoBackgroundService.offlineVideoBackgroundBatch(request.getIds()));
    }

    @PostMapping("/member-only/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "batch_update_member_only")
    public BaseResponse<Boolean> updateMemberOnlyBatch(@RequestBody VideoBackgroundBatchMemberOnlyRequest request) {
        if (request == null || CollUtil.isEmpty(request.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(videoBackgroundService.updateVideoBackgroundMemberOnlyBatch(
                request.getIds(), request.getMemberOnly()));
    }

    @PostMapping("/admin/list/page/vo")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Page<VideoBackgroundVO>> adminList(@RequestBody VideoBackgroundQueryRequest request,
            HttpServletRequest servletRequest) {
        Page<VideoBackgroundVO> page = videoBackgroundService.listVideoBackgroundVOByPage(request,
                userService.getLoginUser(servletRequest), true);
        contentModuleDraftBridgeService.annotateAdminResources(ContentExternalService.VIDEO_BACKGROUND, page.getRecords());
        return ResultUtils.success(page);
    }

    @PostMapping("/list/page/vo")
    @ApiOperation("Public page query video backgrounds")
    public BaseResponse<Page<VideoBackgroundVO>> list(@RequestBody VideoBackgroundQueryRequest request,
            HttpServletRequest servletRequest) {
        User loginUser = userService.getLoginUserPermitNull(servletRequest);
        publicContentAntiCrawlerManager.checkRequest(request, loginUser, servletRequest);
        return ResultUtils.success(videoBackgroundService.listVideoBackgroundVOByPage(request, loginUser, false));
    }

    @PostMapping("/favorite/add")
    @OperationLog(module = "video_background", action = "favorite_video_background")
    @ApiOperation("Favorite video background")
    public BaseResponse<Boolean> addFavorite(@RequestBody VideoBackgroundFavoriteRequest request,
            HttpServletRequest servletRequest) {
        return ResultUtils.success(videoBackgroundService.addFavorite(request,
                userService.getLoginUser(servletRequest)));
    }

    @PostMapping("/favorite/cancel")
    @OperationLog(module = "video_background", action = "cancel_favorite_video_background")
    @ApiOperation("Cancel video background favorite")
    public BaseResponse<Boolean> cancelFavorite(@RequestBody VideoBackgroundFavoriteRequest request,
            HttpServletRequest servletRequest) {
        return ResultUtils.success(videoBackgroundService.cancelFavorite(request,
                userService.getLoginUser(servletRequest)));
    }

    @GetMapping("/favorite/check")
    @ApiOperation("Check video background favorite status")
    public BaseResponse<Boolean> checkFavorite(@RequestParam Long videoBackgroundId, HttpServletRequest servletRequest) {
        return ResultUtils.success(videoBackgroundService.isFavorited(videoBackgroundId,
                userService.getLoginUser(servletRequest)));
    }

    @PostMapping("/favorite/my/list/page")
    @ApiOperation("Page query my favorite video backgrounds")
    public BaseResponse<Page<VideoBackgroundVO>> listMyFavorites(@RequestBody VideoBackgroundQueryRequest request,
            HttpServletRequest servletRequest) {
        return ResultUtils.success(videoBackgroundService.listMyFavoriteVideoBackgroundVOByPage(request,
                userService.getLoginUser(servletRequest)));
    }

    @GetMapping("/resource/get")
    public BaseResponse<VideoBackgroundResourceVO> getResource(@RequestParam("id") Long id,
            HttpServletRequest servletRequest) {
        User loginUser = userService.getLoginUser(servletRequest);
        String downloadUrl = servletRequest.getContextPath() + "/videoBackground/source/download?id=" + id;
        return ResultUtils.success(videoBackgroundService.getVideoBackgroundResource(id, loginUser, downloadUrl));
    }

    @GetMapping("/source/download")
    public void downloadSource(@RequestParam("id") Long id, HttpServletRequest servletRequest,
            HttpServletResponse response) throws IOException {
        com.yupi.springbootinit.model.entity.User loginUser = userService.getLoginUser(servletRequest);
        resourceDownloadService.download("video_background", id, null, loginUser,
                () -> videoBackgroundService.getVideoBackgroundSourceUrl(id, loginUser), "video-background-" + id, response);
    }


}
