package com.yupi.springbootinit.controller;

import cn.hutool.core.io.FileUtil;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.model.dto.file.UploadFileRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.FileUploadBizEnum;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.util.Arrays;
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
 * 文件接口 File Controller
 */
@RestController
@RequestMapping("/file")
@Slf4j
@Api(tags = "File")
public class FileController {

    @Resource
    private UserService userService;

    @Resource
    private CosManager cosManager;

    @Resource
    private CosClientConfig cosClientConfig;

    @Resource
    private ContentApiKeyService contentApiKeyService;

    /**
     * 上传文件到对象存储 Upload file to object storage
     */
    @PostMapping("/upload")
    @OperationLog(module = "file", action = "upload_file")
    @ApiOperation("上传文件到对象存储 Upload file to object storage")
    public BaseResponse<String> uploadFile(@RequestPart("file") MultipartFile multipartFile,
            UploadFileRequest uploadFileRequest, HttpServletRequest request) {
        if (uploadFileRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String biz = uploadFileRequest.getBiz();
        FileUploadBizEnum fileUploadBizEnum = FileUploadBizEnum.getEnumByValue(biz);
        if (fileUploadBizEnum == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Invalid upload business type");
        }
        validFile(multipartFile, fileUploadBizEnum);
        User loginUser = resolveUploadUser(uploadFileRequest, request, fileUploadBizEnum);
        if (FileUploadBizEnum.IMAGE_GENERATION_RESULT.equals(fileUploadBizEnum)
                && !userService.isAdmin(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        String uuid = RandomStringUtils.randomAlphanumeric(8);
        String filename = uuid + "-" + FileUtil.getName(multipartFile.getOriginalFilename());
        String objectPath = String.format("%s/%s/%s", fileUploadBizEnum.getValue(), loginUser.getId(), filename);
        String filepath = "/" + objectPath;
        if (FileUploadBizEnum.IMAGE_GENERATION_RESULT.equals(fileUploadBizEnum) && !isCosConfigured()) {
            return uploadImageGenerationResultToLocal(multipartFile, objectPath, request);
        }
        File file = null;
        try {
            file = File.createTempFile("upload-", FileUtil.extName(filename));
            multipartFile.transferTo(file);
            cosManager.putObject(filepath, file);
            return ResultUtils.success(cosClientConfig.getHost() + filepath);
        } catch (Exception e) {
            log.error("file upload error, filepath = {}", filepath, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Upload failed");
        } finally {
            if (file != null && file.exists() && !file.delete()) {
                log.warn("temp file delete failed, filepath = {}", filepath);
            }
        }
    }

    private User resolveUploadUser(UploadFileRequest uploadFileRequest, HttpServletRequest request,
            FileUploadBizEnum fileUploadBizEnum) {
        String requestKey = uploadFileRequest == null ? null : uploadFileRequest.getApiSecret();
        List<String> allowedScopes = getUploadAllowedScopes(fileUploadBizEnum);
        if (allowedScopes != null && contentApiKeyService.validateRequestKeyAny(requestKey, request, allowedScopes)) {
            return getDefaultAdminUser();
        }
        return userService.getLoginUser(request);
    }

    private List<String> getUploadAllowedScopes(FileUploadBizEnum fileUploadBizEnum) {
        if (FileUploadBizEnum.ARTWORK_COVER.equals(fileUploadBizEnum)
                || FileUploadBizEnum.ARTWORK_VIDEO.equals(fileUploadBizEnum)
                || FileUploadBizEnum.ARTWORK_PROMPT.equals(fileUploadBizEnum)) {
            return Arrays.asList(ContentApiKeyService.SCOPE_ARTWORK_ADD, ContentApiKeyService.SCOPE_ARTWORK_UPDATE);
        }
        if (FileUploadBizEnum.PROMPT_ASSET_COVER.equals(fileUploadBizEnum)) {
            return Arrays.asList(ContentApiKeyService.SCOPE_PROMPT_ASSET_ADD,
                    ContentApiKeyService.SCOPE_PROMPT_ASSET_UPDATE);
        }
        return null;
    }

    private User getDefaultAdminUser() {
        User adminUser = userService.getOne(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<User>()
                .eq("userRole", com.yupi.springbootinit.constant.UserConstant.ADMIN_ROLE)
                .eq("isDelete", 0)
                .orderByAsc("id")
                .last("LIMIT 1"));
        if (adminUser == null) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Default admin user not found");
        }
        return adminUser;
    }

    private boolean isCosConfigured() {
        return StringUtils.isNoneBlank(cosClientConfig.getHost(), cosClientConfig.getSecretId(),
                cosClientConfig.getSecretKey(), cosClientConfig.getRegion(), cosClientConfig.getBucket());
    }

    private BaseResponse<String> uploadImageGenerationResultToLocal(MultipartFile multipartFile, String objectPath,
            HttpServletRequest request) {
        File uploadRoot = new File(System.getProperty("user.dir"), "uploads");
        File targetFile = new File(uploadRoot, objectPath);
        try {
            FileUtil.mkdir(targetFile.getParentFile());
            multipartFile.transferTo(targetFile);
            String publicPath = "/uploads/" + objectPath.replace("\\", "/");
            log.warn("COS is not configured, image generation result saved locally: {}", targetFile.getAbsolutePath());
            return ResultUtils.success(buildRequestBaseUrl(request) + publicPath);
        } catch (Exception e) {
            log.error("local file upload error, filepath = {}", targetFile.getAbsolutePath(), e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Upload failed");
        }
    }

    private String buildRequestBaseUrl(HttpServletRequest request) {
        String proto = StringUtils.defaultIfBlank(request.getHeader("X-Forwarded-Proto"), request.getScheme());
        if (StringUtils.contains(proto, ",")) {
            proto = StringUtils.trim(StringUtils.substringBefore(proto, ","));
        }
        String host = StringUtils.defaultIfBlank(request.getHeader("X-Forwarded-Host"), request.getHeader("Host"));
        if (StringUtils.isBlank(host)) {
            host = request.getServerName();
            int port = request.getServerPort();
            if (port > 0 && port != 80 && port != 443) {
                host = host + ":" + port;
            }
        }
        return proto + "://" + host;
    }

    /**
     * 校验文件
     *
     * @param multipartFile 文件
     * @param fileUploadBizEnum 业务类型
     */
    private void validFile(MultipartFile multipartFile, FileUploadBizEnum fileUploadBizEnum) {
        long fileSize = multipartFile.getSize();
        String fileSuffix = FileUtil.getSuffix(multipartFile.getOriginalFilename()).toLowerCase();
        final long ONE_M = 1024 * 1024L;
        final long TEN_M = 10 * ONE_M;
        final long FIFTY_M = 50 * ONE_M;
        if (FileUploadBizEnum.USER_AVATAR.equals(fileUploadBizEnum)) {
            validSuffix(fileSuffix, Arrays.asList("jpeg", "jpg", "svg", "png", "webp"));
            if (fileSize > ONE_M) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "Avatar file cannot exceed 1MB");
            }
            return;
        }
        if (FileUploadBizEnum.ARTWORK_COVER.equals(fileUploadBizEnum)
                || FileUploadBizEnum.PROMPT_ASSET_COVER.equals(fileUploadBizEnum)
                || FileUploadBizEnum.IMAGE_GENERATION_RESULT.equals(fileUploadBizEnum)) {
            validSuffix(fileSuffix, Arrays.asList("jpeg", "jpg", "png", "webp"));
            long maxSize = FileUploadBizEnum.IMAGE_GENERATION_RESULT.equals(fileUploadBizEnum) ? FIFTY_M : TEN_M;
            if (fileSize > maxSize) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR,
                        FileUploadBizEnum.IMAGE_GENERATION_RESULT.equals(fileUploadBizEnum)
                                ? "Image result file cannot exceed 50MB"
                                : "Cover file cannot exceed 10MB");
            }
            return;
        }
        if (FileUploadBizEnum.ARTWORK_VIDEO.equals(fileUploadBizEnum)) {
            validSuffix(fileSuffix, Arrays.asList("mp4", "mov", "webm", "m4v"));
            if (fileSize > FIFTY_M) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "Video file cannot exceed 50MB");
            }
            return;
        }
        if (FileUploadBizEnum.ARTWORK_PROMPT.equals(fileUploadBizEnum)) {
            validSuffix(fileSuffix, Arrays.asList("json", "txt"));
            if (fileSize > TEN_M) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "Prompt file cannot exceed 10MB");
            }
        }
    }

    /**
     * 校验文件后缀
     *
     * @param fileSuffix 文件后缀
     * @param allowedSuffixList 允许的后缀列表
     */
    private void validSuffix(String fileSuffix, List<String> allowedSuffixList) {
        if (!allowedSuffixList.contains(fileSuffix)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Unsupported file type");
        }
    }
}
