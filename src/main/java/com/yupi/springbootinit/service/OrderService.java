package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.order.OrderCallbackRequest;
import com.yupi.springbootinit.model.dto.order.OrderCreateRequest;
import com.yupi.springbootinit.model.dto.order.OrderQueryRequest;
import com.yupi.springbootinit.model.entity.ArtworkOrder;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.order.OrderVO;

public interface OrderService extends IService<ArtworkOrder> {

    ArtworkOrder createOrder(OrderCreateRequest orderCreateRequest, User loginUser);

    boolean handlePaymentCallback(OrderCallbackRequest orderCallbackRequest);

    boolean cancelOrder(String orderNo, User loginUser, boolean adminOperation);

    Page<OrderVO> listMyOrders(OrderQueryRequest orderQueryRequest, User loginUser);

    Page<OrderVO> listAllOrders(OrderQueryRequest orderQueryRequest);
}
