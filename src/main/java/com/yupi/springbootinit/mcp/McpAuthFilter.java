package com.yupi.springbootinit.mcp;

import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.UserMcpKeyService;
import com.yupi.springbootinit.utils.NetUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * MCP 端点鉴权过滤器。
 * 拦截 /sse 和 /mcp/message 路径，从 Authorization 或 X-MCP-Key 头提取 API Key，
 * 校验 Key 有效性和用户会员状态，通过后将 User 存入 McpUserContext。
 */
@Slf4j
public class McpAuthFilter extends OncePerRequestFilter {

    private final UserMcpKeyService userMcpKeyService;

    public McpAuthFilter(UserMcpKeyService userMcpKeyService) {
        this.userMcpKeyService = userMcpKeyService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // 仅拦截 MCP 端点
        if (!isMcpEndpoint(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String apiKey = extractApiKey(request);
        if (StringUtils.isBlank(apiKey)) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Missing MCP API Key. Provide via 'Authorization: Bearer omk_xxx' or 'X-MCP-Key' header.");
            return;
        }

        String clientIp = NetUtils.getIpAddress(request);
        User user = userMcpKeyService.validateKey(apiKey, clientIp);
        if (user == null) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Invalid or expired MCP API Key, or membership has expired.");
            return;
        }

        McpUserContext.set(user);
        try {
            // 针对 SSE / 流式端点，告知反向代理（如 Nginx）立即禁用响应缓冲，实现首包毫秒级直达
            response.setHeader("X-Accel-Buffering", "no");
            response.setHeader("Cache-Control", "no-cache, no-transform");
            filterChain.doFilter(request, response);
        } finally {
            McpUserContext.clear();
        }
    }

    private boolean isMcpEndpoint(String path) {
        if (path == null) {
            return false;
        }
        // 排除 Web 端的 Key 管理和 OAuth 授权 REST 接口（走 JWT 鉴权）
        if (path.contains("/mcp/oauth") || path.contains("/mcp/key")) {
            return false;
        }
        return "/sse".equals(path)
                || "/api/sse".equals(path)
                || path.endsWith("/sse")
                || path.contains("/mcp/message")
                || "/mcp".equals(path)
                || "/api/mcp".equals(path);
    }

    private String extractApiKey(HttpServletRequest request) {
        // 优先 Authorization: Bearer xxx
        String auth = request.getHeader("Authorization");
        if (StringUtils.isNotBlank(auth) && auth.startsWith("Bearer ")) {
            String token = auth.substring(7).trim();
            // 只处理 MCP Key（omk_ 前缀），避免拦截 JWT Token
            if (token.startsWith("omk_")) {
                return token;
            }
        }
        // 其次 X-MCP-Key 头
        String mcpKey = request.getHeader("X-MCP-Key");
        if (StringUtils.isNotBlank(mcpKey)) {
            return mcpKey.trim();
        }
        return null;
    }

    private void sendError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"error\": \"" + message + "\"}");
        response.getWriter().flush();
    }
}
