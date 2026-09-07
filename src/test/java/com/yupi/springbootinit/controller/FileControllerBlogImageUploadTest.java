package com.yupi.springbootinit.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.model.dto.file.UploadFileRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.service.UserService;
import java.io.File;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

class FileControllerBlogImageUploadTest {

    private FileController controller;
    private CosManager cosManager;

    @BeforeEach
    void setUp() {
        controller = new FileController();
        UserService userService = mock(UserService.class);
        cosManager = mock(CosManager.class);
        CosClientConfig cosClientConfig = mock(CosClientConfig.class);
        ContentApiKeyService contentApiKeyService = mock(ContentApiKeyService.class);

        User admin = new User();
        admin.setId(100L);
        when(userService.getLoginUser(any())).thenReturn(admin);
        when(userService.isAdmin(admin)).thenReturn(true);
        when(cosClientConfig.getHost()).thenReturn("https://files.example.com");

        ReflectionTestUtils.setField(controller, "userService", userService);
        ReflectionTestUtils.setField(controller, "cosManager", cosManager);
        ReflectionTestUtils.setField(controller, "cosClientConfig", cosClientConfig);
        ReflectionTestUtils.setField(controller, "contentApiKeyService", contentApiKeyService);
    }

    @Test
    void adminCanUploadGifAsBlogImage() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "community-demo.gif", "image/gif", new byte[] {'G', 'I', 'F', '8', '9', 'a'});
        UploadFileRequest request = new UploadFileRequest();
        request.setBiz("blog_image");

        BaseResponse<String> response = controller.uploadFile(file, request, new MockHttpServletRequest());

        assertEquals(ErrorCode.SUCCESS.getCode(), response.getCode());
        assertTrue(response.getData().matches(
                "https://files\\.example\\.com/blog_image/100/[A-Za-z0-9]{8}-community-demo\\.gif"));
        verify(cosManager).putObject(argThat(path -> path.endsWith("-community-demo.gif")), any(File.class));
    }
}
