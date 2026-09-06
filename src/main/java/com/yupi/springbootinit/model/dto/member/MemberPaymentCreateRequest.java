package com.yupi.springbootinit.model.dto.member;

import java.io.Serializable;
import lombok.Data;

@Data
public class MemberPaymentCreateRequest implements Serializable {

    /** month, year, or lifetime */
    private String planType;

    /** A UUID generated once by the client for retry-safe checkout creation. */
    private String requestId;

    /** points for a point recharge; quantity and quote are required for this product. */
    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = com.yupi.springbootinit.model.dto.member.RechargeQuantityDeserializer.class)
    private Integer quantity;
    private java.math.BigDecimal expectedUnitPrice;
    private Integer expectedPointsPerUnit;

    private static final long serialVersionUID = 1L;
}
