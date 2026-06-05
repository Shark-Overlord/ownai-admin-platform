package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationCanvasSaveRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationCreateRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationManualCompleteRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationMessageQueryRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationTaskUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationCanvasVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationConversationVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationConversationSummaryVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationCreateVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationMessageVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationMonitorOverviewVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationQuoteVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationTaskContextVO;
import com.yupi.springbootinit.service.ImageGenerationCanvasService;
import com.yupi.springbootinit.service.ImageGenerationMessageService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/image/generation")
@Api(tags = "ImageGeneration")
public class ImageGenerationController {

    @Resource
    private UserService userService;

    @Resource
    private ImageGenerationMessageService imageGenerationMessageService;

    @Resource
    private ImageGenerationCanvasService imageGenerationCanvasService;

    @Value("${image.generation.worker-token:}")
    private String imageGenerationWorkerToken;

    @PostMapping("/create")
    @ApiOperation("Create image generation message and task placeholder")
    public BaseResponse<ImageGenerationCreateVO> createImageGeneration(
            @RequestBody ImageGenerationCreateRequest createRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(imageGenerationMessageService.createGeneration(createRequest, loginUser));
    }

    @PostMapping("/config/quote")
    @ApiOperation("Quote image generation point cost")
    public BaseResponse<ImageGenerationQuoteVO> quoteImageGeneration(
            @RequestBody ImageGenerationCreateRequest quoteRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(imageGenerationMessageService.quoteGeneration(quoteRequest, loginUser));
    }

    @GetMapping("/conversation/current")
    @ApiOperation("Get current image generation conversation")
    public BaseResponse<ImageGenerationConversationVO> getCurrentConversation(HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(imageGenerationMessageService.getCurrentConversation(loginUser));
    }

    @GetMapping("/conversation/get")
    @ApiOperation("Get image generation conversation by conversationId")
    public BaseResponse<ImageGenerationConversationVO> getConversation(
            @RequestParam("conversationId") String conversationId,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(imageGenerationMessageService.getConversation(conversationId, loginUser));
    }

    @PostMapping("/conversation/list/page")
    @ApiOperation("Page query current user's image generation conversations")
    public BaseResponse<Page<ImageGenerationConversationSummaryVO>> listMyConversations(
            @RequestBody(required = false) ImageGenerationMessageQueryRequest queryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(imageGenerationMessageService.listMyConversationVOByPage(queryRequest, loginUser));
    }

    @GetMapping("/canvas/get")
    @ApiOperation("Get image generation canvas layout")
    public BaseResponse<ImageGenerationCanvasVO> getCanvas(
            @RequestParam("conversationId") String conversationId,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(imageGenerationCanvasService.getCanvas(conversationId, loginUser));
    }

    @PostMapping("/canvas/save")
    @ApiOperation("Save image generation canvas layout")
    public BaseResponse<ImageGenerationCanvasVO> saveCanvas(
            @RequestBody ImageGenerationCanvasSaveRequest saveRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(imageGenerationCanvasService.saveCanvas(saveRequest, loginUser));
    }

    @PostMapping("/admin/message/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin page query image generation messages")
    public BaseResponse<Page<ImageGenerationMessageVO>> listAdminMessages(
            @RequestBody(required = false) ImageGenerationMessageQueryRequest queryRequest) {
        return ResultUtils.success(imageGenerationMessageService.listAdminMessageVOByPage(queryRequest));
    }

    @GetMapping("/admin/message/get/vo")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin get image generation message detail")
    public BaseResponse<ImageGenerationMessageVO> getAdminMessage(@RequestParam("id") Long id) {
        return ResultUtils.success(imageGenerationMessageService.getAdminMessageVO(id));
    }

    @PostMapping("/admin/monitor/overview")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin get image generation monitor overview")
    public BaseResponse<ImageGenerationMonitorOverviewVO> getAdminMonitorOverview(
            @RequestBody(required = false) ImageGenerationMessageQueryRequest queryRequest) {
        return ResultUtils.success(imageGenerationMessageService.getAdminMonitorOverview(queryRequest));
    }

    @PostMapping("/admin/conversation/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin page query image generation conversations")
    public BaseResponse<Page<ImageGenerationConversationSummaryVO>> listAdminConversations(
            @RequestBody(required = false) ImageGenerationMessageQueryRequest queryRequest) {
        return ResultUtils.success(imageGenerationMessageService.listAdminConversationVOByPage(queryRequest));
    }

    @GetMapping("/admin/conversation/get")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin get image generation conversation detail")
    public BaseResponse<ImageGenerationConversationVO> getAdminConversation(
            @RequestParam("conversationId") String conversationId,
            @RequestParam("userId") Long userId) {
        return ResultUtils.success(imageGenerationMessageService.getAdminConversation(conversationId, userId));
    }

    @PostMapping({"/admin/task/pending/page", "/worker/task/pending/page"})
    @ApiOperation("Admin page query pending image generation tasks with conversation context")
    public BaseResponse<Page<ImageGenerationTaskContextVO>> listPendingTasks(
            @RequestBody(required = false) ImageGenerationMessageQueryRequest queryRequest,
            HttpServletRequest request) {
        checkWorkerOrAdmin(request);
        return ResultUtils.success(imageGenerationMessageService.listPendingTaskContextByPage(queryRequest));
    }

    @PostMapping({"/admin/task/update", "/worker/task/update"})
    @ApiOperation("Admin update image generation task result")
    public BaseResponse<ImageGenerationMessageVO> updateTaskResult(
            @RequestBody ImageGenerationTaskUpdateRequest updateRequest,
            HttpServletRequest request) {
        checkWorkerOrAdmin(request);
        return ResultUtils.success(imageGenerationMessageService.updateTaskResult(updateRequest));
    }

    @PostMapping("/admin/task/manual-complete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin manually complete an image generation task")
    public BaseResponse<ImageGenerationMessageVO> manualCompleteTask(
            @RequestBody ImageGenerationManualCompleteRequest completeRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(imageGenerationMessageService.manualCompleteTask(completeRequest, loginUser));
    }

    private void checkWorkerOrAdmin(HttpServletRequest request) {
        String workerToken = StringUtils.trimToNull(request.getHeader("X-Worker-Token"));
        if (StringUtils.isNotBlank(imageGenerationWorkerToken)
                && StringUtils.equals(workerToken, imageGenerationWorkerToken)) {
            return;
        }
        User loginUser = userService.getLoginUser(request);
        if (!userService.isAdmin(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
    }
}
