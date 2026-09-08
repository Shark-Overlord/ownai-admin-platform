package com.yupi.springbootinit.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.file.UploadFileRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.FileUploadBizEnum;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.service.ContentFileUploadService;
import com.yupi.springbootinit.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

class FileControllerBlogImageUploadTest {

    private FileController controller;
    private UserService userService;
    private ContentFileUploadService contentFileUploadService;
    private User loginUser;

    @BeforeEach
    void setUp() {
        controller = new FileController();
        userService = mock(UserService.class);
        contentFileUploadService = mock(ContentFileUploadService.class);
        ContentApiKeyService contentApiKeyService = mock(ContentApiKeyService.class);

        loginUser = new User();
        loginUser.setId(100L);
        when(userService.getLoginUser(any())).thenReturn(loginUser);

        ReflectionTestUtils.setField(controller, "userService", userService);
        ReflectionTestUtils.setField(controller, "contentApiKeyService", contentApiKeyService);
        ReflectionTestUtils.setField(controller, "contentFileUploadService", contentFileUploadService);
    }

    @Test
    void adminCanUploadGifAsBlogImage() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "community-demo.gif", "image/gif", new byte[] {'G', 'I', 'F', '8', '9', 'a'});
        UploadFileRequest request = new UploadFileRequest();
        request.setBiz("blog_image");
        when(userService.isAdmin(loginUser)).thenReturn(true);
        when(contentFileUploadService.uploadTrusted(eq(file), eq(FileUploadBizEnum.BLOG_IMAGE),
                eq(loginUser), any())).thenReturn("https://files.example.com/blog-image.gif");

        BaseResponse<String> response = controller.uploadFile(file, request, new MockHttpServletRequest());

        assertEquals(ErrorCode.SUCCESS.getCode(), response.getCode());
        assertEquals("https://files.example.com/blog-image.gif", response.getData());
        verify(contentFileUploadService).uploadTrusted(eq(file), eq(FileUploadBizEnum.BLOG_IMAGE),
                eq(loginUser), any());
    }

    @Test
    void ordinaryUserCanStillUploadAvatar() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[] {1});
        UploadFileRequest request = new UploadFileRequest();
        request.setBiz("user_avatar");
        when(contentFileUploadService.uploadTrusted(eq(file), eq(FileUploadBizEnum.USER_AVATAR),
                eq(loginUser), any())).thenReturn("https://files.example.com/avatar.png");

        BaseResponse<String> response = controller.uploadFile(file, request, new MockHttpServletRequest());

        assertEquals("https://files.example.com/avatar.png", response.getData());
    }

    @Test
    void ordinaryUserCannotUploadAdminOnlyBlogMedia() {
        MockMultipartFile file = new MockMultipartFile("file", "post.gif", "image/gif", new byte[] {1});
        UploadFileRequest request = new UploadFileRequest();
        request.setBiz("blog_image");
        when(userService.isAdmin(loginUser)).thenReturn(false);

        assertThrows(BusinessException.class,
                () -> controller.uploadFile(file, request, new MockHttpServletRequest()));
    }
}
