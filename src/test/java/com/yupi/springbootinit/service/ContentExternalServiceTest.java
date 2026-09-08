package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.artwork.ArtworkAddRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkUpdateRequest;
import com.yupi.springbootinit.model.dto.contentapi.ContentResourceQuery;
import com.yupi.springbootinit.model.entity.ContentApiKey;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.ArtworkDetailVO;
import com.yupi.springbootinit.model.vo.contentapi.ContentResourceVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ContentExternalServiceTest {
    @Mock private UserService userService;
    @Mock private ArtworkService artworkService;
    @Mock private ContentModuleDraftBridgeService draftBridgeService;
    private ContentExternalService service;
    private ObjectMapper objectMapper;
    private User operator;

    @BeforeEach
    void setUp() {
        service = new ContentExternalService();
        objectMapper = new ObjectMapper();
        operator = new User(); operator.setId(7L); operator.setUserRole("admin");
        ReflectionTestUtils.setField(service, "objectMapper", objectMapper);
        ReflectionTestUtils.setField(service, "userService", userService);
        ReflectionTestUtils.setField(service, "artworkService", artworkService);
        ReflectionTestUtils.setField(service, "draftBridgeService", draftBridgeService);
    }

    @Test
    void keyCreatorMustStillBeAnAdministrator() {
        ContentApiKey key = new ContentApiKey(); key.setCreateUserId(7L);
        when(userService.getById(7L)).thenReturn(operator);
        when(userService.isAdmin(operator)).thenReturn(true);
        assertEquals(operator, service.requireOperator(key));
        when(userService.isAdmin(operator)).thenReturn(false);
        assertThrows(BusinessException.class, () -> service.requireOperator(key));
    }

    @Test
    void addArtworkForcesDraftAndRejectsClientStatus() {
        ObjectNode valid = objectMapper.createObjectNode();
        valid.put("title", "测试作品"); valid.put("categoryId", 1L);
        when(artworkService.addArtwork(any(), eq(operator))).thenReturn(10L);
        ArtworkDetailVO saved = artwork(10L, 0);
        when(artworkService.getArtworkDetail(10L, operator, true)).thenReturn(saved);

        service.add(ContentExternalService.ARTWORK, valid, operator);
        ArgumentCaptor<ArtworkAddRequest> request = ArgumentCaptor.forClass(ArtworkAddRequest.class);
        verify(artworkService).addArtwork(request.capture(), eq(operator));
        assertEquals(0, request.getValue().getStatus());

        valid.put("status", 1);
        assertThrows(BusinessException.class,
                () -> service.add(ContentExternalService.ARTWORK, valid, operator));
    }

    @Test
    void publishedArtworkCreatesNativeDraftCloneInsteadOfOverwritingLiveRow() {
        ArtworkDetailVO published = artwork(10L, 1);
        when(artworkService.getArtworkDetail(10L, operator, true)).thenReturn(published);
        when(artworkService.addArtwork(any(), eq(operator))).thenReturn(20L);
        ContentResourceVO current = service.get(ContentExternalService.ARTWORK, 10L, operator);
        ObjectNode patch = objectMapper.createObjectNode().put("title", "未审核的新标题");

        service.update(ContentExternalService.ARTWORK, 10L, current.getVersion(), patch, operator);
        verify(artworkService, never()).updateArtwork(any(ArtworkUpdateRequest.class), any());
        verify(artworkService).addArtwork(any(ArtworkAddRequest.class), eq(operator));
        verify(draftBridgeService).create(eq(ContentExternalService.ARTWORK), eq(10L), eq(20L),
                eq(current.getVersion()), eq(null), eq(operator.getId()));
    }

    @Test
    void externalListIncludesNativeDraftBridgeMarkers() {
        Page<com.yupi.springbootinit.model.vo.artwork.ArtworkVO> page = new Page<>(1, 20, 1);
        page.setRecords(java.util.Collections.<com.yupi.springbootinit.model.vo.artwork.ArtworkVO>singletonList(
                artwork(10L, 1)));
        when(artworkService.listArtworkVOByPage(any(), eq(operator), eq(true))).thenReturn(page);

        assertEquals(page, service.list(ContentExternalService.ARTWORK, new ContentResourceQuery(), operator));

        verify(draftBridgeService).annotateAdminResources(ContentExternalService.ARTWORK, page.getRecords());
    }

    private ArtworkDetailVO artwork(Long id, int status) {
        ArtworkDetailVO item = new ArtworkDetailVO();
        item.setId(id); item.setStatus(status); item.setTitle("原标题"); item.setCategoryId(1L);
        item.setMemberOnly(0); item.setSort(0);
        return item;
    }
}
