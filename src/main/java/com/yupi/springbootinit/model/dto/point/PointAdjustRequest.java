package com.yupi.springbootinit.model.dto.point;

import java.io.Serializable;
import lombok.Data;

@Data
public class PointAdjustRequest implements Serializable {

    private Long userId;

    /**
     * grant or deduct
     */
    private String operation;

    private Integer amount;

    private String description;

    private static final long serialVersionUID = 1L;
}
