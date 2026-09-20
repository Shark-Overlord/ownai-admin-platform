package com.yupi.springbootinit.model.vo.mcp;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

/**
 * MCP Key 列表展示 VO（不含明文）
 */
@Data
public class McpKeyVO implements Serializable {

    private Long id;

    private String keyName;

    /**
     * 前缀用于展示识别，如 omk_Ab3x...
     */
    private String keyPrefix;

    private Integer status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date lastUsedTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date createTime;

    private static final long serialVersionUID = 1L;
}
