package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.dto.analytics.PageViewTrackRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.analytics.SiteAnalyticsOverviewVO;
import com.yupi.springbootinit.service.SiteAnalyticsService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.time.LocalDate;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/site-analytics")
@Api(tags = "Site Analytics")
public class SiteAnalyticsController {

    @Resource
    private SiteAnalyticsService siteAnalyticsService;

    @Resource
    private UserService userService;

    @PostMapping("/track/page-view")
    @ApiOperation("Track a frontend page view")
    public BaseResponse<Boolean> trackPageView(@RequestBody PageViewTrackRequest trackRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(siteAnalyticsService.trackPageView(
                trackRequest, loginUser, request.getHeader("User-Agent")));
    }

    @GetMapping("/admin/overview")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin site traffic overview")
    public BaseResponse<SiteAnalyticsOverviewVO> getOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResultUtils.success(siteAnalyticsService.getOverview(startDate, endDate));
    }
}
