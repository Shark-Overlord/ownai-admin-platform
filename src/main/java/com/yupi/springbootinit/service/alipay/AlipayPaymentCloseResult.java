package com.yupi.springbootinit.service.alipay;

import lombok.Data;

@Data
public class AlipayPaymentCloseResult {

    private boolean closed;

    private boolean tradeNotFound;

    private String errorMessage;
}
