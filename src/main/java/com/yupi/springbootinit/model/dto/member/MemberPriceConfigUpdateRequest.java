package com.yupi.springbootinit.model.dto.member;

import java.io.Serializable;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class MemberPriceConfigUpdateRequest implements Serializable {

    private Long id;

    private String memberLevel;

    private String planType;

    private BigDecimal cashPrice;

    private Integer pointsPrice;

    private Integer durationDays;

    private String description;

    private Integer status;

    private static final long serialVersionUID = 1L;
}
