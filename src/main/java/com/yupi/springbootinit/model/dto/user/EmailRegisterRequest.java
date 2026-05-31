package com.yupi.springbootinit.model.dto.user;

import java.io.Serializable;
import lombok.Data;

@Data
public class EmailRegisterRequest implements Serializable {

    private String userEmail;

    private String emailCode;

    private String userPassword;

    private String checkPassword;

    private static final long serialVersionUID = 1L;
}
