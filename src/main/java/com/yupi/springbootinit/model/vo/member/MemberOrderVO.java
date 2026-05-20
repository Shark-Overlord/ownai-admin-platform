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

    private Integer pointsAmount;

    private String paymentChannel;

    private Date payTime;

    private Date finishTime;

    private Date createTime;

    private static final long serialVersionUID = 1L;
}
