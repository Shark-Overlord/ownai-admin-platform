package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.AnnouncementMapper;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementAddRequest;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementQueryRequest;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementUpdateRequest;
import com.yupi.springbootinit.model.entity.Announcement;
import com.yupi.springbootinit.model.entity.AnnouncementRead;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.announcement.AnnouncementVO;
import com.yupi.springbootinit.service.AnnouncementReadService;
import com.yupi.springbootinit.service.AnnouncementService;
import com.yupi.springbootinit.utils.SqlUtils;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnouncementServiceImpl extends ServiceImpl<AnnouncementMapper, Announcement>
        implements AnnouncementService {

    private static final String STATUS_DRAFT = "draft";

    private static final String STATUS_PUBLISHED = "published";

    private static final String STATUS_OFFLINE = "offline";

    private static final String TYPE_SITE_UPDATE = "site_update";

    @Resource
    private AnnouncementReadService announcementReadService;

    @Override
    public Long addAnnouncement(AnnouncementAddRequest request, User adminUser) {
        validateAnnouncement(request == null ? null : request.getTitle(), request == null ? null : request.getContent(),
                request == null ? null : request.getStatus(), request == null ? null : request.getExpireTime(),
                request == null ? null : request.getPublishTime());
        Announcement announcement = new Announcement();
        BeanUtils.copyProperties(request, announcement);
        normalizeAnnouncement(announcement);
        announcement.setCreateUserId(adminUser == null ? null : adminUser.getId());
        boolean result = this.save(announcement);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return announcement.getId();
    }

    @Override
    public Boolean updateAnnouncement(AnnouncementUpdateRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        validateAnnouncement(request.getTitle(), request.getContent(), request.getStatus(), request.getExpireTime(),
                request.getPublishTime());
        Announcement existing = getValidAnnouncement(request.getId());
        Announcement announcement = new Announcement();
        BeanUtils.copyProperties(request, announcement);
        normalizeAnnouncement(announcement);
        announcement.setId(existing.getId());
        boolean result = this.updateById(announcement);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    public Boolean deleteAnnouncement(Long id) {
        Announcement existing = getValidAnnouncement(id);
        Announcement update = new Announcement();
        update.setId(existing.getId());
        update.setIsDelete(1);
        boolean result = this.updateById(update);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    public Boolean publishAnnouncement(Long id) {
        Announcement existing = getValidAnnouncement(id);
        Announcement update = new Announcement();
        update.setId(existing.getId());
        update.setStatus(STATUS_PUBLISHED);
        if (existing.getPublishTime() == null) {
            update.setPublishTime(new Date());
        }
        boolean result = this.updateById(update);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    public Boolean offlineAnnouncement(Long id) {
        Announcement existing = getValidAnnouncement(id);
        Announcement update = new Announcement();
        update.setId(existing.getId());
        update.setStatus(STATUS_OFFLINE);
        boolean result = this.updateById(update);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    public Page<AnnouncementVO> listAdminAnnouncementByPage(AnnouncementQueryRequest request) {
        AnnouncementQueryRequest safeRequest = request == null ? new AnnouncementQueryRequest() : request;
        QueryWrapper<Announcement> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("isDelete", 0);
        queryWrapper.like(StringUtils.isNotBlank(safeRequest.getTitle()), "title", safeRequest.getTitle());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getType()), "type", safeRequest.getType());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getStatus()), "status", safeRequest.getStatus());
        queryWrapper.ge(safeRequest.getStartTime() != null, "createTime", safeRequest.getStartTime());
        queryWrapper.le(safeRequest.getEndTime() != null, "createTime", safeRequest.getEndTime());
        if (SqlUtils.validSortField(safeRequest.getSortField())) {
            queryWrapper.orderBy(true, "ascend".equals(safeRequest.getSortOrder()), safeRequest.getSortField());
        }
        queryWrapper.orderByDesc("priority").orderByDesc("updateTime");
        Page<Announcement> page = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()),
                queryWrapper);
        return toVOPage(page, Collections.emptyMap());
    }

    @Override
    public Page<AnnouncementVO> listUserAnnouncementByPage(AnnouncementQueryRequest request, User loginUser) {
        AnnouncementQueryRequest safeRequest = request == null ? new AnnouncementQueryRequest() : request;
        Page<Announcement> page = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()),
                buildVisibleQueryWrapper(safeRequest));
        Map<Long, AnnouncementRead> readMap = getReadMap(page.getRecords(), loginUser.getId());
        return toVOPage(page, readMap);
    }

    @Override
    public AnnouncementVO getUserAnnouncementVO(Long id, User loginUser) {
        Announcement announcement = getVisibleAnnouncement(id);
        Map<Long, AnnouncementRead> readMap = getReadMap(Collections.singletonList(announcement), loginUser.getId());
        return toVO(announcement, readMap.get(announcement.getId()));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean markRead(Long id, User loginUser) {
        Announcement announcement = getVisibleAnnouncement(id);
        saveReadIfAbsent(announcement.getId(), loginUser.getId());
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean markAllRead(User loginUser) {
        List<Announcement> visibleList = this.list(buildVisibleQueryWrapper(new AnnouncementQueryRequest())
                .select("id"));
        if (visibleList == null || visibleList.isEmpty()) {
            return true;
        }
        Set<Long> visibleIds = visibleList.stream().map(Announcement::getId).collect(Collectors.toSet());
        Set<Long> readIds = announcementReadService.list(new QueryWrapper<AnnouncementRead>()
                        .eq("userId", loginUser.getId())
                        .in("announcementId", visibleIds))
                .stream()
                .map(AnnouncementRead::getAnnouncementId)
                .collect(Collectors.toSet());
        List<AnnouncementRead> toSaveList = new ArrayList<>();
        for (Long announcementId : visibleIds) {
            if (!readIds.contains(announcementId)) {
                AnnouncementRead read = new AnnouncementRead();
                read.setAnnouncementId(announcementId);
                read.setUserId(loginUser.getId());
                read.setReadTime(new Date());
                toSaveList.add(read);
            }
        }
        if (!toSaveList.isEmpty()) {
            announcementReadService.saveBatch(toSaveList);
        }
        return true;
    }

    @Override
    public Long getUnreadCount(User loginUser) {
        List<Announcement> visibleList = this.list(buildVisibleQueryWrapper(new AnnouncementQueryRequest())
                .select("id"));
        if (visibleList == null || visibleList.isEmpty()) {
            return 0L;
        }
        List<Long> visibleIds = visibleList.stream().map(Announcement::getId).collect(Collectors.toList());
        long readCount = announcementReadService.count(new QueryWrapper<AnnouncementRead>()
                .eq("userId", loginUser.getId())
                .in("announcementId", visibleIds));
        return visibleIds.size() - readCount;
    }

    private void validateAnnouncement(String title, String content, String status, Date expireTime, Date publishTime) {
        if (StringUtils.isBlank(title) || StringUtils.length(title.trim()) > 100) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "公告标题不能为空且不能超过 100 字");
        }
        if (StringUtils.isBlank(content)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "公告内容不能为空");
        }
        String safeStatus = StringUtils.defaultIfBlank(status, STATUS_DRAFT);
        if (!STATUS_DRAFT.equals(safeStatus) && !STATUS_PUBLISHED.equals(safeStatus) && !STATUS_OFFLINE.equals(safeStatus)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "公告状态不合法");
        }
        if (expireTime != null && publishTime != null && expireTime.before(publishTime)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "过期时间不能早于发布时间");
        }
    }

    private void normalizeAnnouncement(Announcement announcement) {
        announcement.setTitle(announcement.getTitle().trim());
        announcement.setType(StringUtils.defaultIfBlank(announcement.getType(), TYPE_SITE_UPDATE).trim());
        announcement.setStatus(StringUtils.defaultIfBlank(announcement.getStatus(), STATUS_DRAFT).trim());
        if (announcement.getPriority() == null) {
            announcement.setPriority(0);
        }
        if (STATUS_PUBLISHED.equals(announcement.getStatus()) && announcement.getPublishTime() == null) {
            announcement.setPublishTime(new Date());
        }
    }

    private Announcement getValidAnnouncement(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Announcement announcement = this.getOne(new QueryWrapper<Announcement>()
                .eq("id", id)
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        ThrowUtils.throwIf(announcement == null, ErrorCode.NOT_FOUND_ERROR);
        return announcement;
    }

    private Announcement getVisibleAnnouncement(Long id) {
        Announcement announcement = this.getOne(buildVisibleQueryWrapper(new AnnouncementQueryRequest())
                .eq("id", id)
                .last("LIMIT 1"));
        ThrowUtils.throwIf(announcement == null, ErrorCode.NOT_FOUND_ERROR);
        return announcement;
    }

    private QueryWrapper<Announcement> buildVisibleQueryWrapper(AnnouncementQueryRequest request) {
        Date now = new Date();
        QueryWrapper<Announcement> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("isDelete", 0)
                .eq("status", STATUS_PUBLISHED)
                .like(StringUtils.isNotBlank(request.getTitle()), "title", request.getTitle())
                .eq(StringUtils.isNotBlank(request.getType()), "type", request.getType())
                .and(wrapper -> wrapper.isNull("publishTime").or().le("publishTime", now))
                .and(wrapper -> wrapper.isNull("expireTime").or().gt("expireTime", now))
                .orderByDesc("priority")
                .orderByDesc("publishTime")
                .orderByDesc("id");
        return queryWrapper;
    }

    private Map<Long, AnnouncementRead> getReadMap(List<Announcement> announcementList, Long userId) {
        if (announcementList == null || announcementList.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> ids = announcementList.stream().map(Announcement::getId).collect(Collectors.toList());
        return announcementReadService.list(new QueryWrapper<AnnouncementRead>()
                        .eq("userId", userId)
                        .in("announcementId", ids))
                .stream()
                .collect(Collectors.toMap(AnnouncementRead::getAnnouncementId, Function.identity(), (a, b) -> a));
    }

    private void saveReadIfAbsent(Long announcementId, Long userId) {
        AnnouncementRead existing = announcementReadService.getOne(new QueryWrapper<AnnouncementRead>()
                .eq("announcementId", announcementId)
                .eq("userId", userId)
                .last("LIMIT 1"));
        if (existing != null) {
            return;
        }
        AnnouncementRead read = new AnnouncementRead();
        read.setAnnouncementId(announcementId);
        read.setUserId(userId);
        read.setReadTime(new Date());
        announcementReadService.save(read);
    }

    private Page<AnnouncementVO> toVOPage(Page<Announcement> page, Map<Long, AnnouncementRead> readMap) {
        Page<AnnouncementVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream()
                .map(announcement -> toVO(announcement, readMap.get(announcement.getId())))
                .collect(Collectors.toList()));
        return voPage;
    }

    private AnnouncementVO toVO(Announcement announcement, AnnouncementRead read) {
        AnnouncementVO vo = new AnnouncementVO();
        BeanUtils.copyProperties(announcement, vo);
        vo.setReadStatus(read != null);
        vo.setReadTime(read == null ? null : read.getReadTime());
        return vo;
    }
}
