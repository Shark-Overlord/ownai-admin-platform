package com.yupi.springbootinit.model.dto.order;

import java.io.Serializable;
import lombok.Data;

@Data
public class OrderCreateRequest implements Serializable {

    private Long artworkId;

    private String orderType;

    private String paymentChannel;

    /** Price displayed in the confirmation dialog; reject a changed price. */
    private Integer expectedPointsPrice;

    private static final long serialVersionUID = 1L;
}
