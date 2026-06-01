package com.yupi.springbootinit.model.dto.user;

import java.io.Serializable;
import lombok.Data;

@Data
public class EmailCodeSendRequest implements Serializable {

    private String userEmail;

    private static final long serialVersionUID = 1L;
}
