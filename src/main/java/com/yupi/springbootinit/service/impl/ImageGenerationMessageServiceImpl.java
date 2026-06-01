package com.yupi.springbootinit.service.impl;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.ImageGenerationMessageMapper;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationCreateRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationMessageQueryRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationTaskUpdateRequest;
import com.yupi.springbootinit.model.entity.ImageGenerationModelConfig;
import com.yupi.springbootinit.model.entity.ImageGenerationMessage;
import com.yupi.springbootinit.model.entity.ImageGenerationProviderConfig;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationConversationVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationConversationSummaryVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationCreateVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationDailyTrendVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationMessageVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationMonitorOverviewVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationTaskContextVO;
import com.yupi.springbootinit.model.enums.PointChangeTypeEnum;
import com.yupi.springbootinit.service.ImageGenerationMessageService;
import com.yupi.springbootinit.service.ImageGenerationModelConfigService;
import com.yupi.springbootinit.service.ImageGenerationProviderConfigService;
import com.yupi.springbootinit.service.PointService;
import com.yupi.springbootinit.utils.SqlUtils;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ImageGenerationMessageServiceImpl
        extends ServiceImpl<ImageGenerationMessageMapper, ImageGenerationMessage>
        implements ImageGenerationMessageService {

    private static final String ROLE_USER = "user";

    private static final String ROLE_ASSISTANT = "assistant";

    private static final String STATUS_SUCCESS = "success";

    private static final String STATUS_PENDING = "pending";

    private static final String STATUS_RUNNING = "running";

    private static final String STATUS_FAILED = "failed";

    private static final String MODEL_GPT_IMAGE_2 = "gpt-image-2";

    private static final String IMAGE_SIZE_1K = "1k";

    private static final Set<String> ALLOWED_IMAGE_SIZES = new HashSet<>(Arrays.asList("1k", "2k", "4k"));

    private static final String POINT_STATUS_NONE = "none";

    private static final String POINT_STATUS_FROZEN = "frozen";

    private static final String POINT_STATUS_CONSUMED = "consumed";

    private static final String POINT_STATUS_REFUNDED = "refunded";

    private static final String RELATED_TYPE_IMAGE_GENERATION = "image_generation";

    private static final Set<String> ALLOWED_ASPECT_RATIOS = new HashSet<>(
            Arrays.asList("1:1", "3:4", "9:16", "4:3", "16:9"));

    private static final Set<String> ALLOWED_TASK_UPDATE_STATUSES = new HashSet<>(
            Arrays.asList(STATUS_RUNNING, STATUS_SUCCESS, STATUS_FAILED));

    @Resource
    private PointService pointService;

    @Resource
    private ImageGenerationProviderConfigService providerConfigService;

    @Resource
    private ImageGenerationModelConfigService modelConfigService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImageGenerationCreateVO createGeneration(ImageGenerationCreateRequest request, User loginUser) {
        validateCreateRequest(request);
        Long userId = loginUser.getId();
        String conversationId = StringUtils.trimToNull(request.getConversationId());
        if (conversationId == null) {
            conversationId = "img_conv_" + IdWorker.getIdStr();
        } else {
            validateConversationOwner(conversationId, userId);
        }

        ImageGenerationProviderConfig providerConfig = resolveProviderConfig(request.getProviderCode());
        String modelCode = normalizeModelCode(request.getModelCode());
        String imageSize = normalizeImageSize(request.getImageSize());
        String resolvedAspectRatio = normalizeConfigAspectRatio(request.getAspectRatio());
        ImageGenerationModelConfig modelConfig = modelConfigService.getEnabledModelConfig(
                providerConfig.getProviderCode(), modelCode, imageSize, resolvedAspectRatio);
        String referenceImageUrl = normalizeReferenceImageUrl(request.getReferenceImageUrl());
        if (StringUtils.isNotBlank(referenceImageUrl)
                && !Integer.valueOf(1).equals(modelConfig.getSupportsReferenceImage())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "This model size does not support reference images");
        }
        int imageCount = normalizeImageCount(request.getImageCount());
        int pointCost = calculatePointCost(modelConfig, imageCount);
        BigDecimal apiCostCny = calculateApiCost(modelConfig, imageCount);
        Date now = new Date();
        String taskId = "img_task_" + IdWorker.getIdStr();
        String vendorModel = modelConfig.getModelCode();
        String vendorSize = modelConfig.getVendorSize();
        Map<String, Object> providerRequest = buildProviderRequestPayload(providerConfig, modelConfig,
                request, modelCode, imageSize, imageCount, resolvedAspectRatio, referenceImageUrl);
        ImageGenerationMessage userMessage = new ImageGenerationMessage();
        userMessage.setUserId(userId);
        userMessage.setConversationId(conversationId);
        userMessage.setRole(ROLE_USER);
        userMessage.setPrompt(StringUtils.trimToNull(request.getPrompt()));
        userMessage.setAspectRatio(request.getAspectRatio());
        userMessage.setProviderCode(providerConfig.getProviderCode());
        userMessage.setProviderName(providerConfig.getProviderName());
        userMessage.setModelCode(modelCode);
        userMessage.setVendorModel(vendorModel);
        userMessage.setImageSize(imageSize);
        userMessage.setVendorSize(vendorSize);
        userMessage.setImageCount(imageCount);
        userMessage.setPointStatus(POINT_STATUS_NONE);
        userMessage.setReferenceImageUrl(referenceImageUrl);
        userMessage.setSourcePromptAssetId(request.getSourcePromptAssetId());
        userMessage.setStatus(STATUS_SUCCESS);
        userMessage.setCreateTime(now);
        userMessage.setUpdateTime(now);
        boolean saveUserMessage = this.save(userMessage);
        ThrowUtils.throwIf(!saveUserMessage, ErrorCode.OPERATION_ERROR);

        ImageGenerationMessage assistantMessage = new ImageGenerationMessage();
        assistantMessage.setUserId(userId);
        assistantMessage.setConversationId(conversationId);
        assistantMessage.setRole(ROLE_ASSISTANT);
        assistantMessage.setAspectRatio(request.getAspectRatio());
        assistantMessage.setProviderCode(providerConfig.getProviderCode());
        assistantMessage.setProviderName(providerConfig.getProviderName());
        assistantMessage.setModelCode(modelCode);
        assistantMessage.setVendorModel(vendorModel);
        assistantMessage.setImageSize(imageSize);
        assistantMessage.setVendorSize(vendorSize);
        assistantMessage.setImageCount(imageCount);
        assistantMessage.setPointCost(pointCost);
        assistantMessage.setApiCostCny(apiCostCny);
        assistantMessage.setPointStatus(POINT_STATUS_FROZEN);
        assistantMessage.setReferenceImageUrl(referenceImageUrl);
        assistantMessage.setSourcePromptAssetId(request.getSourcePromptAssetId());
        assistantMessage.setTaskId(taskId);
        assistantMessage.setStatus(STATUS_PENDING);
        assistantMessage.setRequestPayload(JSONUtil.toJsonStr(providerRequest));
        assistantMessage.setCreateTime(now);
        assistantMessage.setUpdateTime(now);
        boolean saveAssistantMessage = this.save(assistantMessage);
        ThrowUtils.throwIf(!saveAssistantMessage, ErrorCode.OPERATION_ERROR);
        pointService.deductPoints(userId, pointCost, PointChangeTypeEnum.IMAGE_GENERATE_FREEZE,
                RELATED_TYPE_IMAGE_GENERATION, assistantMessage.getId(),
                String.format("图片生成冻结 %s %s x%d", modelCode, imageSize, imageCount));

        ImageGenerationCreateVO vo = new ImageGenerationCreateVO();
        vo.setConversationId(conversationId);
        vo.setMessageId(userMessage.getId());
        vo.setAssistantMessageId(assistantMessage.getId());
        vo.setTaskId(taskId);
        vo.setStatus(STATUS_PENDING);
        vo.setProviderCode(providerConfig.getProviderCode());
        vo.setProviderName(providerConfig.getProviderName());
        vo.setModelCode(modelCode);
        vo.setVendorModel(vendorModel);
        vo.setImageSize(imageSize);
        vo.setVendorSize(vendorSize);
        vo.setImageCount(imageCount);
        vo.setPointCost(pointCost);
        vo.setApiCostCny(apiCostCny);
        return vo;
    }

    @Override
    public ImageGenerationConversationVO getCurrentConversation(User loginUser) {
        ImageGenerationMessage latest = this.getOne(new QueryWrapper<ImageGenerationMessage>()
                .eq("userId", loginUser.getId())
                .orderByDesc("createTime", "id")
                .last("limit 1"));
        if (latest == null) {
            return new ImageGenerationConversationVO();
        }
        return getConversation(latest.getConversationId(), loginUser);
    }

    @Override
    public ImageGenerationConversationVO getConversation(String conversationId, User loginUser) {
        if (StringUtils.isBlank(conversationId)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        validateConversationOwner(conversationId, loginUser.getId());
        List<ImageGenerationMessage> messages = this.list(new QueryWrapper<ImageGenerationMessage>()
                .eq("userId", loginUser.getId())
                .eq("conversationId", conversationId)
                .orderByAsc("createTime", "id"));
        ImageGenerationConversationVO vo = new ImageGenerationConversationVO();
        vo.setConversationId(conversationId);
        vo.setUserId(loginUser.getId());
        vo.setMessages(messages.stream().map(this::toVO).collect(Collectors.toList()));
        return vo;
    }

    @Override
    public Page<ImageGenerationConversationSummaryVO> listMyConversationVOByPage(
            ImageGenerationMessageQueryRequest request, User loginUser) {
        ImageGenerationMessageQueryRequest safeRequest =
                request == null ? new ImageGenerationMessageQueryRequest() : request;
        safeRequest.setUserId(loginUser.getId());
        long current = Math.max(safeRequest.getCurrent(), 1);
        long pageSize = Math.min(Math.max(safeRequest.getPageSize(), 1), 50);
        if (StringUtils.isNotBlank(safeRequest.getStatus()) || StringUtils.isNotBlank(safeRequest.getModelCode())
                || StringUtils.isNotBlank(safeRequest.getImageSize())) {
            safeRequest.setRole(ROLE_ASSISTANT);
        }
        List<ImageGenerationMessage> candidateMessages = this.list(getAdminQueryWrapper(safeRequest));
        Map<String, ImageGenerationMessage> latestByConversation = new LinkedHashMap<>();
        candidateMessages.stream()
                .filter(message -> StringUtils.isNotBlank(message.getConversationId()))
                .forEach(message -> {
                    ImageGenerationMessage old = latestByConversation.get(message.getConversationId());
                    if (old == null || compareMessageTime(message, old) > 0) {
                        latestByConversation.put(message.getConversationId(), message);
                    }
                });
        List<ImageGenerationMessage> latestMessages = new ArrayList<>(latestByConversation.values());
        latestMessages.sort((a, b) -> compareMessageTime(b, a));

        int fromIndex = (int) Math.min((current - 1) * pageSize, latestMessages.size());
        int toIndex = (int) Math.min(fromIndex + pageSize, latestMessages.size());
        List<ImageGenerationConversationSummaryVO> records = latestMessages.subList(fromIndex, toIndex).stream()
                .map(message -> buildConversationSummary(loginUser.getId(), message.getConversationId()))
                .collect(Collectors.toList());

        Page<ImageGenerationConversationSummaryVO> page = new Page<>(current, pageSize, latestMessages.size());
        page.setRecords(records);
        return page;
    }

    @Override
    public Page<ImageGenerationMessageVO> listAdminMessageVOByPage(ImageGenerationMessageQueryRequest request) {
        ImageGenerationMessageQueryRequest safeRequest =
                request == null ? new ImageGenerationMessageQueryRequest() : request;
        long current = Math.max(safeRequest.getCurrent(), 1);
        long pageSize = Math.min(Math.max(safeRequest.getPageSize(), 1), 100);
        Page<ImageGenerationMessage> page =
                this.page(new Page<>(current, pageSize), getAdminQueryWrapper(safeRequest));
        Page<ImageGenerationMessageVO> voPage = new Page<>(current, pageSize, page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return voPage;
    }

    @Override
    public ImageGenerationMessageVO getAdminMessageVO(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        ImageGenerationMessage message = this.getById(id);
        if (message == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        return toVO(message);
    }

    @Override
    public ImageGenerationMonitorOverviewVO getAdminMonitorOverview(ImageGenerationMessageQueryRequest request) {
        ImageGenerationMessageQueryRequest safeRequest =
                request == null ? new ImageGenerationMessageQueryRequest() : request;
        Date endTime = safeRequest.getEndTime() == null ? new Date() : safeRequest.getEndTime();
        Date startTime = safeRequest.getStartTime() == null ? defaultMonitorStartTime(endTime) : safeRequest.getStartTime();
        safeRequest.setStartTime(startTime);
        safeRequest.setEndTime(endTime);
        safeRequest.setRole(ROLE_ASSISTANT);

        List<ImageGenerationMessage> tasks = this.list(getAdminQueryWrapper(safeRequest));
        ImageGenerationMonitorOverviewVO overview = new ImageGenerationMonitorOverviewVO();
        overview.setTotalTasks((long) tasks.size());
        overview.setSuccessTasks(countByStatus(tasks, STATUS_SUCCESS));
        overview.setFailedTasks(countByStatus(tasks, STATUS_FAILED));
        overview.setPendingTasks(countByStatus(tasks, STATUS_PENDING));
        overview.setRunningTasks(countByStatus(tasks, STATUS_RUNNING));
        overview.setTotalImages(sumSuccessImages(tasks));
        overview.setTotalPointCost(sumActivePointCost(tasks));
        overview.setTotalApiCostCny(sumSuccessApiCost(tasks));
        overview.setSuccessRate(calculateRate(overview.getSuccessTasks(), overview.getTotalTasks()));
        overview.setAvgDurationSeconds(calculateAvgDurationSeconds(tasks));

        Map<String, Long> statusDistribution = new LinkedHashMap<>();
        statusDistribution.put(STATUS_PENDING, overview.getPendingTasks());
        statusDistribution.put(STATUS_RUNNING, overview.getRunningTasks());
        statusDistribution.put(STATUS_SUCCESS, overview.getSuccessTasks());
        statusDistribution.put(STATUS_FAILED, overview.getFailedTasks());
        overview.setStatusDistribution(statusDistribution);
        overview.setDailyTrend(buildDailyTrend(tasks, startTime, endTime));
        return overview;
    }

    @Override
    public Page<ImageGenerationConversationSummaryVO> listAdminConversationVOByPage(
            ImageGenerationMessageQueryRequest request) {
        ImageGenerationMessageQueryRequest safeRequest =
                request == null ? new ImageGenerationMessageQueryRequest() : request;
        long current = Math.max(safeRequest.getCurrent(), 1);
        long pageSize = Math.min(Math.max(safeRequest.getPageSize(), 1), 50);
        if (StringUtils.isNotBlank(safeRequest.getStatus()) || StringUtils.isNotBlank(safeRequest.getModelCode())
                || StringUtils.isNotBlank(safeRequest.getImageSize())) {
            safeRequest.setRole(ROLE_ASSISTANT);
        }
        List<ImageGenerationMessage> candidateMessages = this.list(getAdminQueryWrapper(safeRequest));
        Map<String, ImageGenerationMessage> latestByConversation = new LinkedHashMap<>();
        candidateMessages.stream()
                .filter(message -> StringUtils.isNotBlank(message.getConversationId()) && message.getUserId() != null)
                .forEach(message -> {
                    String key = conversationKey(message.getUserId(), message.getConversationId());
                    ImageGenerationMessage old = latestByConversation.get(key);
                    if (old == null || compareMessageTime(message, old) > 0) {
                        latestByConversation.put(key, message);
                    }
                });
        List<ImageGenerationMessage> latestMessages = new ArrayList<>(latestByConversation.values());
        latestMessages.sort((a, b) -> compareMessageTime(b, a));

        int fromIndex = (int) Math.min((current - 1) * pageSize, latestMessages.size());
        int toIndex = (int) Math.min(fromIndex + pageSize, latestMessages.size());
        List<ImageGenerationConversationSummaryVO> records = latestMessages.subList(fromIndex, toIndex).stream()
                .map(message -> buildConversationSummary(message.getUserId(), message.getConversationId()))
                .collect(Collectors.toList());

        Page<ImageGenerationConversationSummaryVO> page = new Page<>(current, pageSize, latestMessages.size());
        page.setRecords(records);
        return page;
    }

    @Override
    public ImageGenerationConversationVO getAdminConversation(String conversationId, Long userId) {
        if (StringUtils.isBlank(conversationId) || userId == null || userId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        List<ImageGenerationMessage> messages = this.list(new QueryWrapper<ImageGenerationMessage>()
                .eq("userId", userId)
                .eq("conversationId", StringUtils.trim(conversationId))
                .orderByAsc("createTime", "id"));
        if (messages.isEmpty()) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        ImageGenerationConversationVO vo = new ImageGenerationConversationVO();
        vo.setConversationId(StringUtils.trim(conversationId));
        vo.setUserId(userId);
        vo.setMessages(messages.stream().map(this::toVO).collect(Collectors.toList()));
        return vo;
    }

    @Override
    public Page<ImageGenerationTaskContextVO> listPendingTaskContextByPage(ImageGenerationMessageQueryRequest request) {
        ImageGenerationMessageQueryRequest safeRequest =
                request == null ? new ImageGenerationMessageQueryRequest() : request;
        safeRequest.setRole(ROLE_ASSISTANT);
        safeRequest.setStatus(STATUS_PENDING);
        long current = Math.max(safeRequest.getCurrent(), 1);
        long pageSize = Math.min(Math.max(safeRequest.getPageSize(), 1), 50);
        Page<ImageGenerationMessage> page =
                this.page(new Page<>(current, pageSize), getAdminQueryWrapper(safeRequest));
        Page<ImageGenerationTaskContextVO> voPage = new Page<>(current, pageSize, page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(this::toTaskContextVO).collect(Collectors.toList()));
        return voPage;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImageGenerationMessageVO updateTaskResult(ImageGenerationTaskUpdateRequest request) {
        if (request == null || StringUtils.isBlank(request.getTaskId())
                || StringUtils.isBlank(request.getStatus())
                || !ALLOWED_TASK_UPDATE_STATUSES.contains(request.getStatus())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String taskId = StringUtils.trim(request.getTaskId());
        String targetStatus = request.getStatus();
        String expectedStatus = getExpectedStatusBeforeUpdate(targetStatus);
        ImageGenerationMessage taskMessage = this.getOne(new QueryWrapper<ImageGenerationMessage>()
                .eq("taskId", taskId)
                .eq("role", ROLE_ASSISTANT)
                .last("limit 1"));
        if (taskMessage == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }

        ImageGenerationMessage updateMessage = new ImageGenerationMessage();
        updateMessage.setId(taskMessage.getId());
        updateMessage.setStatus(targetStatus);
        updateMessage.setPrompt(StringUtils.trimToNull(request.getPrompt()));
        updateMessage.setResultImageUrls(toJsonStorage(request.getResultImageUrls()));
        updateMessage.setResponsePayload(toJsonStorage(request.getResponsePayload()));
        updateMessage.setErrorMessage(StringUtils.trimToNull(request.getErrorMessage()));
        Date now = new Date();
        if (STATUS_RUNNING.equals(targetStatus)) {
            updateMessage.setStartedTime(now);
        }
        if (STATUS_SUCCESS.equals(targetStatus) || STATUS_FAILED.equals(targetStatus)) {
            updateMessage.setFinishedTime(now);
        }
        if (STATUS_SUCCESS.equals(targetStatus) && POINT_STATUS_FROZEN.equals(taskMessage.getPointStatus())) {
            updateMessage.setPointStatus(POINT_STATUS_CONSUMED);
        }
        if (STATUS_FAILED.equals(targetStatus) && POINT_STATUS_FROZEN.equals(taskMessage.getPointStatus())) {
            updateMessage.setPointStatus(POINT_STATUS_REFUNDED);
        }
        boolean result = this.update(updateMessage, new QueryWrapper<ImageGenerationMessage>()
                .eq("id", taskMessage.getId())
                .eq("taskId", taskId)
                .eq("role", ROLE_ASSISTANT)
                .eq("status", expectedStatus));
        if (!result) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    String.format("Task status must be %s before changing to %s", expectedStatus, targetStatus));
        }
        if (STATUS_FAILED.equals(targetStatus) && POINT_STATUS_FROZEN.equals(taskMessage.getPointStatus())
                && taskMessage.getPointCost() != null && taskMessage.getPointCost() > 0) {
            pointService.addPoints(taskMessage.getUserId(), taskMessage.getPointCost(),
                    PointChangeTypeEnum.IMAGE_GENERATE_REFUND, RELATED_TYPE_IMAGE_GENERATION, taskMessage.getId(),
                    String.format("图片生成失败退款 %s", taskId));
        }
        return toVO(this.getById(taskMessage.getId()));
    }

    @Override
    public int recoverStaleRunningTasks(int timeoutMinutes) {
        int safeTimeoutMinutes = Math.max(timeoutMinutes, 1);
        Date cutoffTime = new Date(System.currentTimeMillis() - safeTimeoutMinutes * 60L * 1000L);
        ImageGenerationMessage updateMessage = new ImageGenerationMessage();
        updateMessage.setStatus(STATUS_PENDING);
        updateMessage.setErrorMessage(String.format("Recovered from running timeout after %d minutes",
                safeTimeoutMinutes));
        return this.baseMapper.update(updateMessage, new QueryWrapper<ImageGenerationMessage>()
                .eq("role", ROLE_ASSISTANT)
                .eq("status", STATUS_RUNNING)
                .lt("updateTime", cutoffTime));
    }

    private String getExpectedStatusBeforeUpdate(String targetStatus) {
        if (STATUS_RUNNING.equals(targetStatus)) {
            return STATUS_PENDING;
        }
        if (STATUS_SUCCESS.equals(targetStatus) || STATUS_FAILED.equals(targetStatus)) {
            return STATUS_RUNNING;
        }
        throw new BusinessException(ErrorCode.PARAMS_ERROR);
    }

    private void validateCreateRequest(ImageGenerationCreateRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String aspectRatio = request.getAspectRatio();
        if (StringUtils.isBlank(aspectRatio) || !ALLOWED_ASPECT_RATIOS.contains(aspectRatio)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        if (StringUtils.isBlank(request.getPrompt()) && StringUtils.isBlank(request.getReferenceImageUrl())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        normalizeModelCode(request.getModelCode());
        normalizeImageSize(request.getImageSize());
        normalizeImageCount(request.getImageCount());
        normalizeReferenceImageUrl(request.getReferenceImageUrl());
    }

    private String normalizeModelCode(String modelCode) {
        return StringUtils.defaultIfBlank(StringUtils.trimToNull(modelCode), MODEL_GPT_IMAGE_2);
    }

    private String normalizeImageSize(String imageSize) {
        String safeImageSize = StringUtils.defaultIfBlank(StringUtils.trimToNull(imageSize), IMAGE_SIZE_1K).toLowerCase();
        if (!ALLOWED_IMAGE_SIZES.contains(safeImageSize)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Unsupported image size");
        }
        return safeImageSize;
    }

    private String normalizeConfigAspectRatio(String aspectRatio) {
        String safeAspectRatio = StringUtils.defaultIfBlank(StringUtils.trimToNull(aspectRatio), "1:1");
        if (!ALLOWED_ASPECT_RATIOS.contains(safeAspectRatio)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Unsupported aspect ratio");
        }
        return safeAspectRatio;
    }

    private int normalizeImageCount(Integer imageCount) {
        int safeImageCount = imageCount == null ? 1 : imageCount;
        if (safeImageCount <= 0 || safeImageCount > 4) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Image count must be 1-4");
        }
        return safeImageCount;
    }

    private String normalizeReferenceImageUrl(String referenceImageUrl) {
        String safeReferenceImageUrl = StringUtils.trimToNull(referenceImageUrl);
        if (safeReferenceImageUrl != null
                && !StringUtils.startsWithAny(safeReferenceImageUrl, "http://", "https://")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Reference image must be a public URL");
        }
        return safeReferenceImageUrl;
    }

    private ImageGenerationProviderConfig resolveProviderConfig(String providerCode) {
        String safeProviderCode = StringUtils.trimToNull(providerCode);
        if (safeProviderCode == null) {
            return providerConfigService.getDefaultEnabledProvider();
        }
        return providerConfigService.getEnabledProvider(safeProviderCode);
    }

    private int calculatePointCost(ImageGenerationModelConfig modelConfig, int imageCount) {
        int singleCost = modelConfig.getPointCost() == null ? 0 : modelConfig.getPointCost();
        return singleCost * imageCount;
    }

    private BigDecimal calculateApiCost(ImageGenerationModelConfig modelConfig, int imageCount) {
        BigDecimal singleCost = modelConfig.getApiCostCny() == null ? BigDecimal.ZERO : modelConfig.getApiCostCny();
        return singleCost.multiply(BigDecimal.valueOf(imageCount));
    }

    private Map<String, Object> buildProviderRequestPayload(ImageGenerationProviderConfig providerConfig,
            ImageGenerationModelConfig modelConfig, ImageGenerationCreateRequest request, String modelCode,
            String imageSize, int imageCount, String resolvedAspectRatio, String referenceImageUrl) {
        Map<String, Object> payload = new LinkedHashMap<>();
        String prompt = StringUtils.trimToNull(request.getPrompt());
        payload.put("providerCode", providerConfig.getProviderCode());
        payload.put("providerName", providerConfig.getProviderName());
        payload.put("baseUrl", providerConfig.getBaseUrl());
        payload.put("generationPath", providerConfig.getGenerationPath());
        payload.put("authType", providerConfig.getAuthType());
        payload.put("timeoutSeconds", providerConfig.getTimeoutSeconds());
        payload.put("modelCode", modelCode);
        payload.put("model", modelConfig.getModelCode());
        payload.put("vendorModel", modelConfig.getModelCode());
        payload.put("sizeCode", imageSize);
        payload.put("size", modelConfig.getVendorSize());
        payload.put("vendorSize", modelConfig.getVendorSize());
        payload.put("imageCount", imageCount);
        payload.put("aspectRatio", request.getAspectRatio());
        payload.put("resolvedAspectRatio", resolvedAspectRatio);
        payload.put("prompt", prompt);
        payload.put("sourcePromptAssetId", request.getSourcePromptAssetId());
        List<String> referenceImages = new ArrayList<>();
        if (StringUtils.isNotBlank(referenceImageUrl)) {
            referenceImages.add(referenceImageUrl);
            payload.put("reference_images", referenceImages);
        }
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", modelConfig.getModelCode());
        requestBody.put("prompt", prompt);
        requestBody.put("size", modelConfig.getVendorSize());
        if (!referenceImages.isEmpty()) {
            requestBody.put("reference_images", referenceImages);
        }
        payload.put("requestBody", requestBody);
        return payload;
    }

    private void validateConversationOwner(String conversationId, Long userId) {
        long count = this.count(new QueryWrapper<ImageGenerationMessage>()
                .eq("conversationId", conversationId)
                .eq("userId", userId));
        if (count <= 0) {
            long anyConversationCount = this.count(new QueryWrapper<ImageGenerationMessage>()
                    .eq("conversationId", conversationId));
            if (anyConversationCount > 0) {
                throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
            }
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
    }

    private QueryWrapper<ImageGenerationMessage> getAdminQueryWrapper(ImageGenerationMessageQueryRequest request) {
        QueryWrapper<ImageGenerationMessage> queryWrapper = new QueryWrapper<>();
        String providerCode = StringUtils.trimToNull(request.getProviderCode());
        String modelCode = StringUtils.trimToNull(request.getModelCode());
        String imageSize = StringUtils.trimToNull(request.getImageSize());
        String providerCodeValue = providerCode == null ? null : providerCode.toLowerCase();
        String imageSizeValue = imageSize == null ? null : normalizeImageSize(imageSize);
        queryWrapper.eq(request.getUserId() != null && request.getUserId() > 0, "userId", request.getUserId());
        queryWrapper.eq(StringUtils.isNotBlank(request.getConversationId()), "conversationId",
                StringUtils.trim(request.getConversationId()));
        queryWrapper.eq(StringUtils.isNotBlank(request.getRole()), "role", request.getRole());
        queryWrapper.eq(StringUtils.isNotBlank(request.getStatus()), "status", request.getStatus());
        queryWrapper.eq(StringUtils.isNotBlank(request.getAspectRatio()), "aspectRatio", request.getAspectRatio());
        queryWrapper.eq(StringUtils.isNotBlank(providerCodeValue), "providerCode", providerCodeValue);
        queryWrapper.eq(StringUtils.isNotBlank(modelCode), "modelCode", modelCode);
        queryWrapper.eq(StringUtils.isNotBlank(imageSizeValue), "imageSize", imageSizeValue);
        queryWrapper.eq(StringUtils.isNotBlank(request.getTaskId()), "taskId", StringUtils.trim(request.getTaskId()));
        queryWrapper.ge(request.getStartTime() != null, "createTime", request.getStartTime());
        queryWrapper.le(request.getEndTime() != null, "createTime", request.getEndTime());
        String searchText = StringUtils.trimToNull(request.getSearchText());
        queryWrapper.and(StringUtils.isNotBlank(searchText), wrapper -> wrapper
                .like("prompt", searchText)
                .or()
                .like("conversationId", searchText)
                .or()
                .like("taskId", searchText)
                .or()
                .like("providerCode", searchText)
                .or()
                .like("errorMessage", searchText));
        String sortField = request.getSortField();
        String sortOrder = request.getSortOrder();
        queryWrapper.orderBy(StringUtils.isNotBlank(sortField) && SqlUtils.validSortField(sortField),
                CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
        queryWrapper.orderByDesc("createTime", "id");
        return queryWrapper;
    }

    private Date defaultMonitorStartTime(Date endTime) {
        ZoneId zoneId = ZoneId.systemDefault();
        LocalDate endDate = endTime.toInstant().atZone(zoneId).toLocalDate();
        return Date.from(endDate.minusDays(6).atStartOfDay(zoneId).toInstant());
    }

    private long countByStatus(List<ImageGenerationMessage> tasks, String status) {
        return tasks.stream().filter(task -> status.equals(task.getStatus())).count();
    }

    private long sumSuccessImages(List<ImageGenerationMessage> tasks) {
        return tasks.stream()
                .filter(task -> STATUS_SUCCESS.equals(task.getStatus()))
                .mapToLong(task -> task.getImageCount() == null ? 1 : task.getImageCount())
                .sum();
    }

    private long sumActivePointCost(List<ImageGenerationMessage> tasks) {
        return tasks.stream()
                .filter(task -> POINT_STATUS_FROZEN.equals(task.getPointStatus())
                        || POINT_STATUS_CONSUMED.equals(task.getPointStatus()))
                .mapToLong(task -> task.getPointCost() == null ? 0 : task.getPointCost())
                .sum();
    }

    private BigDecimal sumSuccessApiCost(List<ImageGenerationMessage> tasks) {
        return tasks.stream()
                .filter(task -> STATUS_SUCCESS.equals(task.getStatus()))
                .map(task -> task.getApiCostCny() == null ? BigDecimal.ZERO : task.getApiCostCny())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateRate(long numerator, long denominator) {
        if (denominator <= 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(numerator)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateAvgDurationSeconds(List<ImageGenerationMessage> tasks) {
        List<Long> durations = tasks.stream()
                .filter(task -> task.getStartedTime() != null && task.getFinishedTime() != null)
                .map(task -> Math.max(task.getFinishedTime().getTime() - task.getStartedTime().getTime(), 0L))
                .collect(Collectors.toList());
        if (durations.isEmpty()) {
            return BigDecimal.ZERO;
        }
        long totalMillis = durations.stream().mapToLong(Long::longValue).sum();
        return BigDecimal.valueOf(totalMillis)
                .divide(BigDecimal.valueOf(durations.size() * 1000L), 2, RoundingMode.HALF_UP);
    }

    private List<ImageGenerationDailyTrendVO> buildDailyTrend(List<ImageGenerationMessage> tasks, Date startTime,
            Date endTime) {
        ZoneId zoneId = ZoneId.systemDefault();
        LocalDate startDate = startTime.toInstant().atZone(zoneId).toLocalDate();
        LocalDate endDate = endTime.toInstant().atZone(zoneId).toLocalDate();
        Map<LocalDate, ImageGenerationDailyTrendVO> trendMap = new LinkedHashMap<>();
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            ImageGenerationDailyTrendVO trend = new ImageGenerationDailyTrendVO();
            trend.setDate(cursor.toString());
            trend.setTotalTasks(0L);
            trend.setSuccessTasks(0L);
            trend.setTotalImages(0L);
            trend.setTotalPointCost(0L);
            trend.setTotalApiCostCny(BigDecimal.ZERO);
            trendMap.put(cursor, trend);
            cursor = cursor.plusDays(1);
        }
        tasks.forEach(task -> {
            if (task.getCreateTime() == null) {
                return;
            }
            LocalDate date = task.getCreateTime().toInstant().atZone(zoneId).toLocalDate();
            ImageGenerationDailyTrendVO trend = trendMap.get(date);
            if (trend == null) {
                return;
            }
            trend.setTotalTasks(trend.getTotalTasks() + 1);
            if (STATUS_SUCCESS.equals(task.getStatus())) {
                trend.setSuccessTasks(trend.getSuccessTasks() + 1);
                trend.setTotalImages(trend.getTotalImages() + (task.getImageCount() == null ? 1 : task.getImageCount()));
                trend.setTotalApiCostCny(trend.getTotalApiCostCny()
                        .add(task.getApiCostCny() == null ? BigDecimal.ZERO : task.getApiCostCny()));
            }
            if (POINT_STATUS_FROZEN.equals(task.getPointStatus())
                    || POINT_STATUS_CONSUMED.equals(task.getPointStatus())) {
                trend.setTotalPointCost(trend.getTotalPointCost()
                        + (task.getPointCost() == null ? 0 : task.getPointCost()));
            }
        });
        return new ArrayList<>(trendMap.values());
    }

    private String conversationKey(Long userId, String conversationId) {
        return userId + "::" + conversationId;
    }

    private int compareMessageTime(ImageGenerationMessage left, ImageGenerationMessage right) {
        Date leftTime = left.getUpdateTime() == null ? left.getCreateTime() : left.getUpdateTime();
        Date rightTime = right.getUpdateTime() == null ? right.getCreateTime() : right.getUpdateTime();
        long leftMillis = leftTime == null ? 0L : leftTime.getTime();
        long rightMillis = rightTime == null ? 0L : rightTime.getTime();
        if (leftMillis != rightMillis) {
            return Long.compare(leftMillis, rightMillis);
        }
        long leftId = left.getId() == null ? 0L : left.getId();
        long rightId = right.getId() == null ? 0L : right.getId();
        return Long.compare(leftId, rightId);
    }

    private ImageGenerationConversationSummaryVO buildConversationSummary(Long userId, String conversationId) {
        List<ImageGenerationMessage> messages = this.list(new QueryWrapper<ImageGenerationMessage>()
                .eq("userId", userId)
                .eq("conversationId", conversationId)
                .orderByAsc("createTime", "id"));
        ImageGenerationConversationSummaryVO summary = new ImageGenerationConversationSummaryVO();
        summary.setUserId(userId);
        summary.setConversationId(conversationId);
        summary.setMessageCount((long) messages.size());
        List<ImageGenerationMessage> tasks = messages.stream()
                .filter(message -> ROLE_ASSISTANT.equals(message.getRole()))
                .collect(Collectors.toList());
        summary.setTaskCount((long) tasks.size());
        summary.setSuccessCount(countByStatus(tasks, STATUS_SUCCESS));
        summary.setFailedCount(countByStatus(tasks, STATUS_FAILED));
        summary.setPendingCount(countByStatus(tasks, STATUS_PENDING));
        summary.setRunningCount(countByStatus(tasks, STATUS_RUNNING));
        summary.setTotalPointCost(sumActivePointCost(tasks));
        summary.setTotalApiCostCny(sumSuccessApiCost(tasks));
        messages.stream().map(ImageGenerationMessage::getCreateTime).filter(date -> date != null)
                .min(Date::compareTo).ifPresent(summary::setFirstCreateTime);
        messages.stream()
                .map(message -> message.getUpdateTime() == null ? message.getCreateTime() : message.getUpdateTime())
                .filter(date -> date != null)
                .max(Date::compareTo).ifPresent(summary::setLastUpdateTime);
        List<String> thumbnails = new ArrayList<>();
        messages.forEach(message -> extractThumbnailUrls(message).forEach(url -> {
            if (thumbnails.size() < 4 && !thumbnails.contains(url)) {
                thumbnails.add(url);
            }
        }));
        summary.setThumbnailUrls(thumbnails);
        return summary;
    }

    private ImageGenerationTaskContextVO toTaskContextVO(ImageGenerationMessage taskMessage) {
        ImageGenerationTaskContextVO vo = new ImageGenerationTaskContextVO();
        vo.setTask(toVO(taskMessage));
        if (StringUtils.isNotBlank(taskMessage.getProviderCode())) {
            ImageGenerationProviderConfig providerConfig = providerConfigService.getOne(
                    new QueryWrapper<ImageGenerationProviderConfig>()
                            .eq("providerCode", taskMessage.getProviderCode())
                            .last("limit 1"));
            vo.setProviderConfig(providerConfigService.toProviderConfigVO(providerConfig));
        }
        vo.setProviderRequest(parseProviderRequest(taskMessage.getRequestPayload()));
        List<ImageGenerationMessage> contextMessages = this.list(new QueryWrapper<ImageGenerationMessage>()
                .eq("userId", taskMessage.getUserId())
                .eq("conversationId", taskMessage.getConversationId())
                .and(wrapper -> wrapper.lt("createTime", taskMessage.getCreateTime())
                        .or(inner -> inner.eq("createTime", taskMessage.getCreateTime())
                                .le("id", taskMessage.getId())))
                .orderByAsc("createTime", "id"));
        vo.setContextMessages(contextMessages.stream().map(this::toVO).collect(Collectors.toList()));
        return vo;
    }

    private Map<String, Object> parseProviderRequest(String requestPayload) {
        Map<String, Object> providerRequest = new LinkedHashMap<>();
        String text = StringUtils.trimToNull(requestPayload);
        if (text == null) {
            return providerRequest;
        }
        try {
            JSONUtil.parseObj(text).forEach((key, value) -> providerRequest.put(String.valueOf(key), value));
        } catch (Exception e) {
            providerRequest.put("raw", text);
        }
        return providerRequest;
    }

    private String toJsonStorage(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String) {
            return StringUtils.trimToNull((String) value);
        }
        return JSONUtil.toJsonStr(value);
    }

    private List<String> extractThumbnailUrls(ImageGenerationMessage message) {
        List<String> urls = new ArrayList<>();
        if (StringUtils.isNotBlank(message.getReferenceImageUrl())) {
            urls.add(StringUtils.trim(message.getReferenceImageUrl()));
        }
        parseImageUrls(message.getResultImageUrls()).forEach(url -> {
            if (!urls.contains(url)) {
                urls.add(url);
            }
        });
        return urls;
    }

    private List<String> parseImageUrls(String value) {
        List<String> urls = new ArrayList<>();
        String text = StringUtils.trimToNull(value);
        if (text == null) {
            return urls;
        }
        try {
            if (text.startsWith("[")) {
                JSONUtil.parseArray(text).forEach(item -> {
                    if (item != null && StringUtils.isNotBlank(String.valueOf(item))) {
                        urls.add(String.valueOf(item));
                    }
                });
                return urls;
            }
            if (text.startsWith("\"") && text.endsWith("\"")) {
                String parsed = JSONUtil.parse(text).toString();
                if (StringUtils.isNotBlank(parsed)) {
                    urls.add(parsed);
                }
                return urls;
            }
        } catch (Exception ignored) {
            // Fall back to comma/plain URL parsing below.
        }
        if (text.contains(",")) {
            Arrays.stream(text.split(","))
                    .map(StringUtils::trimToNull)
                    .filter(StringUtils::isNotBlank)
                    .forEach(urls::add);
        } else {
            urls.add(text);
        }
        return urls;
    }

    private ImageGenerationMessageVO toVO(ImageGenerationMessage message) {
        ImageGenerationMessageVO vo = new ImageGenerationMessageVO();
        BeanUtils.copyProperties(message, vo);
        List<String> resultImageUrls = parseImageUrls(message.getResultImageUrls());
        vo.setResultImageUrlList(resultImageUrls);
        vo.setThumbnailUrls(extractThumbnailUrls(message));
        return vo;
    }
}
