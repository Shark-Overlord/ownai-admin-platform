package com.yupi.springbootinit.model.dto.imagegeneration;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageGenerationProviderConfigRequest implements Serializable {

    private Long id;

    private String providerCode;

    private String providerName;

    private String baseUrl;

    private String generationPath;

    private String authType;

    private String apiKey;

    private Integer status;

    private Integer isDefault;

    private Integer timeoutSeconds;

    private String requestSchema;

    private static final long serialVersionUID = 1L;
}
