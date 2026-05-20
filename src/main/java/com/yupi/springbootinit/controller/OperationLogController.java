package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.dto.log.OperationLogQueryRequest;
import com.yupi.springbootinit.model.entity.OperationLog;
import com.yupi.springbootinit.service.OperationLogService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 操作日志接口 Operation Log Controller
 */
@RestController
@RequestMapping("/operation-log")
@Api(tags = "Operation Log")
public class OperationLogController {

    @Resource
    private OperationLogService operationLogService;

    /**
     * 管理员分页查询操作日志 Admin page query operation logs
     */
    @PostMapping("/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("管理员分页查询操作日志 Admin page query operation logs")
    public BaseResponse<Page<OperationLog>> listOperationLogs(@RequestBody OperationLogQueryRequest operationLogQueryRequest) {
        return ResultUtils.success(operationLogService.listOperationLogs(operationLogQueryRequest));
    }
}
