package com.yupi.springbootinit.service;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.analytics.*;
import com.yupi.springbootinit.model.entity.User;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import static org.junit.jupiter.api.Assertions.*;

class ResourceAnalyticsServiceTest {
    JdbcTemplate db;
    ResourceAnalyticsService service;
    User user;
    @BeforeEach void setup() throws Exception {
        db=new JdbcTemplate(new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=MySQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER;DATABASE_TO_LOWER=TRUE","sa",""));
        String schema=new String(Files.readAllBytes(Paths.get("sql/resource_analytics.sql")),StandardCharsets.UTF_8)
                .replace("UTC_TIMESTAMP(3) + INTERVAL 8 HOUR","CURRENT_TIMESTAMP(3)");
        for(String statement:schema.replaceAll("(?m)^--.*$", "").split(";")) if(!statement.trim().isEmpty()) db.execute(statement);
        db.execute("CREATE TABLE user(id BIGINT PRIMARY KEY,userName VARCHAR(100),userRole VARCHAR(20),isDelete INT DEFAULT 0)");
        for(String type:Arrays.asList("artwork","video_background","prompt_asset")) {
            db.execute("CREATE TABLE "+type+"(id BIGINT PRIMARY KEY,title VARCHAR(100),status INT,assetType VARCHAR(32),isDelete INT DEFAULT 0,createTime DATETIME)");
            String col=type.equals("artwork") ? "artworkId" : type.equals("prompt_asset") ? "promptAssetId" : "videoBackgroundId";
            db.execute("CREATE TABLE "+type+"_favorite(id BIGINT PRIMARY KEY,userId BIGINT,"+col+" BIGINT,isDelete INT DEFAULT 0,createTime DATETIME)");
            db.update("INSERT INTO "+type+"(id,title,status,assetType,createTime) VALUES(1,'Sample',1,'image_prompt',?)",ResourceAnalyticsService.now());
        }
        db.update("INSERT INTO user VALUES(10,'Tester','user',0)");
        db.update("INSERT INTO user VALUES(20,'Admin','admin',0)");
        service=new ResourceAnalyticsService(db);user=new User();user.setId(10L);user.setUserRole("user");
    }
    ResourceTrackRequest event(String action) {
        ResourceTrackRequest r=new ResourceTrackRequest();r.setAction(action);r.setResourceType("artwork");r.setResourceId(1L);r.setEventKey(UUID.randomUUID().toString());return r;
    }
    @Test void rollingViewsAndRetriesAreDeduplicated() {
        ResourceTrackRequest first=event("view");service.track(first,user);service.track(first,user);service.track(event("view"),user);
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM resource_event",Integer.class));
        db.update("UPDATE resource_event SET eventTime=?",Timestamp.valueOf(LocalDateTime.now(ResourceAnalyticsService.ZONE).minusMinutes(31)));
        service.track(event("view"),user);
        assertEquals(2,db.queryForObject("SELECT COUNT(*) FROM resource_event",Integer.class));
    }
    @Test void restrictionsApplyToExistingUserObjectsAndRestoreWithoutChangingRole() {
        service.checkDownload(user);
        DownloadPermissionRequest r=new DownloadPermissionRequest();r.setUserId(10L);r.setRestricted(true);r.setReason("manual review");
        User admin=new User();admin.setId(20L);service.permission(r,admin);
        assertEquals(ErrorCode.DOWNLOAD_RESTRICTED.getCode(),assertThrows(BusinessException.class,()->service.checkDownload(user)).getCode());
        r.setRestricted(false);r.setReason("review completed");service.permission(r,admin);service.checkDownload(user);
        assertEquals(2,service.audit(10L).size());
        assertEquals("user",db.queryForObject("SELECT userRole FROM user WHERE id=10",String.class));
        db.update("UPDATE user SET userRole='ban' WHERE id=10");
        assertThrows(BusinessException.class,()->service.checkDownload(user));
    }
    @SuppressWarnings("unchecked")
    @Test void aggregatesCountRepeatedTrafficButDeduplicatePopularity() {
        service.track(event("view"),user);
        ResourceTrackRequest copy=event("copy");service.track(copy,user);service.track(copy,user);service.track(event("copy"),user);
        long first=service.startDownload("artwork",1,null,user);service.finish(first,1024,true,null);
        long repeat=service.startDownload("artwork",1,null,user);service.finish(repeat,2048,true,null);
        long failed=service.startDownload("artwork",1,null,user);service.finish(failed,512,false,"transfer_interrupted");
        db.update("INSERT INTO artwork_favorite VALUES(1,10,1,0,?)",ResourceAnalyticsService.now());
        service.aggregate();service.aggregate();
        Map<String,Object> row=((List<Map<String,Object>>)service.resources(null,null,"artwork","hotScore",1,20).get("records")).get(0);
        assertEquals(3,((Number)row.get("requests")).intValue());
        assertEquals(2,((Number)row.get("downloads")).intValue());
        assertEquals(1,((Number)row.get("effectiveDownloads")).intValue());
        assertEquals(3584,((Number)row.get("transferredBytes")).intValue());
        assertEquals(2,((Number)row.get("copies")).intValue());
        assertEquals(11,((Number)row.get("hotScore")).intValue());
        db.update("UPDATE artwork_favorite SET isDelete=1");
        row=((List<Map<String,Object>>)service.resources(null,null,"artwork","hotScore",1,20).get("records")).get(0);
        assertEquals(8,((Number)row.get("hotScore")).intValue());
        assertEquals(3L,service.downloads(null,null,10L,null,null,1,20).get("total"));
        assertEquals(2L,service.accounts(null,null,"requests","",1,20).get("total"));
        assertEquals(21,((List<?>)service.overview(null,null).get("daily")).size());
    }
    @Test void validatesScopeAndPublishedState() {
        assertEquals(LocalDate.of(2026,9,13),ResourceAnalyticsService.databaseDate(LocalDateTime.of(2026,9,13,0,0)));
        assertEquals(LocalDate.of(2026,9,13),ResourceAnalyticsService.databaseDate(Timestamp.valueOf("2026-09-13 23:59:59")));
        assertThrows(BusinessException.class,()->ResourceAnalyticsService.hotOrder("anything",7));
        assertThrows(BusinessException.class,()->ResourceAnalyticsService.hotOrder("artwork",366));
        db.update("UPDATE artwork SET status=0");
        assertThrows(BusinessException.class,()->service.track(event("view"),user));
        assertThrows(BusinessException.class,()->ResourceAnalyticsService.range(ResourceAnalyticsService.today(),ResourceAnalyticsService.today().minusDays(1)));
    }
    @Test void concurrentViewRequestsOnlyProduceOneEvent() throws Exception {
        org.springframework.transaction.support.TransactionTemplate tx = new org.springframework.transaction.support.TransactionTemplate(
                new org.springframework.jdbc.datasource.DataSourceTransactionManager(db.getDataSource()));
        java.util.concurrent.ExecutorService pool=java.util.concurrent.Executors.newFixedThreadPool(4);
        try {
            List<java.util.concurrent.Future<?>> futures=new ArrayList<>();
            for(int i=0;i<8;i++) futures.add(pool.submit(()->tx.execute(status->service.track(event("view"),user))));
            for(java.util.concurrent.Future<?> f:futures) f.get(10,java.util.concurrent.TimeUnit.SECONDS);
            assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM resource_event",Integer.class));
        } finally {pool.shutdownNow();}
    }
}
