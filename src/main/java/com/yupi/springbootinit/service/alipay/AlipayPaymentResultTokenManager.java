package com.yupi.springbootinit.service.alipay;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.AlipayProperties;
import com.yupi.springbootinit.exception.BusinessException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import javax.annotation.Resource;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

/**
 * Creates short-lived tokens for reading a single payment result after an Alipay browser return.
 */
@Component
public class AlipayPaymentResultTokenManager {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final long TOKEN_TTL_SECONDS = 30 * 60L;
    private static final String KEY_CONTEXT = "ownai:alipay:payment-result:";

    @Resource
    private AlipayProperties alipayProperties;

    public String createToken(String orderNo) {
        if (StringUtils.isBlank(orderNo)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        long expiresAt = Instant.now().getEpochSecond() + TOKEN_TTL_SECONDS;
        String payload = encode(orderNo + ":" + expiresAt);
        return payload + "." + encode(sign(payload));
    }

    public boolean verifyToken(String orderNo, String token) {
        if (StringUtils.isAnyBlank(orderNo, token)) {
            return false;
        }
        String[] parts = token.split("\\.", -1);
        if (parts.length != 2) {
            return false;
        }
        try {
            byte[] expectedSignature = sign(parts[0]);
            byte[] actualSignature = Base64.getUrlDecoder().decode(parts[1]);
            if (!MessageDigest.isEqual(expectedSignature, actualSignature)) {
                return false;
            }
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            int separator = payload.lastIndexOf(':');
            if (separator <= 0 || !orderNo.equals(payload.substring(0, separator))) {
                return false;
            }
            long expiresAt = Long.parseLong(payload.substring(separator + 1));
            return expiresAt >= Instant.now().getEpochSecond();
        } catch (RuntimeException e) {
            return false;
        }
    }

    private byte[] sign(String payload) {
        String appPrivateKey = alipayProperties.normalizedAppPrivateKey();
        if (StringUtils.isBlank(appPrivateKey)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Alipay is not configured");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] key = digest.digest((KEY_CONTEXT + appPrivateKey).getBytes(StandardCharsets.UTF_8));
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(key, HMAC_ALGORITHM));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Failed to sign payment result");
        }
    }

    private String encode(String value) {
        return encode(value.getBytes(StandardCharsets.UTF_8));
    }

    private String encode(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }
}
