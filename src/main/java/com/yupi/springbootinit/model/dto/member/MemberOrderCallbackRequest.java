package com.yupi.springbootinit.model.dto.member;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class MemberOrderCallbackRequest implements Serializable {

    private String orderNo;

    private String paymentChannel;

    private String thirdPartyOrderNo;

    private BigDecimal paidAmount;

    private static final long serialVersionUID = 1L;
}
