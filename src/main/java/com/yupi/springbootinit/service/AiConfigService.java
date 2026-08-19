package com.yupi.springbootinit.service;

import com.yupi.springbootinit.model.dto.ai.AiProviderConfigRequest;
import com.yupi.springbootinit.model.dto.ai.AiTaskConfigRequest;
import com.yupi.springbootinit.model.entity.AiTaskConfig;
import com.yupi.springbootinit.model.vo.ai.AiSystemConfigVO;

public interface AiConfigService {

    AiSystemConfigVO getSystemConfig();

    Long saveProvider(AiProviderConfigRequest request);

    Long saveTask(AiTaskConfigRequest request);

    AiTaskConfig getEnabledTask(String taskCode);

    String executeTask(String taskCode, String userPrompt);
}
