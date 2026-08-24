package com.yupi.springbootinit.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yupi.springbootinit.model.vo.home.HomeContentVO;
import com.yupi.springbootinit.service.HomeContentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class HomeContentControllerTest {

    private MockMvc mockMvc;
    private HomeContentService homeContentService;

    @BeforeEach
    void setUp() {
        homeContentService = Mockito.mock(HomeContentService.class);
        HomeContentController controller = new HomeContentController();
        ReflectionTestUtils.setField(controller, "homeContentService", homeContentService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void publicContentIsAvailableWithoutLogin() throws Exception {
        HomeContentVO content = new HomeContentVO();
        content.getHero().setTitle("OwnAI Home");
        when(homeContentService.getPublicContent()).thenReturn(content);

        mockMvc.perform(get("/home/content"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.message").value("ok"))
                .andExpect(jsonPath("$.data.hero.title").value("OwnAI Home"));
    }
}
