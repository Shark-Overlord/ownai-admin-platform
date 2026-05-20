package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.member.AdminMemberGrantRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderCallbackRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderCreateRequest;
import com.yupi.springbootinit.model.dto.member.MemberOrderQueryRequest;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.member.MemberOrderVO;

public interface MemberService extends IService<MemberOrder> {

    MemberOrder createMemberOrder(MemberOrderCreateRequest memberOrderCreateRequest, User loginUser);

    boolean handleMemberPaymentCallback(MemberOrderCallbackRequest memberOrderCallbackRequest);

    boolean cancelMemberOrder(String orderNo, User loginUser, boolean adminOperation);

    MemberOrder adminGrantMember(AdminMemberGrantRequest adminMemberGrantRequest);

    Page<MemberOrderVO> listMyMemberOrders(MemberOrderQueryRequest memberOrderQueryRequest, User loginUser);

    Page<MemberOrderVO> listAllMemberOrders(MemberOrderQueryRequest memberOrderQueryRequest);

    void activateMember(Long userId, String memberLevel, String planType, Integer durationDays);
}
