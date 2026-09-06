package com.yupi.springbootinit.service.impl;

import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.AlipayProperties;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.MemberOrderMapper;
import com.yupi.springbootinit.mapper.UserMapper;
import com.yupi.springbootinit.model.dto.member.AdminMemberGrantRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderQueryRequest;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.entity.MemberPriceConfig;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.enums.MemberOrderTypeEnum;
import com.yupi.springbootinit.model.enums.MemberPlanTypeEnum;
import com.yupi.springbootinit.model.enums.OrderStatusEnum;
import com.yupi.springbootinit.model.vo.member.MemberOrderVO;
import com.yupi.springbootinit.service.MemberPriceConfigService;
import com.yupi.springbootinit.service.MemberService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberServiceImpl extends ServiceImpl<MemberOrderMapper, MemberOrder> implements MemberService {

    @Resource
    private UserMapper userMapper;

    @Resource
    private MemberPriceConfigService memberPriceConfigService;

    @Resource
    private AlipayProperties alipayProperties;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean cancelMemberOrder(String orderNo, User loginUser, boolean adminOperation) {
        ThrowUtils.throwIf(StringUtils.isBlank(orderNo), ErrorCode.PARAMS_ERROR, "orderNo is required");
        MemberOrder order = baseMapper.selectByOrderNoForUpdate(orderNo);
        ThrowUtils.throwIf(order == null, ErrorCode.NOT_FOUND_ERROR, "Membership order not found");
        if (!adminOperation) {
            ThrowUtils.throwIf(loginUser == null || !order.getUserId().equals(loginUser.getId()),
                    ErrorCode.NO_AUTH_ERROR, "You cannot cancel this order");
        }
        ThrowUtils.throwIf(!OrderStatusEnum.PENDING.getValue().equals(order.getOrderStatus()),
                ErrorCode.OPERATION_ERROR, "Only pending orders can be cancelled");
        ThrowUtils.throwIf("alipay".equals(order.getPaymentChannel()), ErrorCode.OPERATION_ERROR,
                "Alipay orders must be closed through the payment provider");
        order.setOrderStatus(OrderStatusEnum.CANCELLED.getValue());
        return this.updateById(order);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MemberOrder adminGrantMember(AdminMemberGrantRequest request) {
        ThrowUtils.throwIf(request == null || request.getUserId() == null, ErrorCode.PARAMS_ERROR);
        MemberPlanTypeEnum planType = MemberPlanTypeEnum.getEnumByValue(request.getPlanType());
        ThrowUtils.throwIf(planType == null, ErrorCode.PARAMS_ERROR, "Invalid membership plan");
        MemberPriceConfig config = memberPriceConfigService.getValidConfig(
                MemberLevelEnum.MEMBER.getValue(), planType.getValue());
        ThrowUtils.throwIf(config == null, ErrorCode.PARAMS_ERROR, "Membership plan is unavailable");
        User user = userMapper.selectById(request.getUserId());
        ThrowUtils.throwIf(user == null, ErrorCode.NOT_FOUND_ERROR, "User not found");

        MemberOrder order = new MemberOrder();
        order.setOrderNo(generateOrderNo());
        order.setUserId(user.getId());
        order.setMemberLevel(MemberLevelEnum.MEMBER.getValue());
        order.setPlanType(planType.getValue());
        order.setDurationDays(planType.isLifetime() ? 0 : planType.getDurationDays());
        order.setOrderType(MemberOrderTypeEnum.ADMIN_GRANT.getValue());
        order.setOrderStatus(OrderStatusEnum.COMPLETED.getValue());
        order.setOrderAmount(BigDecimal.ZERO);
        order.setAmountMinor(0L);
        order.setCurrency(StringUtils.defaultIfBlank(config.getCurrency(), "CNY"));
        order.setPointsAmount(0);
        order.setPaymentChannel("admin");
        order.setPayTime(new Date());
        order.setFinishTime(new Date());
        boolean saved = this.save(order);
        ThrowUtils.throwIf(!saved, ErrorCode.OPERATION_ERROR, "Failed to grant membership");
        activateMember(user.getId(), planType.getValue(), planType.isLifetime() ? 0 : planType.getDurationDays());
        return order;
    }

    @Override
    public Page<MemberOrderVO> listMyMemberOrders(MemberOrderQueryRequest request, User loginUser) {
        return doListMemberOrders(request, loginUser.getId(), false);
    }

    @Override
    public Page<MemberOrderVO> listAllMemberOrders(MemberOrderQueryRequest request) {
        return doListMemberOrders(request, null, true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void activateMember(Long userId, String planTypeValue, Integer durationDays) {
        MemberPlanTypeEnum planType = MemberPlanTypeEnum.getEnumByValue(planTypeValue);
        ThrowUtils.throwIf(userId == null || planType == null, ErrorCode.PARAMS_ERROR);
        User user = userMapper.selectByIdForUpdate(userId);
        ThrowUtils.throwIf(user == null, ErrorCode.NOT_FOUND_ERROR, "User not found");

        // A late-paid finite order must never downgrade an already active lifetime member.
        if (!planType.isLifetime() && "lifetime".equals(user.getMemberPlanType())
                && user.getMemberExpireTime() == null) {
            return;
        }

        Date memberExpireTime;
        if (planType.isLifetime()) {
            memberExpireTime = null;
        } else {
            int days = durationDays == null ? planType.getDurationDays() : durationDays;
            Date now = new Date();
            Date startDate = user.getMemberExpireTime() != null && user.getMemberExpireTime().after(now)
                    ? user.getMemberExpireTime() : now;
            LocalDateTime expires = startDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime().plusDays(days);
            memberExpireTime = Date.from(expires.atZone(ZoneId.systemDefault()).toInstant());
        }
        int updated = userMapper.updateMembership(userId, MemberLevelEnum.MEMBER.getValue(),
                planType.getValue(), memberExpireTime);
        ThrowUtils.throwIf(updated != 1, ErrorCode.OPERATION_ERROR, "Failed to activate membership");
    }

    private Page<MemberOrderVO> doListMemberOrders(MemberOrderQueryRequest request, Long userId, boolean adminView) {
        MemberOrderQueryRequest safeRequest = request == null ? new MemberOrderQueryRequest() : request;
        QueryWrapper<MemberOrder> query = new QueryWrapper<>();
        if (!adminView || safeRequest.getUserId() != null) {
            query.eq("userId", adminView ? safeRequest.getUserId() : userId);
        }
        query.eq(StringUtils.isNotBlank(safeRequest.getOrderNo()), "orderNo", safeRequest.getOrderNo());
        query.eq(StringUtils.isNotBlank(safeRequest.getMemberLevel()), "memberLevel", safeRequest.getMemberLevel());
        query.eq(StringUtils.isNotBlank(safeRequest.getOrderType()), "orderType", safeRequest.getOrderType());
        query.eq(StringUtils.isNotBlank(safeRequest.getPlanType()), "planType", safeRequest.getPlanType());
        query.eq(StringUtils.isNotBlank(safeRequest.getOrderStatus()), "orderStatus", safeRequest.getOrderStatus());
        query.orderByDesc("id");
        Page<MemberOrder> page = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), query);
        Page<MemberOrderVO> voPage = new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(), page.getTotal());
        voPage.setRecords(buildMemberOrderVO(page.getRecords()));
        return voPage;
    }

    private List<MemberOrderVO> buildMemberOrderVO(List<MemberOrder> orders) {
        List<Long> userIds = orders.stream().map(MemberOrder::getUserId).distinct().collect(Collectors.toList());
        Map<Long, User> userMap = userIds.isEmpty() ? Collections.emptyMap() : userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, item -> item));
        return orders.stream().map(order -> {
            MemberOrderVO vo = new MemberOrderVO();
            BeanUtils.copyProperties(order, vo);
            User user = userMap.get(order.getUserId());
            if (user != null) {
                vo.setUserName(user.getUserName());
            }
            if (OrderStatusEnum.PENDING.getValue().equals(order.getOrderStatus())
                    && "alipay".equals(order.getPaymentChannel()) && order.getCreateTime() != null) {
                vo.setExpiresAt(new Date(order.getCreateTime().getTime()
                        + alipayProperties.getPendingOrderTimeoutMinutes() * 60_000L));
            }
            return vo;
        }).collect(Collectors.toList());
    }

    private String generateOrderNo() {
        return "MEM" + System.currentTimeMillis() + RandomUtil.randomNumbers(6);
    }
}
