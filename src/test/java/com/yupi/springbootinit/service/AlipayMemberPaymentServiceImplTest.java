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
    @Mock
    private PointRechargeConfigService pointRechargeConfigService;

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

    @Test
    void rechargeUsesConfiguredPriceAndRecordsQuantityEvenForLifetimeMember() {
        MemberPaymentCreateRequest request = rechargeRequest(3);
        com.yupi.springbootinit.model.entity.PointRechargeConfig config = rechargeConfig();
        when(alipayProperties.isEnabled()).thenReturn(true);
        when(pointRechargeConfigService.getConfig()).thenReturn(config);
        when(memberService.save(any(MemberOrder.class))).thenReturn(true);
        paymentService.createPayment(request, user(100L, "member", "lifetime", null));
        org.mockito.ArgumentCaptor<MemberOrder> captor = org.mockito.ArgumentCaptor.forClass(MemberOrder.class);
        verify(memberService).save(captor.capture());
        MemberOrder saved = captor.getValue();
        assertEquals(new java.math.BigDecimal("7.50"), saved.getOrderAmount());
        assertEquals(750L, saved.getAmountMinor());
        assertEquals(600, saved.getPointsAmount());
        assertEquals(3, saved.getRechargeQuantity());
        assertEquals("point_recharge", saved.getOrderType());
        assertEquals("pending", saved.getOrderStatus());
        verify(memberService, never()).activateMember(any(), any(), any());
    }

    @Test
    void rechargeRejectsChangedQuoteDisabledConfigAndExcessQuantity() {
        when(alipayProperties.isEnabled()).thenReturn(true);
        com.yupi.springbootinit.model.entity.PointRechargeConfig config = rechargeConfig();
        when(pointRechargeConfigService.getConfig()).thenReturn(config);
        MemberPaymentCreateRequest request = rechargeRequest(3);
        config.setUnitPrice(new java.math.BigDecimal("3.00"));
        assertThrows(BusinessException.class, () -> paymentService.createPayment(request, user(100L,"normal",null,null)));
        config.setUnitPrice(new java.math.BigDecimal("2.50")); config.setStatus(0);
        assertThrows(BusinessException.class, () -> paymentService.createPayment(request, user(100L,"normal",null,null)));
        config.setStatus(1); config.setMaxQuantity(2);
        assertThrows(BusinessException.class, () -> paymentService.createPayment(request, user(100L,"normal",null,null)));
        verify(memberService, never()).save(any(MemberOrder.class));
    }

    @Test
    void rechargeRejectsZeroNegativeAndMissingQuantity() {
        for (Integer value : new Integer[] {null, 0, -1, 1001}) {
            assertThrows(BusinessException.class, () -> paymentService.createPayment(rechargeRequest(value), user(100L,"normal",null,null)));
        }
        verify(memberService, never()).save(any(MemberOrder.class));
    }

    @Test
    void rechargeRejectsFractionalJsonQuantity() {
        assertThrows(com.fasterxml.jackson.core.JsonProcessingException.class, () -> new com.fasterxml.jackson.databind.ObjectMapper()
                .readValue("{\"planType\":\"points\",\"quantity\":1.5}", MemberPaymentCreateRequest.class));
    }

    @Test
    void retryReusesSnapshotAndRejectsDifferentQuantity() {
        MemberPaymentCreateRequest request = rechargeRequest(3);
        MemberOrder existing = pendingOrder(100L, new Date());
        existing.setPlanType("points"); existing.setOrderType("point_recharge");
        existing.setRechargeQuantity(3); existing.setPointsAmount(600);
        existing.setOrderAmount(new java.math.BigDecimal("7.50"));
        when(alipayProperties.isEnabled()).thenReturn(true);
        when(alipayProperties.getPendingOrderTimeoutMinutes()).thenReturn(15);
        when(memberOrderMapper.selectByPaymentRequestIdForUpdate(100L, request.getRequestId())).thenReturn(existing);
        assertEquals(existing.getOrderNo(), paymentService.createPayment(request, user(100L,"normal",null,null)).getOrderNo());
        request.setQuantity(4);
        assertThrows(BusinessException.class, () -> paymentService.createPayment(request, user(100L,"normal",null,null)));
        verify(memberService, never()).save(any(MemberOrder.class));
        verify(pointRechargeConfigService, never()).getConfig();
    }

    private MemberPaymentCreateRequest rechargeRequest(Integer quantity) {
        MemberPaymentCreateRequest request = new MemberPaymentCreateRequest();
        request.setPlanType("points"); request.setRequestId("recharge-request"); request.setQuantity(quantity);
        request.setExpectedUnitPrice(new java.math.BigDecimal("2.50")); request.setExpectedPointsPerUnit(200);
        return request;
    }

    private com.yupi.springbootinit.model.entity.PointRechargeConfig rechargeConfig() {
        com.yupi.springbootinit.model.entity.PointRechargeConfig config = new com.yupi.springbootinit.model.entity.PointRechargeConfig();
        config.setUnitPrice(new java.math.BigDecimal("2.50")); config.setPointsPerUnit(200);
        config.setMaxQuantity(100); config.setStatus(1);
        return config;
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
