package com.yupi.springbootinit.mcp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.UserMcpKeyService;
import jakarta.servlet.FilterChain;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

class McpAuthFilterTest {

    @AfterEach
    void tearDown() {
        McpUserContext.clear();
    }

    @Test
    void anonymousSseRequest_whenPreviewEnabled_passesWithClearedContext() throws Exception {
        UserMcpKeyService keyService = mock(UserMcpKeyService.class);
        McpRateLimiter rateLimiter = new McpRateLimiter();
        McpAuthFilter filter = new McpAuthFilter(keyService, rateLimiter, true);

        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/sse");
        req.setRemoteAddr("203.0.113.10");
        MockHttpServletResponse resp = new MockHttpServletResponse();

        AtomicReference<User> observedUser = new AtomicReference<>(new User());
        FilterChain chain = (r, s) -> observedUser.set(McpUserContext.get());

        filter.doFilter(req, resp, chain);

        assertEquals(200, resp.getStatus());
        assertEquals("no", resp.getHeader("X-Accel-Buffering"));
        assertNull(observedUser.get());
        verify(keyService, never()).validateKey(anyString(), anyString());
    }

    @Test
    void anonymousSseRequest_whenPreviewDisabled_returns401_butFreeEndpointStillPasses() throws Exception {
        UserMcpKeyService keyService = mock(UserMcpKeyService.class);
        McpAuthFilter filter = new McpAuthFilter(keyService, new McpRateLimiter(), false);

        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/sse");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, resp, chain);

        assertEquals(401, resp.getStatus());
        verify(chain, never()).doFilter(req, resp);

        MockHttpServletRequest freeReq = new MockHttpServletRequest("GET", "/api/mcp/free/sse");
        MockHttpServletResponse freeResp = new MockHttpServletResponse();
        AtomicReference<Boolean> freePassed = new AtomicReference<>(false);
        filter.doFilter(freeReq, freeResp, (r, s) -> freePassed.set(true));
        assertTrue(freePassed.get());
        assertEquals(200, freeResp.getStatus());
    }

    @Test
    void invalidOrExpiredToken_evenWhenPreviewEnabled_returns401() throws Exception {
        UserMcpKeyService keyService = mock(UserMcpKeyService.class);
        when(keyService.validateKey(eq("omk_expired_token"), anyString())).thenReturn(null);
        McpAuthFilter filter = new McpAuthFilter(keyService, new McpRateLimiter(), true);

        MockHttpServletRequest badPrefixReq = new MockHttpServletRequest("GET", "/api/sse");
        badPrefixReq.addHeader("Authorization", "Bearer invalid_prefix");
        MockHttpServletResponse badPrefixResp = new MockHttpServletResponse();
        filter.doFilter(badPrefixReq, badPrefixResp, mock(FilterChain.class));
        assertEquals(401, badPrefixResp.getStatus());

        MockHttpServletRequest expiredReq = new MockHttpServletRequest("POST", "/api/mcp/message");
        expiredReq.addHeader("Authorization", "Bearer omk_expired_token");
        MockHttpServletResponse expiredResp = new MockHttpServletResponse();
        filter.doFilter(expiredReq, expiredResp, mock(FilterChain.class));
        assertEquals(401, expiredResp.getStatus());
    }

    @Test
    void validMemberToken_propagatesUserContextAcrossBoundedElasticThreadAndClearsAfter() throws Exception {
        UserMcpKeyService keyService = mock(UserMcpKeyService.class);
        User member = new User();
        member.setId(88L);
        when(keyService.validateKey(eq("omk_valid_123"), anyString())).thenReturn(member);

        McpAuthFilter filter = new McpAuthFilter(keyService, new McpRateLimiter(), true);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/mcp/message");
        req.addHeader("Authorization", "Bearer omk_valid_123");
        req.setContent("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{}}".getBytes(StandardCharsets.UTF_8));
        MockHttpServletResponse resp = new MockHttpServletResponse();

        AtomicReference<Long> seenOnElasticThread = new AtomicReference<>();
        FilterChain chain = (r, s) -> {
            Long uid = Mono.fromCallable(McpUserContext::getUserId)
                    .subscribeOn(Schedulers.boundedElastic())
                    .block();
            seenOnElasticThread.set(uid);
        };

        filter.doFilter(req, resp, chain);

        assertEquals(200, resp.getStatus());
        assertEquals(88L, seenOnElasticThread.get());
        assertNull(McpUserContext.get());
    }

