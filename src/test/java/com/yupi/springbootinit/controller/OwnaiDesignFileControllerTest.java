package com.yupi.springbootinit.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.enums.MemberPlanTypeEnum;
import com.yupi.springbootinit.service.UserService;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

class OwnaiDesignFileControllerTest {

    private OwnaiDesignFileController controller;

    private UserService userService;

    @BeforeEach
    void setUp() {
        controller = new OwnaiDesignFileController();
        userService = Mockito.mock(UserService.class);
        CosManager cosManager = Mockito.mock(CosManager.class);
        CosClientConfig cosClientConfig = Mockito.mock(CosClientConfig.class);
        ReflectionTestUtils.setField(controller, "userService", userService);
        ReflectionTestUtils.setField(controller, "cosManager", cosManager);
        ReflectionTestUtils.setField(controller, "cosClientConfig", cosClientConfig);
        when(cosClientConfig.getHost()).thenReturn("https://files.example.com");
    }

    @Test
    void normalUserCannotUpload() {
        when(userService.getLoginUser(any())).thenReturn(buildUser(MemberLevelEnum.NORMAL.getValue(), null, null));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> upload("design.png", "image/png"));

        assertEquals(ErrorCode.NO_AUTH_ERROR.getCode(), exception.getCode());
    }

    @Test
    void expiredMonthlyMemberCannotUpload() {
        when(userService.getLoginUser(any())).thenReturn(buildUser(MemberLevelEnum.MEMBER.getValue(),
                MemberPlanTypeEnum.MONTH.getValue(), new Date(System.currentTimeMillis() - 60_000)));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> upload("design.png", "image/png"));

        assertEquals(ErrorCode.NO_AUTH_ERROR.getCode(), exception.getCode());
    }

    @Test
    void activeMonthlyMemberCanUploadImage() {
        assertSuccessfulUpload(buildUser(MemberLevelEnum.MEMBER.getValue(), MemberPlanTypeEnum.MONTH.getValue(),
                new Date(System.currentTimeMillis() + 60_000)), "design.png", "image/png");
    }

    @Test
    void activeYearlyMemberCanUploadVideo() {
        assertSuccessfulUpload(buildUser(MemberLevelEnum.MEMBER.getValue(), MemberPlanTypeEnum.YEAR.getValue(),
                new Date(System.currentTimeMillis() + 60_000)), "design.mp4", "video/mp4");
    }

    @Test
    void lifetimeMemberCanUploadSvg() {
        assertSuccessfulUpload(buildUser(MemberLevelEnum.MEMBER.getValue(), MemberPlanTypeEnum.LIFETIME.getValue(), null),
                "design.svg", "image/svg+xml");
    }

    @Test
    void unsupportedFileTypeIsRejected() {
        when(userService.getLoginUser(any())).thenReturn(buildUser(MemberLevelEnum.MEMBER.getValue(),
                MemberPlanTypeEnum.LIFETIME.getValue(), null));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> upload("design.exe", "application/octet-stream"));

        assertEquals(ErrorCode.PARAMS_ERROR.getCode(), exception.getCode());
    }

    private void assertSuccessfulUpload(User user, String filename, String contentType) {
        when(userService.getLoginUser(any())).thenReturn(user);

        BaseResponse<String> response = upload(filename, contentType);

        assertEquals(ErrorCode.SUCCESS.getCode(), response.getCode());
        assertTrue(response.getData().startsWith("https://files.example.com/ownai_design/100/"));
    }

    private BaseResponse<String> upload(String filename, String contentType) {
        MockMultipartFile file = new MockMultipartFile("file", filename, contentType, new byte[] {1, 2, 3});
        return controller.upload(file, new MockHttpServletRequest());
    }

    private User buildUser(String memberLevel, String planType, Date expireTime) {
        User user = new User();
        user.setId(100L);
        user.setMemberLevel(memberLevel);
        user.setMemberPlanType(planType);
        user.setMemberExpireTime(expireTime);
        return user;
    }
}
