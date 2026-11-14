package com.yupi.springbootinit.mcp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.UserMcpKeyService;
import jakarta.servlet.FilterChain;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

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
    void anonymousSseRequest_whenPreviewDisabled_returns401() throws Exception {
        UserMcpKeyService keyService = mock(UserMcpKeyService.class);
        McpAuthFilter filter = new McpAuthFilter(keyService, new McpRateLimiter(), false);

        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/sse");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(req, resp, chain);

        assertEquals(401, resp.getStatus());
        verify(chain, never()).doFilter(req, resp);
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
    void validMemberToken_setsUserContextDuringChainAndClearsAfter() throws Exception {
        UserMcpKeyService keyService = mock(UserMcpKeyService.class);
        User member = new User();
        member.setId(88L);
        when(keyService.validateKey(eq("omk_valid_123"), anyString())).thenReturn(member);

        McpAuthFilter filter = new McpAuthFilter(keyService, new McpRateLimiter(), true);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/mcp/message");
        req.addHeader("Authorization", "Bearer omk_valid_123");
        MockHttpServletResponse resp = new MockHttpServletResponse();

        AtomicReference<Long> seenUserId = new AtomicReference<>();
        FilterChain chain = (r, s) -> seenUserId.set(McpUserContext.getUserId());

        filter.doFilter(req, resp, chain);

        assertEquals(200, resp.getStatus());
        assertEquals(88L, seenUserId.get());
        assertNull(McpUserContext.get());
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
