package com.yupi.springbootinit.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.mcp.McpAuthorizeRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.mcp.McpAuthCheckVO;
import com.yupi.springbootinit.model.vo.mcp.McpAuthorizeVO;
import com.yupi.springbootinit.model.vo.mcp.McpKeyCreateVO;
import com.yupi.springbootinit.service.UserMcpKeyService;
import com.yupi.springbootinit.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class McpAuthControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private UserMcpKeyService userMcpKeyService;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private McpAuthController controller;

    private User memberUser;
    private User normalUser;

    @BeforeEach
    void setUp() {
        memberUser = new User();
        memberUser.setId(10L);
        memberUser.setUserAccount("vip_user");
        memberUser.setUserName("VIP用户");
        memberUser.setMemberLevel("member");
        memberUser.setMemberPlanType("year");
        memberUser.setMemberExpireTime(new Date(System.currentTimeMillis() + 86400000L * 100));

        normalUser = new User();
        normalUser.setId(20L);
        normalUser.setUserAccount("free_user");
        normalUser.setMemberLevel("normal");
    }

    @Test
    void checkStatus_notLoggedIn_returnsNotLogin() {
        when(userService.getLoginUserPermitNull(request)).thenReturn(null);

        BaseResponse<McpAuthCheckVO> response = controller.checkStatus(request);
        assertNotNull(response);
        assertEquals(0, response.getCode());
        assertFalse(response.getData().getIsLogin());
        assertFalse(response.getData().getIsEligibleMember());
    }

    @Test
    void checkStatus_memberLoggedIn_returnsEligibleMemberInfo() {
        when(userService.getLoginUserPermitNull(request)).thenReturn(memberUser);
        when(userMcpKeyService.isEligibleMember(memberUser)).thenReturn(true);

        BaseResponse<McpAuthCheckVO> response = controller.checkStatus(request);
        assertNotNull(response);
        assertEquals(0, response.getCode());
        assertTrue(response.getData().getIsLogin());
        assertTrue(response.getData().getIsEligibleMember());
        assertEquals("vip_user", response.getData().getUserAccount());
        assertNotNull(response.getData().getRemainingDays());
    }

    @Test
    void authorize_normalUser_throwsBusinessException() {
        when(userService.getLoginUser(request)).thenReturn(normalUser);
        when(userMcpKeyService.isEligibleMember(normalUser)).thenReturn(false);

        McpAuthorizeRequest authReq = new McpAuthorizeRequest();
        authReq.setClientName("Cursor");

        assertThrows(BusinessException.class, () -> controller.authorize(authReq, request));
    }

    @Test
    void authorize_memberUser_returnsTokenAndState() {
        when(userService.getLoginUser(request)).thenReturn(memberUser);
        when(userMcpKeyService.isEligibleMember(memberUser)).thenReturn(true);

        McpKeyCreateVO keyVO = new McpKeyCreateVO();
        keyVO.setId(101L);
        keyVO.setPlainKey("omk_test_secret_token_123");
        when(userMcpKeyService.generateKey(eq("Cursor"), eq(memberUser))).thenReturn(keyVO);

        McpAuthorizeRequest authReq = new McpAuthorizeRequest();
        authReq.setClientName("Cursor");
        authReq.setState("random_state_xyz");

        BaseResponse<McpAuthorizeVO> response = controller.authorize(authReq, request);
        assertNotNull(response);
        assertEquals(0, response.getCode());
        assertEquals("omk_test_secret_token_123", response.getData().getToken());
        assertEquals("random_state_xyz", response.getData().getState());
        assertEquals(101L, response.getData().getKeyId());
    }
}
