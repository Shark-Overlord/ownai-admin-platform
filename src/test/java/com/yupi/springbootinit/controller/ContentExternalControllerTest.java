package com.yupi.springbootinit.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yupi.springbootinit.exception.GlobalExceptionHandler;
import com.yupi.springbootinit.model.dto.category.CategoryAddRequest;
import com.yupi.springbootinit.model.dto.category.CategoryUpdateRequest;
import com.yupi.springbootinit.model.entity.ContentApiKey;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.FileUploadBizEnum;
import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.service.ContentExternalService;
import com.yupi.springbootinit.service.ContentFileUploadService;
import com.yupi.springbootinit.service.RemoteImageImportService;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ContentExternalControllerTest {

    private MockMvc mockMvc;
    private ContentApiKeyService contentApiKeyService;
    private ContentExternalService contentExternalService;
    private ContentFileUploadService contentFileUploadService;
    private RemoteImageImportService remoteImageImportService;

    @BeforeEach
    void setUp() {
        contentApiKeyService = Mockito.mock(ContentApiKeyService.class);
        contentExternalService = Mockito.mock(ContentExternalService.class);
        contentFileUploadService = Mockito.mock(ContentFileUploadService.class);
        remoteImageImportService = Mockito.mock(RemoteImageImportService.class);

        ContentExternalController controller = new ContentExternalController();
        ReflectionTestUtils.setField(controller, "contentApiKeyService", contentApiKeyService);
        ReflectionTestUtils.setField(controller, "contentExternalService", contentExternalService);
        ReflectionTestUtils.setField(controller, "contentFileUploadService", contentFileUploadService);
        ReflectionTestUtils.setField(controller, "remoteImageImportService", remoteImageImportService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void capabilitiesShouldReturnSuccess() throws Exception {
        ContentApiKey key = new ContentApiKey();
        key.setScopes("category:manage");
        when(contentApiKeyService.requireRequestKey(any(), any())).thenReturn(key);
        Map<String, Object> cap = new HashMap<>();
        cap.put("categoryManage", Collections.singletonList("list"));
        when(contentExternalService.capabilities(key)).thenReturn(cap);

        mockMvc.perform(get("/content/v1/capabilities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.categoryManage[0]").value("list"));
    }

    @Test
    void uploadRemoteShouldSucceed() throws Exception {
        ContentApiKey key = new ContentApiKey();
        when(contentApiKeyService.requireRequestKey(any(), any())).thenReturn(key);
        User operator = new User();
        operator.setId(100L);
        when(contentExternalService.requireOperator(key)).thenReturn(operator);
        when(remoteImageImportService.importForContent(eq("https://example.com/test.png"), eq(FileUploadBizEnum.ARTWORK_COVER), eq(100L)))
                .thenReturn("https://cos.ownai.icu/artwork_cover/100/test.png");

        mockMvc.perform(post("/content/v1/uploads/remote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://example.com/test.png\",\"biz\":\"artwork_cover\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").value("https://cos.ownai.icu/artwork_cover/100/test.png"));
    }

    @Test
    void uploadRemoteShouldRejectUnsupportedBiz() throws Exception {
        mockMvc.perform(post("/content/v1/uploads/remote")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://example.com/test.mp4\",\"biz\":\"artwork_video\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(40000));
    }

    @Test
    void listCategoriesShouldSucceed() throws Exception {
        CategoryVO vo = new CategoryVO();
        vo.setId(1L);
        vo.setName("UI组件");
        when(contentExternalService.listCategories()).thenReturn(Collections.singletonList(vo));

        mockMvc.perform(get("/content/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data[0].name").value("UI组件"));
    }

    @Test
    void addCategoryShouldSucceed() throws Exception {
        when(contentExternalService.addCategory(any(CategoryAddRequest.class))).thenReturn(888L);

        mockMvc.perform(post("/content/v1/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"动效分类\",\"sort\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").value(888L));
    }

    @Test
    void updateCategoryShouldSucceed() throws Exception {
        when(contentExternalService.updateCategory(eq(888L), any(CategoryUpdateRequest.class))).thenReturn(true);

        mockMvc.perform(patch("/content/v1/categories/888")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"新动效分类\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").value(true));
    }

    @Test
    void addTagToCategoryShouldSucceed() throws Exception {
        when(contentExternalService.addTagToCategory(eq(888L), eq("微动效"))).thenReturn(true);

        mockMvc.perform(post("/content/v1/categories/888/tags")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tagName\":\"微动效\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").value(true));
    }

    @Test
    void removeTagFromCategoryShouldSucceed() throws Exception {
        when(contentExternalService.removeTagFromCategory(eq(888L), eq(999L))).thenReturn(true);

        mockMvc.perform(delete("/content/v1/categories/888/tags/999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data").value(true));
    }
}
