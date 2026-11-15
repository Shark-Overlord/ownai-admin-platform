package com.yupi.springbootinit.mcp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.UserMcpKeyService;
import com.yupi.springbootinit.utils.NetUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.util.StreamUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * MCP 端点鉴权与协议流控过滤器。
 * 拦截 /sse、/mcp/message 及 /mcp/free/* 路径：
 * 1. 提取并校验 Authorization / X-MCP-Key 凭证，通过 Reactor Hook 跨线程透传 User 上下文；
 * 2. 区分 MCP 协议控制帧（SSE 建连、initialize、notifications/*、tools/list、ping）与实际 tools/call，
 *    仅对真实业务请求计入多级流控配额，彻底消除并发沙箱评测握手误触发 429；
 * 3. 防御 mcp-0.10.0 SDK 在收到 id=null 的 JSONRPCResponse 时触发 NullPointerException 的已知缺陷。
 */
@Slf4j
public class McpAuthFilter extends OncePerRequestFilter {

    private static final int MAX_INSPECTABLE_BODY_BYTES = 131_072;

    private static final Set<String> PROTOCOL_CONTROL_METHODS = Set.of(
            "initialize",
            "notifications/initialized",
            "notifications/cancelled",
            "notifications/roots/list_changed",
            "ping",
            "tools/list",
            "prompts/list",
            "resources/list",
            "resources/templates/list"
    );

    private final UserMcpKeyService userMcpKeyService;
    private final McpRateLimiter mcpRateLimiter;
    private final boolean allowAnonymousPreview;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public McpAuthFilter(UserMcpKeyService userMcpKeyService, McpRateLimiter mcpRateLimiter) {
        this(userMcpKeyService, mcpRateLimiter, true);
    }

    public McpAuthFilter(UserMcpKeyService userMcpKeyService, McpRateLimiter mcpRateLimiter, boolean allowAnonymousPreview) {
        McpUserContext.installReactorHook();
        this.userMcpKeyService = userMcpKeyService;
        this.mcpRateLimiter = mcpRateLimiter;
        this.allowAnonymousPreview = allowAnonymousPreview;
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

        String clientIp = NetUtils.getIpAddress(request);
        String rawCredential = extractRawCredential(request);
        boolean isFreeDedicatedEndpoint = isFreeMcpEndpoint(path);

        // 预先包装同步 JSON-RPC 消息请求，用于识别协议握手方法与拦截 SDK id=null NPE
        HttpServletRequest effectiveRequest = request;
        JsonRpcFrameInfo frameInfo = JsonRpcFrameInfo.NONE;
        if (isJsonRpcMessagePost(request, path)) {
            CachedBodyHttpServletRequest cachedRequest = new CachedBodyHttpServletRequest(request);
            effectiveRequest = cachedRequest;
            frameInfo = inspectJsonRpcFrame(cachedRequest.getCachedBody());
        }

        boolean shouldCountRateLimit = shouldApplyRateLimit(request, path, frameInfo);

        // 1. 未携带凭证（或访问免登录灵感库专属端点且未传 Key）
        if (StringUtils.isBlank(rawCredential)) {
            if (!allowAnonymousPreview && !isFreeDedicatedEndpoint) {
                sendError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "Missing MCP API Key. Provide via 'Authorization: Bearer omk_xxx' or 'X-MCP-Key' header.");
                return;
            }
            if (frameInfo.dropSilentlyForNullIdResponse()) {
                sendAcceptedEmpty(response);
                return;
            }
            if (mcpRateLimiter != null && shouldCountRateLimit) {
                McpRateLimiter.RateLimitResult anonLimit = mcpRateLimiter.checkAnonymousIpLimit(clientIp);
                if (!anonLimit.allowed()) {
                    sendRateLimitError(response, anonLimit);
                    return;
                }
            }
            McpUserContext.clear();
            try {
                applyNoBufferHeaders(response);
                invokeChainSafely(effectiveRequest, response, filterChain);
            } finally {
                McpUserContext.clear();
            }
            return;
        }

