package com.yupi.springbootinit.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yupi.springbootinit.exception.GlobalExceptionHandler;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.MemberService;
import com.yupi.springbootinit.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.util.ReflectionTestUtils;

class MemberControllerTest {

    private MockMvc mockMvc;
    private MemberService memberService;
    private UserService userService;

    @BeforeEach
    void setUp() {
        memberService = Mockito.mock(MemberService.class);
        userService = Mockito.mock(UserService.class);
        MemberController controller = new MemberController();
        ReflectionTestUtils.setField(controller, "memberService", memberService);
        ReflectionTestUtils.setField(controller, "userService", userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void cancelMemberOrderShouldReturnSuccess() throws Exception {
        User loginUser = new User();
        loginUser.setId(1L);
        when(userService.getLoginUser(any())).thenReturn(loginUser);
        when(memberService.cancelMemberOrder(org.mockito.ArgumentMatchers.eq("MEM123"), org.mockito.ArgumentMatchers.eq(loginUser), org.mockito.ArgumentMatchers.eq(false))).thenReturn(true);

        mockMvc.perform(post("/member/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderNo\":\"MEM123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").value(true));
    }
}
