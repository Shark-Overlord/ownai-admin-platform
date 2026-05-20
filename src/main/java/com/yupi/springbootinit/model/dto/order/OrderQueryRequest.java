package com.yupi.springbootinit.model.dto.order;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class OrderQueryRequest extends PageRequest implements Serializable {

    private String orderNo;

    private String orderStatus;

    private String orderType;

    private Long userId;

    private static final long serialVersionUID = 1L;
}
