package com.yupi.springbootinit.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.http.Header;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.CategoryMapper;
import com.yupi.springbootinit.mapper.PromptAssetAiTagConfigMapper;
import com.yupi.springbootinit.mapper.PromptAssetMapper;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAiTagConfigRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAiTagRunRequest;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.entity.PromptAsset;
import com.yupi.springbootinit.model.entity.PromptAssetAiTagConfig;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetAiTagConfigVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetAiTagItemResultVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetAiTagRunResultVO;
import com.yupi.springbootinit.service.PromptAssetAiTaggingService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class PromptAssetAiTaggingServiceImpl
        extends ServiceImpl<PromptAssetAiTagConfigMapper, PromptAssetAiTagConfig>
        implements PromptAssetAiTaggingService {

    private static final int ENABLED_STATUS = 1;

    private static final int DEFAULT_TIMEOUT_SECONDS = 60;

    private static final int DEFAULT_MAX_TAGS = 8;

    private static final int DEFAULT_LIMIT = 20;

    private static final int MAX_LIMIT = 1000;

    private static final int MAX_PROMPT_CHARS = 6000;

    private static final String DEFAULT_PROVIDER_CODE = "deepseek";

    private static final String DEFAULT_PROVIDER_NAME = "DeepSeek";

    private static final String DEFAULT_BASE_URL = "https://api.deepseek.com";

    private static final String DEFAULT_CHAT_PATH = "/v1/chat/completions";

    private static final String DEFAULT_MODEL_CODE = "deepseek-chat";

    private static final String DEFAULT_AUTH_TYPE = "bearer";

    private static final String AES_ALGORITHM = "AES";

    private static final String AES_TRANSFORMATION = "AES/GCM/NoPadding";

    private static final int GCM_TAG_LENGTH = 128;

    private static final int GCM_IV_LENGTH = 12;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private static final String DEFAULT_SYSTEM_PROMPT =
            "你是 OwnAI 的 Prompt 资产标签编辑器。请根据提示词内容提取资产描述标签。"
                    + "只返回 JSON 对象，格式为 {\"assetTags\":[\"标签1\",\"标签2\"]}。"
                    + "标签必须是中文短词，描述画面用途、风格、主体、构图、材质、行业或视觉特征。"
                    + "不要输出分类名、模型名、仓库名、无意义词、句子或解释。";

    @Resource
    private PromptAssetMapper promptAssetMapper;

    @Resource
    private CategoryMapper categoryMapper;

    @Value("${prompt.asset.ai-tagging.config-secret:${image.generation.config-secret:}}")
    private String configSecret;

    @Override
    public PromptAssetAiTagConfigVO getConfig() {
        PromptAssetAiTagConfig config = getCurrentConfig();
        if (config == null) {
            config = buildDefaultConfig();
        }
        return toConfigVO(config);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long saveConfig(PromptAssetAiTagConfigRequest request) {
        validateConfigRequest(request);
        String providerCode = normalizeCode(StringUtils.defaultIfBlank(request.getProviderCode(), DEFAULT_PROVIDER_CODE));
        PromptAssetAiTagConfig config;
        if (request.getId() != null && request.getId() > 0) {
            config = this.getById(request.getId());
            if (config == null) {
                throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
            }
        } else {
            config = this.getOne(new QueryWrapper<PromptAssetAiTagConfig>()
                    .eq("providerCode", providerCode)
                    .last("limit 1"));
            if (config == null) {
                config = new PromptAssetAiTagConfig();
                config.setProviderCode(providerCode);
                config.setCreateTime(new Date());
                config.setIsDelete(0);
            }
        }
        fillConfig(config, request);
        config.setUpdateTime(new Date());
        boolean result = config.getId() == null ? this.save(config) : this.updateById(config);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return config.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PromptAssetAiTagRunResultVO runTagging(PromptAssetAiTagRunRequest request) {
        PromptAssetAiTagConfig config = getEnabledConfig();
        boolean dryRun = request == null || !Boolean.FALSE.equals(request.getDryRun());
        boolean overwriteExisting = request == null || !Boolean.FALSE.equals(request.getOverwriteExisting());
        List<PromptAsset> assets = listTargetAssets(request, overwriteExisting);
        PromptAssetAiTagRunResultVO resultVO = new PromptAssetAiTagRunResultVO();
        resultVO.setDryRun(dryRun);
        resultVO.setTotalCount(assets.size());
        for (PromptAsset asset : assets) {
            PromptAssetAiTagItemResultVO item = new PromptAssetAiTagItemResultVO();
            item.setId(asset.getId());
            item.setTitle(asset.getTitle());
            try {
                if (!overwriteExisting && Integer.valueOf(1).equals(asset.getAiTagStatus())) {
                    item.setSuccess(true);
                    item.setUpdated(false);
                    item.setErrorMessage("Skipped because AI tag status is processed");
                    resultVO.setSkipCount(resultVO.getSkipCount() + 1);
                    resultVO.getItemList().add(item);
                    continue;
                }
                List<String> tagNames = callDeepSeekForTags(config, asset);
                item.setAssetTagList(tagNames);
                item.setSuccess(true);
                item.setUpdated(!dryRun);
                resultVO.setSuccessCount(resultVO.getSuccessCount() + 1);
                if (!dryRun) {
                    PromptAsset updateAsset = new PromptAsset();
                    updateAsset.setId(asset.getId());
                    updateAsset.setAssetTagText(JSONUtil.toJsonStr(tagNames));
                    updateAsset.setAiTagStatus(1);
                    int updateCount = promptAssetMapper.updateById(updateAsset);
                    if (updateCount <= 0) {
                        throw new BusinessException(ErrorCode.OPERATION_ERROR, "Update prompt asset tags failed");
                    }
                    resultVO.setUpdateCount(resultVO.getUpdateCount() + 1);
                }
            } catch (Exception e) {
                log.warn("AI prompt asset tagging failed, assetId={}", asset.getId(), e);
                item.setSuccess(false);
                item.setUpdated(false);
                item.setErrorMessage(StringUtils.left(e.getMessage(), 500));
                resultVO.setErrorCount(resultVO.getErrorCount() + 1);
            }
            resultVO.getItemList().add(item);
        }
        return resultVO;
    }

    private PromptAssetAiTagConfig getCurrentConfig() {
        return this.getOne(new QueryWrapper<PromptAssetAiTagConfig>()
                .orderByDesc("status")
                .orderByAsc("providerCode")
                .last("limit 1"));
    }

    private PromptAssetAiTagConfig getEnabledConfig() {
        PromptAssetAiTagConfig config = this.getOne(new QueryWrapper<PromptAssetAiTagConfig>()
                .eq("status", ENABLED_STATUS)
                .last("limit 1"));
        if (config == null) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "AI tagging config is not enabled");
        }
        if (StringUtils.isBlank(config.getApiKeyEncrypted())) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "DeepSeek API key is not configured");
        }
        return config;
    }

    private PromptAssetAiTagConfig buildDefaultConfig() {
        PromptAssetAiTagConfig config = new PromptAssetAiTagConfig();
        config.setProviderCode(DEFAULT_PROVIDER_CODE);
        config.setProviderName(DEFAULT_PROVIDER_NAME);
        config.setBaseUrl(DEFAULT_BASE_URL);
        config.setChatPath(DEFAULT_CHAT_PATH);
        config.setModelCode(DEFAULT_MODEL_CODE);
        config.setAuthType(DEFAULT_AUTH_TYPE);
        config.setStatus(ENABLED_STATUS);
        config.setTimeoutSeconds(DEFAULT_TIMEOUT_SECONDS);
        config.setMaxTags(DEFAULT_MAX_TAGS);
        config.setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        return config;
    }

    private void validateConfigRequest(PromptAssetAiTagConfigRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        if (StringUtils.isNotBlank(request.getBaseUrl())
                && !StringUtils.startsWithAny(StringUtils.trim(request.getBaseUrl()), "http://", "https://")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Base URL must start with http:// or https://");
        }
        if (request.getTimeoutSeconds() != null && request.getTimeoutSeconds() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Timeout must be positive");
        }
        if (request.getMaxTags() != null && (request.getMaxTags() <= 0 || request.getMaxTags() > 20)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Max tags must be between 1 and 20");
        }
    }

    private void fillConfig(PromptAssetAiTagConfig config, PromptAssetAiTagConfigRequest request) {
        if (StringUtils.isNotBlank(request.getProviderCode())) {
            config.setProviderCode(normalizeCode(request.getProviderCode()));
        }
        config.setProviderName(StringUtils.defaultIfBlank(StringUtils.trimToNull(request.getProviderName()),
                DEFAULT_PROVIDER_NAME));
        config.setBaseUrl(StringUtils.removeEnd(StringUtils.defaultIfBlank(
                StringUtils.trimToNull(request.getBaseUrl()), DEFAULT_BASE_URL), "/"));
        String chatPath = StringUtils.defaultIfBlank(StringUtils.trimToNull(request.getChatPath()), DEFAULT_CHAT_PATH);
        config.setChatPath(chatPath.startsWith("/") ? chatPath : "/" + chatPath);
        config.setModelCode(StringUtils.defaultIfBlank(StringUtils.trimToNull(request.getModelCode()), DEFAULT_MODEL_CODE));
        config.setAuthType(normalizeCode(StringUtils.defaultIfBlank(request.getAuthType(), DEFAULT_AUTH_TYPE)));
        config.setStatus(request.getStatus() == null ? ENABLED_STATUS : request.getStatus());
        config.setTimeoutSeconds(request.getTimeoutSeconds() == null ? DEFAULT_TIMEOUT_SECONDS : request.getTimeoutSeconds());
        config.setMaxTags(request.getMaxTags() == null ? DEFAULT_MAX_TAGS : request.getMaxTags());
        config.setSystemPrompt(StringUtils.defaultIfBlank(StringUtils.trimToNull(request.getSystemPrompt()),
                DEFAULT_SYSTEM_PROMPT));
        if (StringUtils.isNotBlank(request.getApiKey())) {
            String apiKey = StringUtils.trim(request.getApiKey());
            config.setApiKeyEncrypted(encryptApiKey(apiKey));
            config.setApiKeyLast4(apiKey.length() <= 4 ? apiKey : apiKey.substring(apiKey.length() - 4));
        }
    }

    private List<PromptAsset> listTargetAssets(PromptAssetAiTagRunRequest request, boolean overwriteExisting) {
        PromptAssetAiTagRunRequest safeRequest = request == null ? new PromptAssetAiTagRunRequest() : request;
        int limit = safeRequest.getLimit() == null || safeRequest.getLimit() <= 0 ? DEFAULT_LIMIT : safeRequest.getLimit();
        limit = Math.min(limit, MAX_LIMIT);
        QueryWrapper<PromptAsset> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("id", "assetType", "categoryId", "title", "summary", "promptContent", "promptCn",
                "sourceRepoName", "assetTagText", "aiTagStatus", "visualAssetType", "scenario", "visualStyle",
                "qualityLevel");
        List<Long> idList = normalizeIds(safeRequest.getIdList());
        queryWrapper.in(CollUtil.isNotEmpty(idList), "id", idList);
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getAssetType()), "assetType", safeRequest.getAssetType());
        queryWrapper.eq(safeRequest.getCategoryId() != null && safeRequest.getCategoryId() > 0,
                "categoryId", safeRequest.getCategoryId());
        queryWrapper.eq(safeRequest.getStatus() != null, "status", safeRequest.getStatus());
        if (!overwriteExisting) {
            queryWrapper.and(wrapper -> wrapper.isNull("aiTagStatus").or().eq("aiTagStatus", 0));
        }
        String searchText = StringUtils.trimToNull(safeRequest.getSearchText());
        if (StringUtils.isNotBlank(searchText)) {
            queryWrapper.and(wrapper -> wrapper.like("title", searchText)
                    .or().like("summary", searchText)
                    .or().like("promptContent", searchText)
                    .or().like("promptCn", searchText)
                    .or().like("sourceRepoName", searchText));
        }
        queryWrapper.orderByDesc("updateTime", "id");
        queryWrapper.last("limit " + limit);
        return promptAssetMapper.selectList(queryWrapper);
    }

    private List<String> callDeepSeekForTags(PromptAssetAiTagConfig config, PromptAsset asset) {
        JSONObject requestBody = new JSONObject();
        requestBody.set("model", config.getModelCode());
        requestBody.set("temperature", 0.1);
        requestBody.set("response_format", JSONUtil.createObj().set("type", "json_object"));
        JSONArray messages = new JSONArray();
        messages.add(JSONUtil.createObj()
                .set("role", "system")
                .set("content", StringUtils.defaultIfBlank(config.getSystemPrompt(), DEFAULT_SYSTEM_PROMPT)));
        messages.add(JSONUtil.createObj()
                .set("role", "user")
                .set("content", buildAssetTaggingUserPrompt(asset, resolveMaxTags(config))));
        requestBody.set("messages", messages);

        HttpRequest httpRequest = HttpRequest.post(buildChatUrl(config))
                .header(Header.CONTENT_TYPE, "application/json")
                .timeout(resolveTimeout(config))
                .body(requestBody.toString());
        if (DEFAULT_AUTH_TYPE.equalsIgnoreCase(config.getAuthType())) {
            httpRequest.header(Header.AUTHORIZATION, "Bearer " + decryptApiKey(config.getApiKeyEncrypted()));
        }
        HttpResponse response = httpRequest.execute();
        String responseBody = response.body();
        if (response.getStatus() < 200 || response.getStatus() >= 300) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    "DeepSeek call failed: HTTP " + response.getStatus() + " " + StringUtils.left(responseBody, 500));
        }
        JSONObject responseJson = JSONUtil.parseObj(responseBody);
        String content = extractAssistantContent(responseJson);
        List<String> tags = parseTagNames(content, resolveMaxTags(config));
        if (CollUtil.isEmpty(tags)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "DeepSeek returned empty asset tags");
        }
        return tags;
    }

    private String buildAssetTaggingUserPrompt(PromptAsset asset, int maxTags) {
        Category category = asset.getCategoryId() == null ? null : categoryMapper.selectById(asset.getCategoryId());
        StringBuilder builder = new StringBuilder();
        builder.append("请为下面这条 Prompt 资产重新生成资产描述标签，最多 ").append(maxTags).append(" 个。\n");
        builder.append("不要返回二级场景标签，不要返回 image_prompt、gpt-image-2、仓库名这类元信息。\n\n");
        appendField(builder, "标题", asset.getTitle(), 300);
        appendField(builder, "分类", category == null ? null : category.getName(), 100);
        appendField(builder, "来源仓库", asset.getSourceRepoName(), 200);
        appendField(builder, "摘要", asset.getSummary(), 800);
        appendField(builder, "中文说明", asset.getPromptCn(), 1500);
        appendField(builder, "原始 Prompt", asset.getPromptContent(), MAX_PROMPT_CHARS);
        appendField(builder, "当前视觉类型", asset.getVisualAssetType(), 200);
        appendField(builder, "当前场景", asset.getScenario(), 200);
        appendField(builder, "当前风格", asset.getVisualStyle(), 200);
        appendField(builder, "当前质量等级", asset.getQualityLevel(), 200);
        return builder.toString();
    }

    private void appendField(StringBuilder builder, String label, String value, int maxLength) {
        String safeValue = StringUtils.trimToNull(value);
        if (safeValue == null) {
            return;
        }
        builder.append(label).append("：").append(StringUtils.left(safeValue, maxLength)).append("\n");
    }

    private String extractAssistantContent(JSONObject responseJson) {
        JSONArray choices = responseJson.getJSONArray("choices");
        if (choices == null || choices.isEmpty()) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "DeepSeek response missing choices");
        }
        JSONObject firstChoice = JSONUtil.parseObj(choices.get(0));
        JSONObject message = JSONUtil.parseObj(firstChoice.get("message"));
        String content = message.getStr("content");
        if (StringUtils.isBlank(content)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "DeepSeek response missing message content");
        }
        return content;
    }

    private List<String> parseTagNames(String content, int maxTags) {
        String normalizedContent = StringUtils.trimToEmpty(content)
                .replace("```json", "")
                .replace("```JSON", "")
                .replace("```", "")
                .trim();
        int objectStart = normalizedContent.indexOf('{');
        int objectEnd = normalizedContent.lastIndexOf('}');
        if (objectStart >= 0 && objectEnd > objectStart) {
            normalizedContent = normalizedContent.substring(objectStart, objectEnd + 1);
        }
        try {
            JSONObject jsonObject = JSONUtil.parseObj(normalizedContent);
            JSONArray array = jsonObject.getJSONArray("assetTags");
            if (array == null) {
                array = jsonObject.getJSONArray("tags");
            }
            if (array != null) {
                List<String> names = new ArrayList<>();
                for (Object item : array) {
                    names.add(String.valueOf(item));
                }
                return normalizeTagNames(names, maxTags);
            }
        } catch (Exception e) {
            log.warn("Parse AI asset tag JSON failed, content={}", content, e);
        }
        String[] parts = StringUtils.split(normalizedContent
                .replace("[", "")
                .replace("]", "")
                .replace("\"", "")
                .replace("'", "")
                .replace("，", ",")
                .replace("、", ",")
                .replace(";", ",")
                .replace("\n", ","), ",");
        if (parts == null) {
            return new ArrayList<>();
        }
        return normalizeTagNames(Arrays.asList(parts), maxTags);
    }

    private List<String> normalizeTagNames(List<String> rawNames, int maxTags) {
        if (CollUtil.isEmpty(rawNames)) {
            return new ArrayList<>();
        }
        return rawNames.stream()
                .map(StringUtils::trimToNull)
                .filter(StringUtils::isNotBlank)
                .map(name -> StringUtils.removeEnd(StringUtils.removeStart(name, "#"), "。"))
                .map(name -> StringUtils.left(name, 32))
                .filter(name -> !StringUtils.equalsAnyIgnoreCase(name, "image_prompt", "video_prompt", "gpt-image-2"))
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .limit(Math.max(maxTags, 1))
                .collect(Collectors.toList());
    }

    private List<Long> normalizeIds(List<Long> ids) {
        if (CollUtil.isEmpty(ids)) {
            return new ArrayList<>();
        }
        return ids.stream()
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .collect(Collectors.toList());
    }

    private String buildChatUrl(PromptAssetAiTagConfig config) {
        String chatPath = StringUtils.defaultIfBlank(config.getChatPath(), DEFAULT_CHAT_PATH);
        if (!chatPath.startsWith("/")) {
            chatPath = "/" + chatPath;
        }
        return StringUtils.removeEnd(config.getBaseUrl(), "/") + chatPath;
    }

    private int resolveTimeout(PromptAssetAiTagConfig config) {
        Integer timeoutSeconds = config.getTimeoutSeconds();
        if (timeoutSeconds == null || timeoutSeconds <= 0) {
            return DEFAULT_TIMEOUT_SECONDS * 1000;
        }
        return timeoutSeconds * 1000;
    }

    private int resolveMaxTags(PromptAssetAiTagConfig config) {
        Integer maxTags = config.getMaxTags();
        if (maxTags == null || maxTags <= 0) {
            return DEFAULT_MAX_TAGS;
        }
        return Math.min(maxTags, 20);
    }

    private PromptAssetAiTagConfigVO toConfigVO(PromptAssetAiTagConfig config) {
        PromptAssetAiTagConfigVO vo = new PromptAssetAiTagConfigVO();
        BeanUtils.copyProperties(config, vo);
        boolean hasApiKey = StringUtils.isNotBlank(config.getApiKeyEncrypted());
        vo.setHasApiKey(hasApiKey);
        vo.setApiKeyMasked(hasApiKey ? "********" + StringUtils.defaultString(config.getApiKeyLast4()) : "");
        return vo;
    }

    private String normalizeCode(String code) {
        String safeCode = StringUtils.trimToNull(code);
        if (safeCode == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return safeCode.toLowerCase();
    }

    private String encryptApiKey(String apiKey) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(AES_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, buildSecretKey(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(apiKey.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Failed to encrypt API key");
        }
    }

    private String decryptApiKey(String encryptedApiKey) {
        if (StringUtils.isBlank(encryptedApiKey)) {
            return "";
        }
        try {
            byte[] combined = Base64.getDecoder().decode(encryptedApiKey);
            byte[] iv = Arrays.copyOfRange(combined, 0, GCM_IV_LENGTH);
            byte[] encrypted = Arrays.copyOfRange(combined, GCM_IV_LENGTH, combined.length);
            Cipher cipher = Cipher.getInstance(AES_TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, buildSecretKey(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Failed to decrypt API key");
        }
    }

    private SecretKeySpec buildSecretKey() throws Exception {
        String secret = StringUtils.trimToNull(configSecret);
        if (secret == null) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    "Missing PROMPT_ASSET_AI_TAGGING_CONFIG_SECRET or IMAGE_GENERATION_CONFIG_SECRET");
        }
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] key = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(key, AES_ALGORITHM);
    }
}
