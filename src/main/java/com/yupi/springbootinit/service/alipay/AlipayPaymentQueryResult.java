package com.yupi.springbootinit.service.alipay;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class AlipayPaymentQueryResult {

    private boolean requestSuccess;

    private String tradeStatus;

    private String tradeNo;

    private BigDecimal totalAmount;

    private String errorMessage;

    public boolean isPaid() {
        return "TRADE_SUCCESS".equals(tradeStatus) || "TRADE_FINISHED".equals(tradeStatus);
    }
}
