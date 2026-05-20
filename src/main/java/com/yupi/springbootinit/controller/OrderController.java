package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.order.OrderCallbackRequest;
import com.yupi.springbootinit.model.dto.order.OrderCancelRequest;
import com.yupi.springbootinit.model.dto.order.OrderCreateRequest;
import com.yupi.springbootinit.model.dto.order.OrderMockPayRequest;
import com.yupi.springbootinit.model.dto.order.OrderQueryRequest;
import com.yupi.springbootinit.model.entity.ArtworkOrder;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.order.OrderVO;
import com.yupi.springbootinit.service.OrderService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 艺术作品订单接口 Artwork Order Controller
 */
@RestController
@RequestMapping("/order")
@Api(tags = "Artwork Order")
public class OrderController {

    @Resource
    private OrderService orderService;

    @Resource
    private UserService userService;

    /**
     * 创建艺术作品订单 Create artwork order
     */
    @PostMapping("/create")
    @OperationLog(module = "order", action = "create_artwork_order")
    @ApiOperation("创建艺术作品订单 Create artwork order")
    public BaseResponse<ArtworkOrder> createOrder(@RequestBody OrderCreateRequest orderCreateRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(orderService.createOrder(orderCreateRequest, loginUser));
    }

    /**
     * 艺术作品订单支付回调 Artwork order payment callback
     */
    @PostMapping("/pay/callback")
    @OperationLog(module = "order", action = "artwork_pay_callback")
    @ApiOperation("艺术作品订单支付回调 Artwork order payment callback")
    public BaseResponse<Boolean> payCallback(@RequestBody OrderCallbackRequest orderCallbackRequest) {
        return ResultUtils.success(orderService.handlePaymentCallback(orderCallbackRequest));
    }

    /**
     * 模拟艺术作品订单支付成功 Mock artwork order payment success
     */
    @PostMapping("/pay/mock")
    @OperationLog(module = "order", action = "mock_artwork_pay")
    @ApiOperation("模拟艺术作品订单支付成功 Mock artwork order payment success")
    public BaseResponse<Boolean> mockPay(@RequestBody OrderMockPayRequest orderMockPayRequest) {
        if (orderMockPayRequest == null || orderMockPayRequest.getOrderNo() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        ArtworkOrder artworkOrder = orderService.getOne(new QueryWrapper<ArtworkOrder>()
                .eq("orderNo", orderMockPayRequest.getOrderNo()));
        if (artworkOrder == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR, "Order not found");
        }
        OrderCallbackRequest orderCallbackRequest = new OrderCallbackRequest();
        orderCallbackRequest.setOrderNo(artworkOrder.getOrderNo());
        orderCallbackRequest.setPaidAmount(artworkOrder.getOrderAmount());
        orderCallbackRequest.setPaymentChannel(orderMockPayRequest.getPaymentChannel());
        orderCallbackRequest.setThirdPartyOrderNo("MOCK-" + artworkOrder.getOrderNo());
        return ResultUtils.success(orderService.handlePaymentCallback(orderCallbackRequest));
    }

    /**
     * 取消我的待支付艺术作品订单 Cancel my pending artwork order
     */
    @PostMapping("/cancel")
    @OperationLog(module = "order", action = "cancel_artwork_order")
    @ApiOperation("取消我的待支付艺术作品订单 Cancel my pending artwork order")
    public BaseResponse<Boolean> cancelOrder(@RequestBody OrderCancelRequest orderCancelRequest,
            HttpServletRequest request) {
        if (orderCancelRequest == null || orderCancelRequest.getOrderNo() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(orderService.cancelOrder(orderCancelRequest.getOrderNo(), loginUser, false));
    }

    /**
     * 管理员取消艺术作品订单 Admin cancel artwork order
     */
    @PostMapping("/admin/cancel")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "order", action = "admin_cancel_artwork_order")
    @ApiOperation("管理员取消艺术作品订单 Admin cancel artwork order")
    public BaseResponse<Boolean> adminCancelOrder(@RequestBody OrderCancelRequest orderCancelRequest,
            HttpServletRequest request) {
        if (orderCancelRequest == null || orderCancelRequest.getOrderNo() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(orderService.cancelOrder(orderCancelRequest.getOrderNo(), loginUser, true));
    }

    /**
     * 分页查询我的艺术作品订单 Page query my artwork orders
     */
    @PostMapping("/my/list/page")
    @ApiOperation("分页查询我的艺术作品订单 Page query my artwork orders")
    public BaseResponse<Page<OrderVO>> listMyOrders(@RequestBody OrderQueryRequest orderQueryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(orderService.listMyOrders(orderQueryRequest, loginUser));
    }

    /**
     * 管理员分页查询艺术作品订单 Admin page query artwork orders
     */
    @PostMapping("/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("管理员分页查询艺术作品订单 Admin page query artwork orders")
    public BaseResponse<Page<OrderVO>> listAllOrders(@RequestBody OrderQueryRequest orderQueryRequest) {
        return ResultUtils.success(orderService.listAllOrders(orderQueryRequest));
    }
}
