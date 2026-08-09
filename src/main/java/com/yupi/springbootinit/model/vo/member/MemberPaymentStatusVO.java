package com.yupi.springbootinit.model.vo.member;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class MemberPaymentStatusVO implements Serializable {

    private String orderNo;

    private String orderStatus;

    private String paymentChannel;

    private boolean memberActive;

    private String memberPlanType;

    private Date memberExpireTime;

    private String failureReason;

    private Date expiresAt;

    private static final long serialVersionUID = 1L;
}
