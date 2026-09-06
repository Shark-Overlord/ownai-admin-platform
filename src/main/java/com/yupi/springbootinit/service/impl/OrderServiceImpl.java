package com.yupi.springbootinit.service.impl;

import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.ArtworkMapper;
import com.yupi.springbootinit.mapper.ArtworkOrderMapper;
import com.yupi.springbootinit.mapper.UserMapper;
import com.yupi.springbootinit.model.dto.order.OrderCallbackRequest;
import com.yupi.springbootinit.model.dto.order.OrderCreateRequest;
import com.yupi.springbootinit.model.dto.order.OrderQueryRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.ArtworkOrder;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.ArtworkStatusEnum;
import com.yupi.springbootinit.model.enums.OrderStatusEnum;
import com.yupi.springbootinit.model.enums.OrderTypeEnum;
import com.yupi.springbootinit.model.enums.PointChangeTypeEnum;
import com.yupi.springbootinit.model.vo.order.OrderVO;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.OrderService;
import com.yupi.springbootinit.service.PointService;
import java.math.BigDecimal;
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
public class OrderServiceImpl extends ServiceImpl<ArtworkOrderMapper, ArtworkOrder> implements OrderService {

    @Resource
    private ArtworkMapper artworkMapper;

    @Resource
    private ArtworkService artworkService;

    @Resource
    private PointService pointService;

    @Resource
    private UserMapper userMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArtworkOrder createOrder(OrderCreateRequest orderCreateRequest, User loginUser) {
        ThrowUtils.throwIf(orderCreateRequest == null || orderCreateRequest.getArtworkId() == null, ErrorCode.PARAMS_ERROR);
        OrderTypeEnum orderTypeEnum = OrderTypeEnum.getEnumByValue(orderCreateRequest.getOrderType());
        ThrowUtils.throwIf(orderTypeEnum == null, ErrorCode.PARAMS_ERROR, "订单类型错误");
        ThrowUtils.throwIf(loginUser == null || loginUser.getId() == null, ErrorCode.NOT_LOGIN_ERROR);
        ThrowUtils.throwIf(!OrderTypeEnum.POINTS.equals(orderTypeEnum), ErrorCode.OPERATION_ERROR,
                "作品现金支付暂未开放，请使用积分兑换");
        // Acquire the account lock before any snapshot reads, and use fresh membership/balance.
        User lockedUser = userMapper.selectByIdForUpdate(loginUser.getId());
        ThrowUtils.throwIf(lockedUser == null, ErrorCode.NOT_LOGIN_ERROR);
        loginUser = lockedUser;
        Artwork artwork = artworkMapper.selectById(orderCreateRequest.getArtworkId());
        ThrowUtils.throwIf(artwork == null, ErrorCode.NOT_FOUND_ERROR, "作品不存在");
        ThrowUtils.throwIf(!ArtworkStatusEnum.PUBLISHED.getValue().equals(artwork.getStatus()), ErrorCode.OPERATION_ERROR,
                "仅支持购买已发布作品");
        ArtworkOrder existing = this.getOne(new QueryWrapper<ArtworkOrder>()
                .eq("userId", loginUser.getId()).eq("artworkId", artwork.getId())
                .eq("orderType", "points").eq("orderStatus", "completed").gt("pointsAmount", 0)
                .exists("SELECT 1 FROM point_record p WHERE p.userId = artwork_order.userId "
                        + "AND p.relatedType = 'order' AND p.relatedId = artwork_order.id "
                        + "AND p.changeType = 'redeem_consume' AND p.changeAmount = -artwork_order.pointsAmount")
                .orderByAsc("id").last("LIMIT 1"));
        if (existing != null) {
            artworkService.grantArtworkAccess(artwork.getId(), loginUser.getId(), existing.getId(), "points_exchange");
            return existing;
        }
        if (artworkService.hasArtworkAccess(artwork.getId(), loginUser)) {
            return null; // Already free/member-accessible: success, without an order or debit.
        }
        ArtworkOrder artworkOrder = new ArtworkOrder();
        artworkOrder.setOrderNo(generateOrderNo());
        artworkOrder.setUserId(loginUser.getId());
        artworkOrder.setArtworkId(artwork.getId());
        artworkOrder.setOrderType(orderTypeEnum.getValue());
        artworkOrder.setPaymentChannel(orderCreateRequest.getPaymentChannel());
        artworkOrder.setOrderStatus(OrderStatusEnum.PENDING.getValue());
        Integer pointsAmount = artwork.getPointsPrice();
        ThrowUtils.throwIf(pointsAmount == null || pointsAmount <= 0, ErrorCode.OPERATION_ERROR, "该作品不支持积分兑换");
        ThrowUtils.throwIf(orderCreateRequest.getExpectedPointsPrice() != null
                        && !pointsAmount.equals(orderCreateRequest.getExpectedPointsPrice()),
                ErrorCode.OPERATION_ERROR, "积分价格已变化，请重新确认");
        artworkOrder.setPaymentChannel("points");
        artworkOrder.setOrderAmount(BigDecimal.ZERO);
        artworkOrder.setPointsAmount(pointsAmount);
        artworkOrder.setOrderStatus(OrderStatusEnum.COMPLETED.getValue());
        artworkOrder.setPayTime(new Date());
        artworkOrder.setFinishTime(new Date());
        boolean result = this.save(artworkOrder);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "订单创建失败");
        pointService.deductPoints(loginUser.getId(), pointsAmount, PointChangeTypeEnum.REDEEM_CONSUME, "order",
                artworkOrder.getId(), "积分兑换作品");
        artworkService.grantArtworkAccess(artwork.getId(), loginUser.getId(), artworkOrder.getId(), "points_exchange");
        return artworkOrder;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean handlePaymentCallback(OrderCallbackRequest orderCallbackRequest) {
        // No verified cash payment integration exists for artwork orders. Membership
        // payments have their own signed provider callbacks and are not changed here.
        throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "作品支付回调未开放");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean cancelOrder(String orderNo, User loginUser, boolean adminOperation) {
        ThrowUtils.throwIf(StringUtils.isBlank(orderNo), ErrorCode.PARAMS_ERROR, "订单号不能为空");
        ArtworkOrder artworkOrder = this.getOne(new QueryWrapper<ArtworkOrder>().eq("orderNo", orderNo));
        ThrowUtils.throwIf(artworkOrder == null, ErrorCode.NOT_FOUND_ERROR, "订单不存在");
        if (!adminOperation) {
            ThrowUtils.throwIf(loginUser == null || !artworkOrder.getUserId().equals(loginUser.getId()),
                    ErrorCode.NO_AUTH_ERROR, "无权取消该订单");
        }
        ThrowUtils.throwIf(!OrderStatusEnum.PENDING.getValue().equals(artworkOrder.getOrderStatus()),
                ErrorCode.OPERATION_ERROR, "仅待支付订单可取消");
        artworkOrder.setOrderStatus(OrderStatusEnum.CANCELLED.getValue());
        return this.updateById(artworkOrder);
    }

