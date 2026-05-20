package com.yupi.springbootinit.model.dto.member;

import java.io.Serializable;
import lombok.Data;

@Data
public class MemberOrderCancelRequest implements Serializable {

    private String orderNo;

    private static final long serialVersionUID = 1L;
}
