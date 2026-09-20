package com.yupi.springbootinit.model.dto.mcp;

import java.io.Serializable;
import lombok.Data;

@Data
public class McpKeyGenerateRequest implements Serializable {

    /**
     * Key 名称，如 "My Cursor Key"
     */
    private String keyName;

    private static final long serialVersionUID = 1L;
}
