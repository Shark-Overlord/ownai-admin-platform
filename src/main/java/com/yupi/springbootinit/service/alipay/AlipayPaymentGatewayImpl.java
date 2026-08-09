package com.yupi.springbootinit.service.alipay;

import com.alipay.api.AlipayClient;
import com.alipay.api.AlipayConfig;
import com.alipay.api.DefaultAlipayClient;
import com.alipay.api.domain.AlipayTradeCloseModel;
import com.alipay.api.domain.AlipayTradePagePayModel;
import com.alipay.api.domain.AlipayTradeQueryModel;
import com.alipay.api.internal.util.AlipaySignature;
import com.alipay.api.request.AlipayTradeCloseRequest;
import com.alipay.api.request.AlipayTradePagePayRequest;
import com.alipay.api.request.AlipayTradeQueryRequest;
import com.alipay.api.response.AlipayTradeCloseResponse;
import com.alipay.api.response.AlipayTradePagePayResponse;
import com.alipay.api.response.AlipayTradeQueryResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.AlipayProperties;
import com.yupi.springbootinit.exception.BusinessException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Map;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class AlipayPaymentGatewayImpl implements AlipayPaymentGateway {

    private static final String CHARSET = "UTF-8";
    private static final String SIGN_TYPE = "RSA2";
    private static final DateTimeFormatter ALIPAY_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.of("Asia/Shanghai"));

    @Resource
    private AlipayProperties alipayProperties;

    @Override
    public String createPagePaymentForm(AlipayPagePaymentCommand command) {
        try {
            AlipayTradePagePayRequest request = new AlipayTradePagePayRequest();
            request.setNotifyUrl(alipayProperties.getNotifyUrl());
            request.setReturnUrl(alipayProperties.getReturnUrl());
            AlipayTradePagePayModel model = new AlipayTradePagePayModel();
            model.setOutTradeNo(command.getOutTradeNo());
            model.setTotalAmount(command.getTotalAmount().setScale(2, RoundingMode.HALF_UP).toPlainString());
            model.setSubject(command.getSubject());
            model.setProductCode("FAST_INSTANT_TRADE_PAY");
            if (command.getExpiresAt() != null) {
                model.setTimeExpire(ALIPAY_TIME_FORMATTER.format(command.getExpiresAt().toInstant()));
            }
            request.setBizModel(model);
            AlipayTradePagePayResponse response = createClient().pageExecute(request);
            if (!response.isSuccess()) {
                throw new BusinessException(ErrorCode.OPERATION_ERROR,
                        "Alipay checkout creation failed: " + safeMessage(response.getSubMsg(), response.getMsg()));
            }
            String paymentForm = response.getBody();
            if (!StringUtils.containsIgnoreCase(paymentForm, "<form")) {
                throw new BusinessException(ErrorCode.OPERATION_ERROR, "Alipay did not return a payment form");
            }
            return paymentForm;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to create Alipay page payment", e);
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Alipay checkout creation failed");
        }
    }

    @Override
    public boolean verifyNotification(Map<String, String> notificationParams) {
        try {
            validateRuntimeConfig();
            return AlipaySignature.rsaCheckV1(notificationParams, alipayProperties.normalizedAlipayPublicKey(), CHARSET,
                    SIGN_TYPE);
        } catch (Exception e) {
            log.warn("Alipay notification signature verification failed", e);
            return false;
        }
    }

    @Override
    public AlipayPaymentQueryResult queryTrade(String outTradeNo) {
        AlipayPaymentQueryResult result = new AlipayPaymentQueryResult();
        try {
            AlipayTradeQueryRequest request = new AlipayTradeQueryRequest();
            AlipayTradeQueryModel model = new AlipayTradeQueryModel();
            model.setOutTradeNo(outTradeNo);
            request.setBizModel(model);
            AlipayTradeQueryResponse response = createClient().execute(request);
            result.setRequestSuccess(response.isSuccess());
            result.setTradeStatus(response.getTradeStatus());
            result.setTradeNo(response.getTradeNo());
            result.setTotalAmount(parseAmount(response.getTotalAmount()));
            result.setErrorMessage(safeMessage(response.getSubMsg(), response.getMsg()));
            if (!response.isSuccess()) {
                log.warn("Alipay trade query rejected for {}: subCode={}, subMsg={}", outTradeNo,
                        response.getSubCode(), response.getSubMsg());
            }
            return result;
        } catch (Exception e) {
            log.warn("Failed to query Alipay trade {}", outTradeNo, e);
            result.setRequestSuccess(false);
            result.setErrorMessage("Alipay query unavailable");
            return result;
        }
    }

    @Override
    public AlipayPaymentCloseResult closeTrade(String outTradeNo) {
        AlipayPaymentCloseResult result = new AlipayPaymentCloseResult();
        try {
            AlipayTradeCloseRequest request = new AlipayTradeCloseRequest();
            AlipayTradeCloseModel model = new AlipayTradeCloseModel();
            model.setOutTradeNo(outTradeNo);
            request.setBizModel(model);
            AlipayTradeCloseResponse response = createClient().execute(request);
            result.setClosed(response.isSuccess());
            result.setTradeNotFound("ACQ.TRADE_NOT_EXIST".equals(response.getSubCode()));
            result.setErrorMessage(safeMessage(response.getSubMsg(), response.getMsg()));
            return result;
        } catch (Exception e) {
            log.warn("Failed to close Alipay trade {}", outTradeNo, e);
            result.setErrorMessage("Alipay close unavailable");
            return result;
        }
    }

    private AlipayClient createClient() throws Exception {
        validateRuntimeConfig();
        AlipayConfig config = new AlipayConfig();
        config.setServerUrl(alipayProperties.getGatewayUrl());
        config.setAppId(alipayProperties.getAppId());
        config.setPrivateKey(alipayProperties.normalizedAppPrivateKey());
        config.setFormat("json");
        config.setCharset(CHARSET);
        config.setSignType(SIGN_TYPE);
        config.setAlipayPublicKey(alipayProperties.normalizedAlipayPublicKey());
        config.setConnectTimeout(10000);
        config.setReadTimeout(20000);
        return new DefaultAlipayClient(config);
    }

    private void validateRuntimeConfig() {
        if (!alipayProperties.isEnabled() || StringUtils.isAnyBlank(alipayProperties.getAppId(),
                alipayProperties.normalizedAppPrivateKey(), alipayProperties.normalizedAlipayPublicKey(),
                alipayProperties.getGatewayUrl(), alipayProperties.getNotifyUrl())) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Alipay is not configured");
        }
    }

    private BigDecimal parseAmount(String amount) {
        try {
            return StringUtils.isBlank(amount) ? null : new BigDecimal(amount);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String safeMessage(String subMessage, String message) {
        return StringUtils.abbreviate(StringUtils.defaultIfBlank(subMessage, message), 300);
    }
}
