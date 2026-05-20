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
import com.yupi.springbootinit.model.dto.member.AdminMemberGrantRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderCallbackRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderCancelRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderCreateRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderMockPayRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderQueryRequest;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.member.MemberOrderVO;
import com.yupi.springbootinit.service.MemberService;
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
 * 会员接口 Member Controller
 */
@RestController
@RequestMapping("/member")
@Api(tags = "Member")
public class MemberController {

    @Resource
    private MemberService memberService;

    @Resource
    private UserService userService;

    /**
     * 创建会员订单 Create member order
     */
    @PostMapping("/order/create")
    @OperationLog(module = "member", action = "create_member_order")
    @ApiOperation("创建会员订单 Create member order")
    public BaseResponse<MemberOrder> createMemberOrder(@RequestBody MemberOrderCreateRequest memberOrderCreateRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(memberService.createMemberOrder(memberOrderCreateRequest, loginUser));
    }

    /**
     * 会员订单支付回调 Member order payment callback
     */
    @PostMapping("/pay/callback")
    @OperationLog(module = "member", action = "member_pay_callback")
    @ApiOperation("会员订单支付回调 Member order payment callback")
    public BaseResponse<Boolean> memberPayCallback(@RequestBody MemberOrderCallbackRequest memberOrderCallbackRequest) {
        return ResultUtils.success(memberService.handleMemberPaymentCallback(memberOrderCallbackRequest));
    }

    /**
     * 模拟会员订单支付成功 Mock member order payment success
     */
    @PostMapping("/pay/mock")
    @OperationLog(module = "member", action = "mock_member_pay")
    @ApiOperation("模拟会员订单支付成功 Mock member order payment success")
    public BaseResponse<Boolean> mockMemberPay(@RequestBody MemberOrderMockPayRequest memberOrderMockPayRequest) {
        if (memberOrderMockPayRequest == null || memberOrderMockPayRequest.getOrderNo() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        MemberOrder memberOrder = memberService.getOne(new QueryWrapper<MemberOrder>()
                .eq("orderNo", memberOrderMockPayRequest.getOrderNo()));
        if (memberOrder == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR, "Member order not found");
        }
        MemberOrderCallbackRequest memberOrderCallbackRequest = new MemberOrderCallbackRequest();
        memberOrderCallbackRequest.setOrderNo(memberOrder.getOrderNo());
        memberOrderCallbackRequest.setPaidAmount(memberOrder.getOrderAmount());
        memberOrderCallbackRequest.setPaymentChannel(memberOrderMockPayRequest.getPaymentChannel());
        memberOrderCallbackRequest.setThirdPartyOrderNo("MOCK-" + memberOrder.getOrderNo());
        return ResultUtils.success(memberService.handleMemberPaymentCallback(memberOrderCallbackRequest));
    }

    /**
     * 取消我的待支付会员订单 Cancel my pending member order
     */
    @PostMapping("/cancel")
    @OperationLog(module = "member", action = "cancel_member_order")
    @ApiOperation("取消我的待支付会员订单 Cancel my pending member order")
    public BaseResponse<Boolean> cancelMemberOrder(@RequestBody MemberOrderCancelRequest memberOrderCancelRequest,
            HttpServletRequest request) {
        if (memberOrderCancelRequest == null || memberOrderCancelRequest.getOrderNo() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(memberService.cancelMemberOrder(memberOrderCancelRequest.getOrderNo(), loginUser, false));
    }

    /**
     * 管理员取消会员订单 Admin cancel member order
     */
    @PostMapping("/admin/cancel")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "member", action = "admin_cancel_member_order")
    @ApiOperation("管理员取消会员订单 Admin cancel member order")
    public BaseResponse<Boolean> adminCancelMemberOrder(@RequestBody MemberOrderCancelRequest memberOrderCancelRequest,
            HttpServletRequest request) {
        if (memberOrderCancelRequest == null || memberOrderCancelRequest.getOrderNo() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(memberService.cancelMemberOrder(memberOrderCancelRequest.getOrderNo(), loginUser, true));
    }

    /**
     * 分页查询我的会员订单 Page query my member orders
     */
    @PostMapping("/order/my/list/page")
    @ApiOperation("分页查询我的会员订单 Page query my member orders")
    public BaseResponse<Page<MemberOrderVO>> listMyMemberOrders(@RequestBody MemberOrderQueryRequest memberOrderQueryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(memberService.listMyMemberOrders(memberOrderQueryRequest, loginUser));
    }

    /**
     * 管理员分页查询会员订单 Admin page query member orders
     */
    @PostMapping("/order/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("管理员分页查询会员订单 Admin page query member orders")
    public BaseResponse<Page<MemberOrderVO>> listAllMemberOrders(@RequestBody MemberOrderQueryRequest memberOrderQueryRequest) {
        return ResultUtils.success(memberService.listAllMemberOrders(memberOrderQueryRequest));
    }

    /**
     * 管理员授予会员权限 Admin grant member privileges
     */
    @PostMapping("/grant")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "member", action = "admin_grant_member")
    @ApiOperation("管理员授予会员权限 Admin grant member privileges")
    public BaseResponse<MemberOrder> adminGrantMember(@RequestBody AdminMemberGrantRequest adminMemberGrantRequest) {
        return ResultUtils.success(memberService.adminGrantMember(adminMemberGrantRequest));
    }
}
