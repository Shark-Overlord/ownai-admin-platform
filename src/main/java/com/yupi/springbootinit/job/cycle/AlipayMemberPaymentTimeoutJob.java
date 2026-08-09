package com.yupi.springbootinit.job.cycle;

import com.yupi.springbootinit.service.AlipayMemberPaymentService;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Prevents abandoned checkout attempts from remaining pending forever.
 */
@Component
@Slf4j
public class AlipayMemberPaymentTimeoutJob {

    @Resource
    private AlipayMemberPaymentService alipayMemberPaymentService;

    @Scheduled(fixedDelayString = "${alipay.pending-order-timeout-scan-interval-ms:60000}")
    public void expirePendingOrders() {
        try {
            alipayMemberPaymentService.expirePendingOrders();
        } catch (RuntimeException e) {
            log.warn("Alipay member payment expiration scan failed", e);
        }
    }
}
