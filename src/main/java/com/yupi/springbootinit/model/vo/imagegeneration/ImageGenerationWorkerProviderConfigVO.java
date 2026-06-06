package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageGenerationWorkerProviderConfigVO implements Serializable {

    private String providerCode;

    private String providerName;

    private String baseUrl;

    private String generationPath;

    private String editPath;

    private String authType;

    private String apiKey;

    private Integer timeoutSeconds;

    private String requestSchema;

    private static final long serialVersionUID = 1L;
}
