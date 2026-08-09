package com.yupi.springbootinit.service;

import com.yupi.springbootinit.model.dto.member.MemberPaymentCreateRequest;
import com.yupi.springbootinit.model.dto.member.MemberPaymentResumeRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.member.MemberPaymentCreateVO;
import com.yupi.springbootinit.model.vo.member.MemberPaymentStatusVO;
import java.util.Map;

public interface AlipayMemberPaymentService {

    MemberPaymentCreateVO createPayment(MemberPaymentCreateRequest createRequest, User loginUser);

    MemberPaymentCreateVO resumePayment(MemberPaymentResumeRequest resumeRequest, User loginUser);

    MemberPaymentStatusVO getPaymentStatus(String orderNo, User loginUser);

    MemberPaymentStatusVO getPaymentStatusByResultToken(String orderNo, String resultToken);

    String createPaymentResultToken(String orderNo);

    boolean processNotification(Map<String, String> notificationParams);

    /**
     * Verifies the browser return parameters and refreshes the order from Alipay for display only.
     * Membership activation remains guarded by the verified provider query/callback path.
     */
    boolean processReturn(Map<String, String> returnParams);

    boolean cancelPayment(String orderNo, User loginUser, boolean adminOperation);

    void expirePendingOrders();
}