    @Override
    public Page<OrderVO> listMyOrders(OrderQueryRequest orderQueryRequest, User loginUser) {
        return doListOrders(orderQueryRequest, loginUser.getId(), false);
    }

    @Override
    public Page<OrderVO> listAllOrders(OrderQueryRequest orderQueryRequest) {
        return doListOrders(orderQueryRequest, null, true);
    }

    private Page<OrderVO> doListOrders(OrderQueryRequest orderQueryRequest, Long userId, boolean adminView) {
        OrderQueryRequest safeRequest = orderQueryRequest == null ? new OrderQueryRequest() : orderQueryRequest;
        QueryWrapper<ArtworkOrder> queryWrapper = new QueryWrapper<>();
        if (!adminView || safeRequest.getUserId() != null) {
            queryWrapper.eq("userId", adminView ? safeRequest.getUserId() : userId);
        }
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getOrderNo()), "orderNo", safeRequest.getOrderNo());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getOrderStatus()), "orderStatus", safeRequest.getOrderStatus());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getOrderType()), "orderType", safeRequest.getOrderType());
        queryWrapper.orderByDesc("id");
        Page<ArtworkOrder> orderPage = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), queryWrapper);
        Page<OrderVO> orderVOPage = new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(), orderPage.getTotal());
        orderVOPage.setRecords(buildOrderVOList(orderPage.getRecords()));
        return orderVOPage;
    }

    private List<OrderVO> buildOrderVOList(List<ArtworkOrder> orderList) {
        List<Long> artworkIds = orderList.stream().map(ArtworkOrder::getArtworkId).distinct().collect(Collectors.toList());
        Map<Long, Artwork> artworkMap = artworkIds.isEmpty() ? Collections.emptyMap() : artworkMapper.selectBatchIds(artworkIds)
                .stream().collect(Collectors.toMap(Artwork::getId, item -> item));
        return orderList.stream().map(order -> {
            OrderVO orderVO = new OrderVO();
            BeanUtils.copyProperties(order, orderVO);
            Artwork artwork = artworkMap.get(order.getArtworkId());
            if (artwork != null) {
                orderVO.setArtworkTitle(artwork.getTitle());
                orderVO.setArtworkCoverUrl(artwork.getCoverUrl());
            }
            return orderVO;
        }).collect(Collectors.toList());
    }

    private String generateOrderNo() {
        return "ORD" + System.currentTimeMillis() + RandomUtil.randomNumbers(6);
    }
}
