package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class ImageGenerationProviderConfigVO implements Serializable {

    private Long id;

    private String providerCode;

    private String providerName;

    private String baseUrl;

    private String generationPath;

    private String authType;

    private String apiKeyLast4;

    private Boolean hasApiKey;

    private String apiKeyMasked;

    private Integer status;

    private Integer isDefault;

    private Integer timeoutSeconds;

    private String requestSchema;

    private Date createTime;

    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
