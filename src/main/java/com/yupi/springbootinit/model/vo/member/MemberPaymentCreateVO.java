package com.yupi.springbootinit.model.vo.member;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class MemberPaymentCreateVO implements Serializable {

    private String orderNo;

    private String paymentChannel;

    /**
     * Signed Alipay HTML form. The client must submit it with POST rather than navigate to it as a URL.
     */
    private String paymentFormHtml;

    private String orderStatus;

    private Date expiresAt;

    private static final long serialVersionUID = 1L;
}
