package com.yupi.springbootinit.mcp;

import com.yupi.springbootinit.service.UserMcpKeyService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 注册 MCP 鉴权过滤器，仅拦截 MCP 端点路径。
 */
@Configuration
public class McpFilterConfig {

    @Bean
    public FilterRegistrationBean<McpAuthFilter> mcpAuthFilterRegistration(
            UserMcpKeyService userMcpKeyService,
            McpRateLimiter mcpRateLimiter,
            @Value("${ownai.mcp.allow-anonymous-preview:true}") boolean allowAnonymousPreview) {
        FilterRegistrationBean<McpAuthFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new McpAuthFilter(userMcpKeyService, mcpRateLimiter, allowAnonymousPreview));
        registration.addUrlPatterns("/sse", "/mcp/*");
        registration.setOrder(1);
        registration.setName("mcpAuthFilter");
        return registration;
    }
}
