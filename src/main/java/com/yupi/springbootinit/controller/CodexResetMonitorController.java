package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.model.vo.codex.CodexResetOverviewVO;
import com.yupi.springbootinit.service.CodexResetMonitorService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/codex-reset")
@Api(tags = "CodexResetMonitor")
public class CodexResetMonitorController {

    @Resource
    private CodexResetMonitorService codexResetMonitorService;

    @GetMapping("/overview")
    @ApiOperation("Get public Codex reset signal overview")
    public BaseResponse<CodexResetOverviewVO> getOverview() {
        return ResultUtils.success(codexResetMonitorService.getOverview());
    }
}