    @Test
    void protocolHandshakeFrames_doNotConsumeBurstQuota_andNullIdErrorResponseIsSafelyAbsorbed() throws Exception {
        UserMcpKeyService keyService = mock(UserMcpKeyService.class);
        User member = new User();
        member.setId(99L);
        when(keyService.validateKey(eq("omk_valid_99"), anyString())).thenReturn(member);

        // 极限配置：每秒仅允许 1 次业务调用
        McpRateLimiter strictLimiter = new McpRateLimiter(1, 10, 100);
        McpAuthFilter filter = new McpAuthFilter(keyService, strictLimiter, true);

        // 连续发起 SSE + initialize + notifications/initialized + tools/list 均不应消耗该 1 次配额
        String[] controlBodies = {
                "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{}}",
                "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\"}",
                "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\"}"
        };
        for (String body : controlBodies) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/mcp/message");
            req.addHeader("Authorization", "Bearer omk_valid_99");
            req.setContent(body.getBytes(StandardCharsets.UTF_8));
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(req, resp, (r, s) -> {});
            assertEquals(200, resp.getStatus());
        }

        // 发送会导致 mcp-0.10.0 NPE 的 id=null 错误响应，过滤器应安全拦截返回 200 且不进下游链
        MockHttpServletRequest nullIdRespReq = new MockHttpServletRequest("POST", "/api/mcp/message");
        nullIdRespReq.addHeader("Authorization", "Bearer omk_valid_99");
        nullIdRespReq.setContent("{\"jsonrpc\":\"2.0\",\"id\":null,\"error\":{\"code\":-32600,\"message\":\"bad\"}}"
                .getBytes(StandardCharsets.UTF_8));
        MockHttpServletResponse nullIdResp = new MockHttpServletResponse();
        FilterChain neverCalled = mock(FilterChain.class);
        filter.doFilter(nullIdRespReq, nullIdResp, neverCalled);
        assertEquals(200, nullIdResp.getStatus());
        verify(neverCalled, never()).doFilter(any(), any());

        // 紧接着发起第 1 次真实 tools/call 仍应成功通过（200）
        MockHttpServletRequest toolCall1 = new MockHttpServletRequest("POST", "/api/mcp/message");
        toolCall1.addHeader("Authorization", "Bearer omk_valid_99");
        toolCall1.setContent("{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"find_motion_presets\"}}"
                .getBytes(StandardCharsets.UTF_8));
        MockHttpServletResponse toolResp1 = new MockHttpServletResponse();
        filter.doFilter(toolCall1, toolResp1, (r, s) -> {});
        assertEquals(200, toolResp1.getStatus());

        // 同一秒第 2 次真实 tools/call 触发限流（429）
        MockHttpServletRequest toolCall2 = new MockHttpServletRequest("POST", "/api/mcp/message");
        toolCall2.addHeader("Authorization", "Bearer omk_valid_99");
        toolCall2.setContent("{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"find_motion_presets\"}}"
                .getBytes(StandardCharsets.UTF_8));
        MockHttpServletResponse toolResp2 = new MockHttpServletResponse();
        filter.doFilter(toolCall2, toolResp2, (r, s) -> {});
        assertEquals(429, toolResp2.getStatus());
    }

    @Test
    void oauth2Endpoints_bypassMcpFilter() throws Exception {
        UserMcpKeyService keyService = mock(UserMcpKeyService.class);
        McpAuthFilter filter = new McpAuthFilter(keyService, new McpRateLimiter(), false);

        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/mcp/oauth2/token");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        AtomicReference<Boolean> passed = new AtomicReference<>(false);

        filter.doFilter(req, resp, (r, s) -> passed.set(true));

        assertTrue(passed.get());
        assertEquals(200, resp.getStatus());
    }
}
