package com.yupi.springbootinit.service.alipay;

import java.util.Map;

/**
 * Isolates Alipay SDK calls from membership-order state changes.
 */
public interface AlipayPaymentGateway {

    /**
     * Creates the signed HTML form required by Alipay computer website payment.
     * The browser must submit this form with POST; it is not a redirect URL.
     */
    String createPagePaymentForm(AlipayPagePaymentCommand command);

    boolean verifyNotification(Map<String, String> notificationParams);

    AlipayPaymentQueryResult queryTrade(String outTradeNo);

    AlipayPaymentCloseResult closeTrade(String outTradeNo);
}
