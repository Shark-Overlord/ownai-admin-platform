package com.yupi.springbootinit.service.impl;

import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.MemberOrderMapper;
import com.yupi.springbootinit.mapper.UserMapper;
import com.yupi.springbootinit.model.dto.member.AdminMemberGrantRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderCallbackRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderCreateRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderQueryRequest;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.entity.MemberPriceConfig;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.enums.MemberOrderTypeEnum;
import com.yupi.springbootinit.model.enums.OrderStatusEnum;
import com.yupi.springbootinit.model.enums.PointChangeTypeEnum;
import com.yupi.springbootinit.model.vo.member.MemberOrderVO;
import com.yupi.springbootinit.service.MemberPriceConfigService;
import com.yupi.springbootinit.service.MemberService;
import com.yupi.springbootinit.service.PointService;
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
    private PointService pointService;

    @Resource
    private UserMapper userMapper;

    @Resource
    private MemberPriceConfigService memberPriceConfigService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MemberOrder createMemberOrder(MemberOrderCreateRequest memberOrderCreateRequest, User loginUser) {
        ThrowUtils.throwIf(memberOrderCreateRequest == null, ErrorCode.PARAMS_ERROR);
        MemberLevelEnum memberLevelEnum = MemberLevelEnum.getEnumByValue(memberOrderCreateRequest.getMemberLevel());
        ThrowUtils.throwIf(memberLevelEnum == null || MemberLevelEnum.NORMAL.equals(memberLevelEnum), ErrorCode.PARAMS_ERROR,
                "会员等级错误");
        MemberOrderTypeEnum memberOrderTypeEnum = MemberOrderTypeEnum.getEnumByValue(memberOrderCreateRequest.getOrderType());
        ThrowUtils.throwIf(memberOrderTypeEnum == null || MemberOrderTypeEnum.ADMIN_GRANT.equals(memberOrderTypeEnum),
                ErrorCode.PARAMS_ERROR, "会员订单类型错误");

        int durationDays;
        BigDecimal cashAmount;
        int pointsAmount;

        // 如果传了套餐类型，直接查配置表
        if (StringUtils.isNotBlank(memberOrderCreateRequest.getPlanType())) {
            MemberPriceConfig config = memberPriceConfigService.getValidConfig(
                    memberLevelEnum.getValue(), memberOrderCreateRequest.getPlanType().trim().toLowerCase());
            ThrowUtils.throwIf(config == null, ErrorCode.PARAMS_ERROR, "会员套餐配置不存在");
            durationDays = config.getDurationDays();
            cashAmount = config.getCashPrice();
            pointsAmount = config.getPointsPrice();
        } else {
            // 向后兼容：按天计算
            durationDays = validateDurationDays(memberOrderCreateRequest.getDurationDays());
            cashAmount = calculateCashAmount(memberLevelEnum, durationDays);
            pointsAmount = calculatePointsAmount(memberLevelEnum, durationDays);
        }

        MemberOrder memberOrder = new MemberOrder();
        memberOrder.setOrderNo(generateOrderNo());
        memberOrder.setUserId(loginUser.getId());
        memberOrder.setMemberLevel(memberLevelEnum.getValue());
        memberOrder.setPlanType(memberOrderCreateRequest.getPlanType());
        memberOrder.setDurationDays(durationDays);
        memberOrder.setOrderType(memberOrderTypeEnum.getValue());
        memberOrder.setPaymentChannel(memberOrderCreateRequest.getPaymentChannel());
        memberOrder.setOrderStatus(OrderStatusEnum.PENDING.getValue());
        if (MemberOrderTypeEnum.CASH.equals(memberOrderTypeEnum)) {
            memberOrder.setOrderAmount(cashAmount);
            memberOrder.setPointsAmount(0);
            boolean result = this.save(memberOrder);
            ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "会员订单创建失败");
            return memberOrder;
        }
        memberOrder.setOrderAmount(BigDecimal.ZERO);
        memberOrder.setPointsAmount(pointsAmount);
        memberOrder.setOrderStatus(OrderStatusEnum.COMPLETED.getValue());
        memberOrder.setPayTime(new Date());
        memberOrder.setFinishTime(new Date());
        boolean result = this.save(memberOrder);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "会员订单创建失败");
        pointService.deductPoints(loginUser.getId(), pointsAmount, PointChangeTypeEnum.REDEEM_CONSUME, "member_order",
                memberOrder.getId(), "积分开通会员");
        activateMember(loginUser.getId(), memberLevelEnum.getValue(), memberOrderCreateRequest.getPlanType(), durationDays);
        return memberOrder;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean handleMemberPaymentCallback(MemberOrderCallbackRequest memberOrderCallbackRequest) {
        ThrowUtils.throwIf(memberOrderCallbackRequest == null || StringUtils.isBlank(memberOrderCallbackRequest.getOrderNo()),
                ErrorCode.PARAMS_ERROR);
        MemberOrder memberOrder = this.getOne(new QueryWrapper<MemberOrder>().eq("orderNo", memberOrderCallbackRequest.getOrderNo()));
        ThrowUtils.throwIf(memberOrder == null, ErrorCode.NOT_FOUND_ERROR, "会员订单不存在");
        if (OrderStatusEnum.COMPLETED.getValue().equals(memberOrder.getOrderStatus())) {
            return true;
        }
        ThrowUtils.throwIf(!OrderStatusEnum.PENDING.getValue().equals(memberOrder.getOrderStatus()), ErrorCode.OPERATION_ERROR,
                "会员订单状态不可回调");
        if (memberOrderCallbackRequest.getPaidAmount() != null && memberOrder.getOrderAmount() != null) {
            ThrowUtils.throwIf(memberOrderCallbackRequest.getPaidAmount().compareTo(memberOrder.getOrderAmount()) != 0,
                    ErrorCode.PARAMS_ERROR, "支付金额不匹配");
        }
        memberOrder.setOrderStatus(OrderStatusEnum.COMPLETED.getValue());
        memberOrder.setPayTime(new Date());
        memberOrder.setFinishTime(new Date());
        memberOrder.setThirdPartyOrderNo(memberOrderCallbackRequest.getThirdPartyOrderNo());
        if (StringUtils.isNotBlank(memberOrderCallbackRequest.getPaymentChannel())) {
            memberOrder.setPaymentChannel(memberOrderCallbackRequest.getPaymentChannel());
        }
        boolean result = this.updateById(memberOrder);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "会员支付回调处理失败");
        activateMember(memberOrder.getUserId(), memberOrder.getMemberLevel(), memberOrder.getPlanType(), memberOrder.getDurationDays());
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean cancelMemberOrder(String orderNo, User loginUser, boolean adminOperation) {
        ThrowUtils.throwIf(StringUtils.isBlank(orderNo), ErrorCode.PARAMS_ERROR, "订单号不能为空");
        MemberOrder memberOrder = this.getOne(new QueryWrapper<MemberOrder>().eq("orderNo", orderNo));
        ThrowUtils.throwIf(memberOrder == null, ErrorCode.NOT_FOUND_ERROR, "会员订单不存在");
        if (!adminOperation) {
            ThrowUtils.throwIf(loginUser == null || !memberOrder.getUserId().equals(loginUser.getId()),
                    ErrorCode.NO_AUTH_ERROR, "无权取消该会员订单");
        }
        ThrowUtils.throwIf(!OrderStatusEnum.PENDING.getValue().equals(memberOrder.getOrderStatus()),
                ErrorCode.OPERATION_ERROR, "仅待支付会员订单可取消");
        memberOrder.setOrderStatus(OrderStatusEnum.CANCELLED.getValue());
        return this.updateById(memberOrder);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MemberOrder adminGrantMember(AdminMemberGrantRequest adminMemberGrantRequest) {
        ThrowUtils.throwIf(adminMemberGrantRequest == null || adminMemberGrantRequest.getUserId() == null, ErrorCode.PARAMS_ERROR);
        MemberLevelEnum memberLevelEnum = MemberLevelEnum.getEnumByValue(adminMemberGrantRequest.getMemberLevel());
        ThrowUtils.throwIf(memberLevelEnum == null || MemberLevelEnum.NORMAL.equals(memberLevelEnum), ErrorCode.PARAMS_ERROR,
                "会员等级错误");

        int durationDays;
        if (StringUtils.isNotBlank(adminMemberGrantRequest.getPlanType())) {
            MemberPriceConfig config = memberPriceConfigService.getValidConfig(
                    memberLevelEnum.getValue(), adminMemberGrantRequest.getPlanType().trim().toLowerCase());
            ThrowUtils.throwIf(config == null, ErrorCode.PARAMS_ERROR, "会员套餐配置不存在");
            durationDays = config.getDurationDays();
        } else {
            durationDays = validateDurationDays(adminMemberGrantRequest.getDurationDays());
        }

        User user = userMapper.selectById(adminMemberGrantRequest.getUserId());
        ThrowUtils.throwIf(user == null, ErrorCode.NOT_FOUND_ERROR, "用户不存在");
        MemberOrder memberOrder = new MemberOrder();
        memberOrder.setOrderNo(generateOrderNo());
        memberOrder.setUserId(user.getId());
        memberOrder.setMemberLevel(memberLevelEnum.getValue());
        memberOrder.setPlanType(adminMemberGrantRequest.getPlanType());
        memberOrder.setDurationDays(durationDays);
        memberOrder.setOrderType(MemberOrderTypeEnum.ADMIN_GRANT.getValue());
        memberOrder.setOrderStatus(OrderStatusEnum.COMPLETED.getValue());
        memberOrder.setOrderAmount(BigDecimal.ZERO);
        memberOrder.setPointsAmount(0);
        memberOrder.setPayTime(new Date());
        memberOrder.setFinishTime(new Date());
        boolean result = this.save(memberOrder);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "后台发放会员失败");
        activateMember(user.getId(), memberLevelEnum.getValue(), adminMemberGrantRequest.getPlanType(), durationDays);
        return memberOrder;
    }

    @Override
    public Page<MemberOrderVO> listMyMemberOrders(MemberOrderQueryRequest memberOrderQueryRequest, User loginUser) {
        return doListMemberOrders(memberOrderQueryRequest, loginUser.getId(), false);
    }

    @Override
    public Page<MemberOrderVO> listAllMemberOrders(MemberOrderQueryRequest memberOrderQueryRequest) {
        return doListMemberOrders(memberOrderQueryRequest, null, true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void activateMember(Long userId, String memberLevel, String planType, Integer durationDays) {
        ThrowUtils.throwIf(userId == null || StringUtils.isBlank(memberLevel), ErrorCode.PARAMS_ERROR);
        User user = userMapper.selectById(userId);
        ThrowUtils.throwIf(user == null, ErrorCode.NOT_FOUND_ERROR, "用户不存在");
        int safeDurationDays = validateDurationDays(durationDays);
        Date now = new Date();
        Date startDate = now;
        if (user.getMemberExpireTime() != null && user.getMemberExpireTime().after(now)) {
            startDate = user.getMemberExpireTime();
        }
        LocalDateTime expireLocalDateTime = startDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime()
                .plusDays(safeDurationDays);
        User updateUser = new User();
        updateUser.setId(userId);
        updateUser.setMemberLevel(memberLevel);
        updateUser.setMemberPlanType(planType);
        updateUser.setMemberExpireTime(Date.from(expireLocalDateTime.atZone(ZoneId.systemDefault()).toInstant()));
        userMapper.updateById(updateUser);
    }

    private Page<MemberOrderVO> doListMemberOrders(MemberOrderQueryRequest memberOrderQueryRequest, Long userId,
            boolean adminView) {
        MemberOrderQueryRequest safeRequest = memberOrderQueryRequest == null ? new MemberOrderQueryRequest()
                : memberOrderQueryRequest;
        QueryWrapper<MemberOrder> queryWrapper = new QueryWrapper<>();
        if (!adminView || safeRequest.getUserId() != null) {
            queryWrapper.eq("userId", adminView ? safeRequest.getUserId() : userId);
        }
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getOrderNo()), "orderNo", safeRequest.getOrderNo());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getMemberLevel()), "memberLevel", safeRequest.getMemberLevel());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getOrderType()), "orderType", safeRequest.getOrderType());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getOrderStatus()), "orderStatus", safeRequest.getOrderStatus());
        queryWrapper.orderByDesc("id");
        Page<MemberOrder> memberOrderPage = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()),
                queryWrapper);
        Page<MemberOrderVO> memberOrderVOPage = new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(),
                memberOrderPage.getTotal());
        memberOrderVOPage.setRecords(buildMemberOrderVO(memberOrderPage.getRecords()));
        return memberOrderVOPage;
    }

    private List<MemberOrderVO> buildMemberOrderVO(List<MemberOrder> memberOrderList) {
        List<Long> userIds = memberOrderList.stream().map(MemberOrder::getUserId).distinct().collect(Collectors.toList());
        Map<Long, User> userMap = userIds.isEmpty() ? Collections.emptyMap() : userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, item -> item));
        return memberOrderList.stream().map(memberOrder -> {
            MemberOrderVO memberOrderVO = new MemberOrderVO();
            BeanUtils.copyProperties(memberOrder, memberOrderVO);
            User user = userMap.get(memberOrder.getUserId());
            if (user != null) {
                memberOrderVO.setUserName(user.getUserName());
            }
            return memberOrderVO;
        }).collect(Collectors.toList());
    }

    private int validateDurationDays(Integer durationDays) {
        ThrowUtils.throwIf(durationDays == null || durationDays <= 0, ErrorCode.PARAMS_ERROR, "会员时长必须大于 0");
        ThrowUtils.throwIf(durationDays > 3650, ErrorCode.PARAMS_ERROR, "会员时长过长");
        return durationDays;
    }

    private BigDecimal calculateCashAmount(MemberLevelEnum memberLevelEnum, int durationDays) {
        BigDecimal dailyPrice = new BigDecimal("0.50");
        if (MemberLevelEnum.PRO.equals(memberLevelEnum)) {
            dailyPrice = new BigDecimal("0.90");
        }
        return dailyPrice.multiply(BigDecimal.valueOf(durationDays)).setScale(2, BigDecimal.ROUND_HALF_UP);
    }

    private int calculatePointsAmount(MemberLevelEnum memberLevelEnum, int durationDays) {
        int dailyPrice = 6;
        if (MemberLevelEnum.PRO.equals(memberLevelEnum)) {
            dailyPrice = 10;
        }
        return dailyPrice * durationDays;
    }

    private String generateOrderNo() {
        return "MEM" + System.currentTimeMillis() + RandomUtil.randomNumbers(6);
    }
}
