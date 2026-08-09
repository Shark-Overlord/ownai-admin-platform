package com.yupi.springbootinit.service;

import com.yupi.springbootinit.mapper.UserMapper;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.service.impl.MemberServiceImpl;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemberServiceImplMembershipTest {

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private MemberServiceImpl memberService;

    @Test
    void shouldRenewActiveMonthlyMembershipFromCurrentExpiration() {
        assertRenewal("month", 30);
    }

    @Test
    void shouldRenewActiveYearlyMembershipFromCurrentExpiration() {
        assertRenewal("year", 365);
    }

    private void assertRenewal(String planType, int durationDays) {
        long userId = 100L;
        LocalDateTime currentExpiration = LocalDateTime.now().plusDays(10).withNano(0);
        Date currentExpirationDate = Date.from(currentExpiration.atZone(ZoneId.systemDefault()).toInstant());
        User user = new User();
        user.setId(userId);
        user.setMemberLevel(MemberLevelEnum.MEMBER.getValue());
        user.setMemberPlanType(planType);
        user.setMemberExpireTime(currentExpirationDate);
        when(userMapper.selectByIdForUpdate(userId)).thenReturn(user);

        ArgumentCaptor<Date> expirationCaptor = ArgumentCaptor.forClass(Date.class);
        when(userMapper.updateMembership(eq(userId), eq(MemberLevelEnum.MEMBER.getValue()), eq(planType),
                expirationCaptor.capture())).thenReturn(1);

        memberService.activateMember(userId, planType, durationDays);

        Date expectedExpiration = Date.from(currentExpiration.plusDays(durationDays)
                .atZone(ZoneId.systemDefault()).toInstant());
        assertEquals(expectedExpiration, expirationCaptor.getValue());
        verify(userMapper).selectByIdForUpdate(userId);
    }
}
