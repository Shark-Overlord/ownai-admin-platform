package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAiTagRunRequest;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetAiTagRunResultVO;
import com.yupi.springbootinit.service.PromptAssetAiTaggingService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/promptAsset/admin/ai-tagging")
@Api(tags = "PromptAssetAiTagging")
public class PromptAssetAiTaggingController {

    @Resource
    private PromptAssetAiTaggingService promptAssetAiTaggingService;

    @PostMapping("/run")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "prompt_asset", action = "run_ai_tagging")
    @ApiOperation("Admin run prompt asset AI tagging")
    public BaseResponse<PromptAssetAiTagRunResultVO> runTagging(@RequestBody PromptAssetAiTagRunRequest request) {
        return ResultUtils.success(promptAssetAiTaggingService.runTagging(request));
    }
}
