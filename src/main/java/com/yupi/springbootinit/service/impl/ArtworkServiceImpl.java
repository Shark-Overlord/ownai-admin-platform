package com.yupi.springbootinit.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.ArtworkAccessMapper;
import com.yupi.springbootinit.mapper.ArtworkMapper;
import com.yupi.springbootinit.mapper.ArtworkTagMapper;
import com.yupi.springbootinit.mapper.CategoryMapper;
import com.yupi.springbootinit.mapper.TagMapper;
import com.yupi.springbootinit.model.dto.artwork.ArtworkAddRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkUpdateRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.ArtworkAccess;
import com.yupi.springbootinit.model.entity.ArtworkTag;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.entity.Tag;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.ArtworkStatusEnum;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.model.vo.TagVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkDetailVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.utils.SqlUtils;
import java.math.BigDecimal;
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
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
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
    private UserService userService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public long addArtwork(ArtworkAddRequest artworkAddRequest, User loginUser) {
        ThrowUtils.throwIf(artworkAddRequest == null, ErrorCode.PARAMS_ERROR);
        Artwork artwork = new Artwork();
        BeanUtils.copyProperties(artworkAddRequest, artwork);
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
        validateArtwork(artwork, artworkUpdateRequest.getTagIdList());
        boolean result = this.updateById(artwork);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "作品更新失败");
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
                return new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(), 0);
            }
            List<Long> artworkIdList = artworkTagList.stream().map(ArtworkTag::getArtworkId).distinct()
                    .collect(Collectors.toList());
            queryWrapper.in("id", artworkIdList);
        }
        if (StringUtils.isNotBlank(safeRequest.getTagName())) {
            List<Tag> tagList = tagMapper.selectList(
                    new QueryWrapper<Tag>().like("name", safeRequest.getTagName()));
            if (CollUtil.isEmpty(tagList)) {
                return new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(), 0);
            }
            List<Long> tagIdList = tagList.stream().map(Tag::getId).collect(Collectors.toList());
            List<ArtworkTag> artworkTagList = artworkTagMapper.selectList(
                    new QueryWrapper<ArtworkTag>().in("tagId", tagIdList));
            if (CollUtil.isEmpty(artworkTagList)) {
                return new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(), 0);
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
        Page<Artwork> artworkPage = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), queryWrapper);
        Page<ArtworkVO> artworkVOPage = new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(),
                artworkPage.getTotal());
        artworkVOPage.setRecords(buildArtworkVOList(artworkPage.getRecords(), loginUser));
        return artworkVOPage;
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
    public boolean hasArtworkAccess(Long artworkId, User loginUser) {
        if (artworkId == null) {
            return false;
        }
        Artwork artwork = this.getById(artworkId);
        if (artwork == null) {
            return false;
        }
        if (isFreeArtwork(artwork)) {
            return true;
        }
        if (loginUser == null) {
            return false;
        }
        if (userService.isAdmin(loginUser)) {
            return true;
        }
        if (hasMemberAccess(artwork, loginUser)) {
            return true;
        }
        Long count = artworkAccessMapper.selectCount(new QueryWrapper<ArtworkAccess>()
                .eq("artworkId", artworkId)
                .eq("userId", loginUser.getId()));
        return count != null && count > 0;
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
        return artworkList.stream().map(artwork -> {
            ArtworkVO artworkVO = new ArtworkVO();
            BeanUtils.copyProperties(artwork, artworkVO);
            artworkVO.setCategory(categoryMap.get(artwork.getCategoryId()));
            artworkVO.setTagList(artworkTagMap.getOrDefault(artwork.getId(), Collections.emptyList()));
            artworkVO.setCanAccessPrompt(accessMap.getOrDefault(artwork.getId(), false));
            return artworkVO;
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

    private Map<Long, Boolean> buildAccessMap(List<Artwork> artworkList, User loginUser) {
        Map<Long, Boolean> resultMap = new HashMap<>();
        if (CollUtil.isEmpty(artworkList)) {
            return resultMap;
        }
        if (loginUser != null && userService.isAdmin(loginUser)) {
            artworkList.forEach(artwork -> resultMap.put(artwork.getId(), true));
            return resultMap;
        }
        Map<Long, Boolean> paidAccessMap = new HashMap<>();
        if (loginUser != null) {
            List<Long> artworkIds = artworkList.stream().map(Artwork::getId).collect(Collectors.toList());
            List<ArtworkAccess> artworkAccessList = artworkAccessMapper.selectList(new QueryWrapper<ArtworkAccess>()
                    .eq("userId", loginUser.getId())
                    .in("artworkId", artworkIds));
            artworkAccessList.forEach(item -> paidAccessMap.put(item.getArtworkId(), true));
        }
        for (Artwork artwork : artworkList) {
            boolean canAccess = isFreeArtwork(artwork)
                    || (loginUser != null && (paidAccessMap.getOrDefault(artwork.getId(), false)
                    || hasMemberAccess(artwork, loginUser)));
            resultMap.put(artwork.getId(), canAccess);
        }
        return resultMap;
    }

    private boolean isFreeArtwork(Artwork artwork) {
        boolean noCashPrice = artwork.getCashPrice() == null || artwork.getCashPrice().compareTo(BigDecimal.ZERO) <= 0;
        boolean noPointsPrice = artwork.getPointsPrice() == null || artwork.getPointsPrice() <= 0;
        return artwork.getMemberOnly() != null && artwork.getMemberOnly() == 0 && noCashPrice && noPointsPrice;
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
            if (isFreeArtwork(artwork)) {
                return "free";
            }
            if (hasMemberAccess(artwork, loginUser)) {
                return "member";
            }
            return "purchased";
        }
        if (artwork.getMemberOnly() != null && artwork.getMemberOnly() == 1) {
            return "member_or_purchase_required";
        }
        return "purchase_required";
    }
}
