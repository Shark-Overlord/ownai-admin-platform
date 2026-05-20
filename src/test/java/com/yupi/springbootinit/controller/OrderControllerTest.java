package com.yupi.springbootinit.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yupi.springbootinit.exception.GlobalExceptionHandler;
import com.yupi.springbootinit.model.entity.ArtworkOrder;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.OrderService;
import com.yupi.springbootinit.service.UserService;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class OrderControllerTest {

    private MockMvc mockMvc;

    private OrderService orderService;

    private UserService userService;

    @BeforeEach
    void setUp() {
        orderService = Mockito.mock(OrderService.class);
        userService = Mockito.mock(UserService.class);
        OrderController orderController = new OrderController();
        org.springframework.test.util.ReflectionTestUtils.setField(orderController, "orderService", orderService);
        org.springframework.test.util.ReflectionTestUtils.setField(orderController, "userService", userService);
        mockMvc = MockMvcBuilders.standaloneSetup(orderController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void cancelOrderShouldReturnSuccess() throws Exception {
        User loginUser = new User();
        loginUser.setId(1L);
        when(userService.getLoginUser(any())).thenReturn(loginUser);
        when(orderService.cancelOrder(eq("ORD123"), eq(loginUser), eq(false))).thenReturn(true);

        mockMvc.perform(post("/order/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderNo\":\"ORD123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").value(true));
    }

    @Test
    void mockPayShouldInvokeCallbackFlow() throws Exception {
        ArtworkOrder artworkOrder = new ArtworkOrder();
        artworkOrder.setOrderNo("ORD123");
        artworkOrder.setOrderAmount(new BigDecimal("29.90"));
        when(orderService.getOne(any())).thenReturn(artworkOrder);
        when(orderService.handlePaymentCallback(any())).thenReturn(true);

        mockMvc.perform(post("/order/pay/mock")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderNo\":\"ORD123\",\"paymentChannel\":\"mock\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").value(true));
    }
}
