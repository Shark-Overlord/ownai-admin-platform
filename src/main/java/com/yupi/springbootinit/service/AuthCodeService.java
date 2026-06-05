package com.yupi.springbootinit.service;

import com.yupi.springbootinit.model.vo.user.LoginCaptchaVO;

public interface AuthCodeService {

    LoginCaptchaVO generateLoginCaptcha();

    void validateLoginCaptcha(String captchaId, String captchaCode);

    boolean sendRegisterEmailCode(String userEmail, String ip);

    void validateEmailRegisterCode(String userEmail, String emailCode);

    void invalidateEmailRegisterCode(String userEmail);
}
