package com.yupi.springbootinit.model.vo.ai;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class AiProviderConfigVO implements Serializable {
    private Long id;
    private String providerCode;
    private String providerName;
    private String baseUrl;
    private String chatPath;
    private String modelCode;
    private String authType;
    private String apiKeyLast4;
    private Boolean hasApiKey;
    private Boolean apiKeyUsable;
    private String apiKeyMasked;
    private Integer status;
    private Integer timeoutSeconds;
    private Date createTime;
    private Date updateTime;
    private static final long serialVersionUID = 1L;
}
