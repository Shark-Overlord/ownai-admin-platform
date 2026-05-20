package com.yupi.springbootinit.model.dto.order;

import java.io.Serializable;
import lombok.Data;

@Data
public class OrderMockPayRequest implements Serializable {

    private String orderNo;

    private String paymentChannel;

    private static final long serialVersionUID = 1L;
}
