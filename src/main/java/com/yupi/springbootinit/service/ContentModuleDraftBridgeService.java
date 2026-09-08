package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.ContentModuleDraftBridgeMapper;
import com.yupi.springbootinit.model.entity.ContentModuleDraftBridge;
import com.yupi.springbootinit.model.vo.NativeDraftAwareVO;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

/** Maps a native draft clone back to the published row it will replace. */
@Service
public class ContentModuleDraftBridgeService extends
        ServiceImpl<ContentModuleDraftBridgeMapper, ContentModuleDraftBridge> {

    public ContentModuleDraftBridge findByTarget(String type, Long targetId) {
        if (type == null || targetId == null) return null;
        return getOne(new QueryWrapper<ContentModuleDraftBridge>()
                .eq("resourceType", type).eq("targetId", targetId).last("LIMIT 1"));
    }

    public ContentModuleDraftBridge findByDraft(String type, Long draftId) {
        if (type == null || draftId == null) return null;
        return getOne(new QueryWrapper<ContentModuleDraftBridge>()
                .eq("resourceType", type).eq("draftId", draftId).last("LIMIT 1"));
    }

    public List<ContentModuleDraftBridge> findByResourceIds(String type, Collection<Long> resourceIds) {
        if (type == null || resourceIds == null || resourceIds.isEmpty()) return Collections.emptyList();
        return list(new QueryWrapper<ContentModuleDraftBridge>()
                .eq("resourceType", type)
                .and(wrapper -> wrapper.in("targetId", resourceIds).or().in("draftId", resourceIds)));
    }

    public void annotateAdminResources(String type, Collection<? extends NativeDraftAwareVO> resources) {
        if (resources == null || resources.isEmpty()) return;
        List<Long> ids = new ArrayList<>();
        for (NativeDraftAwareVO resource : resources) {
            if (resource != null && resource.getId() != null) ids.add(resource.getId());
        }
        for (ContentModuleDraftBridge bridge : findByResourceIds(type, ids)) {
            for (NativeDraftAwareVO resource : resources) {
                if (resource == null) continue;
                if (bridge.getTargetId().equals(resource.getId())) {
                    resource.setHasUnpublishedChanges(true);
                    resource.setUnpublishedDraftId(bridge.getDraftId());
                }
                if (bridge.getDraftId().equals(resource.getId())) {
                    resource.setReplacesResourceId(bridge.getTargetId());
                }
            }
        }
    }

    public ContentModuleDraftBridge create(String type, Long targetId, Long draftId,
            String baseVersion, String originalUniqueValue, Long userId) {
        ContentModuleDraftBridge bridge = new ContentModuleDraftBridge();
        bridge.setResourceType(type);
        bridge.setTargetId(targetId);
        bridge.setDraftId(draftId);
        bridge.setBaseVersion(baseVersion);
        bridge.setOriginalUniqueValue(originalUniqueValue);
        bridge.setCreateUserId(userId);
        bridge.setCreateTime(new Date());
        bridge.setUpdateTime(new Date());
        try {
            if (!save(bridge)) throw new BusinessException(ErrorCode.OPERATION_ERROR, "创建内容草稿映射失败");
            return bridge;
        } catch (DuplicateKeyException e) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    "该内容已经存在待发布草稿，请重新查询后继续修改");
        }
    }

    public void removeBridge(ContentModuleDraftBridge bridge) {
        if (bridge != null && !removeById(bridge.getId())) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "清理内容草稿映射失败");
        }
    }

    public void removeByResources(String type, Collection<Long> resourceIds) {
        if (type == null || resourceIds == null || resourceIds.isEmpty()) return;
        remove(new QueryWrapper<ContentModuleDraftBridge>()
                .eq("resourceType", type)
                .and(wrapper -> wrapper.in("targetId", resourceIds).or().in("draftId", resourceIds)));
    }
}
