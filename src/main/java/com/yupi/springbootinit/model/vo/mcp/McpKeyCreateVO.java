package com.yupi.springbootinit.model.vo.mcp;

import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * MCP Key 创建结果 VO（含明文 Key，仅在创建时返回一次）
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class McpKeyCreateVO extends McpKeyVO implements Serializable {

    /**
     * 明文 Key，仅在创建时展示一次
     */
    private String plainKey;

    private static final long serialVersionUID = 1L;
}
