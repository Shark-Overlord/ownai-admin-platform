package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.ContentApiKeyMapper;
import com.yupi.springbootinit.model.entity.ContentApiKey;
import com.yupi.springbootinit.service.impl.ContentApiKeyServiceImpl;
import java.util.Collections;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ContentApiKeyServiceImplExternalTest {
    @Mock private ContentApiKeyMapper mapper;
    private ContentApiKeyServiceImpl service;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        service = new ContentApiKeyServiceImpl();
        ReflectionTestUtils.setField(service, "baseMapper", mapper);
        request = new MockHttpServletRequest();
        request.addHeader(ContentApiKeyService.HEADER_CONTENT_ASSET_KEY, "oak_test");
    }

    @Test
    void authenticatesPrimaryHeaderAndExactScope() {
        ContentApiKey key = key("tutorial:read", 1);
        when(mapper.selectOne(any())).thenReturn(key);
        when(mapper.updateById(any())).thenReturn(1);
        assertEquals(key, service.requireRequestKey(request,
                Collections.singletonList(ContentApiKeyService.SCOPE_TUTORIAL_READ)));
    }

    @Test
    void rejectsMissingLegacyExpiredAndCrossScopeKeys() {
        assertThrows(BusinessException.class, () -> service.requireRequestKey(new MockHttpServletRequest(),
                Collections.singletonList(ContentApiKeyService.SCOPE_TUTORIAL_READ)));

        MockHttpServletRequest legacy = new MockHttpServletRequest();
        legacy.addHeader(ContentApiKeyService.HEADER_CONTENT_ASSET_SECRET, "oak_test");
        assertThrows(BusinessException.class, () -> service.requireRequestKey(legacy,
                Collections.singletonList(ContentApiKeyService.SCOPE_TUTORIAL_READ)));

        ContentApiKey expired = key("tutorial:read", 1);
        expired.setExpireTime(new Date(System.currentTimeMillis() - 1000));
        when(mapper.selectOne(any())).thenReturn(expired);
        assertThrows(BusinessException.class, () -> service.requireRequestKey(request,
                Collections.singletonList(ContentApiKeyService.SCOPE_TUTORIAL_READ)));

        when(mapper.selectOne(any())).thenReturn(key("artwork:read", 1));
        assertThrows(BusinessException.class, () -> service.requireRequestKey(request,
                Collections.singletonList(ContentApiKeyService.SCOPE_TUTORIAL_READ)));
    }

    @Test
    void wildcardStillCannotBypassDisabledState() {
        when(mapper.selectOne(any())).thenReturn(key("*", 0));
        assertThrows(BusinessException.class, () -> service.requireRequestKey(request,
                Collections.singletonList(ContentApiKeyService.SCOPE_ARTWORK_READ)));
    }

    private ContentApiKey key(String scopes, int status) {
        ContentApiKey key = new ContentApiKey();
        key.setId(1L); key.setScopes(scopes); key.setStatus(status); key.setCreateUserId(2L);
        return key;
    }
}
