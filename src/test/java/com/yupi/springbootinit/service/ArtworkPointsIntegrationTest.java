package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.*;
import com.yupi.springbootinit.model.dto.order.OrderCreateRequest;
import com.yupi.springbootinit.model.entity.*;
import com.yupi.springbootinit.model.vo.artwork.ArtworkDetailVO;
import com.yupi.springbootinit.service.impl.*;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.*;
import java.util.concurrent.*;
import javax.annotation.Resource;
import javax.sql.DataSource;
import org.apache.ibatis.session.SqlSessionFactory;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Real MyBatis SQL, database locks, and Spring transaction proxies against isolated H2/MySQL-mode data. */
@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = ArtworkPointsIntegrationTest.Config.class)
class ArtworkPointsIntegrationTest {
    @Configuration
    @EnableTransactionManagement(proxyTargetClass = true)
    static class Config {
        @Bean DataSource dataSource() {
            JdbcDataSource ds = new JdbcDataSource();
            ds.setURL("jdbc:h2:mem:artwork-points;MODE=MySQL;NON_KEYWORDS=USER;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000");
            return ds;
        }
        @Bean DataSourceTransactionManager transactionManager(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean SqlSessionFactory sqlSessionFactory(DataSource ds) throws Exception {
            MybatisConfiguration config = new MybatisConfiguration();
            config.setMapUnderscoreToCamelCase(false);
            config.addMapper(UserMapper.class);
            config.addMapper(ArtworkMapper.class);
            config.addMapper(ArtworkOrderMapper.class);
            config.addMapper(ArtworkAccessMapper.class);
            config.addMapper(PointRecordMapper.class);
            MybatisSqlSessionFactoryBean factory = new MybatisSqlSessionFactoryBean();
            factory.setDataSource(ds);
            factory.setConfiguration(config);
            return factory.getObject();
        }
        @Bean SqlSessionTemplate session(SqlSessionFactory f) { return new SqlSessionTemplate(f); }
        @Bean UserMapper userMapper(SqlSessionTemplate s) { return s.getMapper(UserMapper.class); }
        @Bean ArtworkMapper artworkMapper(SqlSessionTemplate s) { return s.getMapper(ArtworkMapper.class); }
        @Bean ArtworkOrderMapper artworkOrderMapper(SqlSessionTemplate s) { return s.getMapper(ArtworkOrderMapper.class); }
        @Bean ArtworkAccessMapper artworkAccessMapper(SqlSessionTemplate s) {
            return mock(ArtworkAccessMapper.class, org.mockito.AdditionalAnswers.delegatesTo(s.getMapper(ArtworkAccessMapper.class)));
        }
        @Bean PointRecordMapper pointRecordMapper(SqlSessionTemplate s) { return s.getMapper(PointRecordMapper.class); }
        @Bean CategoryMapper categoryMapper() { return mock(CategoryMapper.class); }
        @Bean CategoryTagMapper categoryTagMapper() { return mock(CategoryTagMapper.class); }
        @Bean TagMapper tagMapper() { return mock(TagMapper.class); }
        @Bean ArtworkTagMapper artworkTagMapper() { return mock(ArtworkTagMapper.class); }
        @Bean ArtworkFavoriteMapper artworkFavoriteMapper() { return mock(ArtworkFavoriteMapper.class); }
        @Bean UserService userService() { return mock(UserService.class); }
        @Bean PointCheckInConfigService pointCheckInConfigService() { return mock(PointCheckInConfigService.class); }
        @Bean ArtworkService artworkService() { return new ArtworkServiceImpl(); }
        @Bean PointService pointService() { return new PointServiceImpl(); }
        @Bean OrderService orderService() { return new OrderServiceImpl(); }
    }

    @Resource DataSource dataSource;
    @Resource OrderService orders;
    @Resource ArtworkService artworks;
    @Resource PointService points;
    @Resource ArtworkAccessMapper accessMapper;
    @Resource CategoryMapper categories;
    @Resource CategoryTagMapper categoryTags;
    @Resource TagMapper tags;
    JdbcTemplate jdbc;

