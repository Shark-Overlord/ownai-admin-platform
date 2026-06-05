package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.vo.dashboard.DashboardOverviewVO;
import com.yupi.springbootinit.service.DashboardService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@Api(tags = "Dashboard")
public class DashboardController {

    @Resource
    private DashboardService dashboardService;

    @GetMapping("/admin/overview")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin dashboard overview")
    public BaseResponse<DashboardOverviewVO> getAdminOverview() {
        return ResultUtils.success(dashboardService.getAdminOverview());
    }
}
