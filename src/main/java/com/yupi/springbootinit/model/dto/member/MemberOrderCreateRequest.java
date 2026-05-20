package com.yupi.springbootinit.model.dto.member;

import java.io.Serializable;
import lombok.Data;

@Data
public class MemberOrderCreateRequest implements Serializable {

    private String memberLevel;

    private String planType;

    private Integer durationDays;

    private String orderType;

    private String paymentChannel;

    private static final long serialVersionUID = 1L;
}
