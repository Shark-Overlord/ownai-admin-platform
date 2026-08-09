package com.yupi.springbootinit.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.AlipayProperties;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.MemberOrderMapper;
import com.yupi.springbootinit.model.dto.member.MemberPaymentCreateRequest;
import com.yupi.springbootinit.model.dto.member.MemberPaymentResumeRequest;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.entity.MemberPriceConfig;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.enums.MemberOrderTypeEnum;
import com.yupi.springbootinit.model.enums.MemberPlanTypeEnum;
import com.yupi.springbootinit.model.enums.OrderStatusEnum;
import com.yupi.springbootinit.model.vo.member.MemberPaymentCreateVO;
import com.yupi.springbootinit.model.vo.member.MemberPaymentStatusVO;
import com.yupi.springbootinit.service.AlipayMemberPaymentService;
import com.yupi.springbootinit.service.MemberPriceConfigService;
import com.yupi.springbootinit.service.MemberService;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.service.alipay.AlipayPagePaymentCommand;
import com.yupi.springbootinit.service.alipay.AlipayPaymentCloseResult;
import com.yupi.springbootinit.service.alipay.AlipayPaymentGateway;
import com.yupi.springbootinit.service.alipay.AlipayPaymentQueryResult;
import com.yupi.springbootinit.service.alipay.AlipayPaymentResultTokenManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Date;
import java.util.List;
import java.util.Map;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class AlipayMemberPaymentServiceImpl implements AlipayMemberPaymentService {

    private static final String PAYMENT_CHANNEL = "alipay";

    @Resource
    private MemberOrderMapper memberOrderMapper;

    @Resource
    private MemberPriceConfigService memberPriceConfigService;

    @Resource
    private MemberService memberService;

    @Resource
    private AlipayPaymentGateway alipayPaymentGateway;

    @Resource
    private AlipayProperties alipayProperties;

    @Resource
    private AlipayMemberPaymentSettlementService settlementService;

    @Resource
    private UserService userService;

    @Resource
    private AlipayPaymentResultTokenManager paymentResultTokenManager;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MemberPaymentCreateVO createPayment(MemberPaymentCreateRequest request, User loginUser) {
        ThrowUtils.throwIf(request == null || loginUser == null, ErrorCode.PARAMS_ERROR);
        ThrowUtils.throwIf(StringUtils.isBlank(request.getRequestId()) || request.getRequestId().length() > 64,
                ErrorCode.PARAMS_ERROR, "requestId is required and must be within 64 characters");
        MemberPlanTypeEnum planType = MemberPlanTypeEnum.getEnumByValue(request.getPlanType());
        ThrowUtils.throwIf(planType == null, ErrorCode.PARAMS_ERROR, "Invalid membership plan");
        ensureAlipayEnabled();

        MemberOrder existing = memberOrderMapper.selectByPaymentRequestIdForUpdate(loginUser.getId(), request.getRequestId());
        if (existing != null) {
            ThrowUtils.throwIf(!PAYMENT_CHANNEL.equals(existing.getPaymentChannel()), ErrorCode.OPERATION_ERROR,
                    "Payment request id is already in use");
            ThrowUtils.throwIf(!OrderStatusEnum.PENDING.getValue().equals(existing.getOrderStatus()),
                    ErrorCode.OPERATION_ERROR, "This payment request has already finished. Create a new request to buy again.");
            ThrowUtils.throwIf(isExpired(existing), ErrorCode.OPERATION_ERROR,
                    "This payment request has expired. Create a new request to buy again.");
            return buildCreateResponse(existing);
        }

        Date activeOrderCutoff = new Date(System.currentTimeMillis()
                - alipayProperties.getPendingOrderTimeoutMinutes() * 60_000L);
        MemberOrder activePendingOrder = memberOrderMapper.selectActivePendingByUserForUpdate(loginUser.getId(),
                PAYMENT_CHANNEL, OrderStatusEnum.PENDING.getValue(), activeOrderCutoff);
        if (activePendingOrder != null) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    "An unfinished membership order exists: " + activePendingOrder.getOrderNo()
                            + ". Complete or cancel it before creating a new order.");
        }

        validatePlanChange(loginUser, planType);
        MemberPriceConfig config = memberPriceConfigService.getValidConfig(MemberLevelEnum.MEMBER.getValue(),
                planType.getValue());
        ThrowUtils.throwIf(config == null || config.getCashPrice() == null || config.getCashPrice().compareTo(BigDecimal.ZERO) <= 0,
                ErrorCode.OPERATION_ERROR, "Membership plan is unavailable");

        Date now = new Date();
        MemberOrder order = new MemberOrder();
        order.setOrderNo("MEM" + IdUtil.getSnowflakeNextIdStr());
        order.setUserId(loginUser.getId());
        order.setMemberLevel(MemberLevelEnum.MEMBER.getValue());
        order.setPlanType(planType.getValue());
        order.setDurationDays(planType.isLifetime() ? 0 : config.getDurationDays());
        order.setOrderType(MemberOrderTypeEnum.CASH.getValue());
        order.setOrderStatus(OrderStatusEnum.PENDING.getValue());
        order.setOrderAmount(config.getCashPrice().setScale(2, RoundingMode.HALF_UP));
        order.setAmountMinor(order.getOrderAmount().movePointRight(2).longValueExact());
        order.setCurrency(StringUtils.defaultIfBlank(config.getCurrency(), "CNY"));
        order.setPointsAmount(0);
        order.setPaymentChannel(PAYMENT_CHANNEL);
        order.setPaymentRequestId(request.getRequestId());
        order.setCreateTime(now);
        order.setUpdateTime(now);
        boolean saved = memberService.save(order);
        ThrowUtils.throwIf(!saved, ErrorCode.OPERATION_ERROR, "Failed to create membership order");
        return buildCreateResponse(order);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MemberPaymentCreateVO resumePayment(MemberPaymentResumeRequest request, User loginUser) {
        ThrowUtils.throwIf(request == null || loginUser == null || StringUtils.isBlank(request.getOrderNo()),
                ErrorCode.PARAMS_ERROR, "orderNo is required");
        ensureAlipayEnabled();
        MemberOrder order = memberOrderMapper.selectByOrderNoForUpdate(request.getOrderNo());
        ThrowUtils.throwIf(order == null, ErrorCode.NOT_FOUND_ERROR, "Membership order not found");
        ThrowUtils.throwIf(!loginUser.getId().equals(order.getUserId()), ErrorCode.NO_AUTH_ERROR);
        ThrowUtils.throwIf(!PAYMENT_CHANNEL.equals(order.getPaymentChannel()), ErrorCode.PARAMS_ERROR,
                "This order is not an Alipay payment");
        ThrowUtils.throwIf(!OrderStatusEnum.PENDING.getValue().equals(order.getOrderStatus()),
                ErrorCode.OPERATION_ERROR, "Only pending orders can be resumed");
        ThrowUtils.throwIf(isExpired(order), ErrorCode.OPERATION_ERROR,
                "This payment request has expired. Create a new request to buy again.");
        return buildCreateResponse(order);
    }

    @Override
    public MemberPaymentStatusVO getPaymentStatus(String orderNo, User loginUser) {
        ThrowUtils.throwIf(StringUtils.isBlank(orderNo) || loginUser == null, ErrorCode.PARAMS_ERROR);
        MemberOrder order = memberOrderMapper.selectOne(new QueryWrapper<MemberOrder>().eq("orderNo", orderNo));
        ThrowUtils.throwIf(order == null, ErrorCode.NOT_FOUND_ERROR, "Membership order not found");
        ThrowUtils.throwIf(!loginUser.getId().equals(order.getUserId()), ErrorCode.NO_AUTH_ERROR);
        ThrowUtils.throwIf(!PAYMENT_CHANNEL.equals(order.getPaymentChannel()), ErrorCode.PARAMS_ERROR,
                "This order is not an Alipay payment");
        return refreshAndBuildPaymentStatus(order);
    }

    @Override
    public MemberPaymentStatusVO getPaymentStatusByResultToken(String orderNo, String resultToken) {
        ThrowUtils.throwIf(!paymentResultTokenManager.verifyToken(orderNo, resultToken), ErrorCode.NO_AUTH_ERROR,
                "Payment result link is invalid or expired");
        MemberOrder order = memberOrderMapper.selectOne(new QueryWrapper<MemberOrder>().eq("orderNo", orderNo));
        ThrowUtils.throwIf(order == null || !PAYMENT_CHANNEL.equals(order.getPaymentChannel()), ErrorCode.NOT_FOUND_ERROR,
                "Membership order not found");
        return refreshAndBuildPaymentStatus(order);
    }

    @Override
    public String createPaymentResultToken(String orderNo) {
        MemberOrder order = memberOrderMapper.selectOne(new QueryWrapper<MemberOrder>().eq("orderNo", orderNo));
        if (order == null || !PAYMENT_CHANNEL.equals(order.getPaymentChannel())) {
            return null;
        }
        return paymentResultTokenManager.createToken(orderNo);
    }

    private MemberPaymentStatusVO refreshAndBuildPaymentStatus(MemberOrder order) {
        AlipayPaymentQueryResult queryResult = null;
        if (OrderStatusEnum.PENDING.getValue().equals(order.getOrderStatus())) {
            queryResult = alipayPaymentGateway.queryTrade(order.getOrderNo());
            if (queryResult.isPaid()) {
                settlementService.completeOrder(order.getOrderNo(), queryResult);
            }
            order = memberOrderMapper.selectOne(new QueryWrapper<MemberOrder>().eq("orderNo", order.getOrderNo()));
        }
        MemberPaymentStatusVO response = new MemberPaymentStatusVO();
        response.setOrderNo(order.getOrderNo());
        response.setOrderStatus(order.getOrderStatus());
        response.setPaymentChannel(order.getPaymentChannel());
        response.setFailureReason(order.getFailureReason());
        if (OrderStatusEnum.PENDING.getValue().equals(order.getOrderStatus()) && queryResult != null
                && !queryResult.isRequestSuccess()) {
            response.setFailureReason(queryResult.getErrorMessage());
        }
        response.setExpiresAt(resolveExpiresAt(order));
        User currentUser = userService.getById(order.getUserId());
        response.setMemberPlanType(currentUser.getMemberPlanType());
        response.setMemberExpireTime(currentUser.getMemberExpireTime());
        response.setMemberActive(MemberLevelEnum.MEMBER.getValue().equals(currentUser.getMemberLevel())
                && (currentUser.getMemberExpireTime() == null || currentUser.getMemberExpireTime().after(new Date())));
        return response;
    }

    @Override
    public boolean processNotification(Map<String, String> notificationParams) {
        if (!alipayProperties.isEnabled() || notificationParams == null
                || !alipayProperties.getAppId().equals(notificationParams.get("app_id"))
                || !alipayPaymentGateway.verifyNotification(notificationParams)) {
            return false;
        }
        String orderNo = notificationParams.get("out_trade_no");
        String tradeStatus = notificationParams.get("trade_status");
        if (StringUtils.isBlank(orderNo) || !("TRADE_SUCCESS".equals(tradeStatus) || "TRADE_FINISHED".equals(tradeStatus))) {
            return false;
        }
        return synchronizeOrder(orderNo);
    }

    @Override
    public boolean processReturn(Map<String, String> returnParams) {
        if (!alipayProperties.isEnabled() || returnParams == null
                || !alipayProperties.getAppId().equals(returnParams.get("app_id"))
                || !alipayPaymentGateway.verifyNotification(returnParams)) {
            return false;
        }
        String orderNo = returnParams.get("out_trade_no");
        if (StringUtils.isBlank(orderNo)) {
            return false;
        }
        // The signed browser return is not trusted as a payment result. Querying the provider keeps this path safe
        // while allowing the result page to display the latest local status immediately after redirection.
        synchronizeOrder(orderNo);
        return true;
    }

    @Override
    public boolean cancelPayment(String orderNo, User loginUser, boolean adminOperation) {
        ThrowUtils.throwIf(StringUtils.isBlank(orderNo), ErrorCode.PARAMS_ERROR);
        MemberOrder order = memberOrderMapper.selectOne(new QueryWrapper<MemberOrder>().eq("orderNo", orderNo));
        ThrowUtils.throwIf(order == null, ErrorCode.NOT_FOUND_ERROR, "Membership order not found");
        ThrowUtils.throwIf(!PAYMENT_CHANNEL.equals(order.getPaymentChannel()), ErrorCode.PARAMS_ERROR,
                "This order is not an Alipay payment");
        if (!adminOperation) {
            ThrowUtils.throwIf(loginUser == null || !loginUser.getId().equals(order.getUserId()), ErrorCode.NO_AUTH_ERROR);
        }
        ThrowUtils.throwIf(!OrderStatusEnum.PENDING.getValue().equals(order.getOrderStatus()), ErrorCode.OPERATION_ERROR,
                "Only pending orders can be cancelled");
        AlipayPaymentQueryResult queryResult = alipayPaymentGateway.queryTrade(orderNo);
        if (queryResult.isPaid()) {
            settlementService.completeOrder(orderNo, queryResult);
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Payment has completed and cannot be cancelled");
        }
        AlipayPaymentCloseResult closeResult = alipayPaymentGateway.closeTrade(orderNo);
        ThrowUtils.throwIf(!closeResult.isClosed() && !closeResult.isTradeNotFound(), ErrorCode.OPERATION_ERROR,
                "Alipay order could not be closed. Please try again later.");
        return settlementService.markOrderClosed(orderNo, OrderStatusEnum.CANCELLED.getValue());
    }

    @Override
    public void expirePendingOrders() {
        if (!alipayProperties.isEnabled()) {
            return;
        }
        Date cutoff = new Date(System.currentTimeMillis() - alipayProperties.getPendingOrderTimeoutMinutes() * 60_000L);
        List<MemberOrder> expiredCandidates = memberService.list(new QueryWrapper<MemberOrder>()
                .eq("paymentChannel", PAYMENT_CHANNEL)
                .eq("orderStatus", OrderStatusEnum.PENDING.getValue())
                .lt("createTime", cutoff)
                .orderByAsc("createTime")
                .last("LIMIT 100"));
        for (MemberOrder candidate : expiredCandidates) {
            try {
                expireIfUnpaid(candidate.getOrderNo());
            } catch (RuntimeException e) {
                log.warn("Failed to expire Alipay member order {}", candidate.getOrderNo(), e);
            }
        }
    }

    private boolean synchronizeOrder(String orderNo) {
        AlipayPaymentQueryResult queryResult = alipayPaymentGateway.queryTrade(orderNo);
        if (!queryResult.isPaid()) {
            return false;
        }
        return settlementService.completeOrder(orderNo, queryResult);
    }

    private void expireIfUnpaid(String orderNo) {
        AlipayPaymentQueryResult queryResult = alipayPaymentGateway.queryTrade(orderNo);
        if (queryResult.isPaid()) {
            settlementService.completeOrder(orderNo, queryResult);
            return;
        }
        AlipayPaymentCloseResult closeResult = alipayPaymentGateway.closeTrade(orderNo);
        if (closeResult.isClosed() || closeResult.isTradeNotFound()) {
            settlementService.markOrderClosed(orderNo, OrderStatusEnum.EXPIRED.getValue());
        }
    }

    private MemberPaymentCreateVO buildCreateResponse(MemberOrder order) {
        AlipayPagePaymentCommand command = new AlipayPagePaymentCommand();
        command.setOutTradeNo(order.getOrderNo());
        command.setTotalAmount(order.getOrderAmount());
        command.setSubject("OwnAI membership - " + order.getPlanType());
        command.setExpiresAt(resolveExpiresAt(order));
        MemberPaymentCreateVO response = new MemberPaymentCreateVO();
        response.setOrderNo(order.getOrderNo());
        response.setPaymentChannel(PAYMENT_CHANNEL);
        response.setOrderStatus(order.getOrderStatus());
        response.setExpiresAt(command.getExpiresAt());
        response.setPaymentFormHtml(alipayPaymentGateway.createPagePaymentForm(command));
        return response;
    }

    private boolean isExpired(MemberOrder order) {
        Date expiresAt = resolveExpiresAt(order);
        return expiresAt != null && !expiresAt.after(new Date());
    }

    private Date resolveExpiresAt(MemberOrder order) {
        Date createdAt = order.getCreateTime();
        if (createdAt == null) {
            return null;
        }
        return new Date(createdAt.getTime() + alipayProperties.getPendingOrderTimeoutMinutes() * 60_000L);
    }

    private void ensureAlipayEnabled() {
        ThrowUtils.throwIf(!alipayProperties.isEnabled(), ErrorCode.OPERATION_ERROR, "Alipay is not configured");
    }

    private void validatePlanChange(User user, MemberPlanTypeEnum requestedPlan) {
        if (!MemberLevelEnum.MEMBER.getValue().equals(user.getMemberLevel())) {
            return;
        }
        MemberPlanTypeEnum currentPlan = MemberPlanTypeEnum.getEnumByValue(user.getMemberPlanType());
        boolean active = currentPlan != null && (currentPlan.isLifetime()
                || user.getMemberExpireTime() != null && user.getMemberExpireTime().after(new Date()));
        if (!active) {
            return;
        }
        if (currentPlan.isLifetime()) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    "Lifetime membership is already active; no renewal is required");
        }
        if (planRank(requestedPlan) < planRank(currentPlan)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    "An active membership cannot be downgraded; renew the current plan or choose a higher plan");
        }
    }

    private int planRank(MemberPlanTypeEnum planType) {
        if (planType == MemberPlanTypeEnum.MONTH) {
            return 1;
        }
        if (planType == MemberPlanTypeEnum.YEAR) {
            return 2;
        }
        return 3;
    }
}
