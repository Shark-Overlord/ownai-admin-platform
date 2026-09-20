package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.constant.AiTaskConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.SpringAiClientManager;
import com.yupi.springbootinit.mapper.AiProviderConfigMapper;
import com.yupi.springbootinit.mapper.AiTaskConfigMapper;
import com.yupi.springbootinit.model.dto.ai.AiProviderConfigRequest;
import com.yupi.springbootinit.model.dto.ai.AiTaskConfigRequest;
import com.yupi.springbootinit.model.entity.AiProviderConfig;
import com.yupi.springbootinit.model.entity.AiTaskConfig;
import com.yupi.springbootinit.model.vo.ai.AiSystemConfigVO;
import com.yupi.springbootinit.service.impl.AiConfigServiceImpl;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiConfigServiceImplTest {

    @Mock
    private AiProviderConfigMapper providerMapper;

    @Mock
    private AiTaskConfigMapper taskMapper;

    @Mock
    private SpringAiClientManager springAiClientManager;

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private ChatClient mockChatClient;

    @InjectMocks
    private AiConfigServiceImpl aiConfigService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiConfigService, "configSecret", "test-secret-key-1234567890123456");
    }

    @Test
    void getSystemConfig_returnsDefaultWhenEmpty() {
        when(providerMapper.selectOne(any())).thenReturn(null);
        when(taskMapper.selectList(any())).thenReturn(Collections.emptyList());

        AiSystemConfigVO config = aiConfigService.getSystemConfig();
        assertNotNull(config);
        assertNotNull(config.getProvider());
        assertEquals("DeepSeek", config.getProvider().getProviderName());
        assertEquals(3, config.getTasks().size());
    }

    @Test
    void saveProvider_successAndClearsCache() {
        when(providerMapper.selectOne(any())).thenReturn(null);
        when(providerMapper.insert(any(AiProviderConfig.class))).thenAnswer(invocation -> {
            AiProviderConfig entity = invocation.getArgument(0);
            entity.setId(100L);
            return 1;
        });

        AiProviderConfigRequest request = new AiProviderConfigRequest();
        request.setProviderName("DeepSeek Test");
        request.setBaseUrl("https://api.deepseek.com");
        request.setModelCode("deepseek-chat");
        request.setApiKey("sk-1234567890");
        request.setTimeoutSeconds(45);

        Long id = aiConfigService.saveProvider(request);
        assertEquals(100L, id);
        verify(springAiClientManager).clearCache();
    }

    @Test
    void saveTask_success() {
        when(taskMapper.selectOne(any())).thenReturn(null);
        when(taskMapper.insert(any(AiTaskConfig.class))).thenAnswer(invocation -> {
            AiTaskConfig entity = invocation.getArgument(0);
            entity.setId(200L);
            return 1;
        });

        AiTaskConfigRequest request = new AiTaskConfigRequest();
        request.setTaskCode(AiTaskConstant.BLOG_SLUG_GENERATION);
        request.setTaskName("Slug 生成");
        request.setSystemPrompt("You are a slug generator");
        request.setMaxResultCount(5);

        Long id = aiConfigService.saveTask(request);
        assertEquals(200L, id);
    }

    @Test
    void executeTask_successWithChatClient() {
        AiTaskConfig task = new AiTaskConfig();
        task.setTaskCode(AiTaskConstant.BLOG_SLUG_GENERATION);
        task.setProviderCode(AiTaskConstant.PROVIDER_DEEPSEEK);
        task.setStatus(1);
        task.setSystemPrompt("You are a slug generator");

        // mock encrypt key
        AiProviderConfigRequest providerReq = new AiProviderConfigRequest();
        providerReq.setApiKey("sk-test-key-1234");
        when(providerMapper.insert(any(AiProviderConfig.class))).thenReturn(1);
        aiConfigService.saveProvider(providerReq);

        AiProviderConfig provider = new AiProviderConfig();
        provider.setProviderCode(AiTaskConstant.PROVIDER_DEEPSEEK);
        provider.setProviderName("DeepSeek");
        provider.setStatus(1);
        // use an encrypted key
        String encryptedKey = ReflectionTestUtils.invokeMethod(aiConfigService, "encryptApiKey", "sk-test-key-1234");
        provider.setApiKeyEncrypted(encryptedKey);

        when(taskMapper.selectOne(any())).thenReturn(task);
        when(providerMapper.selectOne(any())).thenReturn(provider);
        when(springAiClientManager.getOrCreateChatClient(any(), any())).thenReturn(mockChatClient);
        when(mockChatClient.prompt().system(any(String.class)).user(any(String.class)).call().content())
                .thenReturn("{\"slug\":\"hello-world\"}");

        String result = aiConfigService.executeTask(AiTaskConstant.BLOG_SLUG_GENERATION, "title: Hello World");
        assertEquals("{\"slug\":\"hello-world\"}", result);
    }

    @Test
    void executeTask_throwsWhenProviderDisabled() {
        AiTaskConfig task = new AiTaskConfig();
        task.setTaskCode(AiTaskConstant.BLOG_SLUG_GENERATION);
        task.setProviderCode(AiTaskConstant.PROVIDER_DEEPSEEK);
        task.setStatus(1);

        when(taskMapper.selectOne(any())).thenReturn(task);
        when(providerMapper.selectOne(any())).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> aiConfigService.executeTask(AiTaskConstant.BLOG_SLUG_GENERATION, "test"));
        assertTrue(ex.getMessage().contains("未启用"));
    }
}