package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.ImageGenerationModelConfigMapper;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationModelConfigBatchUpdateRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationModelConfigRequest;
import com.yupi.springbootinit.model.entity.ImageGenerationModelConfig;
import com.yupi.springbootinit.service.ImageGenerationModelConfigService;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Service
public class ImageGenerationModelConfigServiceImpl
        extends ServiceImpl<ImageGenerationModelConfigMapper, ImageGenerationModelConfig>
        implements ImageGenerationModelConfigService {

    private static final int ENABLED_STATUS = 1;

    private static final int DEFAULT_SUPPORTS_REFERENCE_IMAGE = 1;

    private static final String DEFAULT_ASPECT_RATIO = "1:1";

    private static final BigDecimal DEFAULT_MANUAL_COST_CNY = new BigDecimal("0.10");

    private static final Set<String> ALLOWED_SIZE_CODES = new HashSet<>(Arrays.asList("1k", "2k", "4k"));

    private static final Set<String> ALLOWED_ASPECT_RATIOS = new HashSet<>(
            Arrays.asList("1:1", "3:4", "4:3", "16:9", "9:16"));

    @Override
    public List<ImageGenerationModelConfig> listModelConfigs(String providerCode) {
        QueryWrapper<ImageGenerationModelConfig> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq(StringUtils.isNotBlank(providerCode), "providerCode", normalizeCode(providerCode));
        queryWrapper.orderByAsc("providerCode", "modelCode", "sortOrder", "sizeCode", "aspectRatio");
        return this.list(queryWrapper);
    }

    @Override
    public Long addModelConfig(ImageGenerationModelConfigRequest request) {
        validateModelConfigRequest(request, false);
        String providerCode = normalizeCode(request.getProviderCode());
        String modelCode = StringUtils.trim(request.getModelCode());
        String sizeCode = normalizeSizeCode(request.getSizeCode());
        String aspectRatio = normalizeAspectRatio(request.getAspectRatio());
        ImageGenerationModelConfig existing = this.getOne(new QueryWrapper<ImageGenerationModelConfig>()
                .eq("providerCode", providerCode)
                .eq("modelCode", modelCode)
                .eq("sizeCode", sizeCode)
                .eq("aspectRatio", aspectRatio)
                .last("limit 1"));
        if (existing != null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Model size config already exists");
        }
        ImageGenerationModelConfig config = new ImageGenerationModelConfig();
        BeanUtils.copyProperties(request, config);
        fillNormalizedFields(config, request);
        boolean result = this.save(config);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return config.getId();
    }

    @Override
    public boolean updateModelConfig(ImageGenerationModelConfigRequest request) {
        validateModelConfigRequest(request, true);
        ImageGenerationModelConfig oldConfig = this.getById(request.getId());
        if (oldConfig == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        ImageGenerationModelConfig updateConfig = new ImageGenerationModelConfig();
        BeanUtils.copyProperties(request, updateConfig);
        updateConfig.setId(request.getId());
        fillNormalizedFields(updateConfig, request);
        boolean result = this.updateById(updateConfig);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    public int batchUpdateSizeConfigs(ImageGenerationModelConfigBatchUpdateRequest request) {
        validateBatchUpdateRequest(request);
        String providerCode = normalizeCode(request.getProviderCode());
        String modelCode = StringUtils.trim(request.getModelCode());
        String sizeCode = normalizeSizeCode(request.getSizeCode());
        ImageGenerationModelConfig updateConfig = new ImageGenerationModelConfig();
        updateConfig.setPointCost(request.getPointCost());
        updateConfig.setManualPointCost(request.getManualPointCost());
        updateConfig.setApiInputCostCny(request.getApiInputCostCny());
        updateConfig.setApiOutputCostCny(request.getApiOutputCostCny());
        updateConfig.setApiCostCny(request.getApiInputCostCny().add(request.getApiOutputCostCny()));
        updateConfig.setManualCostCny(request.getManualCostCny());
        updateConfig.setSupportsReferenceImage(request.getSupportsReferenceImage());
        updateConfig.setStatus(request.getStatus());
        QueryWrapper<ImageGenerationModelConfig> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("providerCode", providerCode)
                .eq("modelCode", modelCode)
                .eq("sizeCode", sizeCode);
        return baseMapper.update(updateConfig, queryWrapper);
    }

    @Override
    public ImageGenerationModelConfig getEnabledModelConfig(String providerCode, String modelCode, String sizeCode,
            String aspectRatio) {
        ImageGenerationModelConfig config = this.getOne(new QueryWrapper<ImageGenerationModelConfig>()
                .eq("providerCode", normalizeCode(providerCode))
                .eq("modelCode", StringUtils.trim(modelCode))
                .eq("sizeCode", normalizeSizeCode(sizeCode))
                .eq("aspectRatio", normalizeAspectRatio(aspectRatio))
                .eq("status", ENABLED_STATUS)
                .last("limit 1"));
        if (config == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Image model size is not enabled");
        }
        return config;
    }

    private void validateModelConfigRequest(ImageGenerationModelConfigRequest request, boolean update) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        if (update && (request.getId() == null || request.getId() <= 0)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        if (!update && (StringUtils.isBlank(request.getProviderCode())
                || StringUtils.isBlank(request.getModelCode())
                || StringUtils.isBlank(request.getSizeCode())
                || StringUtils.isBlank(request.getAspectRatio())
                || StringUtils.isBlank(request.getVendorSize()))) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR,
                    "Provider, model, size, aspect ratio and vendor size are required");
        }
        if (request.getPointCost() != null && request.getPointCost() < 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Point cost cannot be negative");
        }
        if (request.getManualPointCost() != null && request.getManualPointCost() < 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Manual point cost cannot be negative");
        }
        validateCost(request.getApiInputCostCny(), "Input cost cannot be negative");
        validateCost(request.getApiOutputCostCny(), "Output cost cannot be negative");
        validateCost(request.getApiCostCny(), "Total cost cannot be negative");
        validateCost(request.getManualCostCny(), "Manual cost cannot be negative");
    }

    private void validateBatchUpdateRequest(ImageGenerationModelConfigBatchUpdateRequest request) {
        if (request == null
                || StringUtils.isBlank(request.getProviderCode())
                || StringUtils.isBlank(request.getModelCode())
                || StringUtils.isBlank(request.getSizeCode())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        if (request.getPointCost() == null || request.getPointCost() < 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Point cost cannot be negative");
        }
        if (request.getManualPointCost() == null || request.getManualPointCost() < 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Manual point cost cannot be negative");
        }
        if (request.getSupportsReferenceImage() == null
                || (request.getSupportsReferenceImage() != 0 && request.getSupportsReferenceImage() != 1)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Invalid reference image support value");
        }
        if (request.getStatus() == null || (request.getStatus() != 0 && request.getStatus() != 1)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Invalid status");
        }
        if (request.getApiInputCostCny() == null || request.getApiOutputCostCny() == null
                || request.getManualCostCny() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Cost fields are required");
        }
        validateCost(request.getApiInputCostCny(), "Input cost cannot be negative");
        validateCost(request.getApiOutputCostCny(), "Output cost cannot be negative");
        validateCost(request.getManualCostCny(), "Manual cost cannot be negative");
    }

    private void validateCost(BigDecimal value, String message) {
        if (value != null && value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, message);
        }
    }

    private void fillNormalizedFields(ImageGenerationModelConfig config, ImageGenerationModelConfigRequest request) {
        if (StringUtils.isNotBlank(request.getProviderCode())) {
            config.setProviderCode(normalizeCode(request.getProviderCode()));
        }
        if (StringUtils.isNotBlank(request.getModelCode())) {
            config.setModelCode(StringUtils.trim(request.getModelCode()));
        }
        if (StringUtils.isNotBlank(request.getSizeCode())) {
            config.setSizeCode(normalizeSizeCode(request.getSizeCode()));
        }
        if (StringUtils.isNotBlank(request.getAspectRatio())) {
            config.setAspectRatio(normalizeAspectRatio(request.getAspectRatio()));
        } else if (config.getAspectRatio() == null) {
            config.setAspectRatio(DEFAULT_ASPECT_RATIO);
        }
        if (StringUtils.isNotBlank(request.getVendorSize())) {
            config.setVendorSize(StringUtils.trim(request.getVendorSize()).toLowerCase());
        }
        if (config.getPointCost() == null) {
            config.setPointCost(0);
        }
        if (config.getManualPointCost() == null) {
            config.setManualPointCost(config.getPointCost());
        }
        if (config.getApiInputCostCny() == null) {
            config.setApiInputCostCny(BigDecimal.ZERO);
        }
        if (config.getApiOutputCostCny() == null) {
            config.setApiOutputCostCny(BigDecimal.ZERO);
        }
        if (config.getApiCostCny() == null) {
            config.setApiCostCny(config.getApiInputCostCny().add(config.getApiOutputCostCny()));
        }
        if (config.getManualCostCny() == null) {
            config.setManualCostCny(DEFAULT_MANUAL_COST_CNY);
        }
        if (config.getSupportsReferenceImage() == null) {
            config.setSupportsReferenceImage(DEFAULT_SUPPORTS_REFERENCE_IMAGE);
        }
        if (config.getStatus() == null) {
            config.setStatus(ENABLED_STATUS);
        }
        if (config.getSortOrder() == null) {
            config.setSortOrder(0);
        }
    }

    private String normalizeCode(String code) {
        String safeCode = StringUtils.trimToNull(code);
        if (safeCode == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return safeCode.toLowerCase();
    }

    private String normalizeSizeCode(String sizeCode) {
        String safeSizeCode = normalizeCode(sizeCode);
        if (!ALLOWED_SIZE_CODES.contains(safeSizeCode)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Unsupported image size");
        }
        return safeSizeCode;
    }

    private String normalizeAspectRatio(String aspectRatio) {
        String safeAspectRatio = StringUtils.defaultIfBlank(StringUtils.trimToNull(aspectRatio), DEFAULT_ASPECT_RATIO);
        if (!ALLOWED_ASPECT_RATIOS.contains(safeAspectRatio)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Unsupported aspect ratio");
        }
        return safeAspectRatio;
    }
}
