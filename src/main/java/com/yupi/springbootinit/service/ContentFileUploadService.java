package com.yupi.springbootinit.service;

import cn.hutool.core.io.FileUtil;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.manager.VideoWatermarkManager;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.FileUploadBizEnum;
import java.io.File;
import java.util.Arrays;
import java.util.List;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Internal storage pipeline. Callers authenticate and authorize the upload before invoking it. */
@Service
@Slf4j
public class ContentFileUploadService {
    @Resource private CosManager cosManager;
    @Resource private CosClientConfig cosClientConfig;
    @Resource private VideoWatermarkManager videoWatermarkManager;

    /**
     * Reuses the validated COS upload pipeline after the caller has already authenticated the operator.
     * This method deliberately does not accept API keys; each controller owns its authentication boundary.
     */
    public String uploadTrusted(MultipartFile multipartFile, FileUploadBizEnum fileUploadBizEnum,
            User operator, HttpServletRequest request) {
        if (operator == null || operator.getId() == null) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        validFile(multipartFile, fileUploadBizEnum);
        String uuid = RandomStringUtils.randomAlphanumeric(8);
        String filename = FileUploadBizEnum.ARTWORK_SOURCE.equals(fileUploadBizEnum)
                ? uuid + ".zip"
                : FileUploadBizEnum.VIDEO_BACKGROUND_PREVIEW.equals(fileUploadBizEnum)
                        ? uuid + "-preview.mp4"
                        : uuid + "-" + FileUtil.getName(multipartFile.getOriginalFilename());
        String objectPath = String.format("%s/%s/%s", fileUploadBizEnum.getValue(), operator.getId(), filename);
        String filepath = "/" + objectPath;
        if (FileUploadBizEnum.IMAGE_GENERATION_RESULT.equals(fileUploadBizEnum) && !isCosConfigured()) {
            return uploadImageGenerationResultToLocal(multipartFile, objectPath, request);
        }
        File file = null;
        File processedFile = null;
        try {
            file = File.createTempFile("upload-", FileUtil.extName(filename));
            multipartFile.transferTo(file);
            File uploadFile = file;
            if (FileUploadBizEnum.VIDEO_BACKGROUND_PREVIEW.equals(fileUploadBizEnum)) {
                processedFile = videoWatermarkManager.renderPreviewWatermark(file);
                uploadFile = processedFile;
            }
            cosManager.putObject(filepath, uploadFile);
            return cosClientConfig.getHost() + filepath;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("file upload error, filepath = {}", filepath, e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Upload failed");
        } finally {
            if (file != null && file.exists() && !file.delete()) {
                log.warn("temp file delete failed, filepath = {}", filepath);
            }
            if (processedFile != null && processedFile.exists() && !processedFile.delete()) {
                log.warn("processed preview video delete failed, filepath = {}", filepath);
            }
        }
    }


    private boolean isCosConfigured() {
        return StringUtils.isNoneBlank(cosClientConfig.getHost(), cosClientConfig.getSecretId(),
                cosClientConfig.getSecretKey(), cosClientConfig.getRegion(), cosClientConfig.getBucket());
    }

    private String uploadImageGenerationResultToLocal(MultipartFile multipartFile, String objectPath,
            HttpServletRequest request) {
        File uploadRoot = new File(System.getProperty("user.dir"), "uploads");
        File targetFile = new File(uploadRoot, objectPath);
        try {
            FileUtil.mkdir(targetFile.getParentFile());
            multipartFile.transferTo(targetFile);
            String publicPath = "/uploads/" + objectPath.replace("\\", "/");
            log.warn("COS is not configured, image generation result saved locally: {}", targetFile.getAbsolutePath());
            return buildRequestBaseUrl(request) + publicPath;
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

    public static java.util.Map<String, Object> limit(FileUploadBizEnum biz) {
        switch (biz) {
            case USER_AVATAR: return rule(1, "jpeg", "jpg", "svg", "png", "webp");
            case ARTWORK_COVER: return rule(10, "jpeg", "jpg", "png", "gif", "webp", "svg");
            case PROMPT_ASSET_COVER: return rule(10, "jpeg", "jpg", "png", "webp");
            case IMAGE_GENERATION_RESULT: return rule(50, "jpeg", "jpg", "png", "webp");
            case VIDEO_BACKGROUND_COVER: return rule(10, "jpeg", "jpg", "png", "webp");
            case BLOG_IMAGE: return rule(20, "jpeg", "jpg", "png", "gif", "webp");
            case BLOG_VIDEO: return rule(100, "mp4", "webm", "m4v");
            case ARTWORK_VIDEO: return rule(50, "mp4", "mov", "webm", "m4v");
            case VIDEO_BACKGROUND_PREVIEW: return rule(200, "mp4", "webm");
            case VIDEO_BACKGROUND_SOURCE: return rule(200, "mp4", "mov", "webm", "m4v");
            case ARTWORK_PROMPT: return rule(10, "json", "txt");
            case ARTWORK_SOURCE: return rule(50, "zip");
            default: throw new BusinessException(ErrorCode.PARAMS_ERROR, "Invalid upload business type");
        }
    }

    private static java.util.Map<String, Object> rule(int megabytes, String... extensions) {
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("maxBytes", megabytes * 1024L * 1024L);
        result.put("extensions", Arrays.asList(extensions));
        return result;
    }

    private void validFile(MultipartFile file, FileUploadBizEnum biz) {
        java.util.Map<String, Object> rule = limit(biz);
        String suffix = FileUtil.getSuffix(file.getOriginalFilename()).toLowerCase();
        if (!((List<?>) rule.get("extensions")).contains(suffix))
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Unsupported file type");
        if (file.getSize() > (Long) rule.get("maxBytes"))
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "File exceeds " + ((Long) rule.get("maxBytes") / 1024 / 1024) + "MB");
    }
}
