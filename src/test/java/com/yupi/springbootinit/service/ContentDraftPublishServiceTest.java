package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.ContentModuleDraftBridge;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.contentapi.ContentResourceVO;
import java.util.Collections;
import java.util.Arrays;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ContentDraftPublishServiceTest {
    @Mock private ContentModuleDraftBridgeService bridgeService;
    @Mock private ContentExternalService contentExternalService;
    @Mock private ArtworkService artworkService;
    @Mock private PromptAssetService promptAssetService;
    @Mock private VideoBackgroundService videoBackgroundService;
    @Mock private BlogPostService blogPostService;
    private ContentDraftPublishService service;
    private User admin;

    @BeforeEach
    void setUp() {
        service = new ContentDraftPublishService();
        ReflectionTestUtils.setField(service, "bridgeService", bridgeService);
        ReflectionTestUtils.setField(service, "contentExternalService", contentExternalService);
        ReflectionTestUtils.setField(service, "artworkService", artworkService);
        ReflectionTestUtils.setField(service, "promptAssetService", promptAssetService);
        ReflectionTestUtils.setField(service, "videoBackgroundService", videoBackgroundService);
        ReflectionTestUtils.setField(service, "blogPostService", blogPostService);
        admin = new User(); admin.setId(1L);
    }

    @Test
    void nonArtworkReplacementDraftStillPublishesBackToStableTargetId() {
        ContentModuleDraftBridge bridge = bridge(ContentExternalService.PROMPT_ASSET, "version-a");
        when(bridgeService.findByDraft(ContentExternalService.PROMPT_ASSET, 20L)).thenReturn(bridge);
        when(contentExternalService.getLive(ContentExternalService.PROMPT_ASSET, 10L, admin))
                .thenReturn(resource("version-a"));

        service.publishPromptAssets(Collections.singletonList(20L), admin);

        verify(contentExternalService).applyReplacementDraft(bridge, admin);
        verify(promptAssetService).publishPromptAssetBatch(Collections.singletonList(10L));
        verify(bridgeService).removeBridge(bridge);
    }

    @Test
    void changedLiveTargetRejectsDraftWithoutOverwritingAnything() {
        ContentModuleDraftBridge bridge = bridge(ContentExternalService.PROMPT_ASSET, "version-a");
        when(bridgeService.findByDraft(ContentExternalService.PROMPT_ASSET, 20L)).thenReturn(bridge);
        when(contentExternalService.getLive(ContentExternalService.PROMPT_ASSET, 10L, admin))
                .thenReturn(resource("version-b"));

        assertThrows(BusinessException.class,
                () -> service.publishPromptAssets(Collections.singletonList(20L), admin));
        verify(contentExternalService, never()).applyReplacementDraft(any(), any());
        verify(promptAssetService, never()).publishPromptAssetBatch(any());
        verify(bridgeService, never()).removeBridge(any());
    }

    @Test
    void artworkPublishUsesTheSelectedRowsDirectly() {
        service.publishArtwork(Arrays.asList(10L, 20L), admin);

        verify(artworkService).publishArtworkBatch(Arrays.asList(10L, 20L));
        verify(contentExternalService, never()).applyReplacementDraft(any(), any());
    }

    @Test
    void ordinaryNativeDraftStillUsesExistingPublishPath() {
        service.publishVideoBackgrounds(Collections.singletonList(30L), admin);
        verify(videoBackgroundService).publishVideoBackgroundBatch(Collections.singletonList(30L));
        verify(contentExternalService, never()).applyReplacementDraft(any(), any());
    }

    @Test
    void selectingTargetAndItsDraftPublishesLogicalResourceOnlyOnce() {
        ContentModuleDraftBridge bridge = bridge(ContentExternalService.PROMPT_ASSET, "version-a");
        when(bridgeService.findByDraft(ContentExternalService.PROMPT_ASSET, 10L)).thenReturn(null);
        when(bridgeService.findByTarget(ContentExternalService.PROMPT_ASSET, 10L)).thenReturn(bridge);
        when(bridgeService.findByDraft(ContentExternalService.PROMPT_ASSET, 20L)).thenReturn(bridge);
        when(contentExternalService.getLive(ContentExternalService.PROMPT_ASSET, 10L, admin))
                .thenReturn(resource("version-a"));

        service.publishPromptAssets(Arrays.asList(10L, 20L), admin);

        verify(contentExternalService, times(1)).applyReplacementDraft(bridge, admin);
        verify(promptAssetService, times(1)).publishPromptAssetBatch(Collections.singletonList(10L));
    }

    private ContentModuleDraftBridge bridge(String type, String baseVersion) {
        ContentModuleDraftBridge bridge = new ContentModuleDraftBridge();
        bridge.setId(99L); bridge.setResourceType(type);
        bridge.setTargetId(10L); bridge.setDraftId(20L); bridge.setBaseVersion(baseVersion);
        return bridge;
    }

    private ContentResourceVO resource(String version) {
        ContentResourceVO value = new ContentResourceVO(); value.setVersion(version); return value;
    }
}
