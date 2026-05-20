package com.yupi.springbootinit.model.vo.point;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class PointOverviewVO implements Serializable {

    private Integer pointBalance;

    private String memberLevel;

    private Date memberExpireTime;

    private Date lastCheckInDate;

    private static final long serialVersionUID = 1L;
}
