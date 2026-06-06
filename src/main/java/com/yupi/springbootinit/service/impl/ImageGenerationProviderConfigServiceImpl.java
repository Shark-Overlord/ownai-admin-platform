package com.yupi.springbootinit.service.impl;

import cn.hutool.http.Header;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.ImageGenerationProviderConfigMapper;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationProviderConfigRequest;
import com.yupi.springbootinit.model.entity.ImageGenerationProviderConfig;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationProviderConfigVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationProviderTestVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationWorkerProviderConfigVO;
import com.yupi.springbootinit.service.ImageGenerationProviderConfigService;
import java.util.HashMap;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ImageGenerationProviderConfigServiceImpl
        extends ServiceImpl<ImageGenerationProviderConfigMapper, ImageGenerationProviderConfig>
        implements ImageGenerationProviderConfigService {

    private static final int ENABLED_STATUS = 1;

    private static final int DISABLED_STATUS = 0;

    private static final int DEFAULT_TIMEOUT_SECONDS = 60;

    private static final String DEFAULT_AUTH_TYPE = "bearer";

    private static final String AUTH_TYPE_BEARER = "bearer";

    private static final String AES_ALGORITHM = "AES";

    private static final String AES_TRANSFORMATION = "AES/GCM/NoPadding";

    private static final int GCM_TAG_LENGTH = 128;

    private static final int GCM_IV_LENGTH = 12;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${image.generation.config-secret:}")
    private String configSecret;

    @Override
    public List<ImageGenerationProviderConfigVO> listAdminProviderConfigs() {
        return this.list(new QueryWrapper<ImageGenerationProviderConfig>()
                        .orderByDesc("isDefault")
                        .orderByAsc("providerCode"))
                .stream()
                .map(this::toProviderConfigVO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long addProviderConfig(ImageGenerationProviderConfigRequest request) {
        validateProviderRequest(request, false);
        String providerCode = normalizeCode(request.getProviderCode());
        ImageGenerationProviderConfig existing = this.getOne(new QueryWrapper<ImageGenerationProviderConfig>()
                .eq("providerCode", providerCode)
                .last("limit 1"));
        if (existing != null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Provider already exists");
        }
        ImageGenerationProviderConfig config = new ImageGenerationProviderConfig();
        fillProviderConfig(config, request);
        config.setProviderCode(providerCode);
        if (config.getStatus() == null) {
            config.setStatus(ENABLED_STATUS);
        }
        if (config.getIsDefault() == null) {
            config.setIsDefault(DISABLED_STATUS);
        }
        if (config.getTimeoutSeconds() == null) {
            config.setTimeoutSeconds(DEFAULT_TIMEOUT_SECONDS);
        }
        boolean result = this.save(config);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        if (Integer.valueOf(1).equals(config.getIsDefault())) {
            setDefaultProvider(config.getId());
        }
        return config.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateProviderConfig(ImageGenerationProviderConfigRequest request) {
        validateProviderRequest(request, true);
        ImageGenerationProviderConfig oldConfig = this.getById(request.getId());
        if (oldConfig == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        ImageGenerationProviderConfig updateConfig = new ImageGenerationProviderConfig();
        updateConfig.setId(request.getId());
        fillProviderConfig(updateConfig, request);
        boolean result = this.updateById(updateConfig);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        if (Integer.valueOf(1).equals(request.getIsDefault())) {
            setDefaultProvider(request.getId());
        }
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean setDefaultProvider(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        ImageGenerationProviderConfig config = this.getById(id);
        if (config == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        ThrowUtils.throwIf(!Integer.valueOf(ENABLED_STATUS).equals(config.getStatus()),
                ErrorCode.OPERATION_ERROR, "Default provider must be enabled");
        ImageGenerationProviderConfig clearDefault = new ImageGenerationProviderConfig();
        clearDefault.setIsDefault(DISABLED_STATUS);
        this.update(clearDefault, new QueryWrapper<ImageGenerationProviderConfig>().eq("isDefault", 1));
        ImageGenerationProviderConfig setDefault = new ImageGenerationProviderConfig();
        setDefault.setId(id);
        setDefault.setIsDefault(1);
        return this.updateById(setDefault);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteProviderConfig(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        ImageGenerationProviderConfig config = this.getById(id);
        if (config == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        if (Integer.valueOf(1).equals(config.getIsDefault())) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Default provider cannot be deleted");
        }
        return this.removeById(id);
    }

    @Override
    public ImageGenerationProviderTestVO testProviderConfig(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        ImageGenerationProviderConfig config = this.getById(id);
        if (config == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        String url = buildProviderUrl(config.getBaseUrl(), config.getGenerationPath());
        ImageGenerationProviderTestVO vo = new ImageGenerationProviderTestVO();
        vo.setUrl(url);
        long start = System.currentTimeMillis();
        try {
            String apiKey = decryptApiKey(config.getApiKeyEncrypted());
            if (AUTH_TYPE_BEARER.equalsIgnoreCase(StringUtils.defaultString(config.getAuthType()))
                    && StringUtils.isBlank(apiKey)) {
                vo.setPassed(false);
                vo.setDurationMs(System.currentTimeMillis() - start);
                vo.setMessage("Bearer API Key is missing");
                return vo;
            }
            HttpRequest httpRequest = HttpRequest.post(url)
                    .timeout(Math.max(1, config.getTimeoutSeconds() == null
                            ? DEFAULT_TIMEOUT_SECONDS : config.getTimeoutSeconds()) * 1000)
                    .header(Header.CONTENT_TYPE, "application/json");
            if (AUTH_TYPE_BEARER.equalsIgnoreCase(StringUtils.defaultString(config.getAuthType()))) {
                httpRequest.header(Header.AUTHORIZATION, "Bearer " + apiKey);
            }
            HttpResponse response = httpRequest.body(JSONUtil.toJsonStr(new HashMap<String, Object>())).execute();
            int status = response.getStatus();
            vo.setHttpStatus(status);
            vo.setDurationMs(System.currentTimeMillis() - start);
            vo.setPassed(isReachableStatus(status));
            vo.setMessage(resolveTestMessage(status));
            return vo;
        } catch (Exception e) {
            vo.setPassed(false);
            vo.setDurationMs(System.currentTimeMillis() - start);
            vo.setMessage(StringUtils.defaultIfBlank(e.getMessage(), "Provider test failed"));
            return vo;
        }
    }

    @Override
    public ImageGenerationProviderConfig getDefaultEnabledProvider() {
        ImageGenerationProviderConfig config = this.getOne(new QueryWrapper<ImageGenerationProviderConfig>()
                .eq("status", ENABLED_STATUS)
                .eq("isDefault", 1)
                .last("limit 1"));
        if (config == null) {
            config = this.getOne(new QueryWrapper<ImageGenerationProviderConfig>()
                    .eq("status", ENABLED_STATUS)
                    .orderByAsc("providerCode")
                    .last("limit 1"));
        }
        if (config == null) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "No enabled image generation provider");
        }
        return config;
    }

    @Override
    public ImageGenerationProviderConfig getEnabledProvider(String providerCode) {
        String safeProviderCode = normalizeCode(providerCode);
        ImageGenerationProviderConfig config = this.getOne(new QueryWrapper<ImageGenerationProviderConfig>()
                .eq("providerCode", safeProviderCode)
                .eq("status", ENABLED_STATUS)
                .last("limit 1"));
        if (config == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Provider is not enabled");
        }
        return config;
    }

    @Override
    public ImageGenerationProviderConfigVO toProviderConfigVO(ImageGenerationProviderConfig config) {
        if (config == null) {
            return null;
        }
        ImageGenerationProviderConfigVO vo = new ImageGenerationProviderConfigVO();
        BeanUtils.copyProperties(config, vo);
        boolean hasApiKey = StringUtils.isNotBlank(config.getApiKeyEncrypted());
        vo.setHasApiKey(hasApiKey);
        vo.setApiKeyMasked(hasApiKey ? "********" + StringUtils.defaultString(config.getApiKeyLast4()) : "");
        return vo;
    }

    @Override
    public ImageGenerationWorkerProviderConfigVO getWorkerProviderConfig(String providerCode) {
        ImageGenerationProviderConfig config = getEnabledProvider(providerCode);
        ImageGenerationWorkerProviderConfigVO vo = new ImageGenerationWorkerProviderConfigVO();
        vo.setProviderCode(config.getProviderCode());
        vo.setProviderName(config.getProviderName());
        vo.setBaseUrl(config.getBaseUrl());
        vo.setGenerationPath(config.getGenerationPath());
        vo.setEditPath(config.getEditPath());
        vo.setAuthType(config.getAuthType());
        vo.setApiKey(decryptApiKey(config.getApiKeyEncrypted()));
        vo.setTimeoutSeconds(config.getTimeoutSeconds());
        vo.setRequestSchema(config.getRequestSchema());
        return vo;
    }

    private void validateProviderRequest(ImageGenerationProviderConfigRequest request, boolean update) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        if (update && (request.getId() == null || request.getId() <= 0)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        if (!update && StringUtils.isBlank(request.getProviderCode())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Provider code is required");
        }
        if (StringUtils.isNotBlank(request.getBaseUrl())
                && !StringUtils.startsWithAny(StringUtils.trim(request.getBaseUrl()), "http://", "https://")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Base URL must start with http:// or https://");
        }
        if (request.getTimeoutSeconds() != null && request.getTimeoutSeconds() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Timeout must be positive");
        }
    }

    private void fillProviderConfig(ImageGenerationProviderConfig config, ImageGenerationProviderConfigRequest request) {
        if (StringUtils.isNotBlank(request.getProviderCode())) {
            config.setProviderCode(normalizeCode(request.getProviderCode()));
        }
        if (StringUtils.isNotBlank(request.getProviderName())) {
            config.setProviderName(StringUtils.trim(request.getProviderName()));
        }
        if (StringUtils.isNotBlank(request.getBaseUrl())) {
            config.setBaseUrl(StringUtils.removeEnd(StringUtils.trim(request.getBaseUrl()), "/"));
        }
        if (StringUtils.isNotBlank(request.getGenerationPath())) {
            String generationPath = StringUtils.trim(request.getGenerationPath());
            config.setGenerationPath(generationPath.startsWith("/") ? generationPath : "/" + generationPath);
        }
        if (StringUtils.isNotBlank(request.getEditPath())) {
            String editPath = StringUtils.trim(request.getEditPath());
            config.setEditPath(editPath.startsWith("/") ? editPath : "/" + editPath);
        }
        if (StringUtils.isNotBlank(request.getAuthType())) {
            config.setAuthType(normalizeCode(request.getAuthType()));
        } else if (config.getAuthType() == null) {
            config.setAuthType(DEFAULT_AUTH_TYPE);
        }
        if (request.getStatus() != null) {
            config.setStatus(request.getStatus());
        }
        if (request.getIsDefault() != null) {
            config.setIsDefault(request.getIsDefault());
        }
        if (request.getTimeoutSeconds() != null) {
            config.setTimeoutSeconds(request.getTimeoutSeconds());
        }
        if (request.getRequestSchema() != null) {
            config.setRequestSchema(StringUtils.trimToNull(request.getRequestSchema()));
        }
        if (StringUtils.isNotBlank(request.getApiKey())) {
            String apiKey = StringUtils.trim(request.getApiKey());
            config.setApiKeyEncrypted(encryptApiKey(apiKey));
            config.setApiKeyLast4(apiKey.length() <= 4 ? apiKey : apiKey.substring(apiKey.length() - 4));
        }
    }

    private String normalizeCode(String code) {
        String safeCode = StringUtils.trimToNull(code);
        if (safeCode == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return safeCode.toLowerCase();
    }

    private String buildProviderUrl(String baseUrl, String path) {
        String safeBaseUrl = StringUtils.removeEnd(StringUtils.trimToEmpty(baseUrl), "/");
        String safePath = StringUtils.trimToEmpty(path);
        if (StringUtils.isBlank(safeBaseUrl) || StringUtils.isBlank(safePath)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Provider URL is incomplete");
        }
        return safeBaseUrl + (safePath.startsWith("/") ? safePath : "/" + safePath);
    }

    private boolean isReachableStatus(int status) {
        return (status >= 200 && status < 400) || status == 400 || status == 405;
    }

    private String resolveTestMessage(int status) {
        if (status >= 200 && status < 400) {
            return "Provider endpoint is reachable";
        }
        if (status == 400 || status == 405) {
            return "Provider endpoint is reachable; test request is intentionally incomplete";
        }
        if (status == 401 || status == 403) {
            return "Authentication failed; please check API key";
        }
        if (status >= 500) {
            return "Provider service returned a server error";
        }
        return "Provider endpoint may be unreachable or path may be incorrect";
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
                    "Missing IMAGE_GENERATION_CONFIG_SECRET for API key encryption");
        }
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] key = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(key, AES_ALGORITHM);
    }
}
