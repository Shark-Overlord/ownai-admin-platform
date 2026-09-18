package com.yupi.springbootinit.mcp;

import com.yupi.springbootinit.service.UserMcpKeyService;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 注册 MCP 鉴权过滤器，仅拦截 MCP 端点路径。
 */
@Configuration
public class McpFilterConfig {

    @Bean
    public FilterRegistrationBean<McpAuthFilter> mcpAuthFilterRegistration(UserMcpKeyService userMcpKeyService) {
        FilterRegistrationBean<McpAuthFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new McpAuthFilter(userMcpKeyService));
        registration.addUrlPatterns("/sse", "/mcp/*");
        registration.setOrder(1);
        registration.setName("mcpAuthFilter");
        return registration;
    }
}
