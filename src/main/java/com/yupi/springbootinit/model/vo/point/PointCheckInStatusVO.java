package com.yupi.springbootinit.model.vo.point;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class PointCheckInStatusVO implements Serializable {

    private Boolean checkedInToday;

    private Integer rewardPoints;

    private Integer pointBalance;

    private Date lastCheckInDate;

    private Integer status;

    private static final long serialVersionUID = 1L;
}
