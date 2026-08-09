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
import com.yupi.springbootinit.model.dto.member.MemberOrderCancelRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderQueryRequest;
import com.yupi.springbootinit.model.dto.member.MemberPaymentCreateRequest;
import com.yupi.springbootinit.model.dto.member.MemberPaymentResumeRequest;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.member.MemberOrderVO;
import com.yupi.springbootinit.model.vo.member.MemberPaymentCreateVO;
import com.yupi.springbootinit.model.vo.member.MemberPaymentStatusVO;
import com.yupi.springbootinit.service.AlipayMemberPaymentService;
import com.yupi.springbootinit.service.MemberService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/member")
@Api(tags = "Member")
public class MemberController {

    @Resource
    private MemberService memberService;

    @Resource
    private UserService userService;

    @Resource
    private AlipayMemberPaymentService alipayMemberPaymentService;

    @PostMapping("/payment/create")
    @OperationLog(module = "member", action = "create_alipay_member_payment")
    @ApiOperation("Create Alipay membership checkout")
    public BaseResponse<MemberPaymentCreateVO> createAlipayPayment(
            @RequestBody MemberPaymentCreateRequest createRequest, HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(alipayMemberPaymentService.createPayment(createRequest, loginUser));
    }

    @PostMapping("/payment/resume")
    @OperationLog(module = "member", action = "resume_alipay_member_payment")
    @ApiOperation("Resume an existing pending Alipay membership checkout")
    public BaseResponse<MemberPaymentCreateVO> resumeAlipayPayment(
            @RequestBody MemberPaymentResumeRequest resumeRequest, HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(alipayMemberPaymentService.resumePayment(resumeRequest, loginUser));
    }

    @GetMapping("/payment/status")
    @ApiOperation("Query authenticated user's Alipay membership payment")
    public BaseResponse<MemberPaymentStatusVO> getAlipayPaymentStatus(@RequestParam String orderNo,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(alipayMemberPaymentService.getPaymentStatus(orderNo, loginUser));
    }

    @PostMapping("/cancel")
    @OperationLog(module = "member", action = "cancel_member_order")
    public BaseResponse<Boolean> cancelMemberOrder(@RequestBody MemberOrderCancelRequest cancelRequest,
            HttpServletRequest request) {
        if (cancelRequest == null || cancelRequest.getOrderNo() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        MemberOrder order = memberService.getOne(new QueryWrapper<MemberOrder>().eq("orderNo", cancelRequest.getOrderNo()));
        if (order != null && "alipay".equals(order.getPaymentChannel())) {
            return ResultUtils.success(alipayMemberPaymentService.cancelPayment(cancelRequest.getOrderNo(), loginUser, false));
        }
        return ResultUtils.success(memberService.cancelMemberOrder(cancelRequest.getOrderNo(), loginUser, false));
    }

    @PostMapping("/admin/cancel")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "member", action = "admin_cancel_member_order")
    public BaseResponse<Boolean> adminCancelMemberOrder(@RequestBody MemberOrderCancelRequest cancelRequest,
            HttpServletRequest request) {
        if (cancelRequest == null || cancelRequest.getOrderNo() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        MemberOrder order = memberService.getOne(new QueryWrapper<MemberOrder>().eq("orderNo", cancelRequest.getOrderNo()));
        if (order != null && "alipay".equals(order.getPaymentChannel())) {
            return ResultUtils.success(alipayMemberPaymentService.cancelPayment(cancelRequest.getOrderNo(), loginUser, true));
        }
        return ResultUtils.success(memberService.cancelMemberOrder(cancelRequest.getOrderNo(), loginUser, true));
    }

    @PostMapping("/order/my/list/page")
    public BaseResponse<Page<MemberOrderVO>> listMyMemberOrders(@RequestBody MemberOrderQueryRequest queryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(memberService.listMyMemberOrders(queryRequest, loginUser));
    }

    @PostMapping("/order/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Page<MemberOrderVO>> listAllMemberOrders(@RequestBody MemberOrderQueryRequest queryRequest) {
        return ResultUtils.success(memberService.listAllMemberOrders(queryRequest));
    }

    @PostMapping("/grant")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "member", action = "admin_grant_member")
    public BaseResponse<MemberOrder> adminGrantMember(@RequestBody AdminMemberGrantRequest grantRequest) {
        return ResultUtils.success(memberService.adminGrantMember(grantRequest));
    }
}
