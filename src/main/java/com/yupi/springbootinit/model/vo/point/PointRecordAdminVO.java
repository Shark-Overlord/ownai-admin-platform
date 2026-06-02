package com.yupi.springbootinit.model.vo.point;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class PointRecordAdminVO implements Serializable {

    private Long id;

    private Long userId;

    private String userAccount;

    private String userName;

    private String changeType;

    private Integer changeAmount;

    private Integer balanceAfter;

    private String relatedType;

    private Long relatedId;

    private String description;

    private Date createTime;

    private static final long serialVersionUID = 1L;
}
