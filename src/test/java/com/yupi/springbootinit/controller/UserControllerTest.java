package com.yupi.springbootinit.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yupi.springbootinit.config.WxOpenConfig;
import com.yupi.springbootinit.exception.GlobalExceptionHandler;
import com.yupi.springbootinit.model.vo.LoginUserVO;
import com.yupi.springbootinit.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class UserControllerTest {

    private MockMvc mockMvc;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = Mockito.mock(UserService.class);
        WxOpenConfig wxOpenConfig = Mockito.mock(WxOpenConfig.class);
        UserController userController = new UserController();
        org.springframework.test.util.ReflectionTestUtils.setField(userController, "userService", userService);
        org.springframework.test.util.ReflectionTestUtils.setField(userController, "wxOpenConfig", wxOpenConfig);
        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void userLoginShouldReturnLoginUser() throws Exception {
        LoginUserVO loginUserVO = new LoginUserVO();
        loginUserVO.setId(1L);
        loginUserVO.setUserName("admin");
        when(userService.userLogin(eq("admin"), eq("12345678"), any())).thenReturn(loginUserVO);

        mockMvc.perform(post("/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userAccount\":\"admin\",\"userPassword\":\"12345678\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.userName").value("admin"));
    }

    @Test
    void userRegisterShouldValidateBlankFields() throws Exception {
        mockMvc.perform(post("/user/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userAccount\":\"\",\"userPassword\":\"\",\"checkPassword\":\"\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(40000));
    }
}
