package com.yupi.springbootinit.model.vo;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class UserVO implements Serializable {

    private Long id;

    private String userAccount;

    private String userEmail;

    private String userName;

    private String userAvatar;

    private String userProfile;

    private String userRole;

    private String memberLevel;

    private String memberPlanType;

    private Integer pointBalance;

    private Date memberExpireTime;

    private Date createTime;

    private static final long serialVersionUID = 1L;
}
