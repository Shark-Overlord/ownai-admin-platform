package com.yupi.springbootinit.model.dto.user;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class UserQueryRequest extends PageRequest implements Serializable {

    private Long id;

    private String unionId;

    private String mpOpenId;

    private String userAccount;

    private String userEmail;

    private String userName;

    private String userProfile;

    private String userRole;

    private String memberLevel;

    private String memberPlanType;

    private static final long serialVersionUID = 1L;
}
