package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogCreateRequest;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogImportRequest;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogVersionActionRequest;
import com.yupi.springbootinit.model.vo.imagecatalog.ImageCatalogImportResultVO;
import com.yupi.springbootinit.model.vo.imagecatalog.ImageCatalogVO;
import com.yupi.springbootinit.model.vo.imagecatalog.ImageChannelVO;
import com.yupi.springbootinit.service.ImageCatalogService;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ImageCatalogServiceImpl implements ImageCatalogService {
    private static final String DRAFT = "DRAFT";
    private static final String REVIEWED = "REVIEWED";
    private static final String ACTIVE = "ACTIVE";
    private static final String RETIRED = "RETIRED";
    private static final int TARGET_CHANNEL_COUNT = 50;
    private static final int MAX_IMPORT_SIZE = 500;
    private static final Pattern SHA256 = Pattern.compile("^[0-9a-f]{64}$");
    private static final Pattern CHANNEL_CODE = Pattern.compile("^[a-z0-9][a-z0-9_-]{0,63}$");

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public ImageCatalogServiceImpl(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @Override
    public Map<String, Object> ensureSchema() {
        if (jdbc.getDataSource() == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Database is unavailable");
        }
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
                new ClassPathResource("db/image_catalog_versioned_channels.sql"));
        populator.setContinueOnError(false);
        populator.execute(jdbc.getDataSource());
        Integer tableCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() "
                        + "AND table_name IN ('image_catalog_version','image_channel','image_catalog_import_batch','image_channel_member')",
                Integer.class);
        if (!Objects.equals(tableCount, 4)) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Image catalog schema verification failed");
        }
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("tableCount", tableCount);
        result.put("schemaReady", true);
        return result;
    }

    @Override
    public Map<String, Object> preflight(Long categoryId, String assetType) {
        requireScope(categoryId, assetType);
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        Map<String, Object> counts = jdbc.queryForMap(
                "SELECT COUNT(*) AS total,COALESCE(SUM(status=1),0) AS published,"
                        + "COALESCE(SUM(status=0),0) AS draft "
                        + "FROM prompt_asset WHERE categoryId=? AND assetType=? AND isDelete=0",
                categoryId, assetType.trim());
        Long bridgeCount = jdbc.queryForObject(
                "SELECT COUNT(DISTINCT p.id) FROM content_module_draft_bridge b INNER JOIN prompt_asset p "
                        + "ON (p.id=b.targetId OR p.id=b.draftId) WHERE b.resourceType='prompt_asset' "
                        + "AND p.categoryId=? AND p.assetType=? AND p.isDelete=0",
                Long.class, categoryId, assetType.trim());
        ImageCatalogVO active = getActiveCatalog(categoryId, assetType);
        result.put("total", ((Number) counts.get("total")).longValue());
        result.put("published", ((Number) counts.get("published")).longValue());
        result.put("draft", ((Number) counts.get("draft")).longValue());
        result.put("draftBridgeCount", bridgeCount);
        result.put("activeVersionId", active == null ? null : active.getVersionId());
        return result;
    }

    @Override
    public ImageCatalogVO getActiveCatalog(Long categoryId, String assetType) {
        requireScope(categoryId, assetType);
        List<CatalogRow> rows = jdbc.query(
                "SELECT id,categoryId,assetType,name,status,sourceSha256,expectedAssetCount "
                        + "FROM image_catalog_version WHERE categoryId=? AND assetType=? AND status='ACTIVE' "
                        + "AND isDelete=0 ORDER BY activateTime DESC,id DESC LIMIT 1",
                (rs, n) -> catalogRow(rs.getLong("id"), rs.getLong("categoryId"), rs.getString("assetType"),
                        rs.getString("name"), rs.getString("status"), rs.getString("sourceSha256"),
                        rs.getInt("expectedAssetCount")),
                categoryId, assetType.trim());
        return rows.isEmpty() ? null : toVO(rows.get(0), true);
    }

    @Override
    public ImageCatalogVO getVersion(Long versionId) {
        return toVO(requireVersion(versionId, false), false);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createVersion(ImageCatalogCreateRequest request, Long userId) {
        if (request == null || userId == null || userId <= 0) {
            throw params("Missing catalog or operator");
        }
        requireScope(request.getCategoryId(), request.getAssetType());
        requireText(request.getName(), "Missing catalog name");
        requireSha(request.getSourceSha256(), "Invalid sourceSha256");
        if (request.getExpectedAssetCount() == null || request.getExpectedAssetCount() <= 0) {
            throw params("expectedAssetCount must be positive");
        }
        List<ImageCatalogCreateRequest.ChannelInput> channels = request.getChannels();
        if (channels == null || channels.size() != TARGET_CHANNEL_COUNT) {
            throw params("Exactly 50 ordered channels are required");
        }
        Set<String> codes = new HashSet<>();
        Set<String> names = new HashSet<>();
        Set<Integer> sorts = new HashSet<>();
        for (ImageCatalogCreateRequest.ChannelInput channel : channels) {
            if (channel == null || StringUtils.isBlank(channel.getCode())
                    || !CHANNEL_CODE.matcher(channel.getCode()).matches()
                    || StringUtils.isBlank(channel.getName()) || channel.getName().trim().length() > 64
                    || channel.getSort() == null || channel.getSort() < 0
                    || !codes.add(channel.getCode()) || !names.add(channel.getName().trim())
                    || !sorts.add(channel.getSort())) {
                throw params("Channel code, name and sort must be valid and unique");
            }
        }
        List<CatalogRow> existingVersions = jdbc.query(
                "SELECT id,categoryId,assetType,name,status,sourceSha256,expectedAssetCount "
                        + "FROM image_catalog_version WHERE categoryId=? AND assetType=? AND name=? AND isDelete=0 LIMIT 1",
                (rs, n) -> catalogRow(rs.getLong("id"), rs.getLong("categoryId"), rs.getString("assetType"),
                        rs.getString("name"), rs.getString("status"), rs.getString("sourceSha256"),
                        rs.getInt("expectedAssetCount")),
                request.getCategoryId(), request.getAssetType().trim(), request.getName().trim());
        if (!existingVersions.isEmpty()) {
            CatalogRow existing = existingVersions.get(0);
            List<Map<String, Object>> existingChannels = jdbc.queryForList(
                    "SELECT channelCode,name,sort FROM image_channel WHERE catalogVersionId=? AND isDelete=0 ORDER BY sort,id",
                    existing.id);
            boolean channelsMatch = existingChannels.size() == channels.size();
            for (int i = 0; channelsMatch && i < channels.size(); i++) {
                Map<String, Object> stored = existingChannels.get(i);
                ImageCatalogCreateRequest.ChannelInput requested = channels.get(i);
                channelsMatch = Objects.equals(stored.get("channelCode"), requested.getCode())
                        && Objects.equals(stored.get("name"), requested.getName().trim())
                        && ((Number) stored.get("sort")).intValue() == requested.getSort();
            }
            if (DRAFT.equals(existing.status) && existing.sourceSha256.equals(request.getSourceSha256())
                    && existing.expectedAssetCount.equals(request.getExpectedAssetCount()) && channelsMatch) {
                return existing.id;
            }
            throw params("A catalog with this scope and name already exists with different content or state");
        }
        Long versionId = IdWorker.getId();
        jdbc.update("INSERT INTO image_catalog_version "
                        + "(id,categoryId,assetType,name,status,sourceSha256,expectedAssetCount,createUserId) "
                        + "VALUES (?,?,?,?,?,?,?,?)",
                versionId, request.getCategoryId(), request.getAssetType().trim(), request.getName().trim(), DRAFT,
                request.getSourceSha256(), request.getExpectedAssetCount(), userId);
        for (ImageCatalogCreateRequest.ChannelInput channel : channels) {
            jdbc.update("INSERT INTO image_channel (id,catalogVersionId,channelCode,name,sort) VALUES (?,?,?,?,?)",
                    IdWorker.getId(), versionId, channel.getCode(), channel.getName().trim(), channel.getSort());
        }
        return versionId;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImageCatalogImportResultVO importMembers(ImageCatalogImportRequest request, Long userId) {
        if (request == null || userId == null || userId <= 0 || request.getCatalogVersionId() == null) {
            throw params("Missing import request or operator");
        }
        requireText(request.getBatchKey(), "Missing batchKey");
        requireSha(request.getSourceSha256(), "Invalid sourceSha256");
        requireSha(request.getBatchSha256(), "Invalid batchSha256");
        List<ImageCatalogImportRequest.MemberInput> members = request.getMembers();
        if (members == null || members.isEmpty() || members.size() > MAX_IMPORT_SIZE) {
            throw params("Each import batch must contain 1 to 500 records");
        }
        CatalogRow version = requireVersion(request.getCatalogVersionId(), true);
        if (!DRAFT.equals(version.status) || !version.sourceSha256.equals(request.getSourceSha256())) {
            throw params("Catalog must be DRAFT and sourceSha256 must match");
        }
        List<BatchRow> prior = jdbc.query(
                "SELECT id,sourceSha256,batchSha256,recordCount,relationCount,status FROM image_catalog_import_batch "
                        + "WHERE catalogVersionId=? AND batchKey=? LIMIT 1",
                (rs, n) -> new BatchRow(rs.getLong("id"), rs.getString("sourceSha256"), rs.getString("batchSha256"),
                        rs.getInt("recordCount"), rs.getInt("relationCount"), rs.getString("status")),
                version.id, request.getBatchKey().trim());
        if (!prior.isEmpty()) {
            BatchRow row = prior.get(0);
            if (!Objects.equals(row.sourceSha256, request.getSourceSha256())
                    || !Objects.equals(row.batchSha256, request.getBatchSha256())
                    || !"COMPLETED".equals(row.status)) {
                throw params("batchKey already exists with different or incomplete content");
            }
            return importResult(row.id, row.recordCount, row.relationCount, true);
        }

        Map<String, Long> channelIds = jdbc.query(
                "SELECT id,name FROM image_channel WHERE catalogVersionId=? AND isDelete=0",
                rs -> {
                    Map<String, Long> map = new HashMap<>();
                    while (rs.next()) map.put(rs.getString("name"), rs.getLong("id"));
                    return map;
                }, version.id);
        Set<Long> memberIds = new HashSet<>();
        int relationCount = 0;
        for (ImageCatalogImportRequest.MemberInput member : members) {
            validateMemberInput(member, channelIds);
            if (!memberIds.add(member.getPromptAssetId())) {
                throw params("Duplicate promptAssetId in batch: " + member.getPromptAssetId());
            }
            relationCount += member.getChannelNames().size();
        }
        Map<Long, AssetRow> assets = loadAssets(memberIds);
        String memberPlaceholders = memberIds.stream().map(id -> "?").collect(Collectors.joining(","));
        List<Object> existingArgs = new ArrayList<>();
        existingArgs.add(version.id);
        existingArgs.addAll(memberIds);
        Integer existingMemberCount = jdbc.queryForObject(
                "SELECT COUNT(DISTINCT promptAssetId) FROM image_channel_member WHERE catalogVersionId=? "
                        + "AND isDelete=0 AND promptAssetId IN (" + memberPlaceholders + ")",
                Integer.class, existingArgs.toArray());
        if (existingMemberCount != null && existingMemberCount > 0) {
            throw params("One or more prompt assets were already imported by another batch");
        }
        for (ImageCatalogImportRequest.MemberInput member : members) {
            AssetRow asset = assets.get(member.getPromptAssetId());
            if (asset == null || !Objects.equals(asset.categoryId, version.categoryId)
                    || !Objects.equals(asset.assetType, version.assetType)
                    || !Objects.equals(asset.status, member.getSourceStatus())
                    || !sameInstant(asset.updateTime, member.getSourceUpdateTime())) {
                throw params("Source asset changed or is outside catalog scope: " + member.getPromptAssetId());
            }
        }

        Long batchId = IdWorker.getId();
        jdbc.update("INSERT INTO image_catalog_import_batch "
                        + "(id,catalogVersionId,batchKey,sourceSha256,batchSha256,recordCount,relationCount,status,createUserId) "
                        + "VALUES (?,?,?,?,?,?,?,'RUNNING',?)",
                batchId, version.id, request.getBatchKey().trim(), request.getSourceSha256(), request.getBatchSha256(), members.size(),
                relationCount, userId);
        for (ImageCatalogImportRequest.MemberInput member : members) {
            Timestamp sourceUpdateTime = Timestamp.from(OffsetDateTime.parse(member.getSourceUpdateTime()).toInstant());
            for (String channelName : member.getChannelNames()) {
                jdbc.update("INSERT INTO image_channel_member "
                                + "(id,catalogVersionId,channelId,promptAssetId,sourceVersion,sourceUpdateTime,sourceStatus,"
                                + "inputSha256,decisionMethod,evidenceJson,batchId) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        IdWorker.getId(), version.id, channelIds.get(channelName), member.getPromptAssetId(),
                        member.getSourceVersion(), sourceUpdateTime, member.getSourceStatus(), member.getInputSha256(),
                        member.getDecisionMethod().trim(), member.getEvidenceJson(), batchId);
            }
        }
        jdbc.update("UPDATE image_catalog_import_batch SET status='COMPLETED',finishTime=CURRENT_TIMESTAMP WHERE id=?",
                batchId);
        return importResult(batchId, members.size(), relationCount, false);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImageCatalogVO reviewVersion(ImageCatalogVersionActionRequest request, Long userId) {
        CatalogRow version = requireActionVersion(request, userId);
        if (REVIEWED.equals(version.status)) {
            return getVersion(version.id);
        }
        if (!DRAFT.equals(version.status)) {
            throw params("Only a DRAFT catalog can be reviewed");
        }
        Integer channelCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM image_channel WHERE catalogVersionId=? AND isDelete=0", Integer.class, version.id);
        Long assetCount = jdbc.queryForObject(
                "SELECT COUNT(DISTINCT promptAssetId) FROM image_channel_member WHERE catalogVersionId=? AND isDelete=0",
                Long.class, version.id);
        Integer driftCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM image_channel_member m LEFT JOIN prompt_asset p ON p.id=m.promptAssetId "
                        + "WHERE m.catalogVersionId=? AND m.isDelete=0 AND (p.id IS NULL OR p.isDelete<>0 "
                        + "OR p.categoryId<>? OR p.assetType<>? OR p.status<>m.sourceStatus OR p.updateTime<>m.sourceUpdateTime)",
                Integer.class, version.id, version.categoryId, version.assetType);
        if (!Objects.equals(channelCount, TARGET_CHANNEL_COUNT)
                || !Objects.equals(assetCount, version.expectedAssetCount.longValue())
                || (driftCount != null && driftCount > 0)) {
            throw params("Catalog review failed: expected 50 channels, exact asset count, and zero source drift");
        }
        jdbc.update("UPDATE image_catalog_version SET status=?,reviewUserId=?,reviewTime=CURRENT_TIMESTAMP WHERE id=?",
                REVIEWED, userId, version.id);
        return getVersion(version.id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImageCatalogVO activateVersion(ImageCatalogVersionActionRequest request, Long userId) {
        CatalogRow target = requireActionVersion(request, userId);
        if (ACTIVE.equals(target.status)) {
            return getVersion(target.id);
        }
        if (!REVIEWED.equals(target.status) && !RETIRED.equals(target.status)) {
            throw params("Only a REVIEWED or RETIRED catalog can be activated");
        }
        List<Long> activeIds = jdbc.queryForList(
                "SELECT id FROM image_catalog_version WHERE categoryId=? AND assetType=? AND status='ACTIVE' "
                        + "AND isDelete=0 FOR UPDATE",
                Long.class, target.categoryId, target.assetType);
        Long currentActive = activeIds.isEmpty() ? null : activeIds.get(0);
        if (activeIds.size() > 1) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Multiple active catalogs detected for the same scope");
        }
        if (!Objects.equals(currentActive, request.getExpectedActiveVersionId())) {
            throw params("Active catalog changed; refresh and retry with expectedActiveVersionId");
        }
        if (currentActive != null) {
            jdbc.update("UPDATE image_catalog_version SET status=? WHERE id=?", RETIRED, currentActive);
        }
        jdbc.update("UPDATE image_catalog_version SET status=?,activateUserId=?,activateTime=CURRENT_TIMESTAMP WHERE id=?",
                ACTIVE, userId, target.id);
        return getVersion(target.id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImageCatalogVO deactivateVersion(ImageCatalogVersionActionRequest request, Long userId) {
        CatalogRow target = requireActionVersion(request, userId);
        List<Long> activeIds = jdbc.queryForList(
                "SELECT id FROM image_catalog_version WHERE categoryId=? AND assetType=? AND status='ACTIVE' "
                        + "AND isDelete=0 FOR UPDATE",
                Long.class, target.categoryId, target.assetType);
        if (activeIds.size() > 1) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Multiple active catalogs detected for the same scope");
        }
        Long currentActive = activeIds.isEmpty() ? null : activeIds.get(0);
        if (RETIRED.equals(target.status) && currentActive == null) {
            return getVersion(target.id);
        }
        if (!ACTIVE.equals(target.status) || !Objects.equals(currentActive, target.id)
                || !Objects.equals(request.getExpectedActiveVersionId(), target.id)) {
            throw params("Only the expected ACTIVE catalog can be deactivated");
        }
        jdbc.update("UPDATE image_catalog_version SET status=? WHERE id=?", RETIRED, target.id);
        return getVersion(target.id);
    }

    private CatalogRow requireActionVersion(ImageCatalogVersionActionRequest request, Long userId) {
        if (request == null || request.getCatalogVersionId() == null || userId == null || userId <= 0) {
            throw params("Missing catalog action or operator");
        }
        return requireVersion(request.getCatalogVersionId(), true);
    }

    private CatalogRow requireVersion(Long versionId, boolean lock) {
        if (versionId == null || versionId <= 0) throw params("Invalid catalogVersionId");
        List<CatalogRow> rows = jdbc.query(
                "SELECT id,categoryId,assetType,name,status,sourceSha256,expectedAssetCount "
                        + "FROM image_catalog_version WHERE id=? AND isDelete=0" + (lock ? " FOR UPDATE" : ""),
                (rs, n) -> catalogRow(rs.getLong("id"), rs.getLong("categoryId"), rs.getString("assetType"),
                        rs.getString("name"), rs.getString("status"), rs.getString("sourceSha256"),
                        rs.getInt("expectedAssetCount")), versionId);
        if (rows.isEmpty()) throw new BusinessException(ErrorCode.NOT_FOUND_ERROR, "Image catalog not found");
        return rows.get(0);
    }

    private ImageCatalogVO toVO(CatalogRow row, boolean publishedCountsOnly) {
        ImageCatalogVO vo = new ImageCatalogVO();
        vo.setVersionId(row.id);
        vo.setCategoryId(row.categoryId);
        vo.setAssetType(row.assetType);
        vo.setName(row.name);
        vo.setStatus(row.status);
        vo.setSourceSha256(row.sourceSha256);
        vo.setExpectedAssetCount(row.expectedAssetCount);
        vo.setImportedAssetCount(jdbc.queryForObject(
                "SELECT COUNT(DISTINCT promptAssetId) FROM image_channel_member WHERE catalogVersionId=? AND isDelete=0",
                Long.class, row.id));
        String joinCondition = publishedCountsOnly
                ? " LEFT JOIN prompt_asset p ON p.id=m.promptAssetId AND p.status=1 AND p.isDelete=0"
                : " LEFT JOIN prompt_asset p ON p.id=m.promptAssetId AND p.isDelete=0";
        String countExpression = publishedCountsOnly ? "COUNT(p.id)" : "COUNT(m.id)";
        vo.setChannels(jdbc.query(
                "SELECT c.id,c.channelCode,c.name,c.sort," + countExpression + " AS itemCount FROM image_channel c "
                        + "LEFT JOIN image_channel_member m ON m.channelId=c.id AND m.catalogVersionId=c.catalogVersionId "
                        + "AND m.isDelete=0" + joinCondition + " WHERE c.catalogVersionId=? AND c.isDelete=0 "
                        + "GROUP BY c.id,c.channelCode,c.name,c.sort ORDER BY c.sort,c.id",
                (rs, n) -> {
                    ImageChannelVO channel = new ImageChannelVO();
                    channel.setId(rs.getLong("id"));
                    channel.setCode(rs.getString("channelCode"));
                    channel.setName(rs.getString("name"));
                    channel.setSort(rs.getInt("sort"));
                    channel.setPublishedCount(rs.getLong("itemCount"));
                    return channel;
                }, row.id));
        return vo;
    }

    private Map<Long, AssetRow> loadAssets(Set<Long> ids) {
        String placeholders = ids.stream().map(id -> "?").collect(Collectors.joining(","));
        List<Object> args = new ArrayList<>(ids);
        return jdbc.query("SELECT id,categoryId,assetType,status,updateTime FROM prompt_asset WHERE isDelete=0 AND id IN ("
                        + placeholders + ")",
                rs -> {
                    Map<Long, AssetRow> result = new HashMap<>();
                    while (rs.next()) {
                        AssetRow row = new AssetRow();
                        row.id = rs.getLong("id");
                        row.categoryId = rs.getLong("categoryId");
                        row.assetType = rs.getString("assetType");
                        row.status = rs.getInt("status");
                        row.updateTime = rs.getTimestamp("updateTime");
                        result.put(row.id, row);
                    }
                    return result;
                }, args.toArray());
    }

    private void validateMemberInput(ImageCatalogImportRequest.MemberInput member, Map<String, Long> channelIds) {
        if (member == null || member.getPromptAssetId() == null || member.getPromptAssetId() <= 0
                || member.getSourceStatus() == null || StringUtils.isBlank(member.getSourceUpdateTime())
                || StringUtils.isBlank(member.getDecisionMethod()) || member.getChannelNames() == null
                || member.getChannelNames().isEmpty() || new HashSet<>(member.getChannelNames()).size() != member.getChannelNames().size()) {
            throw params("Invalid member input");
        }
        requireSha(member.getSourceVersion(), "Invalid sourceVersion");
        requireSha(member.getInputSha256(), "Invalid inputSha256");
        try {
            OffsetDateTime.parse(member.getSourceUpdateTime());
            if (StringUtils.isNotBlank(member.getEvidenceJson())) objectMapper.readTree(member.getEvidenceJson());
        } catch (Exception e) {
            throw params("Invalid sourceUpdateTime or evidenceJson for " + member.getPromptAssetId());
        }
        for (String name : member.getChannelNames()) {
            if (!channelIds.containsKey(name)) throw params("Unknown channel: " + name);
        }
    }

    private boolean sameInstant(Timestamp current, String expected) {
        return current != null && current.toInstant().equals(OffsetDateTime.parse(expected).toInstant());
    }

    private void requireScope(Long categoryId, String assetType) {
        if (categoryId == null || categoryId <= 0 || StringUtils.isBlank(assetType) || assetType.trim().length() > 32) {
            throw params("Invalid categoryId or assetType");
        }
    }

    private void requireText(String value, String message) {
        if (StringUtils.isBlank(value)) throw params(message);
    }

    private void requireSha(String value, String message) {
        if (value == null || !SHA256.matcher(value.toLowerCase(Locale.ROOT)).matches()) throw params(message);
    }

    private BusinessException params(String message) {
        return new BusinessException(ErrorCode.PARAMS_ERROR, message);
    }

    private CatalogRow catalogRow(Long id, Long categoryId, String assetType, String name, String status,
            String sourceSha256, Integer expectedAssetCount) {
        CatalogRow row = new CatalogRow();
        row.id = id;
        row.categoryId = categoryId;
        row.assetType = assetType;
        row.name = name;
        row.status = status;
        row.sourceSha256 = sourceSha256;
        row.expectedAssetCount = expectedAssetCount;
        return row;
    }

    private ImageCatalogImportResultVO importResult(Long batchId, Integer records, Integer relations, boolean replay) {
        ImageCatalogImportResultVO result = new ImageCatalogImportResultVO();
        result.setBatchId(batchId);
        result.setRecordCount(records);
        result.setRelationCount(relations);
        result.setIdempotentReplay(replay);
        return result;
    }

    private static class CatalogRow {
        Long id;
        Long categoryId;
        String assetType;
        String name;
        String status;
        String sourceSha256;
        Integer expectedAssetCount;
    }

    private static class AssetRow {
        Long id;
        Long categoryId;
        String assetType;
        Integer status;
        Timestamp updateTime;
    }

    private static class BatchRow {
        final Long id;
        final String sourceSha256;
        final String batchSha256;
        final Integer recordCount;
        final Integer relationCount;
        final String status;

        BatchRow(Long id, String sourceSha256, String batchSha256, Integer recordCount, Integer relationCount, String status) {
            this.id = id;
            this.sourceSha256 = sourceSha256;
            this.batchSha256 = batchSha256;
            this.recordCount = recordCount;
            this.relationCount = relationCount;
            this.status = status;
        }
    }
}
