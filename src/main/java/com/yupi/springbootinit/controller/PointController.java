package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.model.dto.point.PointRecordQueryRequest;
import com.yupi.springbootinit.model.entity.PointRecord;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.point.PointOverviewVO;
import com.yupi.springbootinit.service.PointService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.HashMap;
import java.util.Map;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 积分接口 Point Controller
 */
@RestController
@RequestMapping("/point")
@Api(tags = "Point")
public class PointController {

    @Resource
    private PointService pointService;

    @Resource
    private UserService userService;

    /**
     * 获取我的积分概览 Get my point overview
     */
    @GetMapping("/me")
    @ApiOperation("获取我的积分概览 Get my point overview")
    public BaseResponse<PointOverviewVO> getMyPointOverview(HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(pointService.getPointOverview(loginUser));
    }

    /**
     * 每日签到 Daily check in
     */
    @PostMapping("/check-in")
    @OperationLog(module = "point", action = "daily_check_in")
    @ApiOperation("每日签到 Daily check in")
    public BaseResponse<Map<String, Integer>> dailyCheckIn(HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        int rewardPoints = pointService.dailyCheckIn(loginUser);
        Map<String, Integer> result = new HashMap<>();
        result.put("rewardPoints", rewardPoints);
        return ResultUtils.success(result);
    }

    /**
     * 分页查询我的积分记录 Page query my point records
     */
    @PostMapping("/record/list/page")
    @ApiOperation("分页查询我的积分记录 Page query my point records")
    public BaseResponse<Page<PointRecord>> listMyPointRecords(@RequestBody PointRecordQueryRequest pointRecordQueryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(pointService.listMyPointRecords(pointRecordQueryRequest, loginUser));
    }
}
