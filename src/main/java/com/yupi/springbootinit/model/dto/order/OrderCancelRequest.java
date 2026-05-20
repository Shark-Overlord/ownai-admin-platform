package com.yupi.springbootinit.model.dto.order;

import java.io.Serializable;
import lombok.Data;

@Data
public class OrderCancelRequest implements Serializable {

    private String orderNo;

    private static final long serialVersionUID = 1L;
}
