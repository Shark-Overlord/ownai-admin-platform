package com.yupi.springbootinit.service.impl;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.PromptAssetMapper;
import com.yupi.springbootinit.mapper.PromptAssetMediaMapper;
import com.yupi.springbootinit.mapper.PromptAssetTagMapper;
import com.yupi.springbootinit.model.entity.PromptAsset;
import java.util.Arrays;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PromptAssetBatchReviewTest {

    @Mock
    private PromptAssetMapper promptAssetMapper;

    @Mock
    private PromptAssetTagMapper promptAssetTagMapper;

    @Mock
    private PromptAssetMediaMapper promptAssetMediaMapper;

    private PromptAssetServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PromptAssetServiceImpl();
        ReflectionTestUtils.setField(service, "baseMapper", promptAssetMapper);
        ReflectionTestUtils.setField(service, "promptAssetTagMapper", promptAssetTagMapper);
        ReflectionTestUtils.setField(service, "promptAssetMediaMapper", promptAssetMediaMapper);
    }

    @Test
    void approvesRetainedAssetsAndDeletesRejectedAssets() {
        PromptAsset approved = pendingAsset(11L);
        PromptAsset deleted = pendingAsset(12L);
        when(promptAssetMapper.selectBatchIds(anyCollection())).thenReturn(Arrays.asList(approved, deleted));
        when(promptAssetMapper.update(isNull(), any(Wrapper.class))).thenReturn(1, 1);
        when(promptAssetMapper.selectById(12L)).thenReturn(deleted);
        when(promptAssetTagMapper.delete(any(Wrapper.class))).thenReturn(1);
        when(promptAssetMediaMapper.delete(any(Wrapper.class))).thenReturn(1);
        when(promptAssetMapper.deleteById(12L)).thenReturn(1);

        assertTrue(service.reviewPromptAssetBatch(Collections.singletonList(11L), Collections.singletonList(12L)));

        verify(promptAssetMapper, times(2)).update(isNull(), any(Wrapper.class));
        verify(promptAssetMapper).deleteById(12L);
    }

    @Test
    void rejectsOverlappingDecisions() {
        assertThrows(BusinessException.class,
                () -> service.reviewPromptAssetBatch(Collections.singletonList(11L), Collections.singletonList(11L)));
    }

    @Test
    void rejectsAssetsThatWereAlreadyReviewed() {
        PromptAsset reviewed = pendingAsset(11L);
        reviewed.setSelectionStatus("approved");
        when(promptAssetMapper.selectBatchIds(anyCollection())).thenReturn(Collections.singletonList(reviewed));

        assertThrows(BusinessException.class,
                () -> service.reviewPromptAssetBatch(Collections.singletonList(11L), Collections.emptyList()));
    }

    @Test
    void doesNotDeleteWhenConcurrentReviewWins() {
        PromptAsset deleted = pendingAsset(12L);
        when(promptAssetMapper.selectBatchIds(anyCollection())).thenReturn(Collections.singletonList(deleted));
        when(promptAssetMapper.update(isNull(), any(Wrapper.class))).thenReturn(0);

        assertThrows(BusinessException.class,
                () -> service.reviewPromptAssetBatch(Collections.emptyList(), Collections.singletonList(12L)));

        verify(promptAssetMapper, never()).deleteById(12L);
    }

    private PromptAsset pendingAsset(Long id) {
        PromptAsset asset = new PromptAsset();
        asset.setId(id);
        asset.setSelectionStatus("pending_review");
        return asset;
    }
}
