package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.UserMcpKeyMapper;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.UserMcpKey;
import com.yupi.springbootinit.model.vo.mcp.McpKeyCreateVO;
import com.yupi.springbootinit.model.vo.mcp.McpKeyVO;
import com.yupi.springbootinit.service.impl.UserMcpKeyServiceImpl;
import java.util.Collections;
import java.util.Date;
import java.util.List;
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
class UserMcpKeyServiceImplTest {

    @Mock
    private UserMcpKeyMapper userMcpKeyMapper;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserMcpKeyServiceImpl userMcpKeyService;

    private User normalUser;
    private User monthMemberUser;
    private User lifetimeMemberUser;
    private User expiredMemberUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        org.springframework.test.util.ReflectionTestUtils.setField(userMcpKeyService, "baseMapper", userMcpKeyMapper);

        normalUser = new User();
        normalUser.setId(1L);
        normalUser.setUserRole("user");
        normalUser.setMemberLevel("normal");

        monthMemberUser = new User();
        monthMemberUser.setId(2L);
        monthMemberUser.setUserRole("user");
        monthMemberUser.setMemberLevel("member");
        monthMemberUser.setMemberPlanType("month");
        monthMemberUser.setMemberExpireTime(new Date(System.currentTimeMillis() + 86400000L * 30));

        lifetimeMemberUser = new User();
        lifetimeMemberUser.setId(3L);
        lifetimeMemberUser.setUserRole("user");
        lifetimeMemberUser.setMemberLevel("member");
        lifetimeMemberUser.setMemberPlanType("lifetime");
        lifetimeMemberUser.setMemberExpireTime(null);

        expiredMemberUser = new User();
        expiredMemberUser.setId(4L);
        expiredMemberUser.setUserRole("user");
        expiredMemberUser.setMemberLevel("member");
        expiredMemberUser.setMemberPlanType("month");
        expiredMemberUser.setMemberExpireTime(new Date(System.currentTimeMillis() - 86400000L));

        adminUser = new User();
        adminUser.setId(5L);
        adminUser.setUserRole("admin");
        when(userService.isAdmin(adminUser)).thenReturn(true);
    }

    @Test
    void isEligibleMember_normalUser_returnsFalse() {
        assertFalse(userMcpKeyService.isEligibleMember(normalUser));
    }

    @Test
    void isEligibleMember_monthMember_returnsTrue() {
        assertTrue(userMcpKeyService.isEligibleMember(monthMemberUser));
    }

    @Test
    void isEligibleMember_lifetimeMember_returnsTrue() {
        assertTrue(userMcpKeyService.isEligibleMember(lifetimeMemberUser));
    }

    @Test
    void isEligibleMember_expiredMember_returnsFalse() {
        assertFalse(userMcpKeyService.isEligibleMember(expiredMemberUser));
    }

    @Test
    void isEligibleMember_adminUser_returnsTrue() {
        assertTrue(userMcpKeyService.isEligibleMember(adminUser));
    }

    @Test
    void generateKey_nonMember_throwsBusinessException() {
        assertThrows(BusinessException.class, () ->
                userMcpKeyService.generateKey("My Key", normalUser));
    }

    @Test
    void generateKey_expiredMember_throwsBusinessException() {
        assertThrows(BusinessException.class, () ->
                userMcpKeyService.generateKey("My Key", expiredMemberUser));
    }

    @Test
    void generateKey_validMember_generatesToken() {
        when(userMcpKeyMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(userMcpKeyMapper.insert(any(UserMcpKey.class))).thenAnswer(invocation -> {
            UserMcpKey entity = invocation.getArgument(0);
            entity.setId(100L);
            return 1;
        });
        when(userMcpKeyMapper.selectById(100L)).thenAnswer(invocation -> {
            UserMcpKey k = new UserMcpKey();
            k.setId(100L);
            k.setUserId(monthMemberUser.getId());
            k.setKeyName("Cursor Client");
            k.setKeyPrefix("omk_test123");
            k.setStatus(1);
            k.setCreateTime(new Date());
            return k;
        });

        McpKeyCreateVO result = userMcpKeyService.generateKey("Cursor Client", monthMemberUser);
        assertNotNull(result);
        assertNotNull(result.getPlainKey());
        assertTrue(result.getPlainKey().startsWith("omk_"));
    }

    @Test
    void revokeKey_notOwner_throwsBusinessException() {
        UserMcpKey existing = new UserMcpKey();
        existing.setId(10L);
        existing.setUserId(999L); // Different user
        existing.setIsDelete(0);
        when(userMcpKeyMapper.selectById(10L)).thenReturn(existing);

        assertThrows(BusinessException.class, () ->
                userMcpKeyService.revokeKey(10L, monthMemberUser));
    }

    @Test
    void validateKey_nullOrBlank_returnsNull() {
        assertNull(userMcpKeyService.validateKey(null, "127.0.0.1"));
        assertNull(userMcpKeyService.validateKey("   ", "127.0.0.1"));
    }
}
