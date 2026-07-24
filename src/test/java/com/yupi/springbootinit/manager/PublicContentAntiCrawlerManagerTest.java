package com.yupi.springbootinit.manager;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.common.PageRequest;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.User;
import javax.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PublicContentAntiCrawlerManagerTest {

    private PublicContentAntiCrawlerManager manager;

    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        manager = new PublicContentAntiCrawlerManager();
        request = mock(HttpServletRequest.class);
        when(request.getHeader("X-Real-IP")).thenReturn("127.0.0.1");
        when(request.getRequestURI()).thenReturn("/api/promptAsset/list/page/vo");
    }

    @Test
    void repeatedIdenticalUiRequestsShouldNotTriggerLimit() {
        PageRequest pageRequest = new PageRequest();
        for (int i = 0; i < 500; i++) {
            assertDoesNotThrow(() -> manager.checkRequest(pageRequest, null, request));
        }
    }

    @Test
    void authenticatedUserShouldNotInheritAnonymousIpLimit() {
        for (int i = 0; i < 120; i++) {
            PageRequest pageRequest = new PageRequest();
            pageRequest.setSortField("field_" + i);
            manager.checkRequest(pageRequest, null, request);
        }
        PageRequest blockedRequest = new PageRequest();
        blockedRequest.setSortField("blocked");
        assertThrows(BusinessException.class,
                () -> manager.checkRequest(blockedRequest, null, request));

        User loginUser = new User();
        loginUser.setId(1L);
        PageRequest authenticatedRequest = new PageRequest();
        authenticatedRequest.setSortField("authenticated");
        assertDoesNotThrow(() -> manager.checkRequest(authenticatedRequest, loginUser, request));
    }

    @Test
    void normalAuthenticatedBrowsingShouldNotTriggerLimit() {
        User loginUser = new User();
        loginUser.setId(1L);
        for (int i = 0; i < 250; i++) {
            PageRequest pageRequest = new PageRequest();
            pageRequest.setSortField("field_" + i);
            assertDoesNotThrow(() -> manager.checkRequest(pageRequest, loginUser, request));
        }
    }

    @Test
    void oversizedPageShouldStillBeRejected() {
        PageRequest pageRequest = new PageRequest();
        pageRequest.setPageSize(21);
        assertThrows(BusinessException.class,
                () -> manager.checkRequest(pageRequest, null, request));
    }
}
