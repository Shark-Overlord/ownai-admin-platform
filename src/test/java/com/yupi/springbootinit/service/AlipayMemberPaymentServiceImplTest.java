package com.yupi.springbootinit.service;

import com.yupi.springbootinit.config.AlipayProperties;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.MemberOrderMapper;
import com.yupi.springbootinit.model.dto.member.MemberPaymentCreateRequest;
import com.yupi.springbootinit.model.dto.member.MemberPaymentResumeRequest;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.OrderStatusEnum;
import com.yupi.springbootinit.service.alipay.AlipayPaymentGateway;
import com.yupi.springbootinit.service.alipay.AlipayPaymentResultTokenManager;
import com.yupi.springbootinit.service.impl.AlipayMemberPaymentServiceImpl;
import com.yupi.springbootinit.service.impl.AlipayMemberPaymentSettlementService;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlipayMemberPaymentServiceImplTest {

    @Mock
    private MemberOrderMapper memberOrderMapper;
    @Mock
    private MemberPriceConfigService memberPriceConfigService;
    @Mock
    private MemberService memberService;
    @Mock
    private AlipayPaymentGateway alipayPaymentGateway;
    @Mock
    private AlipayProperties alipayProperties;
    @Mock
    private AlipayMemberPaymentSettlementService settlementService;
    @Mock
    private UserService userService;
    @Mock
    private AlipayPaymentResultTokenManager paymentResultTokenManager;

    @InjectMocks
    private AlipayMemberPaymentServiceImpl paymentService;

    @Test
    void shouldResumeTheSamePendingOrder() {
        User user = user(100L, "normal", null, null);
        MemberOrder order = pendingOrder(user.getId(), new Date());
        MemberPaymentResumeRequest request = new MemberPaymentResumeRequest();
        request.setOrderNo(order.getOrderNo());
        when(alipayProperties.isEnabled()).thenReturn(true);
        when(alipayProperties.getPendingOrderTimeoutMinutes()).thenReturn(15);
        when(memberOrderMapper.selectByOrderNoForUpdate(order.getOrderNo())).thenReturn(order);
        when(alipayPaymentGateway.createPagePaymentForm(any())).thenReturn("<form action='https://example.test'></form>");

        assertEquals(order.getOrderNo(), paymentService.resumePayment(request, user).getOrderNo());
        verify(memberService, never()).save(any(MemberOrder.class));
    }

    @Test
    void shouldRejectExpiredPendingOrder() {
        User user = user(100L, "normal", null, null);
        MemberOrder order = pendingOrder(user.getId(), new Date(System.currentTimeMillis() - 16 * 60_000L));
        MemberPaymentResumeRequest request = new MemberPaymentResumeRequest();
        request.setOrderNo(order.getOrderNo());
        when(alipayProperties.isEnabled()).thenReturn(true);
        when(alipayProperties.getPendingOrderTimeoutMinutes()).thenReturn(15);
        when(memberOrderMapper.selectByOrderNoForUpdate(order.getOrderNo())).thenReturn(order);

        assertThrows(BusinessException.class, () -> paymentService.resumePayment(request, user));
    }

    @Test
    void shouldRejectDowngradeFromActiveYearToMonth() {
        User user = user(100L, "member", "year", new Date(System.currentTimeMillis() + 86_400_000L));
        MemberPaymentCreateRequest request = new MemberPaymentCreateRequest();
        request.setPlanType("month");
        request.setRequestId("downgrade-request");
        when(alipayProperties.isEnabled()).thenReturn(true);
        when(memberOrderMapper.selectByPaymentRequestIdForUpdate(user.getId(), request.getRequestId())).thenReturn(null);

        assertThrows(BusinessException.class, () -> paymentService.createPayment(request, user));
        verify(memberService, never()).save(any(MemberOrder.class));
    }

    @Test
    void shouldRejectCreatingAnotherOrderWhenAnActivePendingOrderExists() {
        User user = user(100L, "normal", null, null);
        MemberPaymentCreateRequest request = new MemberPaymentCreateRequest();
        request.setPlanType("year");
        request.setRequestId("new-request");
        MemberOrder pendingOrder = pendingOrder(user.getId(), new Date());
        when(alipayProperties.isEnabled()).thenReturn(true);
        when(alipayProperties.getPendingOrderTimeoutMinutes()).thenReturn(15);
        when(memberOrderMapper.selectByPaymentRequestIdForUpdate(user.getId(), request.getRequestId())).thenReturn(null);
        when(memberOrderMapper.selectActivePendingByUserForUpdate(eq(user.getId()), eq("alipay"), eq("pending"),
                any(Date.class))).thenReturn(pendingOrder);

        assertThrows(BusinessException.class, () -> paymentService.createPayment(request, user));
        verify(memberService, never()).save(any(MemberOrder.class));
    }

    private User user(long id, String level, String planType, Date expiresAt) {
        User user = new User();
        user.setId(id);
        user.setMemberLevel(level);
        user.setMemberPlanType(planType);
        user.setMemberExpireTime(expiresAt);
        return user;
    }

    private MemberOrder pendingOrder(long userId, Date createdAt) {
        MemberOrder order = new MemberOrder();
        order.setOrderNo("MEM-PENDING-1");
        order.setUserId(userId);
        order.setPlanType("month");
        order.setOrderStatus(OrderStatusEnum.PENDING.getValue());
        order.setPaymentChannel("alipay");
        order.setCreateTime(createdAt);
        return order;
    }
}
