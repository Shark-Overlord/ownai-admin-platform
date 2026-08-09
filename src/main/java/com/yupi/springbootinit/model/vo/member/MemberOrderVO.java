package com.yupi.springbootinit.model.vo.member;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import lombok.Data;

@Data
public class MemberOrderVO implements Serializable {

    private Long id;

    private String orderNo;

    private Long userId;

    private String userName;

    private String memberLevel;

    private String planType;

    private Integer durationDays;

    private String orderType;

    private String orderStatus;

    private BigDecimal orderAmount;

    private Long amountMinor;

    private String currency;

    private Integer pointsAmount;

    private String paymentChannel;

    private String thirdPartyOrderNo;

    private String failureReason;

    private Date payTime;

    private Date finishTime;

    private Date createTime;

    /** Payment deadline for pending Alipay orders. */
    private Date expiresAt;

    private static final long serialVersionUID = 1L;
}