    @BeforeEach void seed() {
        jdbc = new JdbcTemplate(dataSource);
        for (Class<?> entity : Arrays.asList(User.class, Artwork.class, ArtworkOrder.class, ArtworkAccess.class, PointRecord.class)) {
            String table = entity.getAnnotation(TableName.class).value();
            jdbc.execute("DROP TABLE IF EXISTS " + table);
            List<String> columns = new ArrayList<>();
            for (Field field : entity.getDeclaredFields()) {
                if (Modifier.isStatic(field.getModifiers())) continue;
                TableField annotation = field.getAnnotation(TableField.class);
                if (annotation != null && !annotation.exist()) continue;
                String type = field.getType() == Long.class ? "BIGINT" : field.getType() == Integer.class ? "INT"
                        : field.getType() == Date.class ? "TIMESTAMP" : field.getType() == java.math.BigDecimal.class ? "DECIMAL(10,2)" : "VARCHAR(4000)";
                columns.add(field.getName() + " " + type + (field.getName().equals("id") ? " PRIMARY KEY" : field.getName().equals("isDelete") ? " DEFAULT 0" : ""));
            }
            jdbc.execute("CREATE TABLE " + table + " (" + String.join(",", columns) + ")");
        }
        jdbc.execute("ALTER TABLE artwork_access ADD CONSTRAINT uk_access UNIQUE(userId, artworkId)");
        jdbc.update("INSERT INTO user(id,memberLevel,pointBalance) VALUES(10,'normal',300)");
        jdbc.update("INSERT INTO artwork(id,title,categoryId,memberOnly,status,pointsPrice,promptContent,sourceZipUrl) VALUES(1,'Test',2,1,1,100,'secret prompt','https://private/source.zip')");
        clearInvocations(accessMapper);
    }

