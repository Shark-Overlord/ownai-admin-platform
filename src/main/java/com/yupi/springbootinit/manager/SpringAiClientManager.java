package com.yupi.springbootinit.manager;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.AiProviderConfig;
import java.net.SocketTimeoutException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@Slf4j
public class SpringAiClientManager {

    private static final int DEFAULT_TIMEOUT_SECONDS = 60;

    private final ConcurrentMap<String, ChatClient> clientCache = new ConcurrentHashMap<>();

    /**
     * 根据 Provider 配置与解密后的 Key 获取或创建 ChatClient
     */
    public ChatClient getOrCreateChatClient(AiProviderConfig provider, String decryptedApiKey) {
        if (provider == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "AI Provider 配置不能为空");
        }
        if (StringUtils.isBlank(decryptedApiKey)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "AI API Key 不能为空");
        }
        String cacheKey = buildCacheKey(provider, decryptedApiKey);
        return clientCache.computeIfAbsent(cacheKey, k -> createChatClient(provider, decryptedApiKey));
    }

    /**
     * 清理所有客户端缓存
     */
    public void clearCache() {
        clientCache.clear();
        log.info("SpringAiClientManager 缓存已清空");
    }

    /**
     * 统一处理 Spring AI 调用异常并转换为 BusinessException
     */
    public BusinessException handleException(Throwable error, String providerName) {
        String name = StringUtils.defaultIfBlank(providerName, "AI 服务");
        if (isTimeoutException(error)) {
            return new BusinessException(ErrorCode.OPERATION_ERROR, name + " 调用超时，请稍后重试");
        }
        if (error instanceof RestClientResponseException restException) {
            String responseBody = restException.getResponseBodyAsString();
            return new BusinessException(ErrorCode.OPERATION_ERROR,
                    name + " 调用失败：HTTP " + restException.getStatusCode().value() + " " + StringUtils.left(responseBody, 500));
        }
        Throwable rootCause = getRootCause(error);
        String message = rootCause != null && StringUtils.isNotBlank(rootCause.getMessage())
                ? rootCause.getMessage()
                : (StringUtils.isNotBlank(error.getMessage()) ? error.getMessage() : error.getClass().getSimpleName());
        return new BusinessException(ErrorCode.OPERATION_ERROR, name + " 调用失败：" + message);
    }

    private ChatClient createChatClient(AiProviderConfig provider, String decryptedApiKey) {
        int timeoutSeconds = provider.getTimeoutSeconds() == null ? DEFAULT_TIMEOUT_SECONDS : provider.getTimeoutSeconds();
        timeoutSeconds = Math.max(1, Math.min(timeoutSeconds, 300));

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutSeconds * 1000);
        requestFactory.setReadTimeout(timeoutSeconds * 1000);

        RestClient.Builder restClientBuilder = RestClient.builder().requestFactory(requestFactory);

        String baseUrl = StringUtils.removeEnd(provider.getBaseUrl(), "/");

        OpenAiApi openAiApi = OpenAiApi.builder()
                .apiKey(decryptedApiKey)
                .baseUrl(baseUrl)
                .restClientBuilder(restClientBuilder)
                .webClientBuilder(WebClient.builder())
                .build();

        OpenAiChatOptions chatOptions = OpenAiChatOptions.builder()
                .model(provider.getModelCode())
                .temperature(0.1)
                .build();

        OpenAiChatModel chatModel = OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(chatOptions)
                .build();
        log.info("构建新 Spring AI ChatClient 成功: baseUrl={}, model={}", baseUrl, provider.getModelCode());
        return ChatClient.builder(chatModel).build();
    }

    private String buildCacheKey(AiProviderConfig provider, String apiKey) {
        int keyHash = apiKey.hashCode();
        return String.format("%s:%s:%s:%d:%d",
                StringUtils.defaultString(provider.getProviderCode()),
                StringUtils.defaultString(provider.getBaseUrl()),
                StringUtils.defaultString(provider.getModelCode()),
                provider.getTimeoutSeconds() == null ? DEFAULT_TIMEOUT_SECONDS : provider.getTimeoutSeconds(),
                keyHash
        );
    }

    private boolean isTimeoutException(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof SocketTimeoutException
                    || current instanceof ResourceAccessException
                    || StringUtils.containsIgnoreCase(current.getMessage(), "timed out")
                    || StringUtils.containsIgnoreCase(current.getMessage(), "timeout")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private Throwable getRootCause(Throwable error) {
        Throwable current = error;
        while (current != null && current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }
}