        // 2. 携带了凭证：严格校验格式与会员有效性
        if (!rawCredential.startsWith("omk_")) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Invalid MCP API Key format. Expected key starting with 'omk_'. Generate one at https://ownai.icu/mcp/auth?client=WorkBuddy");
            return;
        }

        User user = userMcpKeyService.validateKey(rawCredential, clientIp);
        if (user == null) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Invalid or expired MCP API Key, or membership has expired.");
            return;
        }

        if (frameInfo.dropSilentlyForNullIdResponse()) {
            sendAcceptedEmpty(response);
            return;
        }

        // 3. 多级流控校验（仅统计真实业务调用，握手与 tools/list 豁免）
        if (mcpRateLimiter != null && shouldCountRateLimit) {
            McpRateLimiter.RateLimitResult rateLimitResult = mcpRateLimiter.checkLimit(user.getId());
            if (!rateLimitResult.allowed()) {
                sendRateLimitError(response, rateLimitResult);
                return;
            }
        }

        McpUserContext.set(user);
        try {
            applyNoBufferHeaders(response);
            invokeChainSafely(effectiveRequest, response, filterChain);
        } finally {
            McpUserContext.clear();
        }
    }

    private void invokeChainSafely(HttpServletRequest request,
                                   HttpServletResponse response,
                                   FilterChain filterChain) throws IOException, ServletException {
        try {
            filterChain.doFilter(request, response);
        } catch (NullPointerException npe) {
            // 防御 mcp-spring-webmvc-0.10.0 handleMessage(line 329) new McpError(null) 二次空指针崩溃
            log.warn("Intercepted MCP transport NullPointerException on path={}: {}",
                    request.getRequestURI(), npe.getMessage());
            if (!response.isCommitted()) {
                sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                        "Malformed or out-of-order MCP JSON-RPC message.");
            }
        }
    }

    private void applyNoBufferHeaders(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache, no-transform");
    }

    private boolean isMcpEndpoint(String path) {
        if (path == null) {
            return false;
        }
        // 排除 Web 端的 Key 管理和 OAuth 授权 REST 接口（走 JWT / OAuth2 自身鉴权）
        if (path.contains("/mcp/oauth") || path.contains("/mcp/key")) {
            return false;
        }
        return "/sse".equals(path)
                || "/api/sse".equals(path)
                || path.endsWith("/sse")
                || path.contains("/mcp/message")
                || path.contains("/mcp/free/")
                || "/mcp".equals(path)
                || "/api/mcp".equals(path);
    }

    private boolean isFreeMcpEndpoint(String path) {
        return path != null && path.contains("/mcp/free/");
    }

    private boolean isJsonRpcMessagePost(HttpServletRequest request, String path) {
        if (path == null || !"POST".equalsIgnoreCase(request.getMethod())) {
            return false;
        }
        int contentLength = request.getContentLength();
        if (contentLength > MAX_INSPECTABLE_BODY_BYTES) {
            return false;
        }
        return path.contains("/message");
    }

    private boolean shouldApplyRateLimit(HttpServletRequest request, String path, JsonRpcFrameInfo frameInfo) {
        // SSE 长连接握手本身不消耗调用配额
        if ("GET".equalsIgnoreCase(request.getMethod()) && path != null && path.endsWith("/sse")) {
            return false;
        }
        // MCP 协议初始化与能力发现帧不消耗调用配额
        if (frameInfo.method() != null && PROTOCOL_CONTROL_METHODS.contains(frameInfo.method())) {
            return false;
        }
        return true;
    }

    private JsonRpcFrameInfo inspectJsonRpcFrame(byte[] bodyBytes) {
        if (bodyBytes == null || bodyBytes.length == 0) {
            return JsonRpcFrameInfo.NONE;
        }
        String text = new String(bodyBytes, StandardCharsets.UTF_8).trim();
        if (text.isEmpty()) {
            return JsonRpcFrameInfo.NONE;
        }
        if ("null".equals(text)) {
            return new JsonRpcFrameInfo(null, true);
        }
        try {
            JsonNode root = objectMapper.readTree(text);
            if (root == null || root.isNull()) {
                return new JsonRpcFrameInfo(null, true);
            }
            if (root.isObject()) {
                String method = root.hasNonNull("method") ? root.get("method").asText() : null;
                boolean isResponseWithoutMethod = method == null && (root.has("result") || root.has("error"));
                boolean hasNullId = !root.hasNonNull("id");
                if (isResponseWithoutMethod && hasNullId) {
                    return new JsonRpcFrameInfo(null, true);
                }
                return new JsonRpcFrameInfo(method, false);
            }
        } catch (Exception ignored) {
            // 非标准 JSON 交由下游 MCP Transport 返回标准 400 Invalid message format
        }
        return JsonRpcFrameInfo.NONE;
    }

    private String extractRawCredential(HttpServletRequest request) {
        String mcpKey = request.getHeader("X-MCP-Key");
        if (StringUtils.isNotBlank(mcpKey)) {
            return mcpKey.trim();
        }
        String auth = request.getHeader("Authorization");
        if (StringUtils.isNotBlank(auth)) {
            String trimmed = auth.trim();
            if (trimmed.regionMatches(true, 0, "Bearer ", 0, 7)) {
                return trimmed.substring(7).trim();
            }
            return trimmed;
        }
        return null;
    }

    private void sendAcceptedEmpty(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{}");
        response.getWriter().flush();
    }

    private void sendError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"error\": \"" + message + "\"}");
        response.getWriter().flush();
    }

    private void sendRateLimitError(HttpServletResponse response, McpRateLimiter.RateLimitResult result) throws IOException {
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(result.retryAfterSeconds()));
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\": 42900, \"message\": \"" + result.message() + "\", \"error\": \"" + result.message() + "\"}");
        response.getWriter().flush();
    }

    private record JsonRpcFrameInfo(String method, boolean dropSilentlyForNullIdResponse) {
        static final JsonRpcFrameInfo NONE = new JsonRpcFrameInfo(null, false);
    }

    private static final class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {
        private final byte[] cachedBody;

        CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
            super(request);
            byte[] bytes = StreamUtils.copyToByteArray(request.getInputStream());
            this.cachedBody = bytes != null ? bytes : new byte[0];
        }

        byte[] getCachedBody() {
            return this.cachedBody;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream bais = new ByteArrayInputStream(this.cachedBody);
            return new ServletInputStream() {
                @Override
                public boolean isFinished() {
                    return bais.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener listener) {
                    // Synchronous cached buffer
                }

                @Override
                public int read() {
                    return bais.read();
                }

                @Override
                public int read(byte[] b, int off, int len) {
                    return bais.read(b, off, len);
                }
            };
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