    User user() { User u = new User(); u.setId(10L); u.setMemberLevel("normal"); return u; }
    OrderCreateRequest request() { OrderCreateRequest r = new OrderCreateRequest(); r.setArtworkId(1L); r.setOrderType("points"); r.setExpectedPointsPrice(100); return r; }
    int count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class); }
    int balance() { return jdbc.queryForObject("SELECT pointBalance FROM user WHERE id=10", Integer.class); }

    @ParameterizedTest @ValueSource(ints = {99,100,300})
    void balanceBoundaries(int initial) {
        jdbc.update("UPDATE user SET pointBalance=?", initial);
        if (initial < 100) {
            assertThrows(BusinessException.class, () -> orders.createOrder(request(), user()));
            assertEquals(initial, balance()); assertEquals(0, count("artwork_order")); assertEquals(0, count("point_record"));
        } else {
            ArtworkOrder order = orders.createOrder(request(), user());
            assertEquals(initial-100, balance()); assertEquals("completed", order.getOrderStatus());
            assertTrue(artworks.hasArtworkAccess(1L, user()));
            assertEquals("secret prompt", artworks.getArtworkPromptContent(1L, user()));
            assertEquals("https://private/source.zip", artworks.getArtworkSourceZipUrl(1L, user()));
        }
    }

    @Test void concurrentRetriesDeductExactlyOnce() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Long>> results = new ArrayList<>();
            for (int i=0; i<8; i++) results.add(pool.submit(() -> { start.await(); return orders.createOrder(request(), user()).getId(); }));
            start.countDown();
            Set<Long> ids = new HashSet<>();
            for (Future<Long> result : results) ids.add(result.get(20, TimeUnit.SECONDS));
            assertEquals(1, ids.size()); assertEquals(200, balance());
            assertEquals(1, count("artwork_order")); assertEquals(1, count("point_record")); assertEquals(1, count("artwork_access"));
        } finally { pool.shutdownNow(); }
    }

    @Test void grantFailureRollsBackOrderBalanceAndLedger() {
        jdbc.execute("ALTER TABLE artwork_access ADD CONSTRAINT fail_grant CHECK (userId <> 10)");
        assertThrows(Exception.class, () -> orders.createOrder(request(), user()));
        assertEquals(300, balance()); assertEquals(0, count("artwork_order")); assertEquals(0, count("point_record"));
    }

    @Test void freeAndFreshMembershipNeverDeduct() {
        jdbc.update("UPDATE artwork SET memberOnly=0");
        assertNull(orders.createOrder(request(), user()));
        assertTrue(artworks.hasArtworkAccess(1L, null));
        jdbc.update("UPDATE artwork SET memberOnly=1");
        jdbc.update("UPDATE user SET memberLevel='member', memberExpireTime=DATEADD('DAY',1,CURRENT_TIMESTAMP)");
        assertNull(orders.createOrder(request(), user())); // Supplied login state is deliberately stale.
        assertEquals(300, balance()); assertEquals(0,count("artwork_order"));
    }

    @Test void permanentAccessSurvivesExpiryUpdatesPriceChangesAndRepublishing() {
        ArtworkOrder first = orders.createOrder(request(), user());
        jdbc.update("UPDATE user SET memberLevel='member',memberExpireTime=DATEADD('DAY',-1,CURRENT_TIMESTAMP)");
        jdbc.update("UPDATE artwork SET pointsPrice=999,promptContent='updated'");
        assertEquals(first.getId(), orders.createOrder(request(), user()).getId());
        assertEquals("updated",artworks.getArtworkPromptContent(1L,user()));
        jdbc.update("UPDATE artwork SET status=0");
        assertFalse(artworks.hasArtworkAccess(1L,user()));
        assertThrows(BusinessException.class, () -> artworks.getArtworkPromptContent(1L,user()));
        jdbc.update("UPDATE artwork SET status=1");
        assertTrue(artworks.hasArtworkAccess(1L,user()));
        jdbc.update("UPDATE artwork SET isDelete=1");
        assertFalse(artworks.hasArtworkAccess(1L,user()));
        assertEquals(200,balance());
    }

    @Test void lockedDetailAndSourceDoNotLeakContent() {
        ArtworkDetailVO detail = artworks.getArtworkDetail(1L, user(), false);
        assertFalse(detail.getCanAccessPrompt()); assertFalse(detail.getPermanentlyUnlocked());
        assertNull(detail.getPromptContent()); assertNull(detail.getSourceZipUrl());
        assertThrows(BusinessException.class, () -> artworks.getArtworkSourceZipUrl(1L, user()));
        orders.createOrder(request(), user());
        ArtworkDetailVO unlocked = artworks.getArtworkDetail(1L, user(), false);
        assertTrue(unlocked.getPermanentlyUnlocked()); assertEquals("permanent_unlock",unlocked.getAccessReason());
        assertNull(unlocked.getSourceZipUrl());
        User other = new User(); other.setId(11L); other.setMemberLevel("normal");
        assertFalse(artworks.hasArtworkAccess(1L,other));
    }

    @Test void legacyRealDebitWorksEvenWhenGrantIsMissingButMockCashDoesNot() {
        ArtworkOrder order = orders.createOrder(request(), user());
        jdbc.update("DELETE FROM artwork_access");
        assertTrue(artworks.hasArtworkAccess(1L,user()));
        assertEquals(order.getId(), orders.createOrder(request(), user()).getId());
        assertEquals(1,count("artwork_access"));
        jdbc.update("UPDATE artwork_order SET orderType='cash'");
        assertFalse(artworks.hasArtworkAccess(1L,user()));
        assertEquals(Collections.emptyList(),accessMapper.selectPermanentArtworkIds(10L,Collections.singletonList(1L)));
        assertThrows(BusinessException.class, () -> orders.handlePaymentCallback(null));
    }

    @Test void changedPriceAndUnavailableContentCannotBeRedeemed() {
        jdbc.update("UPDATE artwork SET pointsPrice=200");
        assertThrows(BusinessException.class, () -> orders.createOrder(request(),user()));
        jdbc.update("UPDATE artwork SET pointsPrice=100,status=0");
        assertThrows(BusinessException.class, () -> orders.createOrder(request(),user()));
        assertEquals(300,balance()); assertEquals(0,count("artwork_order"));
    }

    @Test void balanceOverviewReadsDatabaseNotOldLoginSnapshot() {
        User old = user(); old.setPointBalance(999);
        assertEquals(300,points.getPointOverview(old).getPointBalance());
    }

    @Test void listUsesOneBatchAuthorizationQueryAndDoesNotLeakLockedContent() {
        jdbc.update("INSERT INTO artwork(id,title,categoryId,memberOnly,status,pointsPrice,promptContent,sourceZipUrl) VALUES(2,'Other',2,1,1,100,'other secret','https://private/other.zip')");
        orders.createOrder(request(), user());
        clearInvocations(accessMapper);
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<com.yupi.springbootinit.model.vo.artwork.ArtworkVO> page =
                artworks.listArtworkVOByPage(new com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest(), user(), false);
        assertEquals(2,page.getRecords().size());
        verify(accessMapper,times(1)).selectPermanentArtworkIds(eq(10L),anyList());
        page.getRecords().forEach(item -> {
            assertNull(item.getSourceZipUrl());
            assertEquals(item.getId().equals(1L),item.getPermanentlyUnlocked());
            if (item.getId().equals(2L)) assertNull(item.getPromptContent());
        });
    }

    @Test void newDefaultAndOmittedUpdatePrice() {
        Category category = new Category(); category.setId(2L);
        Tag tag = new Tag(); tag.setId(3L);
        when(categories.selectById(2L)).thenReturn(category);
        when(tags.selectBatchIds(anyCollection())).thenReturn(Collections.singletonList(tag));
        when(categoryTags.selectCount(any())).thenReturn(1L);
        com.yupi.springbootinit.model.dto.artwork.ArtworkAddRequest add = new com.yupi.springbootinit.model.dto.artwork.ArtworkAddRequest();
        add.setTitle("New work");add.setCategoryId(2L);add.setTagIdList(Collections.singletonList(3L));
        long id = artworks.addArtwork(add,user());
        assertEquals(100,artworks.getById(id).getPointsPrice());
        jdbc.update("UPDATE artwork SET pointsPrice=175 WHERE id=?",id);
        com.yupi.springbootinit.model.dto.artwork.ArtworkUpdateRequest edit = new com.yupi.springbootinit.model.dto.artwork.ArtworkUpdateRequest();
        edit.setId(id);edit.setTitle("Edited");edit.setCategoryId(2L);edit.setTagIdList(Collections.singletonList(3L));
        artworks.updateArtwork(edit,user());
        assertEquals(175,artworks.getById(id).getPointsPrice());
    }

    @Test void missingDebitNeverCreatesPermanentAccess() {
        orders.createOrder(request(),user());
        jdbc.update("DELETE FROM point_record");
        assertFalse(artworks.hasArtworkAccess(1L,user()));
    }

    @Test void concurrentDifferentWorksCannotOverdrawAccount() throws Exception {
        jdbc.update("UPDATE user SET pointBalance=100");
        jdbc.update("INSERT INTO artwork(id,title,memberOnly,status,pointsPrice) VALUES(2,'Other',1,1,100)");
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (long id : new long[]{1L,2L}) results.add(pool.submit(() -> {
                start.await();OrderCreateRequest r = request();r.setArtworkId(id);
                try { orders.createOrder(r,user());return true; } catch (BusinessException e) { return false; }
            }));
            start.countDown();
            int successes=0;
            for (Future<Boolean> r:results) if (r.get(20,TimeUnit.SECONDS)) successes++;
            assertEquals(1,successes);assertEquals(0,balance());assertEquals(1,count("artwork_order"));
        } finally { pool.shutdownNow(); }
    }
}
