package com.yupi.springbootinit.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.ArtworkAccessMapper;
import com.yupi.springbootinit.mapper.ArtworkFavoriteMapper;
import com.yupi.springbootinit.mapper.ArtworkMapper;
import com.yupi.springbootinit.mapper.ArtworkTagMapper;
import com.yupi.springbootinit.mapper.CategoryMapper;
import com.yupi.springbootinit.mapper.TagMapper;
import com.yupi.springbootinit.model.dto.artwork.ArtworkAddRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkFavoriteRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkUpdateRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.ArtworkAccess;
import com.yupi.springbootinit.model.entity.ArtworkFavorite;
import com.yupi.springbootinit.model.entity.ArtworkTag;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.entity.Tag;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.ArtworkStatusEnum;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.model.vo.TagVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkDetailVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkHomeOverviewVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkListVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.utils.SqlUtils;
import com.yupi.springbootinit.utils.ImageDimensionUtils;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Calendar;
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
import org.springframework.beans.BeanUtils;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ArtworkServiceImpl extends ServiceImpl<ArtworkMapper, Artwork> implements ArtworkService {

    @Resource
    private CategoryMapper categoryMapper;

    @Resource
    private TagMapper tagMapper;

    @Resource
    private ArtworkTagMapper artworkTagMapper;

    @Resource
    private ArtworkAccessMapper artworkAccessMapper;

    @Resource
    private ArtworkFavoriteMapper artworkFavoriteMapper;

    @Resource
    private UserService userService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public long addArtwork(ArtworkAddRequest artworkAddRequest, User loginUser) {
        ThrowUtils.throwIf(artworkAddRequest == null, ErrorCode.PARAMS_ERROR);
        Artwork artwork = new Artwork();
        BeanUtils.copyProperties(artworkAddRequest, artwork);
        fillArtworkImageDimensions(artwork);
        validateArtwork(artwork, artworkAddRequest.getTagIdList());
        artwork.setUserId(loginUser.getId());
        artwork.setViewCount(0);
        artwork.setSort(artwork.getSort() == null ? 0 : artwork.getSort());
        artwork.setStatus(artwork.getStatus() == null ? ArtworkStatusEnum.DRAFT.getValue() : artwork.getStatus());
        artwork.setMemberOnly(artwork.getMemberOnly() == null ? 0 : artwork.getMemberOnly());
        boolean result = this.save(artwork);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "作品创建失败");
        saveArtworkTags(artwork.getId(), artworkAddRequest.getTagIdList());
        return artwork.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateArtwork(ArtworkUpdateRequest artworkUpdateRequest, User loginUser) {
        ThrowUtils.throwIf(artworkUpdateRequest == null || artworkUpdateRequest.getId() == null, ErrorCode.PARAMS_ERROR);
        Artwork oldArtwork = this.getById(artworkUpdateRequest.getId());
        ThrowUtils.throwIf(oldArtwork == null, ErrorCode.NOT_FOUND_ERROR, "作品不存在");
        Artwork artwork = new Artwork();
        BeanUtils.copyProperties(artworkUpdateRequest, artwork);
        boolean coverChanged = StringUtils.isNotBlank(artwork.getCoverUrl())
                && !StringUtils.equals(artwork.getCoverUrl(), oldArtwork.getCoverUrl());
        boolean needsDimensions = coverChanged
                || oldArtwork.getImageWidth() == null || oldArtwork.getImageHeight() == null
                || oldArtwork.getImageWidth() <= 0 || oldArtwork.getImageHeight() <= 0;
        boolean dimensionsResolved = !needsDimensions || fillArtworkImageDimensions(artwork);
        validateArtwork(artwork, artworkUpdateRequest.getTagIdList());
        boolean result = this.updateById(artwork);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "作品更新失败");
        if (coverChanged && !dimensionsResolved) {
            this.lambdaUpdate().eq(Artwork::getId, artwork.getId())
                    .set(Artwork::getImageWidth, null)
                    .set(Artwork::getImageHeight, null)
                    .update();
        }
        artworkTagMapper.delete(new QueryWrapper<ArtworkTag>().eq("artworkId", artwork.getId()));
        saveArtworkTags(artwork.getId(), artworkUpdateRequest.getTagIdList());
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteArtwork(long id) {
        ThrowUtils.throwIf(id <= 0, ErrorCode.PARAMS_ERROR);
        boolean result = this.removeById(id);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "作品删除失败");
        artworkTagMapper.delete(new QueryWrapper<ArtworkTag>().eq("artworkId", id));
        return true;
    }

    @Override
    public Page<ArtworkVO> listArtworkVOByPage(ArtworkQueryRequest artworkQueryRequest, User loginUser, boolean adminView) {
        ArtworkQueryRequest safeRequest = artworkQueryRequest == null ? new ArtworkQueryRequest() : artworkQueryRequest;
        QueryWrapper<Artwork> queryWrapper = buildArtworkQueryWrapper(safeRequest, adminView);
        if (queryWrapper == null) {
            return new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(), 0);
        }
        Page<Artwork> artworkPage = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), queryWrapper);
        Page<ArtworkVO> artworkVOPage = new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(),
                artworkPage.getTotal());
        artworkVOPage.setRecords(buildArtworkVOList(artworkPage.getRecords(), loginUser));
        return artworkVOPage;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean addFavorite(ArtworkFavoriteRequest request, User loginUser) {
        Long artworkId = normalizeFavoriteArtworkId(request);
        getPublishedArtwork(artworkId);
        Date now = new Date();

        ArtworkFavorite existing = getFavoriteRecord(loginUser.getId(), artworkId);
        if (existing != null) {
            if (existing.getIsDelete() == null || existing.getIsDelete() == 0) {
                return true;
            }
            boolean restored = artworkFavoriteMapper.restoreByUserAndArtwork(loginUser.getId(), artworkId) > 0;
            ThrowUtils.throwIf(!restored, ErrorCode.OPERATION_ERROR);
            return true;
        }

        ArtworkFavorite favorite = new ArtworkFavorite();
        favorite.setUserId(loginUser.getId());
        favorite.setArtworkId(artworkId);
        favorite.setCreateTime(now);
        favorite.setUpdateTime(now);
        favorite.setIsDelete(0);
        boolean result;
        try {
            result = artworkFavoriteMapper.insert(favorite) > 0;
        } catch (DuplicateKeyException e) {
            result = artworkFavoriteMapper.restoreByUserAndArtwork(loginUser.getId(), artworkId) > 0;
        }
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean cancelFavorite(ArtworkFavoriteRequest request, User loginUser) {
        Long artworkId = normalizeFavoriteArtworkIdForCancel(request);
        artworkFavoriteMapper.update(null, new UpdateWrapper<ArtworkFavorite>()
                .eq("userId", loginUser.getId())
                .eq("artworkId", artworkId)
                .eq("isDelete", 0)
                .set("isDelete", 1)
                .set("updateTime", new Date()));
        return true;
    }

    @Override
    public Boolean isFavorited(Long artworkId, User loginUser) {
        if (artworkId == null || artworkId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return isFavoritedByUser(artworkId, loginUser.getId());
    }

    @Override
    public Page<ArtworkListVO> listMyFavoriteArtworkVOByPage(ArtworkQueryRequest request, User loginUser) {
        ArtworkQueryRequest safeRequest = request == null ? new ArtworkQueryRequest() : request;
        long current = Math.max(safeRequest.getCurrent(), 1);
        long pageSize = Math.min(Math.max(safeRequest.getPageSize(), 1), 50);
        QueryWrapper<Artwork> queryWrapper = buildArtworkQueryWrapper(safeRequest, false);
        if (queryWrapper == null) {
            return new Page<>(current, pageSize, 0);
        }
        queryWrapper.inSql("id", "SELECT artworkId FROM artwork_favorite WHERE userId = "
                + loginUser.getId() + " AND isDelete = 0");
        Page<Artwork> page = this.page(new Page<>(current, pageSize), queryWrapper);
        Page<ArtworkListVO> voPage = new Page<>(current, pageSize, page.getTotal());
        voPage.setRecords(toArtworkListVOList(buildArtworkVOList(page.getRecords(), loginUser)));
        return voPage;
    }

    @Override
    public ArtworkHomeOverviewVO getHomeOverview(User loginUser) {
        Date recentThreeDaysStart = getRecentThreeDaysStart();
        QueryWrapper<Artwork> publishedWrapper = new QueryWrapper<Artwork>()
                .eq("status", ArtworkStatusEnum.PUBLISHED.getValue())
                .eq("isDelete", 0);
        QueryWrapper<Artwork> recentWrapper = new QueryWrapper<Artwork>()
                .eq("status", ArtworkStatusEnum.PUBLISHED.getValue())
                .eq("isDelete", 0)
                .ge("updateTime", recentThreeDaysStart)
                .orderByDesc("updateTime", "id");

        List<ArtworkListVO> recentItems = toArtworkListVOList(buildArtworkVOList(this.list(recentWrapper), loginUser));

        ArtworkHomeOverviewVO overview = new ArtworkHomeOverviewVO();
        overview.setTotalCount(this.count(publishedWrapper));
        overview.setRecentThreeDaysCount((long) recentItems.size());
        overview.setRecentItems(recentItems);
        return overview;
    }

    private Date getRecentThreeDaysStart() {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        calendar.add(Calendar.DATE, -2);
        return calendar.getTime();
    }

    private QueryWrapper<Artwork> buildArtworkQueryWrapper(ArtworkQueryRequest safeRequest, boolean adminView) {
        QueryWrapper<Artwork> queryWrapper = new QueryWrapper<>();
        if (!adminView) {
            queryWrapper.eq("status", ArtworkStatusEnum.PUBLISHED.getValue());
        } else if (safeRequest.getStatus() != null) {
            queryWrapper.eq("status", safeRequest.getStatus());
        }
        queryWrapper.eq(safeRequest.getCategoryId() != null, "categoryId", safeRequest.getCategoryId());
        queryWrapper.eq(safeRequest.getMemberOnly() != null, "memberOnly", safeRequest.getMemberOnly());
        if (StringUtils.isNotBlank(safeRequest.getSearchText())) {
            queryWrapper.and(wrapper -> wrapper.like("title", safeRequest.getSearchText())
                    .or()
                    .like("summary", safeRequest.getSearchText())
                    .or()
                    .like("description", safeRequest.getSearchText()));
        }
        if (CollUtil.isNotEmpty(safeRequest.getTagIdList())) {
            List<ArtworkTag> artworkTagList = artworkTagMapper.selectList(
                    new QueryWrapper<ArtworkTag>().in("tagId", safeRequest.getTagIdList()));
            if (CollUtil.isEmpty(artworkTagList)) {
                return null;
            }
            List<Long> artworkIdList = artworkTagList.stream().map(ArtworkTag::getArtworkId).distinct()
                    .collect(Collectors.toList());
            queryWrapper.in("id", artworkIdList);
        }
        if (StringUtils.isNotBlank(safeRequest.getTagName())) {
            List<Tag> tagList = tagMapper.selectList(
                    new QueryWrapper<Tag>().like("name", safeRequest.getTagName()));
            if (CollUtil.isEmpty(tagList)) {
                return null;
            }
            List<Long> tagIdList = tagList.stream().map(Tag::getId).collect(Collectors.toList());
            List<ArtworkTag> artworkTagList = artworkTagMapper.selectList(
                    new QueryWrapper<ArtworkTag>().in("tagId", tagIdList));
            if (CollUtil.isEmpty(artworkTagList)) {
                return null;
            }
            List<Long> artworkIdList = artworkTagList.stream().map(ArtworkTag::getArtworkId).distinct()
                    .collect(Collectors.toList());
            queryWrapper.in("id", artworkIdList);
        }
        String sortField = safeRequest.getSortField();
        String sortOrder = safeRequest.getSortOrder();
        queryWrapper.orderBy(SqlUtils.validSortField(sortField),
                CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
        queryWrapper.orderByDesc("sort", "id");
        return queryWrapper;
    }

    @Override
    public ArtworkDetailVO getArtworkDetail(Long artworkId, User loginUser, boolean adminView) {
        ThrowUtils.throwIf(artworkId == null || artworkId <= 0, ErrorCode.PARAMS_ERROR);
        Artwork artwork = this.getById(artworkId);
        ThrowUtils.throwIf(artwork == null, ErrorCode.NOT_FOUND_ERROR, "作品不存在");
        if (!adminView && !ArtworkStatusEnum.PUBLISHED.getValue().equals(artwork.getStatus())) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "作品未发布");
        }
        ArtworkDetailVO artworkDetailVO = new ArtworkDetailVO();
        BeanUtils.copyProperties(buildArtworkVO(artwork, loginUser), artworkDetailVO);
        artworkDetailVO.setDescription(artwork.getDescription());
        boolean canAccess = Boolean.TRUE.equals(artworkDetailVO.getCanAccessPrompt());
        artworkDetailVO.setPromptContent(canAccess ? artwork.getPromptContent() : null);
        artworkDetailVO.setAccessReason(resolveAccessReason(artwork, loginUser, canAccess));
        this.lambdaUpdate().eq(Artwork::getId, artworkId)
                .setSql("viewCount = IFNULL(viewCount, 0) + 1")
                .update();
        return artworkDetailVO;
    }

    @Override
    public String getArtworkPromptContent(Long artworkId, User loginUser) {
        ThrowUtils.throwIf(artworkId == null || artworkId <= 0, ErrorCode.PARAMS_ERROR);
        Artwork artwork = this.getById(artworkId);
        ThrowUtils.throwIf(artwork == null, ErrorCode.NOT_FOUND_ERROR, "作品不存在");
        ThrowUtils.throwIf(!ArtworkStatusEnum.PUBLISHED.getValue().equals(artwork.getStatus()),
                ErrorCode.NO_AUTH_ERROR, "作品未发布");
        ThrowUtils.throwIf(!hasArtworkAccess(artworkId, loginUser), ErrorCode.NO_AUTH_ERROR,
                "当前作品仅会员可查看");
        this.lambdaUpdate().eq(Artwork::getId, artworkId)
                .setSql("viewCount = IFNULL(viewCount, 0) + 1")
                .update();
        return artwork.getPromptContent();
    }

    @Override
    public boolean hasArtworkAccess(Long artworkId, User loginUser) {
        if (artworkId == null) {
            return false;
        }
        Artwork artwork = this.getById(artworkId);
        if (artwork == null) {
            return false;
        }
        if (artwork.getMemberOnly() == null || artwork.getMemberOnly() == 0) {
            return true;
        }
        if (loginUser == null) {
            return false;
        }
        if (userService.isAdmin(loginUser)) {
            return true;
        }
        return hasMemberAccess(artwork, loginUser);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void grantArtworkAccess(Long artworkId, Long userId, Long orderId, String accessType) {
        Long count = artworkAccessMapper.selectCount(new QueryWrapper<ArtworkAccess>()
                .eq("artworkId", artworkId)
                .eq("userId", userId));
        if (count != null && count > 0) {
            return;
        }
        ArtworkAccess artworkAccess = new ArtworkAccess();
        artworkAccess.setArtworkId(artworkId);
        artworkAccess.setUserId(userId);
        artworkAccess.setOrderId(orderId);
        artworkAccess.setAccessType(accessType);
        artworkAccessMapper.insert(artworkAccess);
    }

    private void validateArtwork(Artwork artwork, List<Long> tagIdList) {
        ThrowUtils.throwIf(artwork == null, ErrorCode.PARAMS_ERROR);
        ThrowUtils.throwIf(StringUtils.isBlank(artwork.getTitle()), ErrorCode.PARAMS_ERROR, "作品标题不能为空");
        ThrowUtils.throwIf(StringUtils.length(artwork.getTitle()) > 128, ErrorCode.PARAMS_ERROR, "作品标题过长");
        ThrowUtils.throwIf(artwork.getCategoryId() == null, ErrorCode.PARAMS_ERROR, "分类不能为空");
        Category category = categoryMapper.selectById(artwork.getCategoryId());
        ThrowUtils.throwIf(category == null, ErrorCode.PARAMS_ERROR, "分类不存在");
        if (artwork.getCashPrice() != null) {
            ThrowUtils.throwIf(artwork.getCashPrice().compareTo(BigDecimal.ZERO) < 0, ErrorCode.PARAMS_ERROR,
                    "现金价格不能小于 0");
        }
        if (artwork.getPointsPrice() != null) {
            ThrowUtils.throwIf(artwork.getPointsPrice() < 0, ErrorCode.PARAMS_ERROR, "积分价格不能小于 0");
        }
        if (CollUtil.isNotEmpty(tagIdList)) {
            Set<Long> distinctTagIds = new LinkedHashSet<>(tagIdList);
            List<Tag> tagList = tagMapper.selectBatchIds(distinctTagIds);
            ThrowUtils.throwIf(tagList.size() != distinctTagIds.size(), ErrorCode.PARAMS_ERROR, "标签不存在");
        }
    }

    private void saveArtworkTags(Long artworkId, List<Long> tagIdList) {
        if (artworkId == null || CollUtil.isEmpty(tagIdList)) {
            return;
        }
        Set<Long> distinctTagIds = new LinkedHashSet<>(tagIdList);
        for (Long tagId : distinctTagIds) {
            ArtworkTag artworkTag = new ArtworkTag();
            artworkTag.setArtworkId(artworkId);
            artworkTag.setTagId(tagId);
            artworkTagMapper.insert(artworkTag);
        }
    }

    private List<ArtworkVO> buildArtworkVOList(List<Artwork> artworkList, User loginUser) {
        if (CollUtil.isEmpty(artworkList)) {
            return new ArrayList<>();
        }
        List<Long> categoryIds = artworkList.stream().map(Artwork::getCategoryId).distinct().collect(Collectors.toList());
        List<Long> artworkIds = artworkList.stream().map(Artwork::getId).collect(Collectors.toList());
        Map<Long, CategoryVO> categoryMap = buildCategoryMap(categoryIds);
        Map<Long, List<TagVO>> artworkTagMap = buildArtworkTagMap(artworkIds);
        Map<Long, Boolean> accessMap = buildAccessMap(artworkList, loginUser);
        List<ArtworkVO> artworkVOList = artworkList.stream().map(artwork -> {
            ArtworkVO artworkVO = new ArtworkVO();
            BeanUtils.copyProperties(artwork, artworkVO);
            fillArtworkAspectRatio(artworkVO);
            artworkVO.setCategory(categoryMap.get(artwork.getCategoryId()));
            artworkVO.setTagList(artworkTagMap.getOrDefault(artwork.getId(), Collections.emptyList()));
            artworkVO.setCanAccessPrompt(accessMap.getOrDefault(artwork.getId(), false));
            return artworkVO;
        }).collect(Collectors.toList());
        fillFavoriteInfo(artworkVOList, loginUser == null ? null : loginUser.getId());
        return artworkVOList;
    }

    private List<ArtworkListVO> toArtworkListVOList(List<ArtworkVO> artworkVOList) {
        if (CollUtil.isEmpty(artworkVOList)) {
            return new ArrayList<>();
        }
        return artworkVOList.stream().map(artworkVO -> {
            ArtworkListVO item = new ArtworkListVO();
            item.setId(artworkVO.getId());
            item.setTitle(artworkVO.getTitle());
            item.setCoverUrl(artworkVO.getCoverUrl());
            item.setVideoUrl(artworkVO.getVideoUrl());
            item.setImageWidth(artworkVO.getImageWidth());
            item.setImageHeight(artworkVO.getImageHeight());
            item.setImageAspectRatio(artworkVO.getImageAspectRatio());
            item.setMemberOnly(artworkVO.getMemberOnly());
            item.setCanAccess(artworkVO.getCanAccessPrompt());
            item.setFavorited(artworkVO.getFavorited());
            item.setFavoriteCount(artworkVO.getFavoriteCount());
            return item;
        }).collect(Collectors.toList());
    }

    private ArtworkVO buildArtworkVO(Artwork artwork, User loginUser) {
        List<ArtworkVO> artworkVOList = buildArtworkVOList(Collections.singletonList(artwork), loginUser);
        return artworkVOList.isEmpty() ? null : artworkVOList.get(0);
    }

    private Map<Long, CategoryVO> buildCategoryMap(List<Long> categoryIds) {
        if (CollUtil.isEmpty(categoryIds)) {
            return new HashMap<>();
        }
        return categoryMapper.selectBatchIds(categoryIds).stream().collect(Collectors.toMap(Category::getId, category -> {
            CategoryVO categoryVO = new CategoryVO();
            BeanUtils.copyProperties(category, categoryVO);
            return categoryVO;
        }));
    }

    private Map<Long, List<TagVO>> buildArtworkTagMap(List<Long> artworkIds) {
        if (CollUtil.isEmpty(artworkIds)) {
            return new HashMap<>();
        }
        List<ArtworkTag> artworkTagList = artworkTagMapper.selectList(new QueryWrapper<ArtworkTag>().in("artworkId", artworkIds));
        if (CollUtil.isEmpty(artworkTagList)) {
            return new HashMap<>();
        }
        List<Long> tagIds = artworkTagList.stream().map(ArtworkTag::getTagId).distinct().collect(Collectors.toList());
        Map<Long, TagVO> tagMap = tagMapper.selectBatchIds(tagIds).stream().collect(Collectors.toMap(Tag::getId, tag -> {
            TagVO tagVO = new TagVO();
            BeanUtils.copyProperties(tag, tagVO);
            return tagVO;
        }));
        Map<Long, List<TagVO>> resultMap = new HashMap<>();
        for (ArtworkTag artworkTag : artworkTagList) {
            resultMap.computeIfAbsent(artworkTag.getArtworkId(), key -> new ArrayList<>());
            TagVO tagVO = tagMap.get(artworkTag.getTagId());
            if (tagVO != null) {
                resultMap.get(artworkTag.getArtworkId()).add(tagVO);
            }
        }
        return resultMap;
    }

    private boolean fillArtworkImageDimensions(Artwork artwork) {
        if (artwork == null || StringUtils.isBlank(artwork.getCoverUrl())) {
            return false;
        }
        try {
            int[] dimensions = ImageDimensionUtils.readFromUrl(artwork.getCoverUrl());
            if (dimensions == null) {
                return false;
            }
            artwork.setImageWidth(dimensions[0]);
            artwork.setImageHeight(dimensions[1]);
            return true;
        } catch (Exception e) {
            log.warn("Unable to read artwork cover dimensions, url={}", artwork.getCoverUrl(), e);
            return false;
        }
    }

    private void fillArtworkAspectRatio(ArtworkVO artworkVO) {
        if (artworkVO == null || artworkVO.getImageWidth() == null || artworkVO.getImageHeight() == null
                || artworkVO.getImageWidth() <= 0 || artworkVO.getImageHeight() <= 0) {
            return;
        }
        artworkVO.setImageAspectRatio(
                artworkVO.getImageWidth().doubleValue() / artworkVO.getImageHeight().doubleValue());
    }

    private Long normalizeFavoriteArtworkId(ArtworkFavoriteRequest request) {
        if (request == null || request.getArtworkId() == null || request.getArtworkId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return request.getArtworkId();
    }

    private Long normalizeFavoriteArtworkIdForCancel(ArtworkFavoriteRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Long artworkId = request.getArtworkId() != null ? request.getArtworkId() : request.getId();
        if (artworkId == null || artworkId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return artworkId;
    }

    private ArtworkFavorite getFavoriteRecord(Long userId, Long artworkId) {
        return artworkFavoriteMapper.selectByUserAndArtworkIncludingDeleted(userId, artworkId);
    }

    private boolean isFavoritedByUser(Long artworkId, Long userId) {
        if (userId == null || artworkId == null) {
            return false;
        }
        Long count = artworkFavoriteMapper.selectCount(new QueryWrapper<ArtworkFavorite>()
                .eq("userId", userId)
                .eq("artworkId", artworkId)
                .eq("isDelete", 0));
        return count != null && count > 0;
    }

    private void fillFavoriteInfo(List<ArtworkVO> records, Long userId) {
        if (CollUtil.isEmpty(records)) {
            return;
        }
        List<Long> artworkIds = records.stream()
                .map(ArtworkVO::getId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .collect(Collectors.toList());
        if (CollUtil.isEmpty(artworkIds)) {
            return;
        }
        List<ArtworkFavorite> favoriteList = artworkFavoriteMapper.selectList(
                new QueryWrapper<ArtworkFavorite>()
                        .in("artworkId", artworkIds)
                        .eq("isDelete", 0));
        Map<Long, Long> countMap = favoriteList.stream().collect(Collectors.groupingBy(
                ArtworkFavorite::getArtworkId,
                Collectors.counting()));
        Set<Long> myFavoriteIds = userId == null ? Collections.emptySet() : favoriteList.stream()
                .filter(item -> userId.equals(item.getUserId()))
                .map(ArtworkFavorite::getArtworkId)
                .collect(Collectors.toSet());
        for (ArtworkVO record : records) {
            Long artworkId = record.getId();
            record.setFavoriteCount(countMap.getOrDefault(artworkId, 0L).intValue());
            record.setFavorited(myFavoriteIds.contains(artworkId));
        }
    }

    private Artwork getPublishedArtwork(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Artwork artwork = this.getOne(new QueryWrapper<Artwork>()
                .eq("id", id)
                .eq("status", ArtworkStatusEnum.PUBLISHED.getValue())
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        if (artwork == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR, "Artwork not found");
        }
        return artwork;
    }

    private Map<Long, Boolean> buildAccessMap(List<Artwork> artworkList, User loginUser) {
        Map<Long, Boolean> resultMap = new HashMap<>();
        if (CollUtil.isEmpty(artworkList)) {
            return resultMap;
        }
        if (loginUser != null && userService.isAdmin(loginUser)) {
            artworkList.forEach(artwork -> resultMap.put(artwork.getId(), true));
            return resultMap;
        }
        for (Artwork artwork : artworkList) {
            boolean canAccess = artwork.getMemberOnly() == null || artwork.getMemberOnly() == 0
                    || (loginUser != null && hasMemberAccess(artwork, loginUser));
            resultMap.put(artwork.getId(), canAccess);
        }
        return resultMap;
    }

    private boolean hasMemberAccess(Artwork artwork, User loginUser) {
        if (loginUser == null || artwork.getMemberOnly() == null || artwork.getMemberOnly() == 0) {
            return false;
        }
        MemberLevelEnum memberLevelEnum = MemberLevelEnum.getEnumByValue(loginUser.getMemberLevel());
        if (memberLevelEnum == null || !memberLevelEnum.canAccessMemberContent()) {
            return false;
        }
        Date memberExpireTime = loginUser.getMemberExpireTime();
        return memberExpireTime == null || memberExpireTime.after(new Date());
    }

    private String resolveAccessReason(Artwork artwork, User loginUser, boolean canAccess) {
        if (canAccess) {
            return artwork.getMemberOnly() != null && artwork.getMemberOnly() == 1 ? "member" : "public";
        }
        return "member_required";
    }
}
