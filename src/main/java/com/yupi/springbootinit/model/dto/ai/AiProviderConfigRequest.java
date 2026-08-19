package com.yupi.springbootinit.model.dto.ai;

import java.io.Serializable;
import lombok.Data;

@Data
public class AiProviderConfigRequest implements Serializable {
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
    private static final long serialVersionUID = 1L;
}
