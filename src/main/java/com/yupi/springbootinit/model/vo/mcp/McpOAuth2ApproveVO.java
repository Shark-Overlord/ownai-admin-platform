package com.yupi.springbootinit.model.vo.mcp;

import java.io.Serializable;
import lombok.Data;

/**
 * 标准 OAuth 2.0 授权码签发响应
 */
@Data
public class McpOAuth2ApproveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 一次性授权码（5 分钟有效）
     */
    private String code;

    /**
     * 原样透传的 state
     */
    private String state;

    /**
     * 完整回调重定向 URL
     */
    private String redirectUrl;
}
