package com.yupi.springbootinit.service;

import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAiTagRunRequest;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetAiTagRunResultVO;

public interface PromptAssetAiTaggingService {

    PromptAssetAiTagRunResultVO runTagging(PromptAssetAiTagRunRequest request);
}
