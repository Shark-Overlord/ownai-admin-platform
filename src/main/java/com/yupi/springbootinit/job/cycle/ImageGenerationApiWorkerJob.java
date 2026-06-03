package com.yupi.springbootinit.job.cycle;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.http.Header;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationMessageQueryRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationTaskUpdateRequest;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationMessageVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationTaskContextVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationWorkerProviderConfigVO;
import com.yupi.springbootinit.service.ImageGenerationMessageService;
import com.yupi.springbootinit.service.ImageGenerationProviderConfigService;
import java.io.File;
import java.net.URI;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ImageGenerationApiWorkerJob {

    private static final String STATUS_RUNNING = "running";

    private static final String STATUS_SUCCESS = "success";

    private static final String STATUS_FAILED = "failed";

    private static final String AUTH_TYPE_BEARER = "bearer";

    private static final String REQUEST_TYPE_MULTIPART = "multipart";

    private static final int DEFAULT_HTTP_TIMEOUT_MS = 180000;

    private static final int MAX_BATCH_SIZE = 5;

    private final AtomicBoolean working = new AtomicBoolean(false);

    @Resource
    private ImageGenerationMessageService imageGenerationMessageService;

    @Resource
    private ImageGenerationProviderConfigService providerConfigService;

    @Resource
    private CosManager cosManager;

    @Resource
    private CosClientConfig cosClientConfig;

    @Value("${image.generation.api-worker.enabled:true}")
    private Boolean enabled;

    @Value("${image.generation.api-worker.batch-size:1}")
    private Integer batchSize;

    @Scheduled(fixedDelayString = "${image.generation.api-worker.scan-interval-ms:5000}")
    public void processPendingApiTasks() {
        if (!Boolean.TRUE.equals(enabled)) {
            return;
        }
        if (!working.compareAndSet(false, true)) {
            return;
        }
        try {
            ImageGenerationMessageQueryRequest request = new ImageGenerationMessageQueryRequest();
            request.setCurrent(1);
            request.setPageSize(resolveBatchSize());
            Page<ImageGenerationTaskContextVO> page = imageGenerationMessageService.listPendingTaskContextByPage(request);
            if (page.getRecords() == null || page.getRecords().isEmpty()) {
                return;
            }
            for (ImageGenerationTaskContextVO taskContext : page.getRecords()) {
                processTask(taskContext);
            }
        } finally {
            working.set(false);
        }
    }

    private int resolveBatchSize() {
        if (batchSize == null || batchSize <= 0) {
            return 1;
        }
        return Math.min(batchSize, MAX_BATCH_SIZE);
    }

    private void processTask(ImageGenerationTaskContextVO taskContext) {
        ImageGenerationMessageVO task = taskContext == null ? null : taskContext.getTask();
        if (task == null || StringUtils.isBlank(task.getTaskId())) {
            return;
        }
        String taskId = task.getTaskId();
        try {
            markTaskRunning(taskId);
            ProviderCallResult callResult = callProviderAndUploadResults(taskContext);
            ImageGenerationTaskUpdateRequest successRequest = new ImageGenerationTaskUpdateRequest();
            successRequest.setTaskId(taskId);
            successRequest.setStatus(STATUS_SUCCESS);
            successRequest.setResultImageUrls(callResult.getResultImageUrls());
            successRequest.setResponsePayload(callResult.getSanitizedResponsePayload());
            imageGenerationMessageService.updateTaskResult(successRequest);
            log.info("Image generation task completed, taskId={}, imageCount={}", taskId,
                    callResult.getResultImageUrls().size());
        } catch (Exception e) {
            log.error("Image generation task failed, taskId={}", taskId, e);
            markTaskFailed(taskId, e);
        }
    }

    private void markTaskRunning(String taskId) {
        ImageGenerationTaskUpdateRequest runningRequest = new ImageGenerationTaskUpdateRequest();
        runningRequest.setTaskId(taskId);
        runningRequest.setStatus(STATUS_RUNNING);
        imageGenerationMessageService.updateTaskResult(runningRequest);
    }

    private void markTaskFailed(String taskId, Exception e) {
        try {
            ImageGenerationTaskUpdateRequest failedRequest = new ImageGenerationTaskUpdateRequest();
            failedRequest.setTaskId(taskId);
            failedRequest.setStatus(STATUS_FAILED);
            failedRequest.setErrorMessage(StringUtils.left(e.getMessage(), 1000));
            imageGenerationMessageService.updateTaskResult(failedRequest);
        } catch (Exception updateException) {
            log.warn("Failed to mark image generation task as failed, taskId={}", taskId, updateException);
        }
    }

    private ProviderCallResult callProviderAndUploadResults(ImageGenerationTaskContextVO taskContext) {
        ImageGenerationMessageVO task = taskContext.getTask();
        Map<String, Object> providerRequest = taskContext.getProviderRequest();
        if (providerRequest == null || providerRequest.isEmpty()) {
            throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                    "Missing provider request payload");
        }
        String providerCode = StringUtils.defaultIfBlank(task.getProviderCode(),
                String.valueOf(providerRequest.get("providerCode")));
        ImageGenerationWorkerProviderConfigVO providerConfig =
                providerConfigService.getWorkerProviderConfig(providerCode);
        String url = buildProviderUrl(providerConfig, providerRequest);
        Object requestBody = providerRequest.get("requestBody");
        if (requestBody == null) {
            throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                    "Missing provider request body");
        }
        HttpResponse response;
        if (shouldUseMultipart(providerRequest, requestBody)) {
            response = executeMultipartProviderRequest(url, providerConfig, requestBody);
        } else {
            response = executeJsonProviderRequest(url, providerConfig, requestBody);
        }
        String responseBody = response.body();
        if (response.getStatus() < 200 || response.getStatus() >= 300) {
            throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                    "Provider call failed: HTTP " + response.getStatus() + " " + StringUtils.left(responseBody, 500));
        }
        JSONObject responseJson = JSONUtil.parseObj(responseBody);
        List<String> resultUrls = uploadProviderImages(task, responseJson);
        if (resultUrls.isEmpty()) {
            throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                    "Provider response did not contain image data");
        }
        ProviderCallResult result = new ProviderCallResult();
        result.setResultImageUrls(resultUrls);
        result.setSanitizedResponsePayload(sanitizeProviderResponse(responseJson));
        return result;
    }

    private HttpResponse executeJsonProviderRequest(String url, ImageGenerationWorkerProviderConfigVO providerConfig,
            Object requestBody) {
        HttpRequest httpRequest = HttpRequest.post(url)
                .header(Header.CONTENT_TYPE, "application/json")
                .timeout(resolveTimeout(providerConfig))
                .body(JSONUtil.toJsonStr(requestBody));
        fillAuthHeader(httpRequest, providerConfig);
        return httpRequest.execute();
    }

    private HttpResponse executeMultipartProviderRequest(String url, ImageGenerationWorkerProviderConfigVO providerConfig,
            Object requestBody) {
        JSONObject body = JSONUtil.parseObj(requestBody);
        List<File> referenceFiles = downloadReferenceImages(body);
        try {
            HttpRequest httpRequest = HttpRequest.post(url)
                    .timeout(resolveTimeout(providerConfig))
                    .form("model", body.getStr("model"))
                    .form("prompt", body.getStr("prompt"))
                    .form("size", body.getStr("size"));
            for (File referenceFile : referenceFiles) {
                httpRequest.form("image[]", referenceFile);
            }
            fillAuthHeader(httpRequest, providerConfig);
            return httpRequest.execute();
        } finally {
            referenceFiles.forEach(FileUtil::del);
        }
    }

    private void fillAuthHeader(HttpRequest httpRequest, ImageGenerationWorkerProviderConfigVO providerConfig) {
        if (AUTH_TYPE_BEARER.equalsIgnoreCase(providerConfig.getAuthType())) {
            httpRequest.header(Header.AUTHORIZATION, "Bearer " + providerConfig.getApiKey());
        }
    }

    private boolean shouldUseMultipart(Map<String, Object> providerRequest, Object requestBody) {
        if (REQUEST_TYPE_MULTIPART.equalsIgnoreCase(String.valueOf(providerRequest.get("requestType")))) {
            return true;
        }
        JSONObject body = JSONUtil.parseObj(requestBody);
        JSONArray referenceImages = body.getJSONArray("reference_images");
        return referenceImages != null && !referenceImages.isEmpty();
    }

    private List<File> downloadReferenceImages(JSONObject body) {
        JSONArray referenceImages = body.getJSONArray("reference_images");
        if (referenceImages == null || referenceImages.isEmpty()) {
            throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                    "Missing reference image for image edit request");
        }
        List<File> files = new ArrayList<>();
        try {
            for (Object referenceImageValue : referenceImages) {
                String referenceImageUrl = String.valueOf(referenceImageValue);
                if (!StringUtils.startsWithAny(referenceImageUrl, "http://", "https://")) {
                    throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                            "Reference image must be a public URL");
                }
                HttpResponse imageResponse = HttpRequest.get(referenceImageUrl).timeout(DEFAULT_HTTP_TIMEOUT_MS).execute();
                if (imageResponse.getStatus() < 200 || imageResponse.getStatus() >= 300) {
                    throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                            "Failed to download reference image: HTTP " + imageResponse.getStatus());
                }
                String contentType = StringUtils.substringBefore(
                        StringUtils.defaultString(imageResponse.header(Header.CONTENT_TYPE)), ";");
                String format = resolveImageFormat(referenceImageUrl, contentType);
                File tempFile = FileUtil.createTempFile("ownai-reference-image-", "." + format, true);
                FileUtil.writeBytes(imageResponse.bodyBytes(), tempFile);
                files.add(tempFile);
            }
            return files;
        } catch (Exception e) {
            files.forEach(FileUtil::del);
            if (e instanceof RuntimeException) {
                throw (RuntimeException) e;
            }
            throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                    "Failed to prepare reference image: " + e.getMessage());
        }
    }

    private String buildProviderUrl(ImageGenerationWorkerProviderConfigVO providerConfig, Map<String, Object> providerRequest) {
        String baseUrl = StringUtils.removeEnd(providerConfig.getBaseUrl(), "/");
        Object requestPath = providerRequest.get("generationPath");
        String generationPath = requestPath == null ? providerConfig.getGenerationPath()
                : StringUtils.defaultIfBlank(String.valueOf(requestPath), providerConfig.getGenerationPath());
        if (!StringUtils.startsWith(generationPath, "/")) {
            generationPath = "/" + generationPath;
        }
        return baseUrl + generationPath;
    }

    private int resolveTimeout(ImageGenerationWorkerProviderConfigVO providerConfig) {
        Integer timeoutSeconds = providerConfig.getTimeoutSeconds();
        if (timeoutSeconds == null || timeoutSeconds <= 0) {
            return DEFAULT_HTTP_TIMEOUT_MS;
        }
        return timeoutSeconds * 1000;
    }

    private List<String> uploadProviderImages(ImageGenerationMessageVO task, JSONObject responseJson) {
        ensureCosConfigured();
        List<String> resultUrls = new ArrayList<>();
        JSONArray dataArray = responseJson.getJSONArray("data");
        if (dataArray != null) {
            for (Object itemValue : dataArray) {
                JSONObject item = JSONUtil.parseObj(itemValue);
                String b64Json = item.getStr("b64_json");
                if (StringUtils.isNotBlank(b64Json)) {
                    String format = normalizeImageFormat(responseJson.getStr("output_format"));
                    resultUrls.add(uploadBase64Image(task.getTaskId(), resultUrls.size() + 1, b64Json, format));
                    continue;
                }
                String imageUrl = StringUtils.firstNonBlank(item.getStr("url"), item.getStr("image_url"),
                        item.getStr("output_url"));
                if (StringUtils.isNotBlank(imageUrl)) {
                    resultUrls.add(uploadRemoteImage(task.getTaskId(), resultUrls.size() + 1, imageUrl));
                }
            }
        }
        return resultUrls;
    }

    private void ensureCosConfigured() {
        if (!StringUtils.isNoneBlank(cosClientConfig.getHost(), cosClientConfig.getSecretId(),
                cosClientConfig.getSecretKey(), cosClientConfig.getRegion(), cosClientConfig.getBucket())) {
            throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                    "COS is not configured");
        }
    }

    private String uploadBase64Image(String taskId, int index, String b64Json, String format) {
        String payload = b64Json;
        if (StringUtils.startsWithIgnoreCase(payload, "data:")) {
            int commaIndex = payload.indexOf(',');
            if (commaIndex >= 0) {
                payload = payload.substring(commaIndex + 1);
            }
        }
        byte[] bytes = Base64.getDecoder().decode(payload);
        return uploadBytes(taskId, index, bytes, format, toContentType(format));
    }

    private String uploadRemoteImage(String taskId, int index, String imageUrl) {
        HttpResponse imageResponse = HttpRequest.get(imageUrl).timeout(DEFAULT_HTTP_TIMEOUT_MS).execute();
        if (imageResponse.getStatus() < 200 || imageResponse.getStatus() >= 300) {
            throw new BusinessException(com.yupi.springbootinit.common.ErrorCode.OPERATION_ERROR,
                    "Failed to download provider image: HTTP " + imageResponse.getStatus());
        }
        String contentType = StringUtils.substringBefore(
                StringUtils.defaultString(imageResponse.header(Header.CONTENT_TYPE)), ";");
        String format = resolveImageFormat(imageUrl, contentType);
        return uploadBytes(taskId, index, imageResponse.bodyBytes(), format, toContentType(format));
    }

    private String uploadBytes(String taskId, int index, byte[] bytes, String format, String contentType) {
        String safeFormat = normalizeImageFormat(format);
        String objectKey = String.format("ownai/image-generation/%s/%02d-%s.%s", taskId, index,
                IdUtil.fastSimpleUUID(), safeFormat);
        File tempFile = FileUtil.createTempFile("ownai-image-generation-", "." + safeFormat, true);
        try {
            FileUtil.writeBytes(bytes, tempFile);
            cosManager.putObject(objectKey, tempFile, contentType);
            return StringUtils.removeEnd(cosClientConfig.getHost(), "/") + "/" + objectKey;
        } finally {
            FileUtil.del(tempFile);
        }
    }

    private String resolveImageFormat(String imageUrl, String contentType) {
        if (StringUtils.isNotBlank(contentType) && contentType.startsWith("image/")) {
            return normalizeImageFormat(StringUtils.substringAfter(contentType, "image/"));
        }
        try {
            String path = URI.create(imageUrl).getPath();
            String ext = StringUtils.substringAfterLast(path, ".");
            if (StringUtils.isNotBlank(ext)) {
                return normalizeImageFormat(ext);
            }
        } catch (Exception ignored) {
            // Fall back to png below.
        }
        return "png";
    }

    private String normalizeImageFormat(String format) {
        String safeFormat = StringUtils.defaultIfBlank(format, "png").toLowerCase();
        if ("jpeg".equals(safeFormat)) {
            return "jpg";
        }
        if (!StringUtils.equalsAny(safeFormat, "png", "jpg", "webp")) {
            return "png";
        }
        return safeFormat;
    }

    private String toContentType(String format) {
        String safeFormat = normalizeImageFormat(format);
        if ("jpg".equals(safeFormat)) {
            return "image/jpeg";
        }
        return "image/" + safeFormat;
    }

    private Object sanitizeProviderResponse(JSONObject responseJson) {
        Map<String, Object> sanitized = new LinkedHashMap<>();
        responseJson.forEach((key, value) -> {
            if ("data".equals(key) && value instanceof JSONArray) {
                JSONArray sanitizedData = new JSONArray();
                ((JSONArray) value).forEach(itemValue -> {
                    JSONObject item = JSONUtil.parseObj(itemValue);
                    if (item.containsKey("b64_json")) {
                        item.set("b64_json", "[base64 omitted]");
                    }
                    sanitizedData.add(item);
                });
                sanitized.put(key, sanitizedData);
            } else {
                sanitized.put(key, value);
            }
        });
        return sanitized;
    }

    @lombok.Data
    private static class ProviderCallResult {

        private List<String> resultImageUrls;

        private Object sanitizedResponsePayload;
    }
}
