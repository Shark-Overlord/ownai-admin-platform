package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.dto.ai.AiProviderConfigRequest;
import com.yupi.springbootinit.model.dto.ai.AiTaskConfigRequest;
import com.yupi.springbootinit.model.vo.ai.AiSystemConfigVO;
import com.yupi.springbootinit.service.AiConfigService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/ai/config")
@Api(tags = "SystemAiConfig")
public class AiConfigController {

    @Resource
    private AiConfigService aiConfigService;

    @GetMapping
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Get system AI configuration")
    public BaseResponse<AiSystemConfigVO> getConfig() {
        return ResultUtils.success(aiConfigService.getSystemConfig());
    }

    @PostMapping("/provider/save")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "system_ai", action = "save_provider")
    @ApiOperation("Save DeepSeek provider configuration")
    public BaseResponse<Long> saveProvider(@RequestBody AiProviderConfigRequest request) {
        return ResultUtils.success(aiConfigService.saveProvider(request));
    }

    @PostMapping("/task/save")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "system_ai", action = "save_task")
    @ApiOperation("Save system AI task configuration")
    public BaseResponse<Long> saveTask(@RequestBody AiTaskConfigRequest request) {
        return ResultUtils.success(aiConfigService.saveTask(request));
    }
}
