package com.yupi.springbootinit.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.ArtworkMapper;
import com.yupi.springbootinit.mapper.DeconstructionAssetFavoriteMapper;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteAddRequest;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteCancelRequest;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteQueryRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.DeconstructionAssetFavorite;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.DeconstructionAssetFavoriteVO;
import com.yupi.springbootinit.service.DeconstructionAssetFavoriteService;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 解构资产收藏服务实现
 */
@Service
@Slf4j
public class DeconstructionAssetFavoriteServiceImpl
        extends ServiceImpl<DeconstructionAssetFavoriteMapper, DeconstructionAssetFavorite>
        implements DeconstructionAssetFavoriteService {

    private static final Set<String> SUPPORTED_ASSET_TYPES = Set.of("prompt", "component", "icon");

    @Resource
    private DeconstructionAssetFavoriteMapper favoriteMapper;

    @Resource
    private ArtworkMapper artworkMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean addFavorite(DeconstructionAssetFavoriteAddRequest request, User loginUser) {
        ThrowUtils.throwIf(loginUser == null, ErrorCode.NOT_LOGIN_ERROR);
        validateAddRequest(request);

        Long userId = loginUser.getId();
        Long artworkId = request.getArtworkId();
        String assetType = request.getAssetType().trim().toLowerCase();
        String assetKey = request.getAssetKey().trim();

        // 校验作品是否存在
        Artwork artwork = artworkMapper.selectById(artworkId);
        ThrowUtils.throwIf(artwork == null || Integer.valueOf(1).equals(artwork.getIsDelete()),
                ErrorCode.NOT_FOUND_ERROR, "作品不存在");

        DeconstructionAssetFavorite existing = favoriteMapper.selectIncludingDeleted(userId, artworkId, assetType, assetKey);
        if (existing != null) {
            if (Integer.valueOf(0).equals(existing.getIsDelete())) {
                // 已收藏，幂等返回 true
                return true;
            }
            // 恢复已删除的记录并更新最新数据
            existing.setTitle(StringUtils.defaultString(request.getTitle()));
            existing.setTag(StringUtils.defaultString(request.getTag()));
            existing.setDescription(request.getDescription());
            existing.setContent(request.getContent());
            existing.setMetaData(request.getMetaData());
            existing.setIsDelete(0);
            existing.setUpdateTime(new Date());
            return favoriteMapper.updateById(existing) > 0;
        }

        // 插入新记录
        DeconstructionAssetFavorite favorite = new DeconstructionAssetFavorite();
        favorite.setUserId(userId);
        favorite.setArtworkId(artworkId);
        favorite.setAssetType(assetType);
        favorite.setAssetKey(assetKey);
        favorite.setTitle(StringUtils.defaultString(request.getTitle()));
        favorite.setTag(StringUtils.defaultString(request.getTag()));
        favorite.setDescription(request.getDescription());
        favorite.setContent(request.getContent());
        favorite.setMetaData(request.getMetaData());
        favorite.setCreateTime(new Date());
        favorite.setUpdateTime(new Date());
        favorite.setIsDelete(0);
        return favoriteMapper.insert(favorite) > 0;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean cancelFavorite(DeconstructionAssetFavoriteCancelRequest request, User loginUser) {
        ThrowUtils.throwIf(loginUser == null, ErrorCode.NOT_LOGIN_ERROR);
        if (request == null || request.getArtworkId() == null || request.getArtworkId() <= 0
                || StringUtils.isBlank(request.getAssetType()) || StringUtils.isBlank(request.getAssetKey())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "缺少取消收藏参数");
        }

        String assetType = request.getAssetType().trim().toLowerCase();
        String assetKey = request.getAssetKey().trim();

        UpdateWrapper<DeconstructionAssetFavorite> updateWrapper = new UpdateWrapper<>();
        updateWrapper.eq("userId", loginUser.getId())
                .eq("artworkId", request.getArtworkId())
                .eq("assetType", assetType)
                .eq("assetKey", assetKey)
                .eq("isDelete", 0)
                .set("isDelete", 1)
                .set("updateTime", new Date());
        favoriteMapper.update(null, updateWrapper);
        return true;
    }

    @Override
    public List<String> listFavoritedKeys(Long artworkId, User loginUser) {
        if (loginUser == null || artworkId == null || artworkId <= 0) {
            return Collections.emptyList();
        }
        QueryWrapper<DeconstructionAssetFavorite> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("assetType", "assetKey")
                .eq("userId", loginUser.getId())
                .eq("artworkId", artworkId)
                .eq("isDelete", 0);
        List<DeconstructionAssetFavorite> list = favoriteMapper.selectList(queryWrapper);
        if (CollUtil.isEmpty(list)) {
            return Collections.emptyList();
        }
        return list.stream()
                .map(item -> item.getAssetType() + ":" + item.getAssetKey())
                .collect(Collectors.toList());
    }

    @Override
    public Page<DeconstructionAssetFavoriteVO> listMyFavoritesByPage(
            DeconstructionAssetFavoriteQueryRequest request, User loginUser) {
        ThrowUtils.throwIf(loginUser == null, ErrorCode.NOT_LOGIN_ERROR);
        long current = request == null ? 1 : Math.max(1, request.getCurrent());
        long pageSize = request == null ? 20 : Math.min(100, Math.max(1, request.getPageSize()));

        QueryWrapper<DeconstructionAssetFavorite> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("userId", loginUser.getId()).eq("isDelete", 0);

        if (request != null) {
            if (request.getArtworkId() != null && request.getArtworkId() > 0) {
                queryWrapper.eq("artworkId", request.getArtworkId());
            }
            if (StringUtils.isNotBlank(request.getAssetType())) {
                queryWrapper.eq("assetType", request.getAssetType().trim().toLowerCase());
            }
            String searchText = StringUtils.trimToNull(request.getSearchText());
            if (StringUtils.isNotBlank(searchText)) {
                queryWrapper.and(wrapper -> wrapper.like("title", searchText)
                        .or().like("tag", searchText)
                        .or().like("description", searchText)
                        .or().like("content", searchText));
            }
        }
        queryWrapper.orderByDesc("updateTime", "id");

        Page<DeconstructionAssetFavorite> entityPage = favoriteMapper.selectPage(new Page<>(current, pageSize), queryWrapper);
        Page<DeconstructionAssetFavoriteVO> voPage = new Page<>(current, pageSize, entityPage.getTotal());
        List<DeconstructionAssetFavorite> records = entityPage.getRecords();
        if (CollUtil.isEmpty(records)) {
            voPage.setRecords(Collections.emptyList());
            return voPage;
        }

        // 批量查询并关联作品标题
        Set<Long> artworkIds = records.stream().map(DeconstructionAssetFavorite::getArtworkId).collect(Collectors.toSet());
        Map<Long, String> artworkTitleMap = Collections.emptyMap();
        if (CollUtil.isNotEmpty(artworkIds)) {
            List<Artwork> artworks = artworkMapper.selectBatchIds(artworkIds);
            artworkTitleMap = artworks.stream()
                    .collect(Collectors.toMap(Artwork::getId, a -> StringUtils.defaultString(a.getTitle())));
        }

        Map<Long, String> finalTitleMap = artworkTitleMap;
        List<DeconstructionAssetFavoriteVO> voList = records.stream().map(record -> {
            DeconstructionAssetFavoriteVO vo = new DeconstructionAssetFavoriteVO();
            BeanUtils.copyProperties(record, vo);
            vo.setArtworkTitle(finalTitleMap.getOrDefault(record.getArtworkId(), ""));
            return vo;
        }).collect(Collectors.toList());

        voPage.setRecords(voList);
        return voPage;
    }

    @Override
    public List<DeconstructionAssetFavorite> listFavoritesForMcp(
            Long userId, String assetType, String keyword, int limit) {
        if (userId == null || userId <= 0) {
            return Collections.emptyList();
        }
        int safeLimit = Math.min(Math.max(1, limit), 50);
        QueryWrapper<DeconstructionAssetFavorite> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("userId", userId).eq("isDelete", 0);
        if (StringUtils.isNotBlank(assetType) && SUPPORTED_ASSET_TYPES.contains(assetType.trim().toLowerCase())) {
            queryWrapper.eq("assetType", assetType.trim().toLowerCase());
        }
        String cleanKeyword = StringUtils.trimToNull(keyword);
        if (StringUtils.isNotBlank(cleanKeyword)) {
            queryWrapper.and(wrapper -> wrapper.like("title", cleanKeyword)
                    .or().like("tag", cleanKeyword)
                    .or().like("description", cleanKeyword)
                    .or().like("content", cleanKeyword));
        }
        queryWrapper.orderByDesc("updateTime").last("LIMIT " + safeLimit);
        return favoriteMapper.selectList(queryWrapper);
    }

    private void validateAddRequest(DeconstructionAssetFavoriteAddRequest request) {
        ThrowUtils.throwIf(request == null, ErrorCode.PARAMS_ERROR, "请求参数不能为空");
        ThrowUtils.throwIf(request.getArtworkId() == null || request.getArtworkId() <= 0,
                ErrorCode.PARAMS_ERROR, "作品ID无效");
        String assetType = request.getAssetType();
        ThrowUtils.throwIf(StringUtils.isBlank(assetType) || !SUPPORTED_ASSET_TYPES.contains(assetType.trim().toLowerCase()),
                ErrorCode.PARAMS_ERROR, "不支持的资产类型，必须为 prompt | component | icon");
        ThrowUtils.throwIf(StringUtils.isBlank(request.getAssetKey()),
                ErrorCode.PARAMS_ERROR, "资产唯一键不能为空");
        ThrowUtils.throwIf(StringUtils.isBlank(request.getContent()),
                ErrorCode.PARAMS_ERROR, "资产内容不能为空");
    }
}