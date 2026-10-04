package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogCreateRequest;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogImportRequest;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogVersionActionRequest;
import com.yupi.springbootinit.model.vo.imagecatalog.ImageCatalogImportResultVO;
import com.yupi.springbootinit.model.vo.imagecatalog.ImageCatalogVO;
import com.yupi.springbootinit.service.impl.ImageCatalogServiceImpl;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class ImageCatalogServiceTest {
    private static final Long CATEGORY_ID = 2057283059198771201L;
    private static final Long USER_ID = 7L;
    private static final String SOURCE_SHA = "a".repeat(64);
    private static final String UPDATED_AT = "2026-06-04T10:46:24.000+00:00";

    private JdbcTemplate jdbc;
    private ImageCatalogService service;

    @BeforeEach
    void setup() {
        jdbc = new JdbcTemplate(new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
                "sa", ""));
        jdbc.execute("CREATE TABLE prompt_asset(id BIGINT PRIMARY KEY,categoryId BIGINT,assetType VARCHAR(32),"
                + "status INT,updateTime TIMESTAMP,isDelete INT DEFAULT 0)");
        jdbc.execute("CREATE TABLE image_catalog_version(id BIGINT PRIMARY KEY,categoryId BIGINT,assetType VARCHAR(32),"
                + "name VARCHAR(128),status VARCHAR(16),sourceSha256 CHAR(64),expectedAssetCount INT,createUserId BIGINT,"
                + "reviewUserId BIGINT,activateUserId BIGINT,reviewTime TIMESTAMP,activateTime TIMESTAMP,"
                + "createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,isDelete INT DEFAULT 0,"
                + "UNIQUE(categoryId,assetType,name,isDelete))");
        jdbc.execute("CREATE TABLE image_channel(id BIGINT PRIMARY KEY,catalogVersionId BIGINT,channelCode VARCHAR(64),"
                + "name VARCHAR(64),sort INT,createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,isDelete INT DEFAULT 0,"
                + "UNIQUE(catalogVersionId,channelCode,isDelete),UNIQUE(catalogVersionId,name,isDelete))");
        jdbc.execute("CREATE TABLE image_catalog_import_batch(id BIGINT PRIMARY KEY,catalogVersionId BIGINT,batchKey VARCHAR(128),"
                + "sourceSha256 CHAR(64),batchSha256 CHAR(64),recordCount INT,relationCount INT,status VARCHAR(16),createUserId BIGINT,"
                + "createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,finishTime TIMESTAMP,UNIQUE(catalogVersionId,batchKey))");
        jdbc.execute("CREATE TABLE image_channel_member(id BIGINT PRIMARY KEY,catalogVersionId BIGINT,channelId BIGINT,"
                + "promptAssetId BIGINT,sourceVersion CHAR(64),sourceUpdateTime TIMESTAMP,sourceStatus INT,inputSha256 CHAR(64),"
                + "decisionMethod VARCHAR(96),evidenceJson CLOB,batchId BIGINT,createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
                + "isDelete INT DEFAULT 0,UNIQUE(catalogVersionId,channelId,promptAssetId,isDelete))");
        Timestamp timestamp = Timestamp.from(OffsetDateTime.parse(UPDATED_AT).toInstant());
        jdbc.update("INSERT INTO prompt_asset VALUES (1,?,'image_prompt',1,?,0)", CATEGORY_ID, timestamp);
        jdbc.update("INSERT INTO prompt_asset VALUES (2,?,'image_prompt',0,?,0)", CATEGORY_ID, timestamp);
        service = new ImageCatalogServiceImpl(jdbc, new ObjectMapper());
    }

    @Test
    void stagedImportIsIdempotentReviewedAndAtomicallyActivated() {
        assertNull(service.getActiveCatalog(CATEGORY_ID, "image_prompt"));
        Long versionId = service.createVersion(createRequest("v1"), USER_ID);
        ImageCatalogImportRequest batch = importRequest(versionId);
        ImageCatalogImportResultVO first = service.importMembers(batch, USER_ID);
        ImageCatalogImportResultVO replay = service.importMembers(batch, USER_ID);
        assertEquals(false, first.getIdempotentReplay());
        assertEquals(true, replay.getIdempotentReplay());
        assertEquals(first.getBatchId(), replay.getBatchId());

        ImageCatalogVersionActionRequest review = new ImageCatalogVersionActionRequest();
        review.setCatalogVersionId(versionId);
        assertEquals("REVIEWED", service.reviewVersion(review, USER_ID).getStatus());

        ImageCatalogVersionActionRequest activate = new ImageCatalogVersionActionRequest();
        activate.setCatalogVersionId(versionId);
        activate.setExpectedActiveVersionId(null);
        ImageCatalogVO active = service.activateVersion(activate, USER_ID);
        assertEquals("ACTIVE", active.getStatus());
        assertEquals(2L, active.getImportedAssetCount());
        assertEquals(50, active.getChannels().size());
        assertEquals(1L, active.getChannels().get(0).getPublishedCount());
        assertNotNull(service.getActiveCatalog(CATEGORY_ID, "image_prompt"));

        ImageCatalogVersionActionRequest deactivate = new ImageCatalogVersionActionRequest();
        deactivate.setCatalogVersionId(versionId);
        deactivate.setExpectedActiveVersionId(versionId);
        assertEquals("RETIRED", service.deactivateVersion(deactivate, USER_ID).getStatus());
        assertNull(service.getActiveCatalog(CATEGORY_ID, "image_prompt"));
        assertEquals("RETIRED", service.deactivateVersion(deactivate, USER_ID).getStatus());
    }

    @Test
    void importRejectsSourceDriftBeforeWritingBatch() {
        Long versionId = service.createVersion(createRequest("v1"), USER_ID);
        jdbc.update("UPDATE prompt_asset SET status=0 WHERE id=1");
        assertThrows(BusinessException.class, () -> service.importMembers(importRequest(versionId), USER_ID));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM image_catalog_import_batch", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM image_channel_member", Integer.class));
    }

    @Test
    void createVersionIsIdempotentOnlyWhileDraftAndContentMatches() {
        ImageCatalogCreateRequest request = createRequest("v1");
        Long first = service.createVersion(request, USER_ID);
        assertEquals(first, service.createVersion(request, USER_ID));
        request.getChannels().get(0).setName("不同分类");
        assertThrows(BusinessException.class, () -> service.createVersion(request, USER_ID));
    }

    private ImageCatalogCreateRequest createRequest(String name) {
        ImageCatalogCreateRequest request = new ImageCatalogCreateRequest();
        request.setCategoryId(CATEGORY_ID);
        request.setAssetType("image_prompt");
        request.setName(name);
        request.setSourceSha256(SOURCE_SHA);
        request.setExpectedAssetCount(2);
        List<ImageCatalogCreateRequest.ChannelInput> channels = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            ImageCatalogCreateRequest.ChannelInput channel = new ImageCatalogCreateRequest.ChannelInput();
            channel.setCode("channel-" + i);
            channel.setName("分类" + i);
            channel.setSort(i);
            channels.add(channel);
        }
        request.setChannels(channels);
        return request;
    }

    private ImageCatalogImportRequest importRequest(Long versionId) {
        ImageCatalogImportRequest request = new ImageCatalogImportRequest();
        request.setCatalogVersionId(versionId);
        request.setBatchKey("batch-001");
        request.setSourceSha256(SOURCE_SHA);
        request.setBatchSha256("d".repeat(64));
        request.setMembers(Arrays.asList(member(1L, 1, Arrays.asList("分类0", "分类1")),
                member(2L, 0, Arrays.asList("分类2"))));
        return request;
    }

    private ImageCatalogImportRequest.MemberInput member(Long id, int status, List<String> channels) {
        ImageCatalogImportRequest.MemberInput member = new ImageCatalogImportRequest.MemberInput();
        member.setPromptAssetId(id);
        member.setSourceVersion("b".repeat(64));
        member.setSourceUpdateTime(UPDATED_AT);
        member.setSourceStatus(status);
        member.setInputSha256("c".repeat(64));
        member.setDecisionMethod("assistant_text_policy");
        member.setEvidenceJson("[]");
        member.setChannelNames(channels);
        return member;
    }
}
