package com.yupi.springbootinit.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.io.FileUtil;
import cn.hutool.crypto.digest.DigestUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.mapper.CategoryMapper;
import com.yupi.springbootinit.mapper.CategoryTagMapper;
import com.yupi.springbootinit.mapper.PromptAssetImportBatchMapper;
import com.yupi.springbootinit.mapper.PromptAssetImportItemMapper;
import com.yupi.springbootinit.mapper.PromptAssetMapper;
import com.yupi.springbootinit.mapper.PromptAssetMediaMapper;
import com.yupi.springbootinit.mapper.PromptAssetTagMapper;
import com.yupi.springbootinit.mapper.TagMapper;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetQueryRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetUpdateRequest;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.entity.CategoryTag;
import com.yupi.springbootinit.model.entity.PromptAsset;
import com.yupi.springbootinit.model.entity.PromptAssetImportBatch;
import com.yupi.springbootinit.model.entity.PromptAssetImportItem;
import com.yupi.springbootinit.model.entity.PromptAssetMedia;
import com.yupi.springbootinit.model.entity.PromptAssetTag;
import com.yupi.springbootinit.model.entity.Tag;
import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.model.vo.TagVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetImageSyncResultVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetImportResultVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetMediaVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetVO;
import com.yupi.springbootinit.service.CategoryService;
import com.yupi.springbootinit.service.PromptAssetService;
import com.yupi.springbootinit.service.TagService;
import com.yupi.springbootinit.utils.SqlUtils;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
public class PromptAssetServiceImpl extends ServiceImpl<PromptAssetMapper, PromptAsset>
        implements PromptAssetService {

    private static final String SOURCE_NAME = "visual_prompt_library";

    private static final String[] STALE_CN_MARKERS = {
            "该 Prompt 适合用于图像生成场景",
            "该 Prompt 适合用于视频生成场景",
            "重点参考其主体描述",
            "原文需结合来源 License"
    };

    @Resource
    private PromptAssetMediaMapper promptAssetMediaMapper;

    @Resource
    private PromptAssetTagMapper promptAssetTagMapper;

    @Resource
    private CategoryMapper categoryMapper;

    @Resource
    private CategoryTagMapper categoryTagMapper;

    @Resource
    private PromptAssetImportBatchMapper promptAssetImportBatchMapper;

    @Resource
    private PromptAssetImportItemMapper promptAssetImportItemMapper;

    @Resource
    private TagMapper tagMapper;

    @Resource
    private TagService tagService;

    @Resource
    private CategoryService categoryService;

    @Resource
    private CosManager cosManager;

    @Resource
    private CosClientConfig cosClientConfig;

    @Override
    public Page<PromptAssetVO> listPromptAssetVOByPage(PromptAssetQueryRequest request) {
        PromptAssetQueryRequest safeRequest = request == null ? new PromptAssetQueryRequest() : request;
        long current = Math.max(safeRequest.getCurrent(), 1);
        long pageSize = Math.max(safeRequest.getPageSize(), 1);
        Page<PromptAsset> page = this.page(new Page<>(current, pageSize), getQueryWrapper(safeRequest));
        Page<PromptAssetVO> voPage = new Page<>(current, pageSize, page.getTotal());
        voPage.setRecords(toVOList(page.getRecords(), false));
        return voPage;
    }

    @Override
    public Page<PromptAssetVO> listPublishedPromptAssetVOByPage(PromptAssetQueryRequest request) {
        PromptAssetQueryRequest safeRequest = request == null ? new PromptAssetQueryRequest() : request;
        PromptAssetQueryRequest publicRequest = new PromptAssetQueryRequest();
        BeanUtils.copyProperties(safeRequest, publicRequest);
        publicRequest.setStatus(1);
        long current = Math.max(publicRequest.getCurrent(), 1);
        long pageSize = Math.min(Math.max(publicRequest.getPageSize(), 1), 50);
        Page<PromptAsset> page = this.page(new Page<>(current, pageSize), getQueryWrapper(publicRequest));
        Page<PromptAssetVO> voPage = new Page<>(current, pageSize, page.getTotal());
        voPage.setRecords(toPublicVOList(page.getRecords()));
        return voPage;
    }

    @Override
    public PromptAssetVO getPromptAssetVO(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        PromptAsset asset = this.getById(id);
        if (asset == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        return toVO(asset, true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean updatePromptAsset(PromptAssetUpdateRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        PromptAsset oldAsset = this.getById(request.getId());
        if (oldAsset == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        PromptAsset asset = new PromptAsset();
        BeanUtils.copyProperties(request, asset);
        boolean result = this.updateById(asset);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        syncPrimaryMediaAfterManualUpdate(request, oldAsset);
        if (request.getSceneTagIdList() != null || request.getAssetTagIdList() != null) {
            PromptAsset tagAsset = new PromptAsset();
            BeanUtils.copyProperties(oldAsset, tagAsset);
            if (request.getCategoryId() != null) {
                tagAsset.setCategoryId(request.getCategoryId());
            }
            syncPromptAssetSplitTags(tagAsset, request.getSceneTagIdList(), request.getAssetTagIdList());
        } else if (request.getTagIdList() != null) {
            syncPromptAssetTags(request.getId(), request.getTagIdList());
        }
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean updatePromptAssetTags(PromptAssetUpdateRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        if (request.getSceneTagIdList() == null && request.getAssetTagIdList() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "标签列表不能为空");
        }
        PromptAsset asset = this.getById(request.getId());
        if (asset == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        syncPromptAssetSplitTags(asset, request.getSceneTagIdList(), request.getAssetTagIdList());
        return true;
    }

    @Override
    public Boolean deletePromptAsset(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        PromptAsset asset = this.getById(id);
        if (asset == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        promptAssetTagMapper.delete(new QueryWrapper<PromptAssetTag>().eq("promptAssetId", id));
        promptAssetMediaMapper.delete(new QueryWrapper<PromptAssetMedia>().eq("promptAssetId", id));
        boolean result = this.removeById(id);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    public Boolean deletePromptAssetBatch(List<Long> ids) {
        if (CollUtil.isEmpty(ids)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        for (Long id : ids) {
            deletePromptAsset(id);
        }
        return true;
    }

    @Override
    public Boolean publishPromptAssetBatch(List<Long> ids) {
        List<Long> distinctIds = normalizeTagIds(ids);
        if (CollUtil.isEmpty(distinctIds)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        for (Long id : distinctIds) {
            PromptAsset updateAsset = new PromptAsset();
            updateAsset.setId(id);
            updateAsset.setStatus(1);
            updateAsset.setUpdateTime(new Date());
            this.updateById(updateAsset);
        }
        return true;
    }

    @Override
    public PromptAssetImageSyncResultVO syncImagesToCos(List<Long> ids) {
        if (CollUtil.isEmpty(ids)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        PromptAssetImageSyncResultVO result = new PromptAssetImageSyncResultVO();
        result.setTotalCount(ids.size());
        int success = 0;
        int skip = 0;
        int error = 0;
        for (Long id : ids) {
            PromptAsset asset = this.getById(id);
            if (asset == null) {
                skip++;
                continue;
            }
            try {
                String cosUrl = uploadImageToCosIfPossible(asset, asset);
                if (StringUtils.isBlank(cosUrl)) {
                    skip++;
                } else {
                    success++;
                }
            } catch (Exception e) {
                error++;
                log.warn("sync prompt asset image to cos failed, id={}", id, e);
            }
        }
        result.setSuccessCount(success);
        result.setSkipCount(skip);
        result.setErrorCount(error);
        return result;
    }

    @Override
    public PromptAssetImportResultVO importVisualPromptLibrary(MultipartFile file, Boolean dryRun,
            String assetTypeFilter, Long categoryId, Boolean syncTagsToCategory, Boolean uploadImagesToCos) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "empty sqlite file");
        }
        String filename = file.getOriginalFilename();
        if (StringUtils.isBlank(filename) || !filename.toLowerCase().endsWith(".db")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "only .db files are supported");
        }

        boolean dryRunFlag = Boolean.TRUE.equals(dryRun);
        boolean syncTagsToCategoryFlag = !Boolean.FALSE.equals(syncTagsToCategory);
        boolean uploadImagesToCosFlag = Boolean.TRUE.equals(uploadImagesToCos);
        validateAssetTypeFilter(assetTypeFilter);
        validateCategory(categoryId);
        File tempDb = new File(System.getProperty("java.io.tmpdir"),
                "visual-prompt-library-" + UUID.randomUUID().toString().replace("-", "") + ".db");

        PromptAssetImportBatch batch = createBatch(filename, dryRunFlag, assetTypeFilter,
                categoryId, syncTagsToCategoryFlag);
        ImportCounter counter = new ImportCounter();
        try {
            file.transferTo(tempDb);
            Class.forName("org.sqlite.JDBC");
            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + tempDb.getAbsolutePath());
                    PreparedStatement statement = connection.prepareStatement(buildSourceSql(assetTypeFilter))) {
                int index = 1;
                if (StringUtils.isNotBlank(assetTypeFilter)) {
                    statement.setString(index, toSourceCategory(assetTypeFilter));
                }
                try (ResultSet rs = statement.executeQuery()) {
                    while (rs.next()) {
                        counter.totalCount++;
                        SourcePromptRow row = SourcePromptRow.from(rs);
                        try {
                            importOneRow(connection, batch.getId(), row, dryRunFlag, categoryId,
                                    syncTagsToCategoryFlag, uploadImagesToCosFlag, counter);
                        } catch (Exception rowError) {
                            counter.errorCount++;
                            saveImportItem(batch.getId(), row.getSourcePairId(), row.getSyncKey(), null,
                                    "error", "error", rowError.getMessage());
                            log.warn("import prompt asset row failed, sourcePairId={}", row.getSourcePairId(), rowError);
                        }
                    }
                }
            }
            finishBatch(batch, counter, "success", null);
            return toImportResult(batch, counter, dryRunFlag);
        } catch (Exception e) {
            finishBatch(batch, counter, "failed", e.getMessage());
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "import failed: " + e.getMessage());
        } finally {
            FileUtil.del(tempDb);
        }
    }

    private QueryWrapper<PromptAsset> getQueryWrapper(PromptAssetQueryRequest request) {
        QueryWrapper<PromptAsset> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq(StringUtils.isNotBlank(request.getAssetType()), "assetType", request.getAssetType());
        queryWrapper.eq(request.getCategoryId() != null, "categoryId", request.getCategoryId());
        queryWrapper.eq(StringUtils.isNotBlank(request.getMediaType()), "mediaType", request.getMediaType());
        queryWrapper.eq(StringUtils.isNotBlank(request.getVisualAssetType()), "visualAssetType", request.getVisualAssetType());
        queryWrapper.eq(StringUtils.isNotBlank(request.getSelectionStatus()), "selectionStatus", request.getSelectionStatus());
        queryWrapper.eq(StringUtils.isNotBlank(request.getQualityLevel()), "qualityLevel", request.getQualityLevel());
        queryWrapper.eq(StringUtils.isNotBlank(request.getCommercialRisk()), "commercialRisk", request.getCommercialRisk());
        queryWrapper.eq(request.getMemberOnly() != null, "memberOnly", request.getMemberOnly());
        queryWrapper.eq(request.getStatus() != null, "status", request.getStatus());
        queryWrapper.like(StringUtils.isNotBlank(request.getSourceRepoName()), "sourceRepoName", request.getSourceRepoName());
        applyTagFilter(queryWrapper, request.getTagIdList());
        applyTagFilter(queryWrapper, request.getSceneTagIdList());
        applyTagFilter(queryWrapper, request.getAssetTagIdList());
        if (StringUtils.isNotBlank(request.getSearchText())) {
            List<String> keywordList = splitSearchKeywords(request.getSearchText());
            for (String keyword : keywordList) {
                List<Long> promptAssetIdsByTag = findPromptAssetIdsByTagKeyword(keyword);
                queryWrapper.and(wrapper -> {
                    wrapper.like("title", keyword)
                            .or().like("summary", keyword)
                            .or().like("promptContent", keyword)
                            .or().like("promptCn", keyword)
                            .or().like("sourceRepoName", keyword);
                    if (CollUtil.isNotEmpty(promptAssetIdsByTag)) {
                        wrapper.or().in("id", promptAssetIdsByTag);
                    }
                });
            }
        }
        String sortField = request.getSortField();
        String sortOrder = request.getSortOrder();
        queryWrapper.orderBy(SqlUtils.validSortField(sortField),
                CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
        queryWrapper.orderByDesc("sort", "id");
        return queryWrapper;
    }

    private List<String> splitSearchKeywords(String searchText) {
        String[] keywords = StringUtils.split(StringUtils.trimToEmpty(searchText));
        if (keywords == null || keywords.length == 0) {
            return new ArrayList<>();
        }
        List<String> result = new ArrayList<>();
        for (String keyword : keywords) {
            String trimmed = StringUtils.trimToNull(keyword);
            if (trimmed != null) {
                result.add(trimmed);
            }
        }
        return result;
    }

    private void applyTagFilter(QueryWrapper<PromptAsset> queryWrapper, List<Long> rawTagIds) {
        List<Long> tagIds = normalizeTagIds(rawTagIds);
        if (CollUtil.isEmpty(tagIds)) {
            return;
        }
        List<Tag> validTags = tagMapper.selectList(new QueryWrapper<Tag>().in("id", tagIds).eq("isDelete", 0));
        if (CollUtil.isEmpty(validTags)) {
            queryWrapper.eq("id", -1L);
            return;
        }
        List<Long> validTagIds = validTags.stream().map(Tag::getId).collect(Collectors.toList());
        List<Long> promptAssetIds = findPromptAssetIdsByTagIds(validTagIds);
        if (CollUtil.isEmpty(promptAssetIds)) {
            queryWrapper.eq("id", -1L);
            return;
        }
        queryWrapper.in("id", promptAssetIds);
    }

    private List<Long> findPromptAssetIdsByTagKeyword(String keyword) {
        if (StringUtils.isBlank(keyword)) {
            return new ArrayList<>();
        }
        List<Tag> tags = tagMapper.selectList(new QueryWrapper<Tag>()
                .like("name", keyword)
                .eq("isDelete", 0));
        if (CollUtil.isEmpty(tags)) {
            return new ArrayList<>();
        }
        List<Long> tagIds = tags.stream().map(Tag::getId).collect(Collectors.toList());
        return findPromptAssetIdsByTagIds(tagIds);
    }

    private List<Long> findPromptAssetIdsByTagIds(List<Long> tagIds) {
        if (CollUtil.isEmpty(tagIds)) {
            return new ArrayList<>();
        }
        List<PromptAssetTag> assetTagList = promptAssetTagMapper.selectList(
                new QueryWrapper<PromptAssetTag>().in("tagId", tagIds));
        if (CollUtil.isEmpty(assetTagList)) {
            return new ArrayList<>();
        }
        return assetTagList.stream()
                .map(PromptAssetTag::getPromptAssetId)
                .filter(promptAssetId -> promptAssetId != null && promptAssetId > 0)
                .distinct()
                .collect(Collectors.toList());
    }

    private void importOneRow(Connection sourceConnection, Long batchId, SourcePromptRow row,
            boolean dryRun, Long categoryId, boolean syncTagsToCategory, boolean uploadImagesToCos,
            ImportCounter counter) throws Exception {
        PromptAsset existing = this.getOne(new QueryWrapper<PromptAsset>().eq("syncKey", row.getSyncKey()), false);
        if (dryRun) {
            if (existing == null) {
                counter.insertCount++;
                saveImportItem(batchId, row.getSourcePairId(), row.getSyncKey(), null,
                        "insert", "dry_run", null);
            } else if (row.hasChanged(existing, categoryId)) {
                counter.updateCount++;
                saveImportItem(batchId, row.getSourcePairId(), row.getSyncKey(), existing.getId(),
                        "update", "dry_run", null);
            } else {
                counter.skipCount++;
                saveImportItem(batchId, row.getSourcePairId(), row.getSyncKey(), existing.getId(),
                        "skip", "dry_run", null);
            }
            return;
        }

        PromptAsset asset = row.toPromptAsset(categoryId);
        if (existing == null) {
            this.save(asset);
            counter.insertCount++;
            saveImportItem(batchId, row.getSourcePairId(), row.getSyncKey(), asset.getId(),
                    "insert", "success", null);
        } else if (row.hasChanged(existing, categoryId)) {
            asset.setId(existing.getId());
            this.updateById(asset);
            counter.updateCount++;
            saveImportItem(batchId, row.getSourcePairId(), row.getSyncKey(), existing.getId(),
                    "update", "success", null);
        } else {
            asset.setId(existing.getId());
            counter.skipCount++;
            saveImportItem(batchId, row.getSourcePairId(), row.getSyncKey(), existing.getId(),
                    "skip", "success", null);
        }
        if (uploadImagesToCos) {
            uploadImageToCosIfPossible(asset, existing);
        }
        saveMedia(asset, row);
        saveTags(sourceConnection, asset.getId(), row, categoryId, syncTagsToCategory);
    }

    private void saveMedia(PromptAsset asset, SourcePromptRow row) {
        if (StringUtils.isBlank(asset.getSourceImageHash())
                && StringUtils.isBlank(asset.getSourceImageOriginalUrl())
                && StringUtils.isBlank(asset.getSourceImageLocalPath())
                && StringUtils.isBlank(asset.getSourceCloudStorageUrl())) {
            return;
        }
        QueryWrapper<PromptAssetMedia> queryWrapper = new QueryWrapper<PromptAssetMedia>()
                .eq("promptAssetId", asset.getId());
        if (StringUtils.isNotBlank(asset.getSourceImageHash())) {
            queryWrapper.eq("fileHash", asset.getSourceImageHash());
        } else if (StringUtils.isNotBlank(asset.getSourceImageOriginalUrl())) {
            queryWrapper.eq("originalUrl", asset.getSourceImageOriginalUrl());
        } else if (StringUtils.isNotBlank(asset.getSourceCloudStorageUrl())) {
            queryWrapper.eq("cloudUrl", asset.getSourceCloudStorageUrl());
        } else {
            queryWrapper.eq("sourceLocalPath", asset.getSourceImageLocalPath());
        }
        PromptAssetMedia existing = promptAssetMediaMapper.selectOne(queryWrapper.last("limit 1"));
        if (existing != null) {
            if (StringUtils.isNotBlank(asset.getCoverUrl())
                    && !StringUtils.equals(existing.getLocalUrl(), asset.getCoverUrl())) {
                existing.setLocalUrl(asset.getCoverUrl());
            }
            existing.setCloudUrl(asset.getSourceCloudStorageUrl());
            existing.setThumbnailLocalUrl(asset.getSourceThumbnailLocalPath());
            existing.setThumbnailCloudUrl(asset.getSourceThumbnailCloudStorageUrl());
            existing.setCloudStorageProvider(asset.getCloudStorageProvider());
            existing.setCloudStorageBucket(asset.getCloudStorageBucket());
            existing.setCloudStorageRegion(asset.getCloudStorageRegion());
            existing.setCloudStorageKey(asset.getCloudStorageKey());
            existing.setCloudUploadedAt(asset.getCloudUploadedAt());
            if (row != null) {
                existing.setWidth(row.getWidth());
                existing.setHeight(row.getHeight());
                existing.setFileSize(row.getFileSize());
            }
            promptAssetMediaMapper.updateById(existing);
            return;
        }
        PromptAssetMedia media = new PromptAssetMedia();
        media.setPromptAssetId(asset.getId());
        media.setMediaType("image");
        media.setOriginalUrl(asset.getSourceImageOriginalUrl());
        media.setLocalUrl(asset.getCoverUrl());
        media.setCloudUrl(asset.getSourceCloudStorageUrl());
        media.setThumbnailLocalUrl(asset.getSourceThumbnailLocalPath());
        media.setThumbnailCloudUrl(asset.getSourceThumbnailCloudStorageUrl());
        media.setSourceLocalPath(asset.getSourceImageLocalPath());
        media.setFileHash(asset.getSourceImageHash());
        media.setCloudStorageProvider(asset.getCloudStorageProvider());
        media.setCloudStorageBucket(asset.getCloudStorageBucket());
        media.setCloudStorageRegion(asset.getCloudStorageRegion());
        media.setCloudStorageKey(asset.getCloudStorageKey());
        media.setCloudUploadedAt(asset.getCloudUploadedAt());
        if (row != null) {
            media.setWidth(row.getWidth());
            media.setHeight(row.getHeight());
            media.setFileSize(row.getFileSize());
        }
        media.setSort(0);
        media.setCreateTime(new Date());
        media.setIsDelete(0);
        promptAssetMediaMapper.insert(media);
    }

    private void syncPrimaryMediaAfterManualUpdate(PromptAssetUpdateRequest request, PromptAsset oldAsset) {
        if (request == null || request.getId() == null || StringUtils.isBlank(request.getCoverUrl())) {
            return;
        }
        if (StringUtils.equals(StringUtils.defaultString(request.getCoverUrl()), StringUtils.defaultString(oldAsset.getCoverUrl()))
                && StringUtils.equals(StringUtils.defaultString(request.getPreviewMediaUrl()),
                StringUtils.defaultString(oldAsset.getPreviewMediaUrl()))) {
            return;
        }
        PromptAssetMedia media = promptAssetMediaMapper.selectOne(new QueryWrapper<PromptAssetMedia>()
                .eq("promptAssetId", request.getId())
                .orderByAsc("sort", "id")
                .last("limit 1"));
        if (media == null) {
            media = new PromptAssetMedia();
            media.setPromptAssetId(request.getId());
            media.setMediaType("image");
            media.setOriginalUrl(request.getCoverUrl());
            media.setLocalUrl(request.getCoverUrl());
            media.setCloudUrl(request.getCoverUrl());
            media.setSort(0);
            media.setCreateTime(new Date());
            media.setIsDelete(0);
            promptAssetMediaMapper.insert(media);
            return;
        }
        media.setOriginalUrl(request.getCoverUrl());
        media.setLocalUrl(request.getCoverUrl());
        media.setCloudUrl(request.getCoverUrl());
        media.setThumbnailCloudUrl(null);
        media.setThumbnailLocalUrl(null);
        promptAssetMediaMapper.updateById(media);
    }

    private String uploadImageToCosIfPossible(PromptAsset asset, PromptAsset existing) throws Exception {
        if (asset == null || asset.getId() == null) {
            return null;
        }
        if (existing != null && isCosUrl(existing.getCoverUrl())) {
            asset.setCoverUrl(existing.getCoverUrl());
            asset.setPreviewMediaUrl(existing.getPreviewMediaUrl());
            return null;
        }
        if (StringUtils.isNotBlank(asset.getSourceCloudStorageUrl())) {
            return null;
        }
        String sourceUrl = SourcePromptRow.firstNotBlank(asset.getSourceImageOriginalUrl(), asset.getCoverUrl());
        if (!isHttpUrl(sourceUrl)) {
            return null;
        }
        String suffix = resolveImageSuffix(sourceUrl);
        File tempFile = File.createTempFile("prompt-asset-image-", "." + suffix);
        try {
            downloadToFile(sourceUrl, tempFile);
            String key = String.format("/prompt_asset/%s/%s.%s",
                    StringUtils.defaultIfBlank(asset.getAssetType(), "image"),
                    asset.getSyncKey(), suffix);
            cosManager.putObject(key, tempFile);
            String cosUrl = cosClientConfig.getHost() + key;
            PromptAsset updateAsset = new PromptAsset();
            updateAsset.setId(asset.getId());
            updateAsset.setCoverUrl(cosUrl);
            updateAsset.setPreviewMediaUrl(cosUrl);
            this.updateById(updateAsset);
            asset.setCoverUrl(cosUrl);
            asset.setPreviewMediaUrl(cosUrl);
            return cosUrl;
        } finally {
            FileUtil.del(tempFile);
        }
    }

    private boolean isCosUrl(String url) {
        return StringUtils.isNotBlank(url)
                && StringUtils.isNotBlank(cosClientConfig.getHost())
                && url.startsWith(cosClientConfig.getHost());
    }

    private boolean isHttpUrl(String url) {
        return StringUtils.startsWithIgnoreCase(url, "http://")
                || StringUtils.startsWithIgnoreCase(url, "https://");
    }

    private String resolveImageSuffix(String url) {
        String path = StringUtils.substringBefore(StringUtils.substringBefore(url, "?"), "#").toLowerCase();
        String suffix = FileUtil.getSuffix(path);
        if (StringUtils.isBlank(suffix)) {
            return "jpg";
        }
        if ("jpeg".equals(suffix) || "jpg".equals(suffix) || "png".equals(suffix) || "webp".equals(suffix)) {
            return suffix;
        }
        return "jpg";
    }

    private void downloadToFile(String url, File targetFile) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("User-Agent", "ownai-admin-prompt-asset-import/1.0");
        connection.setInstanceFollowRedirects(true);
        int status = connection.getResponseCode();
        if (status < 200 || status >= 300) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "image download failed: " + status);
        }
        try (InputStream inputStream = connection.getInputStream();
                FileOutputStream outputStream = new FileOutputStream(targetFile)) {
            byte[] buffer = new byte[8192];
            int len;
            while ((len = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, len);
            }
        } finally {
            connection.disconnect();
        }
    }

    private void saveTags(Connection sourceConnection, Long assetId, SourcePromptRow row,
            Long categoryId, boolean syncTagsToCategory) throws Exception {
        List<String> sceneTagNames = splitTagNames(row.getSceneTagList());
        List<String> assetTagNames = splitTagNames(row.getAssetTagList());
        if (CollUtil.isNotEmpty(sceneTagNames) || CollUtil.isNotEmpty(assetTagNames)) {
            Set<Long> insertedTagIds = new LinkedHashSet<>();
            promptAssetTagMapper.delete(new QueryWrapper<PromptAssetTag>().eq("promptAssetId", assetId));
            for (String tagName : sceneTagNames) {
                Long tagId = ensureTag(tagName);
                if (insertedTagIds.add(tagId)) {
                    insertPromptAssetTag(assetId, tagId);
                }
                ensureCategoryTag(categoryId, tagId);
            }
            for (String tagName : assetTagNames) {
                Long tagId = ensureTag(tagName);
                if (insertedTagIds.add(tagId)) {
                    insertPromptAssetTag(assetId, tagId);
                }
            }
            return;
        }

        Set<String> tagNames = new LinkedHashSet<>();
        addIfNotBlank(tagNames, row.getAssetType());
        addIfNotBlank(tagNames, row.getVisualAssetType());
        addIfNotBlank(tagNames, row.getScenario());
        addIfNotBlank(tagNames, row.getVisualStyle());
        addIfNotBlank(tagNames, row.getQualityLevel());
        try (PreparedStatement statement = sourceConnection.prepareStatement(
                "SELECT t.name FROM pair_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.pair_id = ?")) {
            statement.setLong(1, row.getSourcePairId());
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    addIfNotBlank(tagNames, rs.getString("name"));
                }
            }
        }
        if (tagNames.isEmpty()) {
            return;
        }
        promptAssetTagMapper.delete(new QueryWrapper<PromptAssetTag>().eq("promptAssetId", assetId));
        for (String tagName : tagNames) {
            Long tagId = ensureTag(tagName);
            insertPromptAssetTag(assetId, tagId);
            if (syncTagsToCategory) {
                ensureCategoryTag(categoryId, tagId);
            }
        }
    }

    private void syncPromptAssetTags(Long assetId, List<Long> tagIdList) {
        Set<Long> distinctTagIds = new LinkedHashSet<>(normalizeTagIds(tagIdList));
        if (CollUtil.isEmpty(distinctTagIds)) {
            promptAssetTagMapper.delete(new QueryWrapper<PromptAssetTag>().eq("promptAssetId", assetId));
            return;
        }
        List<Tag> validTags = tagMapper.selectList(
                new QueryWrapper<Tag>().in("id", distinctTagIds).eq("isDelete", 0));
        if (validTags.size() != distinctTagIds.size()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "标签不存在或已删除");
        }
        promptAssetTagMapper.delete(new QueryWrapper<PromptAssetTag>().eq("promptAssetId", assetId));
        for (Long tagId : distinctTagIds) {
            insertPromptAssetTag(assetId, tagId);
        }
    }

    private void insertPromptAssetTag(Long assetId, Long tagId) {
        PromptAssetTag assetTag = new PromptAssetTag();
        assetTag.setPromptAssetId(assetId);
        assetTag.setTagId(tagId);
        assetTag.setCreateTime(new Date());
        promptAssetTagMapper.insert(assetTag);
    }

    private List<String> splitTagNames(String rawValue) {
        if (StringUtils.isBlank(rawValue)) {
            return new ArrayList<>();
        }
        String normalized = rawValue.trim()
                .replace("[", "")
                .replace("]", "")
                .replace("\"", "")
                .replace("'", "")
                .replace("，", ",")
                .replace("、", ",")
                .replace("；", ",")
                .replace(";", ",")
                .replace("|", ",")
                .replace("\r", ",")
                .replace("\n", ",");
        String[] parts = StringUtils.split(normalized, ",");
        if (parts == null || parts.length == 0) {
            return new ArrayList<>();
        }
        List<String> result = new ArrayList<>();
        for (String part : parts) {
            String tagName = StringUtils.trimToNull(part);
            if (tagName != null) {
                result.add(StringUtils.left(tagName, 64));
            }
        }
        return result.stream()
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .collect(Collectors.toList());
    }

    private void syncPromptAssetSplitTags(PromptAsset asset, List<Long> sceneTagIdList, List<Long> assetTagIdList) {
        List<Long> sceneTagIds = normalizeTagIds(sceneTagIdList);
        List<Long> assetTagIds = normalizeTagIds(assetTagIdList);
        if (CollUtil.isNotEmpty(sceneTagIds)) {
            Set<Long> allowedSceneTagIds = getSceneTagIdsByCategory(asset.getCategoryId());
            if (CollUtil.isEmpty(allowedSceneTagIds) || !allowedSceneTagIds.containsAll(sceneTagIds)) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "二级场景标签不属于当前分类");
            }
        }
        List<Long> mergedTagIds = new ArrayList<>();
        mergedTagIds.addAll(sceneTagIds);
        mergedTagIds.addAll(assetTagIds);
        syncPromptAssetTags(asset.getId(), mergedTagIds);
    }

    private List<Long> normalizeTagIds(List<Long> tagIdList) {
        if (CollUtil.isEmpty(tagIdList)) {
            return new ArrayList<>();
        }
        return tagIdList.stream()
                .filter(tagId -> tagId != null && tagId > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .collect(Collectors.toList());
    }

    private Set<Long> getSceneTagIdsByCategory(Long categoryId) {
        if (categoryId == null || categoryId <= 0) {
            return new LinkedHashSet<>();
        }
        List<CategoryTag> categoryTags = categoryTagMapper.selectList(
                new QueryWrapper<CategoryTag>().eq("categoryId", categoryId));
        if (CollUtil.isEmpty(categoryTags)) {
            return new LinkedHashSet<>();
        }
        return categoryTags.stream()
                .map(CategoryTag::getTagId)
                .filter(tagId -> tagId != null && tagId > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Long ensureTag(String name) {
        String trimmed = StringUtils.left(StringUtils.trimToEmpty(name), 64);
        Tag existing = tagMapper.selectOne(new QueryWrapper<Tag>().eq("name", trimmed).last("limit 1"));
        if (existing != null) {
            return existing.getId();
        }
        Tag tag = new Tag();
        tag.setName(trimmed);
        tag.setDescription("Imported from visual prompt library");
        tag.setSort(0);
        tag.setCreateTime(new Date());
        tag.setUpdateTime(new Date());
        tag.setIsDelete(0);
        tagMapper.insert(tag);
        return tag.getId();
    }

    private void ensureCategoryTag(Long categoryId, Long tagId) {
        if (categoryId == null || tagId == null) {
            return;
        }
        CategoryTag existing = categoryTagMapper.selectOne(new QueryWrapper<CategoryTag>()
                .eq("categoryId", categoryId)
                .eq("tagId", tagId)
                .last("limit 1"));
        if (existing != null) {
            return;
        }
        CategoryTag categoryTag = new CategoryTag();
        categoryTag.setCategoryId(categoryId);
        categoryTag.setTagId(tagId);
        categoryTag.setSort(0);
        categoryTag.setCreateTime(new Date());
        categoryTagMapper.insert(categoryTag);
    }

    private List<PromptAssetVO> toVOList(List<PromptAsset> assets, boolean includeRelations) {
        if (CollUtil.isEmpty(assets)) {
            return new ArrayList<>();
        }
        return assets.stream().map(asset -> toVO(asset, includeRelations)).collect(Collectors.toList());
    }

    private List<PromptAssetVO> toPublicVOList(List<PromptAsset> assets) {
        return toVOList(assets, true).stream().map(this::sanitizePublicVO).collect(Collectors.toList());
    }

    private PromptAssetVO sanitizePublicVO(PromptAssetVO vo) {
        if (vo == null) {
            return null;
        }
        vo.setPromptContent(null);
        vo.setSourceCloudStorageUrl(null);
        vo.setCloudStorageBucket(null);
        vo.setCloudStorageRegion(null);
        vo.setCloudStorageKey(null);
        vo.setCloudUploadedAt(null);
        if (CollUtil.isNotEmpty(vo.getMediaList())) {
            vo.getMediaList().forEach(media -> {
                media.setOriginalUrl(null);
                media.setSourceLocalPath(null);
                media.setFileHash(null);
                media.setCloudStorageBucket(null);
                media.setCloudStorageRegion(null);
                media.setCloudStorageKey(null);
                media.setCloudUploadedAt(null);
            });
        }
        return vo;
    }

    private PromptAssetVO toVO(PromptAsset asset, boolean includeRelations) {
        if (asset == null) {
            return null;
        }
        PromptAssetVO vo = new PromptAssetVO();
        BeanUtils.copyProperties(asset, vo);
        if (asset.getCategoryId() != null) {
            Category category = categoryMapper.selectById(asset.getCategoryId());
            if (category != null) {
                CategoryVO categoryVO = categoryService.getCategoryVO(category);
                vo.setCategory(categoryVO);
            }
        }
        if (includeRelations) {
            List<PromptAssetMedia> mediaList = promptAssetMediaMapper.selectList(
                    new QueryWrapper<PromptAssetMedia>().eq("promptAssetId", asset.getId()).orderByAsc("sort", "id"));
            List<PromptAssetMediaVO> mediaVOList = mediaList.stream().map(media -> {
                PromptAssetMediaVO mediaVO = new PromptAssetMediaVO();
                BeanUtils.copyProperties(media, mediaVO);
                return mediaVO;
            }).collect(Collectors.toList());
            vo.setMediaList(mediaVOList);

            List<PromptAssetTag> assetTags = promptAssetTagMapper.selectList(
                    new QueryWrapper<PromptAssetTag>().eq("promptAssetId", asset.getId()).orderByAsc("createTime", "id"));
            if (CollUtil.isNotEmpty(assetTags)) {
                List<Long> tagIds = assetTags.stream().map(PromptAssetTag::getTagId).collect(Collectors.toList());
                List<Tag> tags = tagMapper.selectList(new QueryWrapper<Tag>().in("id", tagIds).eq("isDelete", 0));
                Map<Long, TagVO> tagVOMap = tags.stream().collect(Collectors.toMap(
                        Tag::getId,
                        tagService::getTagVO,
                        (left, right) -> left,
                        LinkedHashMap::new));
                Set<Long> sceneTagIds = getSceneTagIdsByCategory(asset.getCategoryId());
                List<TagVO> tagList = new ArrayList<>();
                List<TagVO> sceneTagList = new ArrayList<>();
                List<TagVO> assetTagList = new ArrayList<>();
                for (PromptAssetTag assetTag : assetTags) {
                    TagVO tagVO = tagVOMap.get(assetTag.getTagId());
                    if (tagVO == null) {
                        continue;
                    }
                    tagList.add(tagVO);
                    if (sceneTagIds.contains(assetTag.getTagId())) {
                        sceneTagList.add(tagVO);
                    } else {
                        assetTagList.add(tagVO);
                    }
                }
                vo.setTagList(tagList);
                vo.setSceneTagList(sceneTagList);
                vo.setAssetTagList(assetTagList);
            } else {
                vo.setTagList(new ArrayList<TagVO>());
                vo.setSceneTagList(new ArrayList<TagVO>());
                vo.setAssetTagList(new ArrayList<TagVO>());
            }
        }
        return vo;
    }

    private PromptAssetImportBatch createBatch(String filename, boolean dryRun, String assetTypeFilter,
            Long categoryId, boolean syncTagsToCategory) {
        PromptAssetImportBatch batch = new PromptAssetImportBatch();
        batch.setSourceName(SOURCE_NAME);
        batch.setSourceDbName(filename);
        batch.setImportMode("incremental");
        batch.setAssetTypeFilter(assetTypeFilter);
        batch.setCategoryId(categoryId);
        batch.setSyncTagsToCategory(syncTagsToCategory ? 1 : 0);
        batch.setDryRun(dryRun ? 1 : 0);
        batch.setStatus("running");
        batch.setTotalCount(0);
        batch.setInsertCount(0);
        batch.setUpdateCount(0);
        batch.setSkipCount(0);
        batch.setErrorCount(0);
        batch.setStartedAt(new Date());
        batch.setCreateTime(new Date());
        batch.setUpdateTime(new Date());
        batch.setIsDelete(0);
        promptAssetImportBatchMapper.insert(batch);
        return batch;
    }

    private void finishBatch(PromptAssetImportBatch batch, ImportCounter counter, String status, String errorMessage) {
        batch.setStatus(status);
        batch.setTotalCount(counter.totalCount);
        batch.setInsertCount(counter.insertCount);
        batch.setUpdateCount(counter.updateCount);
        batch.setSkipCount(counter.skipCount);
        batch.setErrorCount(counter.errorCount);
        batch.setFinishedAt(new Date());
        batch.setUpdateTime(new Date());
        batch.setErrorMessage(errorMessage);
        batch.setSummary(String.format("total=%d, insert=%d, update=%d, skip=%d, error=%d",
                counter.totalCount, counter.insertCount, counter.updateCount, counter.skipCount, counter.errorCount));
        promptAssetImportBatchMapper.updateById(batch);
    }

    private void saveImportItem(Long batchId, Long sourcePairId, String syncKey, Long targetAssetId,
            String action, String status, String message) {
        PromptAssetImportItem item = new PromptAssetImportItem();
        item.setBatchId(batchId);
        item.setSourcePairId(sourcePairId);
        item.setSyncKey(syncKey);
        item.setTargetAssetId(targetAssetId);
        item.setAction(action);
        item.setStatus(status);
        item.setMessage(StringUtils.left(message, 1000));
        item.setCreateTime(new Date());
        promptAssetImportItemMapper.insert(item);
    }

    private PromptAssetImportResultVO toImportResult(PromptAssetImportBatch batch, ImportCounter counter, boolean dryRun) {
        PromptAssetImportResultVO result = new PromptAssetImportResultVO();
        result.setBatchId(batch.getId());
        result.setDryRun(dryRun);
        result.setStatus(batch.getStatus());
        result.setTotalCount(counter.totalCount);
        result.setInsertCount(counter.insertCount);
        result.setUpdateCount(counter.updateCount);
        result.setSkipCount(counter.skipCount);
        result.setErrorCount(counter.errorCount);
        result.setSummary(batch.getSummary());
        return result;
    }

    private String buildSourceSql(String assetTypeFilter) {
        String baseSql = "SELECT p.*, r.id AS sourceRepoId, r.repo_name AS sourceRepoName, r.repo_url AS sourceRepoUrl, "
                + "(SELECT s.suggested_cn_explanation "
                + " FROM prompt_pair_annotation_suggestions s "
                + " WHERE s.pair_id = p.id "
                + "   AND s.status IN ('accepted', 'pending_review') "
                + "   AND TRIM(COALESCE(s.suggested_cn_explanation, '')) != '' "
                + " ORDER BY CASE WHEN s.status = 'accepted' THEN 0 ELSE 1 END, "
                + "          COALESCE(s.updated_at, s.created_at) DESC, s.id DESC "
                + " LIMIT 1) AS latestSuggestedCnExplanation, "
                + "a.cloud_storage_url AS assetCloudStorageUrl, "
                + "a.thumbnail_local_path AS assetThumbnailLocalPath, "
                + "a.thumbnail_cloud_storage_url AS assetThumbnailCloudStorageUrl, "
                + "a.cloud_storage_provider AS assetCloudStorageProvider, "
                + "a.cloud_storage_bucket AS assetCloudStorageBucket, "
                + "a.cloud_storage_region AS assetCloudStorageRegion, "
                + "a.cloud_storage_key AS assetCloudStorageKey, "
                + "a.cloud_uploaded_at AS assetCloudUploadedAt, "
                + "a.width AS assetWidth, a.height AS assetHeight, a.file_size AS assetFileSize "
                + "FROM prompt_effect_pairs p LEFT JOIN repos r ON r.id = p.repo_id "
                + "LEFT JOIN assets a ON a.image_hash = p.image_hash "
                + "WHERE p.category IN ('image_generation_prompt', 'video_generation_prompt')";
        if (StringUtils.isNotBlank(assetTypeFilter)) {
            baseSql += " AND p.category = ?";
        }
        return baseSql + " ORDER BY p.id ASC";
    }

    private void validateAssetTypeFilter(String assetTypeFilter) {
        if (StringUtils.isBlank(assetTypeFilter)) {
            return;
        }
        if (!"image_prompt".equals(assetTypeFilter) && !"video_prompt".equals(assetTypeFilter)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "assetTypeFilter must be image_prompt or video_prompt");
        }
    }

    private void validateCategory(Long categoryId) {
        if (categoryId == null || categoryId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "categoryId is required");
        }
        Category category = categoryMapper.selectById(categoryId);
        if (category == null || (category.getIsDelete() != null && category.getIsDelete() == 1)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "category not found");
        }
    }

    private String toSourceCategory(String assetType) {
        return "video_prompt".equals(assetType) ? "video_generation_prompt" : "image_generation_prompt";
    }

    private static void addIfNotBlank(Set<String> values, String value) {
        if (StringUtils.isNotBlank(value)) {
            values.add(value.trim());
        }
    }

    @Data
    private static class ImportCounter {
        private int totalCount;
        private int insertCount;
        private int updateCount;
        private int skipCount;
        private int errorCount;
    }

    @Data
    private static class SourcePromptRow {

        private Long sourcePairId;
        private Long sourceRepoId;
        private String repoName;
        private String repoUrl;
        private String sourcePageUrl;
        private String originalPrompt;
        private String promptCn;
        private String imageOriginalUrl;
        private String imageLocalPath;
        private String imageHash;
        private String cloudStorageUrl;
        private String thumbnailLocalPath;
        private String thumbnailCloudStorageUrl;
        private String cloudStorageProvider;
        private String cloudStorageBucket;
        private String cloudStorageRegion;
        private String cloudStorageKey;
        private String cloudUploadedAt;
        private Integer width;
        private Integer height;
        private Long fileSize;
        private String sourceCategory;
        private String assetType;
        private String mediaType;
        private String scenario;
        private String visualStyle;
        private String qualityLevel;
        private String selectionStatus;
        private String license;
        private String commercialRisk;
        private String visualAssetType;
        private String sceneTagList;
        private String assetTagList;
        private String sourceCreatedAt;
        private String sourceUpdatedAt;
        private String syncKey;

        static SourcePromptRow from(ResultSet rs) throws Exception {
            SourcePromptRow row = new SourcePromptRow();
            row.setSourcePairId(rs.getLong("id"));
            row.setSourceRepoId(rs.getLong("sourceRepoId"));
            row.setRepoName(firstNotBlank(rs.getString("sourceRepoName"), rs.getString("repo_name")));
            row.setRepoUrl(firstNotBlank(rs.getString("sourceRepoUrl"), rs.getString("repo_url")));
            row.setSourcePageUrl(rs.getString("source_page_url"));
            row.setOriginalPrompt(rs.getString("original_prompt"));
            row.setPromptCn(firstValidCn(rs.getString("prompt_cn_explanation"),
                    optionalString(rs, "latestSuggestedCnExplanation")));
            row.setImageOriginalUrl(rs.getString("image_original_url"));
            row.setImageLocalPath(rs.getString("image_local_path"));
            row.setImageHash(rs.getString("image_hash"));
            row.setCloudStorageUrl(firstNotBlank(optionalString(rs, "cloud_storage_url"),
                    optionalString(rs, "assetCloudStorageUrl")));
            row.setThumbnailLocalPath(optionalString(rs, "assetThumbnailLocalPath"));
            row.setThumbnailCloudStorageUrl(optionalString(rs, "assetThumbnailCloudStorageUrl"));
            row.setCloudStorageProvider(optionalString(rs, "assetCloudStorageProvider"));
            row.setCloudStorageBucket(optionalString(rs, "assetCloudStorageBucket"));
            row.setCloudStorageRegion(optionalString(rs, "assetCloudStorageRegion"));
            row.setCloudStorageKey(optionalString(rs, "assetCloudStorageKey"));
            row.setCloudUploadedAt(optionalString(rs, "assetCloudUploadedAt"));
            row.setWidth(optionalInteger(rs, "assetWidth"));
            row.setHeight(optionalInteger(rs, "assetHeight"));
            row.setFileSize(optionalLong(rs, "assetFileSize"));
            row.setSourceCategory(rs.getString("category"));
            row.setAssetType("video_generation_prompt".equals(row.getSourceCategory()) ? "video_prompt" : "image_prompt");
            row.setMediaType("video_prompt".equals(row.getAssetType()) ? "video" : "image");
            row.setScenario(rs.getString("scenario"));
            row.setVisualStyle(rs.getString("visual_style"));
            row.setQualityLevel(defaultIfBlank(rs.getString("quality_level"), "pending_review"));
            row.setSelectionStatus(defaultIfBlank(rs.getString("selection_status"), "pending_review"));
            row.setLicense(rs.getString("license"));
            row.setCommercialRisk(defaultIfBlank(rs.getString("commercial_risk"), "unknown"));
            row.setVisualAssetType(rs.getString("visual_asset_type"));
            row.setSceneTagList(firstNotBlank(optionalString(rs, "sceneTagList"),
                    optionalString(rs, "scene_tag_list")));
            row.setAssetTagList(firstNotBlank(optionalString(rs, "assetTagList"),
                    optionalString(rs, "asset_tag_list")));
            row.setSourceCreatedAt(rs.getString("created_at"));
            row.setSourceUpdatedAt(rs.getString("updated_at"));
            row.setSyncKey(buildSyncKey(row));
            return row;
        }

        PromptAsset toPromptAsset(Long categoryId) {
            PromptAsset asset = new PromptAsset();
            asset.setAssetType(assetType);
            asset.setCategoryId(categoryId);
            asset.setTitle(buildTitle());
            asset.setSummary(StringUtils.left(promptCn, 500));
            asset.setPromptContent(originalPrompt);
            asset.setPromptCn(promptCn);
            asset.setCoverUrl(firstNotBlank(cloudStorageUrl, firstNotBlank(imageLocalPath, imageOriginalUrl)));
            asset.setPreviewMediaUrl(cloudStorageUrl);
            asset.setMediaType(mediaType);
            asset.setSourceName(SOURCE_NAME);
            asset.setSourcePairId(sourcePairId);
            asset.setSourceRepoId(sourceRepoId);
            asset.setSourceRepoName(repoName);
            asset.setSourceRepoUrl(repoUrl);
            asset.setSourcePageUrl(sourcePageUrl);
            asset.setSourceImageOriginalUrl(imageOriginalUrl);
            asset.setSourceImageLocalPath(imageLocalPath);
            asset.setSourceImageHash(imageHash);
            asset.setSourceCloudStorageUrl(cloudStorageUrl);
            asset.setSourceThumbnailLocalPath(thumbnailLocalPath);
            asset.setSourceThumbnailCloudStorageUrl(thumbnailCloudStorageUrl);
            asset.setCloudStorageProvider(cloudStorageProvider);
            asset.setCloudStorageBucket(cloudStorageBucket);
            asset.setCloudStorageRegion(cloudStorageRegion);
            asset.setCloudStorageKey(cloudStorageKey);
            asset.setCloudUploadedAt(cloudUploadedAt);
            asset.setVisualAssetType(visualAssetType);
            asset.setScenario(scenario);
            asset.setVisualStyle(visualStyle);
            asset.setQualityLevel(qualityLevel);
            asset.setSelectionStatus(selectionStatus);
            asset.setLicense(license);
            asset.setCommercialRisk(commercialRisk);
            asset.setMemberOnly(0);
            asset.setStatus("featured".equals(selectionStatus) ? 1 : 0);
            asset.setSort(0);
            asset.setSyncKey(syncKey);
            asset.setSourceCreatedAt(sourceCreatedAt);
            asset.setSourceUpdatedAt(sourceUpdatedAt);
            asset.setCreateTime(new Date());
            asset.setUpdateTime(new Date());
            asset.setIsDelete(0);
            return asset;
        }

        boolean hasChanged(PromptAsset existing, Long categoryId) {
            if (existing == null) {
                return true;
            }
            return !StringUtils.equals(StringUtils.defaultString(existing.getPromptContent()), StringUtils.defaultString(originalPrompt))
                    || !StringUtils.equals(StringUtils.defaultString(existing.getPromptCn()), StringUtils.defaultString(promptCn))
                    || !StringUtils.equals(StringUtils.defaultString(existing.getSourceImageHash()), StringUtils.defaultString(imageHash))
                    || !StringUtils.equals(StringUtils.defaultString(existing.getSourceCloudStorageUrl()), StringUtils.defaultString(cloudStorageUrl))
                    || !StringUtils.equals(StringUtils.defaultString(existing.getSourceThumbnailCloudStorageUrl()), StringUtils.defaultString(thumbnailCloudStorageUrl))
                    || !StringUtils.equals(StringUtils.defaultString(existing.getSourceUpdatedAt()), StringUtils.defaultString(sourceUpdatedAt))
                    || !java.util.Objects.equals(existing.getCategoryId(), categoryId);
        }

        private String buildTitle() {
            if (StringUtils.isNotBlank(repoName)) {
                return StringUtils.left(repoName, 120);
            }
            String source = StringUtils.defaultIfBlank(originalPrompt, assetType);
            return StringUtils.left(source.replaceAll("\\s+", " ").trim(), 120);
        }

        private static String buildSyncKey(SourcePromptRow row) {
            String raw = SOURCE_NAME + "|" + row.getSourcePairId() + "|" + row.getSourceCategory()
                    + "|" + StringUtils.defaultString(row.getImageHash())
                    + "|" + normalize(row.getOriginalPrompt());
            return DigestUtil.sha256Hex(raw);
        }

        private static String normalize(String value) {
            return StringUtils.defaultString(value).replaceAll("\\s+", " ").trim().toLowerCase();
        }

        private static String firstNotBlank(String first, String second) {
            return StringUtils.isNotBlank(first) ? first : second;
        }

        private static String defaultIfBlank(String value, String defaultValue) {
            return StringUtils.isBlank(value) ? defaultValue : value;
        }

        private static String firstValidCn(String formal, String suggestion) {
            if (isValidCn(formal)) {
                return formal;
            }
            if (isValidCn(suggestion)) {
                return suggestion;
            }
            return null;
        }

        private static boolean isValidCn(String value) {
            String text = StringUtils.trimToEmpty(value);
            if (StringUtils.isBlank(text)) {
                return false;
            }
            for (String marker : STALE_CN_MARKERS) {
                if (text.contains(marker)) {
                    return false;
                }
            }
            return true;
        }

        private static String optionalString(ResultSet rs, String columnLabel) throws Exception {
            if (!hasColumn(rs, columnLabel)) {
                return null;
            }
            return rs.getString(columnLabel);
        }

        private static Integer optionalInteger(ResultSet rs, String columnLabel) throws Exception {
            if (!hasColumn(rs, columnLabel)) {
                return null;
            }
            Object value = rs.getObject(columnLabel);
            return value == null ? null : ((Number) value).intValue();
        }

        private static Long optionalLong(ResultSet rs, String columnLabel) throws Exception {
            if (!hasColumn(rs, columnLabel)) {
                return null;
            }
            Object value = rs.getObject(columnLabel);
            return value == null ? null : ((Number) value).longValue();
        }

        private static boolean hasColumn(ResultSet rs, String columnLabel) throws Exception {
            ResultSetMetaData metaData = rs.getMetaData();
            int count = metaData.getColumnCount();
            for (int i = 1; i <= count; i++) {
                if (columnLabel.equalsIgnoreCase(metaData.getColumnLabel(i))) {
                    return true;
                }
            }
            return false;
        }
    }
}
