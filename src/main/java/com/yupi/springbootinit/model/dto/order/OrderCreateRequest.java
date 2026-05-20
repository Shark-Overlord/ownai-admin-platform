package com.yupi.springbootinit.model.dto.order;

import java.io.Serializable;
import lombok.Data;

@Data
public class OrderCreateRequest implements Serializable {

    private Long artworkId;

    private String orderType;

    private String paymentChannel;

    private static final long serialVersionUID = 1L;
}
