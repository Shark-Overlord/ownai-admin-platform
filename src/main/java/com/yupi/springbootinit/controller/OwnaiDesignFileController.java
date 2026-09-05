package com.yupi.springbootinit.controller;

import cn.hutool.core.io.FileUtil;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.enums.MemberPlanTypeEnum;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * OwnAI Design 插件文件接口。
 */
@RestController
@RequestMapping("/ownai-design/file")
@Slf4j
@Api(tags = "OwnAI Design File")
public class OwnaiDesignFileController {

    private static final long ONE_MB = 1024 * 1024L;

    private static final long MAX_IMAGE_SIZE = 10 * ONE_MB;

    private static final long MAX_VIDEO_SIZE = 50 * ONE_MB;

    private static final List<String> IMAGE_SUFFIXES = Arrays.asList("jpeg", "jpg", "png", "gif", "webp", "svg");

    private static final List<String> VIDEO_SUFFIXES = Arrays.asList("mp4", "mov", "webm", "m4v");

    @Resource
    private UserService userService;

    @Resource
    private CosManager cosManager;

    @Resource
    private CosClientConfig cosClientConfig;

    /**
     * 上传 OwnAI Design 插件使用的图片或视频。
     */
    @PostMapping("/upload")
    @OperationLog(module = "ownai_design", action = "upload_file")
    @ApiOperation("上传 OwnAI Design 插件图片或视频")
    public BaseResponse<String> upload(@RequestPart("file") MultipartFile multipartFile,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        if (!isActiveSystemMember(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "Only active members can upload OwnAI Design files");
        }
        if (multipartFile == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Upload file cannot be empty");
        }
        String originalFilename = FileUtil.getName(multipartFile.getOriginalFilename());
        String suffix = validateFile(multipartFile, originalFilename);
        String filename = RandomStringUtils.randomAlphanumeric(8) + "-" + originalFilename;
        String objectPath = String.format("ownai_design/%s/%s", loginUser.getId(), filename);
        String filepath = "/" + objectPath;
        File file = null;
        try {
            file = File.createTempFile("ownai-design-upload-", "." + suffix);
            multipartFile.transferTo(file);
            cosManager.putObject(filepath, file);
            return ResultUtils.success(cosClientConfig.getHost() + filepath);
        } catch (Exception e) {
            log.error("OwnAI Design file upload error, filepath = {}", filepath, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Upload failed");
        } finally {
            if (file != null && file.exists() && !file.delete()) {
                log.warn("OwnAI Design temp file delete failed, filepath = {}", filepath);
            }
        }
    }

    private String validateFile(MultipartFile multipartFile, String originalFilename) {
        if (multipartFile.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Upload file cannot be empty");
        }
        if (StringUtils.isBlank(originalFilename)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Upload filename cannot be empty");
        }
        String suffix = StringUtils.lowerCase(FileUtil.getSuffix(originalFilename));
        long fileSize = multipartFile.getSize();
        if (IMAGE_SUFFIXES.contains(suffix)) {
            if (fileSize > MAX_IMAGE_SIZE) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "Image file cannot exceed 10MB");
            }
            return suffix;
        }
        if (VIDEO_SUFFIXES.contains(suffix)) {
            if (fileSize > MAX_VIDEO_SIZE) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "Video file cannot exceed 50MB");
            }
            return suffix;
        }
        throw new BusinessException(ErrorCode.PARAMS_ERROR, "Unsupported file type");
    }

    private boolean isActiveSystemMember(User user) {
        if (user == null || !MemberLevelEnum.MEMBER.getValue().equalsIgnoreCase(user.getMemberLevel())) {
            return false;
        }
        MemberPlanTypeEnum planType = MemberPlanTypeEnum.getEnumByValue(user.getMemberPlanType());
        if (planType == null) {
            return false;
        }
        Date expireTime = user.getMemberExpireTime();
        if (planType.isLifetime()) {
            return expireTime == null;
        }
        return expireTime != null && expireTime.after(new Date());
    }
}
