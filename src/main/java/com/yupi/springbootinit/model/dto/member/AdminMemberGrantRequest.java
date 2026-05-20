package com.yupi.springbootinit.model.dto.member;

import java.io.Serializable;
import lombok.Data;

@Data
public class AdminMemberGrantRequest implements Serializable {

    private Long userId;

    private String memberLevel;

    private String planType;

    private Integer durationDays;

    private String description;

    private static final long serialVersionUID = 1L;
}
