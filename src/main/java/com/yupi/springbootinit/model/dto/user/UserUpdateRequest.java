package com.yupi.springbootinit.model.dto.user;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class UserUpdateRequest implements Serializable {

    private Long id;

    private String userName;

    private String userAvatar;

    private String userProfile;

    private String userRole;

    private String memberLevel;

    private String memberPlanType;

    private Integer pointBalance;

    private Date memberExpireTime;

    private static final long serialVersionUID = 1L;
}
