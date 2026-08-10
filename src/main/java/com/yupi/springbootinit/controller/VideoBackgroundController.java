package com.yupi.springbootinit.controller;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.io.FileUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.BatchDeleteRequest;
import com.yupi.springbootinit.common.DeleteRequest;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.PublicContentAntiCrawlerManager;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundAddRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundBatchMemberOnlyRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundQueryRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.videobackground.VideoBackgroundResourceVO;
import com.yupi.springbootinit.model.vo.videobackground.VideoBackgroundVO;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.service.VideoBackgroundService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/videoBackground")
@Api(tags = "Video Background")
public class VideoBackgroundController {

    @Resource
    private VideoBackgroundService videoBackgroundService;
    @Resource
    private UserService userService;
    @Resource
    private CosClientConfig cosClientConfig;
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
        return ResultUtils.success(videoBackgroundService.updateVideoBackground(request,
                userService.getLoginUser(servletRequest)));
    }

    @PostMapping("/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "delete")
    public BaseResponse<Boolean> delete(@RequestBody DeleteRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(videoBackgroundService.deleteVideoBackground(request.getId()));
    }

    @PostMapping("/delete/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "batch_delete")
    public BaseResponse<Boolean> deleteBatch(@RequestBody BatchDeleteRequest request) {
        if (request == null || CollUtil.isEmpty(request.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        for (Long id : request.getIds()) {
            videoBackgroundService.deleteVideoBackground(id);
        }
        return ResultUtils.success(true);
    }

    @PostMapping("/publish/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "video_background", action = "batch_publish")
    public BaseResponse<Boolean> publishBatch(@RequestBody BatchDeleteRequest request) {
        if (request == null || CollUtil.isEmpty(request.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(videoBackgroundService.publishVideoBackgroundBatch(request.getIds()));
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
        return ResultUtils.success(videoBackgroundService.listVideoBackgroundVOByPage(request,
                userService.getLoginUser(servletRequest), true));
    }

    @PostMapping("/list/page/vo")
    @ApiOperation("Public page query video backgrounds")
    public BaseResponse<Page<VideoBackgroundVO>> list(@RequestBody VideoBackgroundQueryRequest request,
            HttpServletRequest servletRequest) {
        User loginUser = userService.getLoginUserPermitNull(servletRequest);
        publicContentAntiCrawlerManager.checkRequest(request, loginUser, servletRequest);
        return ResultUtils.success(videoBackgroundService.listVideoBackgroundVOByPage(request, loginUser, false));
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
        String sourceUrl = videoBackgroundService.getVideoBackgroundSourceUrl(id,
                userService.getLoginUser(servletRequest));
        validateCosSourceUrl(sourceUrl);
        HttpURLConnection connection = (HttpURLConnection) new URL(sourceUrl).openConnection();
        connection.setConnectTimeout(15_000);
        connection.setReadTimeout(300_000);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestMethod("GET");
        int code = connection.getResponseCode();
        if (code < 200 || code >= 300) {
            connection.disconnect();
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Original video read failed");
        }
        String suffix = FileUtil.getSuffix(new URL(sourceUrl).getPath());
        String filename = "video-background-" + id + (StringUtils.isBlank(suffix) ? "" : "." + suffix);
        response.setContentType(StringUtils.defaultIfBlank(connection.getContentType(), "application/octet-stream"));
        response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''"
                + URLEncoder.encode(filename, StandardCharsets.UTF_8.name()).replace("+", "%20"));
        response.setHeader("Cache-Control", "private, no-store");
        if (connection.getContentLengthLong() >= 0) {
            response.setContentLengthLong(connection.getContentLengthLong());
        }
        try (InputStream input = new BufferedInputStream(connection.getInputStream());
                OutputStream output = new BufferedOutputStream(response.getOutputStream())) {
            byte[] buffer = new byte[16 * 1024];
            int length;
            while ((length = input.read(buffer)) != -1) {
                output.write(buffer, 0, length);
            }
            output.flush();
        } finally {
            connection.disconnect();
        }
    }

    private void validateCosSourceUrl(String sourceUrl) {
        String host = StringUtils.removeEnd(StringUtils.trimToEmpty(cosClientConfig.getHost()), "/");
        if (StringUtils.isBlank(host) || !StringUtils.startsWith(sourceUrl, host + "/")) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Original video URL is invalid");
        }
    }
}
