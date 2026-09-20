package com.yupi.springbootinit.mcp;

import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

/**
 * Spring AI MCP Server 工具自动注册配置
 */
@Configuration
public class McpServerConfig {

    @Bean
    public List<ToolCallback> ownAiDesignToolCallbacks(OwnAiDesignTools ownAiDesignTools) {
        return Arrays.asList(ToolCallbacks.from(ownAiDesignTools));
    }
}
