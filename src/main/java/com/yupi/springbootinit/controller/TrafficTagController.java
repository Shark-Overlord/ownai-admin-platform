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
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagAddRequest;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagPublicQueryRequest;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagQueryRequest;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagUpdateRequest;
import com.yupi.springbootinit.model.vo.traffictag.TrafficTagOverviewVO;
import com.yupi.springbootinit.model.vo.traffictag.TrafficTagVO;
import com.yupi.springbootinit.service.TrafficTagService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/traffic-tags")
@Api(tags = "Traffic tags")
public class TrafficTagController {

    @Resource
    private TrafficTagService trafficTagService;

    @GetMapping("/public/overview")
    @ApiOperation("Public traffic tag overview")
    public BaseResponse<TrafficTagOverviewVO> getPublicOverview(
            @ModelAttribute TrafficTagPublicQueryRequest request) {
        return ResultUtils.success(trafficTagService.getPublicOverview(request));
    }

    @PostMapping("/admin/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin page query traffic tags")
    public BaseResponse<Page<TrafficTagVO>> listAdminByPage(
            @RequestBody(required = false) TrafficTagQueryRequest request) {
        return ResultUtils.success(trafficTagService.listAdminByPage(request));
    }

    @PostMapping("/admin/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "traffic_tag", action = "add_traffic_tag")
    @ApiOperation("Admin add traffic tag")
    public BaseResponse<String> add(@RequestBody TrafficTagAddRequest request) {
        return ResultUtils.success(String.valueOf(trafficTagService.addTrafficTag(request)));
    }

    @PostMapping("/admin/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "traffic_tag", action = "update_traffic_tag")
    @ApiOperation("Admin update traffic tag")
    public BaseResponse<Boolean> update(@RequestBody TrafficTagUpdateRequest request) {
        return ResultUtils.success(trafficTagService.updateTrafficTag(request));
    }

    @PostMapping("/admin/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "traffic_tag", action = "delete_traffic_tag")
    @ApiOperation("Admin delete traffic tag")
    public BaseResponse<Boolean> delete(@RequestBody DeleteRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(trafficTagService.deleteTrafficTag(request.getId()));
    }
}
