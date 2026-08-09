package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.config.AlipayProperties;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.model.vo.member.MemberPaymentStatusVO;
import com.yupi.springbootinit.service.AlipayMemberPaymentService;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Alipay server callback. This endpoint intentionally does not require user authentication.
 */
@RestController
@RequestMapping("/payment/alipay")
public class AlipayPaymentController {

    @Resource
    private AlipayMemberPaymentService alipayMemberPaymentService;

    @Resource
    private AlipayProperties alipayProperties;

    @PostMapping(value = "/notify", produces = MediaType.TEXT_PLAIN_VALUE)
    public String notifyPayment(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (values != null && values.length > 0) {
                params.put(key, values[0]);
            }
        });
        try {
            return alipayMemberPaymentService.processNotification(params) ? "success" : "failure";
        } catch (RuntimeException e) {
            return "failure";
        }
    }

    /**
     * Browser return endpoint. Alipay calls this address after checkout; it verifies the signed parameters server-side
     * and then redirects the browser to the SPA result page. It never grants membership from return parameters alone.
     */
    @GetMapping("/return")
    public void returnPayment(HttpServletRequest request, HttpServletResponse response) throws IOException {
        Map<String, String> params = extractParams(request);
        boolean verified = alipayMemberPaymentService.processReturn(params);
        String orderNo = params.get("out_trade_no");
        String resultToken = verified ? alipayMemberPaymentService.createPaymentResultToken(orderNo) : null;
        response.sendRedirect(buildFrontendResultUrl(orderNo, verified && resultToken != null, resultToken));
    }

    @GetMapping("/result/status")
    public BaseResponse<MemberPaymentStatusVO> getPaymentResultStatus(@RequestParam String orderNo,
            @RequestParam String resultToken) {
        return ResultUtils.success(alipayMemberPaymentService.getPaymentStatusByResultToken(orderNo, resultToken));
    }

    private Map<String, String> extractParams(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (values != null && values.length > 0) {
                params.put(key, values[0]);
            }
        });
        return params;
    }

    private String buildFrontendResultUrl(String orderNo, boolean verified, String resultToken) {
        String baseUrl = alipayProperties.getFrontendReturnUrl();
        String separator = baseUrl.contains("?") ? "&" : "?";
        StringBuilder target = new StringBuilder(baseUrl).append(separator)
                .append("orderNo=").append(urlEncode(orderNo == null ? "" : orderNo));
        if (!verified) {
            target.append("&paymentError=return_verification_failed");
        } else {
            target.append("&resultToken=")
                    .append(urlEncode(resultToken));
        }
        return target.toString();
    }

    private String urlEncode(String value) {
        try {
            return URLEncoder.encode(value, StandardCharsets.UTF_8.name());
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException("UTF-8 encoding is unavailable", e);
        }
    }
}
