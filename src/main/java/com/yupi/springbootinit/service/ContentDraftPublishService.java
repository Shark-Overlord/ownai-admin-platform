package com.yupi.springbootinit.service;

import cn.hutool.core.collection.CollUtil;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.ContentModuleDraftBridge;
import com.yupi.springbootinit.model.entity.User;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Publishes native draft clones through each module's existing publish operation. */
@Service
public class ContentDraftPublishService {
    @Resource private ContentModuleDraftBridgeService bridgeService;
    @Resource private ContentExternalService contentExternalService;
    @Resource private ArtworkService artworkService;
    @Resource private PromptAssetService promptAssetService;
    @Resource private VideoBackgroundService videoBackgroundService;
    @Resource private BlogPostService blogPostService;

    @Transactional(rollbackFor = Exception.class)
    public Boolean publishArtwork(List<Long> ids, User admin) {
        for (Long id : normalize(ContentExternalService.ARTWORK, ids)) {
            Long targetId = prepare(ContentExternalService.ARTWORK, id, admin);
            artworkService.publishArtworkBatch(java.util.Collections.singletonList(targetId));
        }
        return true;
    }

    @Transactional(rollbackFor = Exception.class)
    public Boolean publishPromptAssets(List<Long> ids, User admin) {
        for (Long id : normalize(ContentExternalService.PROMPT_ASSET, ids)) {
            Long targetId = prepare(ContentExternalService.PROMPT_ASSET, id, admin);
            promptAssetService.publishPromptAssetBatch(java.util.Collections.singletonList(targetId));
        }
        return true;
    }

    @Transactional(rollbackFor = Exception.class)
    public Boolean publishVideoBackgrounds(List<Long> ids, User admin) {
        for (Long id : normalize(ContentExternalService.VIDEO_BACKGROUND, ids)) {
            Long targetId = prepare(ContentExternalService.VIDEO_BACKGROUND, id, admin);
            videoBackgroundService.publishVideoBackgroundBatch(java.util.Collections.singletonList(targetId));
        }
        return true;
    }

    @Transactional(rollbackFor = Exception.class)
    public Boolean publishTutorialPost(Long id, User admin) {
        Long targetId = prepare(ContentExternalService.TUTORIAL_POST, id, admin);
        return blogPostService.publishPost(targetId, admin);
    }

    @Transactional(rollbackFor = Exception.class)
    public Integer publishTutorialPosts(List<Long> ids, User admin) {
        int count = 0;
        for (Long id : normalize(ContentExternalService.TUTORIAL_POST, ids)) {
            publishTutorialPost(id, admin);
            count++;
        }
        return count;
    }

    private Long prepare(String type, Long requestedId, User admin) {
        ContentModuleDraftBridge bridge = bridgeService.findByDraft(type, requestedId);
        if (bridge == null) bridge = bridgeService.findByTarget(type, requestedId);
        if (bridge == null) return requestedId;
        String liveVersion = contentExternalService.getLive(type, bridge.getTargetId(), admin).getVersion();
        if (!bridge.getBaseVersion().equals(liveVersion)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    "线上内容在草稿创建后已被修改，请先重新合并最新内容，未覆盖任何数据");
        }
        contentExternalService.applyReplacementDraft(bridge, admin);
        bridgeService.removeBridge(bridge);
        return bridge.getTargetId();
    }

    private Set<Long> normalize(String type, List<Long> ids) {
        if (CollUtil.isEmpty(ids)) throw new BusinessException(ErrorCode.PARAMS_ERROR);
        Set<Long> result = new LinkedHashSet<>();
        for (Long id : ids) {
            if (id == null || id <= 0) continue;
            ContentModuleDraftBridge bridge = bridgeService.findByDraft(type, id);
            if (bridge == null) bridge = bridgeService.findByTarget(type, id);
            result.add(bridge == null ? id : bridge.getDraftId());
        }
        if (result.isEmpty()) throw new BusinessException(ErrorCode.PARAMS_ERROR);
        return result;
    }
}
