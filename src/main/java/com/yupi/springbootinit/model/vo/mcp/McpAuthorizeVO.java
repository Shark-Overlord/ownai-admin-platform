package com.yupi.springbootinit.model.vo.mcp;

import java.io.Serializable;
import lombok.Data;

/**
 * MCP 网页一键授权成功返回 VO
 */
@Data
public class McpAuthorizeVO implements Serializable {

    /**
     * 授权凭证 Token (omk_xxx)
     */
    private String token;

    /**
     * 关联的 Key ID
     */
    private Long keyId;

    /**
     * 原样返回的状态参数
     */
    private String state;

    private static final long serialVersionUID = 1L;
}
