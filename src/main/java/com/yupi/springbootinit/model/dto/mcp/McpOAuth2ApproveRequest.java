package com.yupi.springbootinit.model.dto.mcp;

import java.io.Serializable;
import lombok.Data;

/**
 * 标准 OAuth 2.0 授权确认请求（供 WorkBuddy / CodeBuddy 等云端连接器使用）
 */
@Data
public class McpOAuth2ApproveRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * OAuth 应用 Client ID
     */
    private String clientId;

    /**
     * 授权回调地址（域名需命中白名单）
     */
    private String redirectUri;

    /**
     * 防 CSRF 状态码
     */
    private String state;

    /**
     * 权限范围（可选）
     */
    private String scope;

    /**
     * PKCE Code Challenge（可选）
     */
    private String codeChallenge;

    /**
     * PKCE 摘要算法（S256 / plain，可选）
     */
    private String codeChallengeMethod;
}
