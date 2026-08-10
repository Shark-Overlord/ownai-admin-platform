package com.yupi.springbootinit.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.CategoryMapper;
import com.yupi.springbootinit.mapper.CategoryTagMapper;
import com.yupi.springbootinit.mapper.TagMapper;
import com.yupi.springbootinit.mapper.VideoBackgroundMapper;
import com.yupi.springbootinit.mapper.VideoBackgroundFavoriteMapper;
import com.yupi.springbootinit.mapper.VideoBackgroundTagMapper;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundAddRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundFavoriteRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundQueryRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundUpdateRequest;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.entity.CategoryTag;
import com.yupi.springbootinit.model.entity.Tag;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.VideoBackground;
import com.yupi.springbootinit.model.entity.VideoBackgroundFavorite;
import com.yupi.springbootinit.model.entity.VideoBackgroundTag;
import com.yupi.springbootinit.model.enums.ArtworkStatusEnum;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.model.vo.TagVO;
import com.yupi.springbootinit.model.vo.videobackground.VideoBackgroundResourceVO;
import com.yupi.springbootinit.model.vo.videobackground.VideoBackgroundVO;
import com.yupi.springbootinit.service.VideoBackgroundService;
import com.yupi.springbootinit.utils.SqlUtils;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VideoBackgroundServiceImpl extends ServiceImpl<VideoBackgroundMapper, VideoBackground>
        implements VideoBackgroundService {

    @Resource
    private CategoryMapper categoryMapper;

    @Resource
    private CategoryTagMapper categoryTagMapper;

    @Resource
    private TagMapper tagMapper;

    @Resource
    private VideoBackgroundTagMapper videoBackgroundTagMapper;

    @Resource
    private VideoBackgroundFavoriteMapper videoBackgroundFavoriteMapper;

    @Resource
    private CosClientConfig cosClientConfig;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public long addVideoBackground(VideoBackgroundAddRequest request, User operator) {
        ThrowUtils.throwIf(request == null, ErrorCode.PARAMS_ERROR);
        VideoBackground videoBackground = new VideoBackground();
        BeanUtils.copyProperties(request, videoBackground);
        videoBackground.setUserId(operator.getId());
        videoBackground.setMemberOnly(videoBackground.getMemberOnly() == null ? 0 : videoBackground.getMemberOnly());
        videoBackground.setStatus(videoBackground.getStatus() == null ? ArtworkStatusEnum.DRAFT.getValue()
                : videoBackground.getStatus());
        videoBackground.setSort(videoBackground.getSort() == null ? 0 : videoBackground.getSort());
        validateVideoBackground(videoBackground, request.getTagIdList(),
                ArtworkStatusEnum.PUBLISHED.getValue().equals(videoBackground.getStatus()));
        ThrowUtils.throwIf(!this.save(videoBackground), ErrorCode.OPERATION_ERROR, "Failed to create video background");
        saveTags(videoBackground.getId(), request.getTagIdList());
        return videoBackground.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateVideoBackground(VideoBackgroundUpdateRequest request, User operator) {
        ThrowUtils.throwIf(request == null || request.getId() == null || request.getId() <= 0, ErrorCode.PARAMS_ERROR);
        VideoBackground old = this.getById(request.getId());
        ThrowUtils.throwIf(old == null, ErrorCode.NOT_FOUND_ERROR, "Video background not found");
        VideoBackground videoBackground = new VideoBackground();
        BeanUtils.copyProperties(request, videoBackground);
        videoBackground.setUserId(old.getUserId());
        // Admin edits are partial updates. Do not erase the persisted category
        // when the client omits categoryId while editing another tab.
        videoBackground.setCategoryId(videoBackground.getCategoryId() == null ? old.getCategoryId()
                : videoBackground.getCategoryId());
        // Media tabs may not participate in a partial edit request. Preserve the
        // stored media and metadata unless the client explicitly sends a value.
        videoBackground.setCoverUrl(videoBackground.getCoverUrl() == null ? old.getCoverUrl()
                : videoBackground.getCoverUrl());
        videoBackground.setPreviewVideoUrl(videoBackground.getPreviewVideoUrl() == null ? old.getPreviewVideoUrl()
                : videoBackground.getPreviewVideoUrl());
        videoBackground.setSourceVideoUrl(videoBackground.getSourceVideoUrl() == null ? old.getSourceVideoUrl()
                : videoBackground.getSourceVideoUrl());
        videoBackground.setVideoWidth(videoBackground.getVideoWidth() == null ? old.getVideoWidth()
                : videoBackground.getVideoWidth());
        videoBackground.setVideoHeight(videoBackground.getVideoHeight() == null ? old.getVideoHeight()
                : videoBackground.getVideoHeight());
        videoBackground.setDurationMs(videoBackground.getDurationMs() == null ? old.getDurationMs()
                : videoBackground.getDurationMs());
        videoBackground.setFileSize(videoBackground.getFileSize() == null ? old.getFileSize()
                : videoBackground.getFileSize());
        videoBackground.setVideoFormat(videoBackground.getVideoFormat() == null ? old.getVideoFormat()
                : videoBackground.getVideoFormat());
        videoBackground.setMemberOnly(videoBackground.getMemberOnly() == null ? old.getMemberOnly()
                : videoBackground.getMemberOnly());
        videoBackground.setStatus(videoBackground.getStatus() == null ? old.getStatus() : videoBackground.getStatus());
        videoBackground.setSort(videoBackground.getSort() == null ? old.getSort() : videoBackground.getSort());
        validateVideoBackground(videoBackground, request.getTagIdList(),
                ArtworkStatusEnum.PUBLISHED.getValue().equals(videoBackground.getStatus()));
        ThrowUtils.throwIf(!this.updateById(videoBackground), ErrorCode.OPERATION_ERROR, "Failed to update video background");
        videoBackgroundTagMapper.delete(new QueryWrapper<VideoBackgroundTag>().eq("videoBackgroundId", request.getId()));
        saveTags(request.getId(), request.getTagIdList());
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteVideoBackground(long id) {
        ThrowUtils.throwIf(id <= 0, ErrorCode.PARAMS_ERROR);
        ThrowUtils.throwIf(!this.removeById(id), ErrorCode.OPERATION_ERROR, "Failed to delete video background");
        videoBackgroundTagMapper.delete(new QueryWrapper<VideoBackgroundTag>().eq("videoBackgroundId", id));
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean publishVideoBackgroundBatch(List<Long> ids) {
        for (Long id : normalizeIds(ids)) {
            VideoBackground item = this.getById(id);
            ThrowUtils.throwIf(item == null, ErrorCode.NOT_FOUND_ERROR, "Video background not found");
            validateVideoBackground(item, getTagIds(id), true);
            item.setStatus(ArtworkStatusEnum.PUBLISHED.getValue());
            item.setUpdateTime(new Date());
            this.updateById(item);
        }
        return true;
    }

    @Override
    public boolean offlineVideoBackgroundBatch(List<Long> ids) {
        List<Long> normalizedIds = normalizeIds(ids);
        return this.lambdaUpdate().in(VideoBackground::getId, normalizedIds)
                .set(VideoBackground::getStatus, ArtworkStatusEnum.DRAFT.getValue())
                .set(VideoBackground::getUpdateTime, new Date()).update();
    }

    @Override
    public boolean updateVideoBackgroundMemberOnlyBatch(List<Long> ids, Integer memberOnly) {
        ThrowUtils.throwIf(memberOnly == null || (memberOnly != 0 && memberOnly != 1), ErrorCode.PARAMS_ERROR);
        return this.lambdaUpdate().in(VideoBackground::getId, normalizeIds(ids))
                .set(VideoBackground::getMemberOnly, memberOnly)
                .set(VideoBackground::getUpdateTime, new Date()).update();
    }

    @Override
    public Page<VideoBackgroundVO> listVideoBackgroundVOByPage(VideoBackgroundQueryRequest request, User loginUser,
            boolean adminView) {
        VideoBackgroundQueryRequest safeRequest = request == null ? new VideoBackgroundQueryRequest() : request;
        QueryWrapper<VideoBackground> wrapper = buildQueryWrapper(safeRequest, adminView);
        if (wrapper == null) {
            return new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(), 0);
        }
        Page<VideoBackground> page = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), wrapper);
        Page<VideoBackgroundVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(buildVOList(page.getRecords(), loginUser, adminView));
        return result;
    }

    @Override
    public VideoBackgroundResourceVO getVideoBackgroundResource(Long id, User loginUser, String downloadUrl) {
        VideoBackground item = getPublished(id);
        ThrowUtils.throwIf(!hasAccess(item, loginUser), ErrorCode.NO_AUTH_ERROR, "Membership required");
        VideoBackgroundResourceVO result = new VideoBackgroundResourceVO();
        result.setId(item.getId());
        result.setTitle(item.getTitle());
        result.setPromptContent(item.getPromptContent());
        result.setDownloadUrl(downloadUrl);
        return result;
    }

    @Override
    public String getVideoBackgroundSourceUrl(Long id, User loginUser) {
        VideoBackground item = getPublished(id);
        ThrowUtils.throwIf(!hasAccess(item, loginUser), ErrorCode.NO_AUTH_ERROR, "Membership required");
        ThrowUtils.throwIf(StringUtils.isBlank(item.getSourceVideoUrl()), ErrorCode.NOT_FOUND_ERROR,
                "Original video is unavailable");
        return item.getSourceVideoUrl();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean addFavorite(VideoBackgroundFavoriteRequest request, User loginUser) {
        Long videoBackgroundId = normalizeFavoriteVideoBackgroundId(request);
        getPublished(videoBackgroundId);
        VideoBackgroundFavorite existing = getFavoriteRecord(loginUser.getId(), videoBackgroundId);
        if (existing != null) {
            if (existing.getIsDelete() == null || existing.getIsDelete() == 0) {
                return true;
            }
            boolean restored = videoBackgroundFavoriteMapper.restoreByUserAndVideo(loginUser.getId(), videoBackgroundId) > 0;
            ThrowUtils.throwIf(!restored, ErrorCode.OPERATION_ERROR);
            return true;
        }
        VideoBackgroundFavorite favorite = new VideoBackgroundFavorite();
        favorite.setUserId(loginUser.getId());
        favorite.setVideoBackgroundId(videoBackgroundId);
        favorite.setCreateTime(new Date());
        favorite.setUpdateTime(new Date());
        favorite.setIsDelete(0);
        boolean result;
        try {
            result = videoBackgroundFavoriteMapper.insert(favorite) > 0;
        } catch (DuplicateKeyException e) {
            result = videoBackgroundFavoriteMapper.restoreByUserAndVideo(loginUser.getId(), videoBackgroundId) > 0;
        }
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean cancelFavorite(VideoBackgroundFavoriteRequest request, User loginUser) {
        Long videoBackgroundId = normalizeFavoriteVideoBackgroundId(request);
        videoBackgroundFavoriteMapper.update(null, new UpdateWrapper<VideoBackgroundFavorite>()
                .eq("userId", loginUser.getId())
                .eq("videoBackgroundId", videoBackgroundId)
                .eq("isDelete", 0)
                .set("isDelete", 1)
                .set("updateTime", new Date()));
        return true;
    }

    @Override
    public Boolean isFavorited(Long videoBackgroundId, User loginUser) {
        ThrowUtils.throwIf(videoBackgroundId == null || videoBackgroundId <= 0, ErrorCode.PARAMS_ERROR);
        return isFavoritedByUser(videoBackgroundId, loginUser.getId());
    }

    @Override
    public Page<VideoBackgroundVO> listMyFavoriteVideoBackgroundVOByPage(VideoBackgroundQueryRequest request,
            User loginUser) {
        VideoBackgroundQueryRequest safeRequest = request == null ? new VideoBackgroundQueryRequest() : request;
        long current = Math.max(safeRequest.getCurrent(), 1);
        long pageSize = Math.min(Math.max(safeRequest.getPageSize(), 1), 50);
        QueryWrapper<VideoBackground> wrapper = buildQueryWrapper(safeRequest, false, loginUser.getId());
        if (wrapper == null) {
            return new Page<>(current, pageSize, 0);
        }
        wrapper.inSql("id", "SELECT videoBackgroundId FROM video_background_favorite WHERE userId = "
                + loginUser.getId() + " AND isDelete = 0");
        Page<VideoBackground> page = this.page(new Page<>(current, pageSize), wrapper);
        Page<VideoBackgroundVO> result = new Page<>(current, pageSize, page.getTotal());
        result.setRecords(buildVOList(page.getRecords(), loginUser, false));
        return result;
    }

    private QueryWrapper<VideoBackground> buildQueryWrapper(VideoBackgroundQueryRequest request, boolean adminView) {
        return buildQueryWrapper(request, adminView, null);
    }

    private QueryWrapper<VideoBackground> buildQueryWrapper(VideoBackgroundQueryRequest request, boolean adminView,
            Long favoriteUserId) {
        QueryWrapper<VideoBackground> wrapper = new QueryWrapper<>();
        if (adminView) {
            wrapper.eq(request.getStatus() != null, "status", request.getStatus());
        } else {
            wrapper.eq("status", ArtworkStatusEnum.PUBLISHED.getValue());
        }
        wrapper.eq(request.getCategoryId() != null, "categoryId", request.getCategoryId());
        wrapper.eq(request.getMemberOnly() != null, "memberOnly", request.getMemberOnly());
        if (StringUtils.isNotBlank(request.getSearchText())) {
            wrapper.and(w -> w.like("title", request.getSearchText())
                    .or().like("summary", request.getSearchText())
                    .or().like("promptContent", request.getSearchText()));
        }
        if (CollUtil.isNotEmpty(request.getTagIdList())) {
            List<VideoBackgroundTag> relations = videoBackgroundTagMapper.selectList(
                    new QueryWrapper<VideoBackgroundTag>().in("tagId", request.getTagIdList()));
            if (CollUtil.isEmpty(relations)) {
                return null;
            }
            wrapper.in("id", relations.stream().map(VideoBackgroundTag::getVideoBackgroundId).distinct()
                    .collect(Collectors.toList()));
        }
        if (favoriteUserId != null) {
            wrapper.last("ORDER BY (SELECT updateTime FROM video_background_favorite f WHERE f.videoBackgroundId = "
                    + "video_background.id AND f.userId = " + favoriteUserId + " AND f.isDelete = 0) DESC, id DESC");
        } else {
            String sortField = request.getSortField();
            String sortOrder = request.getSortOrder();
            wrapper.orderBy(SqlUtils.validSortField(sortField), CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
            wrapper.orderByDesc("sort", "createTime", "id");
        }
        return wrapper;
    }

    private List<VideoBackgroundVO> buildVOList(List<VideoBackground> records, User loginUser, boolean adminView) {
        if (CollUtil.isEmpty(records)) {
            return Collections.emptyList();
        }
        Map<Long, CategoryVO> categoryMap = buildCategoryMap(records.stream().map(VideoBackground::getCategoryId)
                .filter(id -> id != null && id > 0).distinct().collect(Collectors.toList()));
        Map<Long, List<TagVO>> tagMap = buildTagMap(records.stream().map(VideoBackground::getId)
                .collect(Collectors.toList()));
        List<VideoBackgroundVO> result = new ArrayList<>();
        for (VideoBackground item : records) {
            VideoBackgroundVO vo = new VideoBackgroundVO();
            BeanUtils.copyProperties(item, vo);
            vo.setCategory(categoryMap.get(item.getCategoryId()));
            vo.setTagList(tagMap.getOrDefault(item.getId(), Collections.emptyList()));
            vo.setCanAccess(hasAccess(item, loginUser));
            if (item.getVideoWidth() != null && item.getVideoHeight() != null && item.getVideoWidth() > 0
                    && item.getVideoHeight() > 0) {
                vo.setVideoAspectRatio(item.getVideoWidth().doubleValue() / item.getVideoHeight().doubleValue());
            }
            if (!adminView) {
                vo.setPromptContent(null);
                vo.setSourceVideoUrl(null);
                vo.setStatus(null);
            }
            result.add(vo);
        }
        fillFavoriteInfo(result, loginUser == null ? null : loginUser.getId());
        return result;
    }

    private Map<Long, CategoryVO> buildCategoryMap(List<Long> categoryIds) {
        if (CollUtil.isEmpty(categoryIds)) {
            return Collections.emptyMap();
        }
        return categoryMapper.selectBatchIds(categoryIds).stream().collect(Collectors.toMap(Category::getId, item -> {
            CategoryVO vo = new CategoryVO();
            BeanUtils.copyProperties(item, vo);
            return vo;
        }));
    }

    private Map<Long, List<TagVO>> buildTagMap(List<Long> ids) {
        if (CollUtil.isEmpty(ids)) {
            return Collections.emptyMap();
        }
        List<VideoBackgroundTag> relations = videoBackgroundTagMapper.selectList(
                new QueryWrapper<VideoBackgroundTag>().in("videoBackgroundId", ids));
        if (CollUtil.isEmpty(relations)) {
            return Collections.emptyMap();
        }
        Map<Long, TagVO> tags = tagMapper.selectBatchIds(relations.stream().map(VideoBackgroundTag::getTagId)
                .distinct().collect(Collectors.toList())).stream().collect(Collectors.toMap(Tag::getId, item -> {
                    TagVO vo = new TagVO();
                    BeanUtils.copyProperties(item, vo);
                    return vo;
                }));
        Map<Long, List<TagVO>> result = new HashMap<>();
        for (VideoBackgroundTag relation : relations) {
            TagVO tag = tags.get(relation.getTagId());
            if (tag != null) {
                result.computeIfAbsent(relation.getVideoBackgroundId(), ignored -> new ArrayList<>()).add(tag);
            }
        }
        return result;
    }

    private void validateVideoBackground(VideoBackground item, List<Long> tagIds, boolean publishing) {
        ThrowUtils.throwIf(StringUtils.isBlank(item.getTitle()), ErrorCode.PARAMS_ERROR, "Title is required");
        ThrowUtils.throwIf(item.getTitle().trim().length() > 128, ErrorCode.PARAMS_ERROR, "Title is too long");
        ThrowUtils.throwIf(item.getCategoryId() == null || item.getCategoryId() <= 0, ErrorCode.PARAMS_ERROR,
                "Category is required");
        ThrowUtils.throwIf(categoryMapper.selectById(item.getCategoryId()) == null, ErrorCode.PARAMS_ERROR,
                "Category does not exist");
        ThrowUtils.throwIf(item.getMemberOnly() == null || (item.getMemberOnly() != 0 && item.getMemberOnly() != 1),
                ErrorCode.PARAMS_ERROR, "memberOnly must be 0 or 1");
        ThrowUtils.throwIf(item.getStatus() == null || ArtworkStatusEnum.getEnumByValue(item.getStatus()) == null,
                ErrorCode.PARAMS_ERROR, "Invalid status");
        validateTagIds(item.getCategoryId(), tagIds);
        if (publishing) {
            ThrowUtils.throwIf(StringUtils.isBlank(item.getPromptContent()), ErrorCode.PARAMS_ERROR,
                    "Prompt is required before publishing");
            ThrowUtils.throwIf(StringUtils.isBlank(item.getPreviewVideoUrl()), ErrorCode.PARAMS_ERROR,
                    "Preview video is required before publishing");
            ThrowUtils.throwIf(StringUtils.isBlank(item.getSourceVideoUrl()), ErrorCode.PARAMS_ERROR,
                    "Original video is required before publishing");
            String cosHost = StringUtils.removeEnd(StringUtils.trimToEmpty(cosClientConfig.getHost()), "/");
            ThrowUtils.throwIf(StringUtils.isBlank(cosHost)
                    || !StringUtils.startsWith(item.getSourceVideoUrl(), cosHost + "/"),
                    ErrorCode.PARAMS_ERROR, "Original video must be uploaded to COS before publishing");
        }
    }

    private void validateTagIds(Long categoryId, List<Long> tagIds) {
        if (CollUtil.isEmpty(tagIds)) {
            return;
        }
        Set<Long> distinctIds = new LinkedHashSet<>(tagIds);
        List<Tag> tags = tagMapper.selectBatchIds(new ArrayList<>(distinctIds));
        ThrowUtils.throwIf(tags.size() != distinctIds.size(), ErrorCode.PARAMS_ERROR, "Tag does not exist");
        for (Long tagId : distinctIds) {
            Long count = categoryTagMapper.selectCount(new QueryWrapper<CategoryTag>()
                    .eq("categoryId", categoryId).eq("tagId", tagId));
            ThrowUtils.throwIf(count == null || count == 0, ErrorCode.PARAMS_ERROR,
                    "Tag is not bound to the selected category");
        }
    }

    private void saveTags(Long videoBackgroundId, List<Long> tagIds) {
        if (CollUtil.isEmpty(tagIds)) {
            return;
        }
        for (Long tagId : new LinkedHashSet<>(tagIds)) {
            VideoBackgroundTag relation = new VideoBackgroundTag();
            relation.setVideoBackgroundId(videoBackgroundId);
            relation.setTagId(tagId);
            videoBackgroundTagMapper.insert(relation);
        }
    }

    private List<Long> getTagIds(Long videoBackgroundId) {
        return videoBackgroundTagMapper.selectList(new QueryWrapper<VideoBackgroundTag>()
                .eq("videoBackgroundId", videoBackgroundId)).stream().map(VideoBackgroundTag::getTagId)
                .collect(Collectors.toList());
    }

    private List<Long> normalizeIds(List<Long> ids) {
        if (CollUtil.isEmpty(ids)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        List<Long> result = ids.stream().filter(id -> id != null && id > 0).distinct().collect(Collectors.toList());
        if (CollUtil.isEmpty(result)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return result;
    }

    private Long normalizeFavoriteVideoBackgroundId(VideoBackgroundFavoriteRequest request) {
        ThrowUtils.throwIf(request == null, ErrorCode.PARAMS_ERROR);
        Long videoBackgroundId = request.getVideoBackgroundId();
        if (videoBackgroundId == null || videoBackgroundId <= 0) {
            videoBackgroundId = request.getId();
        }
        ThrowUtils.throwIf(videoBackgroundId == null || videoBackgroundId <= 0, ErrorCode.PARAMS_ERROR);
        return videoBackgroundId;
    }

    private VideoBackgroundFavorite getFavoriteRecord(Long userId, Long videoBackgroundId) {
        return videoBackgroundFavoriteMapper.selectByUserAndVideoIncludingDeleted(userId, videoBackgroundId);
    }

    private boolean isFavoritedByUser(Long videoBackgroundId, Long userId) {
        if (userId == null || videoBackgroundId == null) {
            return false;
        }
        Long count = videoBackgroundFavoriteMapper.selectCount(new QueryWrapper<VideoBackgroundFavorite>()
                .eq("userId", userId).eq("videoBackgroundId", videoBackgroundId).eq("isDelete", 0));
        return count != null && count > 0;
    }

    private void fillFavoriteInfo(List<VideoBackgroundVO> records, Long userId) {
        if (CollUtil.isEmpty(records)) {
            return;
        }
        List<Long> videoBackgroundIds = records.stream().map(VideoBackgroundVO::getId)
                .filter(id -> id != null && id > 0).distinct().collect(Collectors.toList());
        if (CollUtil.isEmpty(videoBackgroundIds)) {
            return;
        }
        List<VideoBackgroundFavorite> favorites = videoBackgroundFavoriteMapper.selectList(
                new QueryWrapper<VideoBackgroundFavorite>().in("videoBackgroundId", videoBackgroundIds)
                        .eq("isDelete", 0));
        Map<Long, Long> countMap = favorites.stream().collect(Collectors.groupingBy(
                VideoBackgroundFavorite::getVideoBackgroundId, Collectors.counting()));
        Set<Long> myFavoriteIds = userId == null ? Collections.emptySet() : favorites.stream()
                .filter(item -> userId.equals(item.getUserId())).map(VideoBackgroundFavorite::getVideoBackgroundId)
                .collect(Collectors.toSet());
        for (VideoBackgroundVO record : records) {
            Long videoBackgroundId = record.getId();
            record.setFavoriteCount(countMap.getOrDefault(videoBackgroundId, 0L).intValue());
            record.setFavorited(myFavoriteIds.contains(videoBackgroundId));
        }
    }

    private VideoBackground getPublished(Long id) {
        ThrowUtils.throwIf(id == null || id <= 0, ErrorCode.PARAMS_ERROR);
        VideoBackground item = this.getById(id);
        ThrowUtils.throwIf(item == null || !ArtworkStatusEnum.PUBLISHED.getValue().equals(item.getStatus()),
                ErrorCode.NOT_FOUND_ERROR, "Video background not found");
        return item;
    }

    private boolean hasAccess(VideoBackground item, User loginUser) {
        if (item.getMemberOnly() == null || item.getMemberOnly() == 0) {
            return loginUser != null;
        }
        if (loginUser == null) {
            return false;
        }
        MemberLevelEnum level = MemberLevelEnum.getEnumByValue(loginUser.getMemberLevel());
        if (level == null || !level.canAccessMemberContent()) {
            return false;
        }
        Date expireTime = loginUser.getMemberExpireTime();
        return expireTime == null || expireTime.after(new Date());
    }
}
