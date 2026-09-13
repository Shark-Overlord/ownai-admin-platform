package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.common.*;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.dto.analytics.*;
import com.yupi.springbootinit.service.*;
import java.time.LocalDate;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/resource-analytics")
public class ResourceAnalyticsController {
    private final ResourceAnalyticsService analytics;
    private final UserService users;
    public ResourceAnalyticsController(ResourceAnalyticsService analytics,UserService users) {this.analytics=analytics;this.users=users;}
    @PostMapping("/track")
    public BaseResponse<Boolean> track(@RequestBody ResourceTrackRequest body,HttpServletRequest request) {
        return ResultUtils.success(analytics.track(body,users.getLoginUserPermitNull(request)));
    }
    @GetMapping("/admin/resources") @AuthCheck(mustRole=UserConstant.ADMIN_ROLE)
    public BaseResponse<Map<String,Object>> resources(
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required=false) String resourceType,@RequestParam(defaultValue="hotScore") String sort,
            @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int pageSize) {
        return ResultUtils.success(analytics.resources(startDate,endDate,resourceType,sort,page,pageSize));
    }
    @GetMapping("/admin/accounts") @AuthCheck(mustRole=UserConstant.ADMIN_ROLE)
    public BaseResponse<Map<String,Object>> accounts(
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue="transferredBytes") String sort,@RequestParam(defaultValue="") String keyword,
            @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int pageSize) {
        return ResultUtils.success(analytics.accounts(startDate,endDate,sort,keyword,page,pageSize));
    }
    @GetMapping("/admin/downloads") @AuthCheck(mustRole=UserConstant.ADMIN_ROLE)
    public BaseResponse<Map<String,Object>> downloads(
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required=false) Long userId,@RequestParam(required=false) String resourceType,@RequestParam(required=false) Long resourceId,
            @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int pageSize) {
        return ResultUtils.success(analytics.downloads(startDate,endDate,userId,resourceType,resourceId,page,pageSize));
    }
    @GetMapping("/admin/overview") @AuthCheck(mustRole=UserConstant.ADMIN_ROLE)
    public BaseResponse<Map<String,Object>> overview(
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResultUtils.success(analytics.overview(startDate,endDate));
    }
    @PostMapping("/admin/download-permission") @AuthCheck(mustRole=UserConstant.ADMIN_ROLE)
    public BaseResponse<Boolean> permission(@RequestBody DownloadPermissionRequest body,HttpServletRequest request) {
        return ResultUtils.success(analytics.permission(body,users.getLoginUser(request)));
    }
    @GetMapping("/admin/download-permission/audit") @AuthCheck(mustRole=UserConstant.ADMIN_ROLE)
    public BaseResponse<List<Map<String,Object>>> audit(@RequestParam long userId) {return ResultUtils.success(analytics.audit(userId));}
}
