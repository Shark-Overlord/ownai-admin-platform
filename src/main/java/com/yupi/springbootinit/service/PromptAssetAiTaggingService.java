package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAiTagConfigRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAiTagRunRequest;
import com.yupi.springbootinit.model.entity.PromptAssetAiTagConfig;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetAiTagConfigVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetAiTagRunResultVO;

public interface PromptAssetAiTaggingService extends IService<PromptAssetAiTagConfig> {

    PromptAssetAiTagConfigVO getConfig();

    Long saveConfig(PromptAssetAiTagConfigRequest request);

    PromptAssetAiTagRunResultVO runTagging(PromptAssetAiTagRunRequest request);
}
