package com.yupi.springbootinit.model.dto.member;

import java.io.Serializable;
import lombok.Data;

@Data
public class MemberOrderMockPayRequest implements Serializable {

    private String orderNo;

    private String paymentChannel;

    private static final long serialVersionUID = 1L;
}
