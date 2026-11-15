package com.yupi.springbootinit.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.transport.WebMvcSseServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema;
import jakarta.annotation.PreDestroy;
import java.util.Arrays;
import java.util.List;
import org.springframework.ai.mcp.McpToolUtils;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

/**
 * Spring AI MCP Server 工具自动注册配置：
 * 1. 主端点 (/sse + /mcp/message)：挂载全量 8 个设计解构与个人收藏工具（OwnAiDesignTools）；
 * 2. 免登录灵感库独立端点 (/mcp/free/sse + /mcp/free/message)：仅挂载 4 个 100% 免费完整工具（OwnAiFreeDesignTools），
 *    注意不将内部 WebMvcSseServerTransportProvider / McpSyncServer 暴露为顶层 Bean，避免干扰 Spring AI 主服务自动装配。
 */
@Configuration
public class McpServerConfig {

    private McpSyncServer freeMcpSyncServer;

    public McpServerConfig() {
        McpUserContext.installReactorHook();
    }

    @Bean
    public List<ToolCallback> ownAiDesignToolCallbacks(OwnAiDesignTools ownAiDesignTools) {
        return Arrays.asList(ToolCallbacks.from(ownAiDesignTools));
    }

    @Bean
    public RouterFunction<ServerResponse> ownAiFreeMcpRouterFunction(
            OwnAiFreeDesignTools ownAiFreeDesignTools,
            @Value("${spring.ai.mcp.server.base-url:/api}") String baseUrl) {
        ObjectMapper mapper = new ObjectMapper();
        WebMvcSseServerTransportProvider freeTransport = new WebMvcSseServerTransportProvider(
                mapper,
                baseUrl,
                "/mcp/free/message",
                "/mcp/free/sse"
        );
        List<ToolCallback> freeCallbacks = Arrays.asList(ToolCallbacks.from(ownAiFreeDesignTools));
        List<McpServerFeatures.SyncToolSpecification> freeSpecs = McpToolUtils.toSyncToolSpecification(freeCallbacks);

        this.freeMcpSyncServer = McpServer.sync(freeTransport)
                .serverInfo("ownai-design-free", "1.0.1")
                .capabilities(McpSchema.ServerCapabilities.builder().tools(true).build())
                .tools(freeSpecs)
                .objectMapper(mapper)
                .build();

        return freeTransport.getRouterFunction();
    }

    @PreDestroy
    public void closeFreeMcpServer() {
        if (this.freeMcpSyncServer != null) {
            this.freeMcpSyncServer.closeGracefully();
        }
    }
}
