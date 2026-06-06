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
import com.yupi.springbootinit.model.dto.announcement.AnnouncementAddRequest;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementQueryRequest;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementReadRequest;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.announcement.AnnouncementVO;
import com.yupi.springbootinit.service.AnnouncementService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/announcement")
@Api(tags = "Announcement")
public class AnnouncementController {

    @Resource
    private AnnouncementService announcementService;

    @Resource
    private UserService userService;

    @PostMapping("/admin/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "announcement", action = "add_announcement")
    @ApiOperation("Admin add announcement")
    public BaseResponse<Long> addAnnouncement(@RequestBody AnnouncementAddRequest addRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(announcementService.addAnnouncement(addRequest, loginUser));
    }

    @PostMapping("/admin/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "announcement", action = "update_announcement")
    @ApiOperation("Admin update announcement")
    public BaseResponse<Boolean> updateAnnouncement(@RequestBody AnnouncementUpdateRequest updateRequest) {
        return ResultUtils.success(announcementService.updateAnnouncement(updateRequest));
    }

    @PostMapping("/admin/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "announcement", action = "delete_announcement")
    @ApiOperation("Admin delete announcement")
    public BaseResponse<Boolean> deleteAnnouncement(@RequestBody DeleteRequest deleteRequest) {
        if (deleteRequest == null || deleteRequest.getId() == null || deleteRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(announcementService.deleteAnnouncement(deleteRequest.getId()));
    }

    @PostMapping("/admin/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin page query announcement")
    public BaseResponse<Page<AnnouncementVO>> listAnnouncementByPage(
            @RequestBody(required = false) AnnouncementQueryRequest queryRequest) {
        return ResultUtils.success(announcementService.listAdminAnnouncementByPage(queryRequest));
    }

    @PostMapping("/admin/publish")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "announcement", action = "publish_announcement")
    @ApiOperation("Admin publish announcement")
    public BaseResponse<Boolean> publishAnnouncement(@RequestBody DeleteRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(announcementService.publishAnnouncement(request.getId()));
    }

    @PostMapping("/admin/offline")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "announcement", action = "offline_announcement")
    @ApiOperation("Admin offline announcement")
    public BaseResponse<Boolean> offlineAnnouncement(@RequestBody DeleteRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(announcementService.offlineAnnouncement(request.getId()));
    }

    @PostMapping("/list/page")
    @ApiOperation("Page query published announcements")
    public BaseResponse<Page<AnnouncementVO>> listPublishedAnnouncementByPage(
            @RequestBody(required = false) AnnouncementQueryRequest queryRequest, HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(announcementService.listUserAnnouncementByPage(queryRequest, loginUser));
    }

    @GetMapping("/get")
    @ApiOperation("Get published announcement detail")
    public BaseResponse<AnnouncementVO> getAnnouncement(long id, HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(announcementService.getUserAnnouncementVO(id, loginUser));
    }

    @PostMapping("/read")
    @OperationLog(module = "announcement", action = "read_announcement")
    @ApiOperation("Mark announcement as read")
    public BaseResponse<Boolean> markRead(@RequestBody AnnouncementReadRequest readRequest,
            HttpServletRequest request) {
        if (readRequest == null || readRequest.getId() == null || readRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(announcementService.markRead(readRequest.getId(), loginUser));
    }

    @PostMapping("/read/all")
    @OperationLog(module = "announcement", action = "read_all_announcement")
    @ApiOperation("Mark all announcements as read")
    public BaseResponse<Boolean> markAllRead(HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(announcementService.markAllRead(loginUser));
    }

    @GetMapping("/unread/count")
    @ApiOperation("Get unread announcement count")
    public BaseResponse<Long> getUnreadCount(HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(announcementService.getUnreadCount(loginUser));
    }
}
