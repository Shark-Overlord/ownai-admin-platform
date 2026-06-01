package com.yupi.springbootinit.model.vo.user;

import java.io.Serializable;
import lombok.Data;

@Data
public class LoginCaptchaVO implements Serializable {

    private String captchaId;

    private String imageBase64;

    private String imageUrl;

    private static final long serialVersionUID = 1L;
}
