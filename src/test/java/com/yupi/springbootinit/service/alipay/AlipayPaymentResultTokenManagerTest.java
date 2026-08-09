package com.yupi.springbootinit.service.alipay;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.yupi.springbootinit.config.AlipayProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class AlipayPaymentResultTokenManagerTest {

    private AlipayPaymentResultTokenManager tokenManager;

    @BeforeEach
    void setUp() {
        AlipayProperties properties = new AlipayProperties();
        properties.setAppPrivateKey("test-private-key-material");
        tokenManager = new AlipayPaymentResultTokenManager();
        ReflectionTestUtils.setField(tokenManager, "alipayProperties", properties);
    }

    @Test
    void tokenIsBoundToOrderAndRejectsTampering() {
        String orderNo = "MEM10001";
        String token = tokenManager.createToken(orderNo);

        assertTrue(tokenManager.verifyToken(orderNo, token));
        assertFalse(tokenManager.verifyToken("MEM10002", token));
        assertFalse(tokenManager.verifyToken(orderNo, token + "x"));
        assertFalse(tokenManager.verifyToken(orderNo, "invalid"));
    }
}
