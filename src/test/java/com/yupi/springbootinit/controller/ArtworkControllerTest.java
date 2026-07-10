package com.yupi.springbootinit.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.exception.GlobalExceptionHandler;
import com.yupi.springbootinit.manager.PublicContentAntiCrawlerManager;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkHomeOverviewVO;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.UserService;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ArtworkControllerTest {

    private MockMvc mockMvc;

    private ArtworkService artworkService;

    private UserService userService;

    @BeforeEach
    void setUp() {
        artworkService = Mockito.mock(ArtworkService.class);
        userService = Mockito.mock(UserService.class);
        ArtworkController artworkController = new ArtworkController();
        org.springframework.test.util.ReflectionTestUtils.setField(artworkController, "artworkService", artworkService);
        org.springframework.test.util.ReflectionTestUtils.setField(artworkController, "userService", userService);
        org.springframework.test.util.ReflectionTestUtils.setField(artworkController, "publicContentAntiCrawlerManager",
                new PublicContentAntiCrawlerManager());
        mockMvc = MockMvcBuilders.standaloneSetup(artworkController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getArtworkDetailShouldReturnSuccess() throws Exception {
        when(userService.getLoginUserPermitNull(any())).thenReturn(null);
        when(artworkService.getArtworkPromptContent(eq(1L), eq(null))).thenReturn("Demo prompt");

        mockMvc.perform(get("/artwork/get/vo").param("id", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").value("Demo prompt"));
    }

    @Test
    void listArtworkShouldReturnPagedResult() throws Exception {
        Page<ArtworkVO> artworkVOPage = new Page<>(1, 10, 1);
        ArtworkVO artworkVO = new ArtworkVO();
        artworkVO.setId(1L);
        artworkVO.setTitle("Demo Artwork");
        artworkVOPage.setRecords(Collections.singletonList(artworkVO));
        when(userService.getLoginUserPermitNull(any())).thenReturn(null);
        when(artworkService.listArtworkVOByPage(any(), eq(null), eq(false))).thenReturn(artworkVOPage);

        mockMvc.perform(post("/artwork/list/page/vo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"current\":1,\"pageSize\":10}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.records[0].title").value("Demo Artwork"));
    }

    @Test
    void listArtworkShouldRejectOversizedPage() throws Exception {
        when(userService.getLoginUserPermitNull(any())).thenReturn(null);

        mockMvc.perform(post("/artwork/list/page/vo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"current\":1,\"pageSize\":21}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(40000));
    }

    @Test
    void getArtworkHomeOverviewShouldReturnSuccess() throws Exception {
        User loginUser = new User();
        loginUser.setId(1L);
        ArtworkHomeOverviewVO overview = new ArtworkHomeOverviewVO();
        overview.setTotalCount(100L);
        overview.setRecentThreeDaysCount(5L);
        when(userService.getLoginUser(any())).thenReturn(loginUser);
        when(artworkService.getHomeOverview(loginUser)).thenReturn(overview);

        mockMvc.perform(get("/artwork/home/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.totalCount").value(100))
                .andExpect(jsonPath("$.data.recentThreeDaysCount").value(5));
    }
}
