package com.yupi.springbootinit.service.alipay;

import java.math.BigDecimal;
import java.util.Date;
import lombok.Data;

@Data
public class AlipayPagePaymentCommand {

    private String outTradeNo;

    private BigDecimal totalAmount;

    private String subject;

    private Date expiresAt;
}
