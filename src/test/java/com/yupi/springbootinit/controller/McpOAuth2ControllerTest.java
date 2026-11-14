package com.yupi.springbootinit.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.model.dto.mcp.McpOAuth2ApproveRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.mcp.McpKeyCreateVO;
import com.yupi.springbootinit.model.vo.mcp.McpKeyVO;
import com.yupi.springbootinit.model.vo.mcp.McpOAuth2ApproveVO;
import com.yupi.springbootinit.service.UserMcpKeyService;
import com.yupi.springbootinit.service.UserService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class McpOAuth2ControllerTest {

    private UserService userService;
    private UserMcpKeyService userMcpKeyService;
    private McpOAuth2Controller controller;
    private User memberUser;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        userMcpKeyService = mock(UserMcpKeyService.class);
        controller = new McpOAuth2Controller(userService, userMcpKeyService);
        controller.setConfiguredClientId("ownai-workbuddy-client");
        controller.setConfiguredClientSecret("test_super_secret_key_2026");
        controller.setWebBaseUrl("https://ownai.icu");

        memberUser = new User();
        memberUser.setId(42L);
        memberUser.setMemberLevel("pro");
    }

    @Test
    void isAllowedRedirectUri_matchesAllFiveOfficialWorkBuddyWhitelistPatterns() {
        assertTrue(McpOAuth2Controller.isAllowedRedirectUri("https://oauth.workbuddy.cn/callback"));
        assertTrue(McpOAuth2Controller.isAllowedRedirectUri("https://a.b.c.workbuddy.cn/api/oauth/cb"));
        assertTrue(McpOAuth2Controller.isAllowedRedirectUri("https://open.codebuddy.cn/oauth2/callback"));
        assertTrue(McpOAuth2Controller.isAllowedRedirectUri("https://us.auth.workbuddy.ai/cb"));
        assertTrue(McpOAuth2Controller.isAllowedRedirectUri("https://copilot.tencent.com/oauth/callback"));
        assertTrue(McpOAuth2Controller.isAllowedRedirectUri("https://staging-codebuddy.tencent.com/oauth/callback"));
        assertTrue(McpOAuth2Controller.isAllowedRedirectUri("http://127.0.0.1:54321/callback"));

        // Reject non-HTTPS, root domain without subdomain, suffix spoofing, and arbitrary hosts
        assertFalse(McpOAuth2Controller.isAllowedRedirectUri("http://oauth.workbuddy.cn/callback"));
        assertFalse(McpOAuth2Controller.isAllowedRedirectUri("https://workbuddy.cn/callback"));
        assertFalse(McpOAuth2Controller.isAllowedRedirectUri("https://evilworkbuddy.cn/callback"));
        assertFalse(McpOAuth2Controller.isAllowedRedirectUri("https://attacker.example.com/callback"));
    }

    @Test
    void authorizeRedirect_validParams_redirectsToFrontendConsentWithPkce() throws Exception {
        MockHttpServletResponse resp = new MockHttpServletResponse();
        controller.authorizeRedirect(
                "code",
                "ownai-workbuddy-client",
                "https://auth.workbuddy.cn/oauth/cb",
                "xyz123",
                "mcp:design",
                "challenge_abc",
                "S256",
                resp
        );

        assertEquals(302, resp.getStatus());
        String redirected = resp.getRedirectedUrl();
        assertNotNull(redirected);
        assertTrue(redirected.startsWith("https://ownai.icu/mcp/auth?oauth2=1&client=WorkBuddy"));
        assertTrue(redirected.contains("state=xyz123"));
        assertTrue(redirected.contains("code_challenge=challenge_abc"));
    }

    @Test
    void fullAuthorizationCodePkceAndRefreshFlow_rotatesSingleSlotAndHonorsRevocation() throws Exception {
        String verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        String challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(
                MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));

        MockHttpServletRequest approveHttpReq = new MockHttpServletRequest();
        when(userService.getLoginUser(approveHttpReq)).thenReturn(memberUser);
        when(userService.getById(42L)).thenReturn(memberUser);
        when(userMcpKeyService.isEligibleMember(memberUser)).thenReturn(true);

        McpOAuth2ApproveRequest approveReq = new McpOAuth2ApproveRequest();
        approveReq.setClientId("ownai-workbuddy-client");
        approveReq.setRedirectUri("https://cloud.workbuddy.cn/cb");
        approveReq.setState("st_99");
        approveReq.setCodeChallenge(challenge);
        approveReq.setCodeChallengeMethod("S256");

        BaseResponse<McpOAuth2ApproveVO> approveRes = controller.approve(approveReq, approveHttpReq);
        assertEquals(0, approveRes.getCode());
        String authCode = approveRes.getData().getCode();
        assertTrue(approveRes.getData().getRedirectUrl().contains("code=" + authCode));
        assertTrue(approveRes.getData().getRedirectUrl().contains("state=st_99"));

        // Exchange authorization_code -> access_token + refresh_token
        McpKeyCreateVO created1 = new McpKeyCreateVO();
        created1.setId(501L);
        created1.setPlainKey("omk_first_issued_token");
        when(userMcpKeyService.listMyKeys(memberUser)).thenReturn(Collections.emptyList());
        when(userMcpKeyService.generateKey("WorkBuddy Connector", memberUser)).thenReturn(created1);

        String formBody = "grant_type=authorization_code"
                + "&client_id=ownai-workbuddy-client"
                + "&client_secret=test_super_secret_key_2026"
                + "&code=" + authCode
                + "&redirect_uri=https%3A%2F%2Fcloud.workbuddy.cn%2Fcb"
                + "&code_verifier=" + verifier;

        ResponseEntity<Map<String, Object>> tokenRes = controller.token(formBody, new MockHttpServletRequest());
        assertEquals(HttpStatus.OK, tokenRes.getStatusCode());
        assertEquals("omk_first_issued_token", tokenRes.getBody().get("access_token"));
        String refreshToken = (String) tokenRes.getBody().get("refresh_token");
        assertNotNull(refreshToken);

        // Refresh token rotates existing "WorkBuddy Connector" key slot
        McpKeyVO activeVo = new McpKeyVO();
        activeVo.setId(501L);
        activeVo.setKeyName("WorkBuddy Connector");
        when(userMcpKeyService.listMyKeys(memberUser)).thenReturn(List.of(activeVo));

        McpKeyCreateVO created2 = new McpKeyCreateVO();
        created2.setId(502L);
        created2.setPlainKey("omk_rotated_second_token");
        when(userMcpKeyService.generateKey("WorkBuddy Connector", memberUser)).thenReturn(created2);

        String refreshBody = "grant_type=refresh_token"
                + "&client_id=ownai-workbuddy-client"
                + "&client_secret=test_super_secret_key_2026"
                + "&refresh_token=" + refreshToken;

        ResponseEntity<Map<String, Object>> refreshedRes = controller.token(refreshBody, new MockHttpServletRequest());
        assertEquals(HttpStatus.OK, refreshedRes.getStatusCode());
        assertEquals("omk_rotated_second_token", refreshedRes.getBody().get("access_token"));
        verify(userMcpKeyService).revokeKey(eq(501L), eq(memberUser));

        // Simulate user revoking key 502 in Profile center -> refresh must fail
        String secondRefreshToken = (String) refreshedRes.getBody().get("refresh_token");
        when(userMcpKeyService.listMyKeys(memberUser)).thenReturn(Collections.emptyList());

        String revokedRefreshBody = "grant_type=refresh_token"
                + "&client_id=ownai-workbuddy-client"
                + "&client_secret=test_super_secret_key_2026"
                + "&refresh_token=" + secondRefreshToken;

        ResponseEntity<Map<String, Object>> rejectedRes = controller.token(revokedRefreshBody, new MockHttpServletRequest());
        assertEquals(HttpStatus.BAD_REQUEST, rejectedRes.getStatusCode());
        assertEquals("invalid_grant", rejectedRes.getBody().get("error"));
    }
}
