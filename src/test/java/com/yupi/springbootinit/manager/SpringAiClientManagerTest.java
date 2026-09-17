package com.yupi.springbootinit.manager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.AiProviderConfig;
import java.net.SocketTimeoutException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

class SpringAiClientManagerTest {

    private SpringAiClientManager manager;

    @BeforeEach
    void setUp() {
        manager = new SpringAiClientManager();
    }

    @Test
    void getOrCreateChatClient_successAndCache() {
        AiProviderConfig provider = new AiProviderConfig();
        provider.setProviderCode("deepseek");
        provider.setBaseUrl("https://api.deepseek.com");
        provider.setModelCode("deepseek-chat");
        provider.setTimeoutSeconds(30);

        ChatClient client1 = manager.getOrCreateChatClient(provider, "sk-test-1234");
        assertNotNull(client1);

        // 再次获取命中缓存，返回相同实例
        ChatClient client2 = manager.getOrCreateChatClient(provider, "sk-test-1234");
        assertSame(client1, client2);

        // 清理缓存后再获取，生成新实例
        manager.clearCache();
        ChatClient client3 = manager.getOrCreateChatClient(provider, "sk-test-1234");
        assertNotNull(client3);
    }

    @Test
    void getOrCreateChatClient_rejectsNullOrBlankKey() {
        AiProviderConfig provider = new AiProviderConfig();
        assertThrows(BusinessException.class, () -> manager.getOrCreateChatClient(null, "sk-xxx"));
        assertThrows(BusinessException.class, () -> manager.getOrCreateChatClient(provider, "  "));
    }

    @Test
    void handleException_convertsTimeout() {
        ResourceAccessException timeoutEx = new ResourceAccessException("read timed out", new SocketTimeoutException("timeout"));
        BusinessException be = manager.handleException(timeoutEx, "DeepSeek");
        assertTrue(be.getMessage().contains("调用超时"));
    }

    @Test
    void handleException_convertsHttpError() {
        HttpClientErrorException httpEx = HttpClientErrorException.create(
                HttpStatusCode.valueOf(401), "Unauthorized", HttpHeaders.EMPTY, "invalid api key".getBytes(), null);
        BusinessException be = manager.handleException(httpEx, "DeepSeek");
        assertTrue(be.getMessage().contains("HTTP 401"));
        assertTrue(be.getMessage().contains("invalid api key"));
    }

    @Test
    void handleException_convertsGenericError() {
        RuntimeException ex = new RuntimeException("custom failure");
        BusinessException be = manager.handleException(ex, "DeepSeek");
        assertTrue(be.getMessage().contains("custom failure"));
    }
}