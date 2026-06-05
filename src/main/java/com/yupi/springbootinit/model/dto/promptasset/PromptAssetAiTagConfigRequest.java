package com.yupi.springbootinit.model.dto.promptasset;

import java.io.Serializable;
import lombok.Data;

@Data
public class PromptAssetAiTagConfigRequest implements Serializable {

    private Long id;

    private String providerCode;

    private String providerName;

    private String baseUrl;

    private String chatPath;

    private String modelCode;

    private String authType;

    private String apiKey;

    private Integer status;

    private Integer timeoutSeconds;

    private Integer maxTags;

    private String systemPrompt;

    private static final long serialVersionUID = 1L;
}
