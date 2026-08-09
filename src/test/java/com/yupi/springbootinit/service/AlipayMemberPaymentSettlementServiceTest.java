package com.yupi.springbootinit.service;

import com.yupi.springbootinit.mapper.MemberOrderMapper;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.enums.OrderStatusEnum;
import com.yupi.springbootinit.service.alipay.AlipayPaymentQueryResult;
import com.yupi.springbootinit.service.impl.AlipayMemberPaymentSettlementService;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlipayMemberPaymentSettlementServiceTest {

    @Mock
    private MemberOrderMapper memberOrderMapper;

    @Mock
    private MemberService memberService;

    @InjectMocks
    private AlipayMemberPaymentSettlementService settlementService;

    @Test
    void shouldActivateMembershipOnlyOnceForDuplicateCallback() {
        MemberOrder order = pendingOrder();
        AlipayPaymentQueryResult result = paidResult("2026080400000001", "19.90");
        when(memberOrderMapper.selectByOrderNoForUpdate("MEM1")).thenReturn(order);
        when(memberService.updateById(any(MemberOrder.class))).thenReturn(true);

        assertTrue(settlementService.completeOrder("MEM1", result));
        assertTrue(settlementService.completeOrder("MEM1", result));

        verify(memberService, times(1)).updateById(order);
        verify(memberService, times(1)).activateMember(100L, "month", 30);
    }

    @Test
    void shouldRejectSuccessfulProviderStatusWhenAmountDoesNotMatch() {
        MemberOrder order = pendingOrder();
        when(memberOrderMapper.selectByOrderNoForUpdate("MEM1")).thenReturn(order);

        assertFalse(settlementService.completeOrder("MEM1", paidResult("2026080400000002", "0.01")));

        verify(memberService, never()).updateById(any(MemberOrder.class));
        verify(memberService, never()).activateMember(any(Long.class), any(String.class), any(Integer.class));
    }

    private MemberOrder pendingOrder() {
        MemberOrder order = new MemberOrder();
        order.setOrderNo("MEM1");
        order.setUserId(100L);
        order.setPlanType("month");
        order.setDurationDays(30);
        order.setPaymentChannel("alipay");
        order.setOrderAmount(new BigDecimal("19.90"));
        order.setOrderStatus(OrderStatusEnum.PENDING.getValue());
        return order;
    }

    private AlipayPaymentQueryResult paidResult(String tradeNo, String amount) {
        AlipayPaymentQueryResult result = new AlipayPaymentQueryResult();
        result.setRequestSuccess(true);
        result.setTradeStatus("TRADE_SUCCESS");
        result.setTradeNo(tradeNo);
        result.setTotalAmount(new BigDecimal(amount));
        return result;
    }
}
