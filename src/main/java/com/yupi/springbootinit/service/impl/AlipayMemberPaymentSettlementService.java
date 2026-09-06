package com.yupi.springbootinit.service.impl;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.MemberOrderMapper;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.enums.OrderStatusEnum;
import com.yupi.springbootinit.model.enums.MemberOrderTypeEnum;
import com.yupi.springbootinit.model.enums.PointChangeTypeEnum;
import com.yupi.springbootinit.service.MemberService;
import com.yupi.springbootinit.service.PointService;
import com.yupi.springbootinit.service.alipay.AlipayPaymentQueryResult;
import java.util.Date;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transaction boundary for final payment state changes. Kept separate so callback retries stay idempotent.
 */
@Service
@Slf4j
public class AlipayMemberPaymentSettlementService {

    @Resource
    private MemberOrderMapper memberOrderMapper;

    @Resource
    private MemberService memberService;

    @Resource
    private PointService pointService;

    @Transactional(rollbackFor = Exception.class)
    public boolean completeOrder(String orderNo, AlipayPaymentQueryResult queryResult) {
        MemberOrder order = memberOrderMapper.selectByOrderNoForUpdate(orderNo);
        if (order == null || !"alipay".equals(order.getPaymentChannel())) {
            return false;
        }
        if (OrderStatusEnum.COMPLETED.getValue().equals(order.getOrderStatus())) {
            return StringUtils.isBlank(order.getThirdPartyOrderNo())
                    || StringUtils.equals(order.getThirdPartyOrderNo(), queryResult.getTradeNo());
        }
        if (!OrderStatusEnum.PENDING.getValue().equals(order.getOrderStatus()) || !queryResult.isPaid()
                || queryResult.getTotalAmount() == null || order.getOrderAmount().compareTo(queryResult.getTotalAmount()) != 0
                || StringUtils.isBlank(queryResult.getTradeNo())) {
            log.error("Rejected Alipay completion for order {}, local status {}, provider status {}, amount {}", orderNo,
                    order.getOrderStatus(), queryResult.getTradeStatus(), queryResult.getTotalAmount());
            return false;
        }
        Date now = new Date();
        order.setOrderStatus(OrderStatusEnum.COMPLETED.getValue());
        order.setThirdPartyOrderNo(queryResult.getTradeNo());
        order.setFailureReason(null);
        order.setPayTime(now);
        order.setFinishTime(now);
        boolean updated = memberService.updateById(order);
        ThrowUtils.throwIf(!updated, ErrorCode.OPERATION_ERROR, "Failed to complete membership order");
        if (MemberOrderTypeEnum.POINT_RECHARGE.getValue().equals(order.getOrderType())) {
            ThrowUtils.throwIf(order.getPointsAmount() == null || order.getPointsAmount() <= 0,
                    ErrorCode.OPERATION_ERROR, "充值订单积分无效");
            pointService.addPoints(order.getUserId(), order.getPointsAmount(),
                    PointChangeTypeEnum.POINT_RECHARGE,
                    "member_order", order.getId(), "支付宝充值积分，订单 " + order.getOrderNo());
        } else {
            memberService.activateMember(order.getUserId(), order.getPlanType(), order.getDurationDays());
        }
        return true;
    }

    @Transactional(rollbackFor = Exception.class)
    public boolean markOrderClosed(String orderNo, String targetStatus) {
        MemberOrder order = memberOrderMapper.selectByOrderNoForUpdate(orderNo);
        if (order == null || !OrderStatusEnum.PENDING.getValue().equals(order.getOrderStatus())) {
            return false;
        }
        order.setOrderStatus(targetStatus);
        order.setFinishTime(new Date());
        return memberService.updateById(order);
    }
}
