package com.yupi.springbootinit.model.dto.member;

import java.io.Serializable;
import lombok.Data;

@Data
public class MemberPaymentCreateRequest implements Serializable {

    /** month, year, or lifetime */
    private String planType;

    /** A UUID generated once by the client for retry-safe checkout creation. */
    private String requestId;

    private static final long serialVersionUID = 1L;
}
