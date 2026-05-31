package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationProviderConfigRequest;
import com.yupi.springbootinit.model.entity.ImageGenerationProviderConfig;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationProviderConfigVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationWorkerProviderConfigVO;
import java.util.List;

public interface ImageGenerationProviderConfigService extends IService<ImageGenerationProviderConfig> {

    List<ImageGenerationProviderConfigVO> listAdminProviderConfigs();

    Long addProviderConfig(ImageGenerationProviderConfigRequest request);

    boolean updateProviderConfig(ImageGenerationProviderConfigRequest request);

    boolean setDefaultProvider(Long id);

    ImageGenerationProviderConfig getDefaultEnabledProvider();

    ImageGenerationProviderConfig getEnabledProvider(String providerCode);

    ImageGenerationProviderConfigVO toProviderConfigVO(ImageGenerationProviderConfig config);

    ImageGenerationWorkerProviderConfigVO getWorkerProviderConfig(String providerCode);
}
