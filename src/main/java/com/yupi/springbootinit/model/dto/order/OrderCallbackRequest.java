package com.yupi.springbootinit.model.dto.order;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class OrderCallbackRequest implements Serializable {

    private String orderNo;

    private String paymentChannel;

    private String thirdPartyOrderNo;

    private BigDecimal paidAmount;

    private static final long serialVersionUID = 1L;
}
