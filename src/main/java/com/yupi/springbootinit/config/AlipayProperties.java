package com.yupi.springbootinit.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Runtime-only Alipay configuration. Secrets are supplied through environment variables.
 */
@Configuration
@ConfigurationProperties(prefix = "alipay")
@Data
public class AlipayProperties {

    private boolean enabled;

    private String appId;

    private String appPrivateKey;

    private String alipayPublicKey;

    private String gatewayUrl;

    private String notifyUrl;

    private String returnUrl;

    /**
     * Browser-facing page used after the verified server return handler finishes.
     */
    private String frontendReturnUrl;

    private int pendingOrderTimeoutMinutes = 15;

    private long pendingOrderTimeoutScanIntervalMs = 60000L;

    /**
     * The SDK expects compact Base64 key text. This also accepts PEM copied from Alipay.
     */
    public String normalizedAppPrivateKey() {
        return normalizeKey(appPrivateKey);
    }

    public String normalizedAlipayPublicKey() {
        return normalizeKey(alipayPublicKey);
    }

    private String normalizeKey(String value) {
        if (value == null) {
            return null;
        }
        return value.replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("\\n", "")
                .replaceAll("\\s+", "");
    }
}
