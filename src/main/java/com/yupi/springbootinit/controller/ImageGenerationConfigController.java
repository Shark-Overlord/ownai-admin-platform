package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationModelConfigRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationProviderConfigRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationProviderDefaultRequest;
import com.yupi.springbootinit.model.entity.ImageGenerationModelConfig;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationProviderConfigVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationWorkerProviderConfigVO;
import com.yupi.springbootinit.service.ImageGenerationModelConfigService;
import com.yupi.springbootinit.service.ImageGenerationProviderConfigService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.List;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/image/generation")
@Api(tags = "ImageGenerationConfig")
public class ImageGenerationConfigController {

    @Resource
    private ImageGenerationProviderConfigService providerConfigService;

    @Resource
    private ImageGenerationModelConfigService modelConfigService;

    @Value("${image.generation.worker-token:}")
    private String imageGenerationWorkerToken;

    @GetMapping("/config/admin/provider/list")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin list image generation providers")
    public BaseResponse<List<ImageGenerationProviderConfigVO>> listProviders() {
        return ResultUtils.success(providerConfigService.listAdminProviderConfigs());
    }

    @PostMapping("/config/admin/provider/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin add image generation provider")
    public BaseResponse<Long> addProvider(@RequestBody ImageGenerationProviderConfigRequest request) {
        return ResultUtils.success(providerConfigService.addProviderConfig(request));
    }

    @PostMapping("/config/admin/provider/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin update image generation provider")
    public BaseResponse<Boolean> updateProvider(@RequestBody ImageGenerationProviderConfigRequest request) {
        return ResultUtils.success(providerConfigService.updateProviderConfig(request));
    }

    @PostMapping("/config/admin/provider/set-default")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin set default image generation provider")
    public BaseResponse<Boolean> setDefaultProvider(@RequestBody ImageGenerationProviderDefaultRequest request) {
        if (request == null || request.getId() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(providerConfigService.setDefaultProvider(request.getId()));
    }

    @GetMapping("/config/admin/model/list")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin list image generation model configs")
    public BaseResponse<List<ImageGenerationModelConfig>> listModels(
            @RequestParam(value = "providerCode", required = false) String providerCode) {
        return ResultUtils.success(modelConfigService.listModelConfigs(providerCode));
    }

    @PostMapping("/config/admin/model/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin add image generation model config")
    public BaseResponse<Long> addModel(@RequestBody ImageGenerationModelConfigRequest request) {
        return ResultUtils.success(modelConfigService.addModelConfig(request));
    }

    @PostMapping("/config/admin/model/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin update image generation model config")
    public BaseResponse<Boolean> updateModel(@RequestBody ImageGenerationModelConfigRequest request) {
        return ResultUtils.success(modelConfigService.updateModelConfig(request));
    }

    @GetMapping("/worker/provider/config")
    @ApiOperation("Worker get provider config with API key")
    public BaseResponse<ImageGenerationWorkerProviderConfigVO> getWorkerProviderConfig(
            @RequestParam("providerCode") String providerCode,
            HttpServletRequest request) {
        checkWorkerToken(request);
        return ResultUtils.success(providerConfigService.getWorkerProviderConfig(providerCode));
    }

    private void checkWorkerToken(HttpServletRequest request) {
        String workerToken = StringUtils.trimToNull(request.getHeader("X-Worker-Token"));
        if (StringUtils.isBlank(imageGenerationWorkerToken)
                || !StringUtils.equals(workerToken, imageGenerationWorkerToken)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
    }
}
