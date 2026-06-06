package com.yupi.springbootinit.model.dto.point;

import java.io.Serializable;
import lombok.Data;

@Data
public class PointCheckInConfigUpdateRequest implements Serializable {

    private Long id;

    private Integer rewardPoints;

    private Integer status;

    private String description;

    private static final long serialVersionUID = 1L;
}
