package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationModelConfigRequest;
import com.yupi.springbootinit.model.entity.ImageGenerationModelConfig;
import java.util.List;

public interface ImageGenerationModelConfigService extends IService<ImageGenerationModelConfig> {

    List<ImageGenerationModelConfig> listModelConfigs(String providerCode);

    Long addModelConfig(ImageGenerationModelConfigRequest request);

    boolean updateModelConfig(ImageGenerationModelConfigRequest request);

    ImageGenerationModelConfig getEnabledModelConfig(String providerCode, String modelCode, String sizeCode,
            String aspectRatio);
}
