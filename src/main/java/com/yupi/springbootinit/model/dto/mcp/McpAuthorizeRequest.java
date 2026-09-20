package com.yupi.springbootinit.model.dto.mcp;

import java.io.Serializable;
import lombok.Data;

/**
 * MCP 网页一键授权请求 DTO
 */
@Data
public class McpAuthorizeRequest implements Serializable {

    /**
     * 接入客户端名称，如 "Cursor", "Claude Desktop"
     */
    private String clientName;

    /**
     * 状态参数（防 CSRF / 回传给本地桥接客户端）
     */
    private String state;

    private static final long serialVersionUID = 1L;
}
