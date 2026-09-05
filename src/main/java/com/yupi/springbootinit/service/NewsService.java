package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.AnnouncementMapper;
import com.yupi.springbootinit.mapper.AnnouncementPopupDismissalMapper;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementQueryRequest;
import com.yupi.springbootinit.model.entity.Announcement;
import com.yupi.springbootinit.model.vo.announcement.PublicNewsVO;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NewsService {
    @Resource
    private AnnouncementMapper announcementMapper;
    @Resource
    private AnnouncementPopupDismissalMapper dismissalMapper;

    public QueryWrapper<Announcement> visibleQuery() {
        Date now = new Date();
        return new QueryWrapper<Announcement>().eq("isDelete", 0).eq("publicVisible", true)
                .eq("status", "published")
                .and(q -> q.isNull("publishTime").or().le("publishTime", now))
                .and(q -> q.isNull("expireTime").or().gt("expireTime", now))
                .orderByDesc("priority", "publishTime", "id");
    }

    public Page<PublicNewsVO> list(AnnouncementQueryRequest request) {
        AnnouncementQueryRequest query = request == null ? new AnnouncementQueryRequest() : request;
        if (query.getCurrent() < 1 || query.getCurrent() > 10000 || query.getPageSize() < 1
                || query.getPageSize() > 50) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "分页参数不合法");
        }
        Page<Announcement> page = announcementMapper.selectPage(
                new Page<>(query.getCurrent(), query.getPageSize()), visibleQuery());
        Page<PublicNewsVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(a -> toPublic(a, false)).collect(Collectors.toList()));
        return result;
    }

    public PublicNewsVO get(Long id) {
        if (id == null || id <= 0) throw new BusinessException(ErrorCode.PARAMS_ERROR);
        Announcement item = announcementMapper.selectOne(visibleQuery().eq("id", id));
        if (item == null) throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        return toPublic(item, true);
    }

    public PublicNewsVO popup(List<Long> excludedIds, Long userId) {
        List<Long> ids = validateIds(excludedIds);
        QueryWrapper<Announcement> query = visibleQuery().eq("popupEnabled", true);
        if (!ids.isEmpty()) query.notIn("id", ids);
        if (userId != null) {
            query.apply("NOT EXISTS (SELECT 1 FROM announcement_popup_dismissal d "
                    + "WHERE d.announcementId = announcement.id AND d.userId = {0})", userId);
        }
        Announcement item = announcementMapper.selectOne(query.last("LIMIT 1"));
        return item == null ? null : toPublic(item, false);
    }

    @Transactional(rollbackFor = Exception.class)
    public void dismiss(List<Long> requestedIds, Long userId) {
        if (userId == null) throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        List<Long> ids = validateIds(requestedIds);
        if (ids.isEmpty()) return;
        // Accept old guest records even after expiry/offline; ignore unknown/private records.
        List<Announcement> items = announcementMapper.selectList(new QueryWrapper<Announcement>()
                .select("id").eq("publicVisible", true).eq("isDelete", 0).in("id", ids));
        for (Announcement item : items) {
            dismissalMapper.dismissOnce(IdWorker.getId(), item.getId(), userId);
        }
    }

    private List<Long> validateIds(List<Long> ids) {
        if (ids == null) return Collections.emptyList();
        if (ids.size() > 500 || ids.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "公告编号不合法或超过 500 条");
        }
        return ids.stream().distinct().collect(Collectors.toList());
    }

    private PublicNewsVO toPublic(Announcement item, boolean detail) {
        PublicNewsVO result = new PublicNewsVO();
        BeanUtils.copyProperties(item, result);
        result.setId(String.valueOf(item.getId()));
        if (!detail) result.setContent(null);
        return result;
    }
}
