package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;
import com.yupi.springbootinit.config.AlipayProperties;
import com.yupi.springbootinit.mapper.*;
import com.yupi.springbootinit.model.entity.*;
import com.yupi.springbootinit.service.alipay.AlipayPaymentQueryResult;
import com.yupi.springbootinit.service.impl.*;
import java.lang.reflect.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import javax.annotation.Resource;
import javax.sql.DataSource;
import org.apache.ibatis.session.SqlSessionFactory;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(SpringExtension.class)
@ContextConfiguration(classes = PointRechargeSettlementIntegrationTest.Config.class)
class PointRechargeSettlementIntegrationTest {
    @Configuration
    @EnableTransactionManagement(proxyTargetClass = true)
    static class Config {
        @Bean DataSource dataSource() {
            JdbcDataSource ds = new JdbcDataSource();
            ds.setURL("jdbc:h2:mem:point-recharge;MODE=MySQL;NON_KEYWORDS=USER;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000");
            return ds;
        }
        @Bean DataSourceTransactionManager transactionManager(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean SqlSessionFactory sqlSessionFactory(DataSource ds) throws Exception {
            MybatisConfiguration config = new MybatisConfiguration();
            config.setMapUnderscoreToCamelCase(false);
            config.addMapper(UserMapper.class); config.addMapper(MemberOrderMapper.class); config.addMapper(PointRecordMapper.class);
            MybatisSqlSessionFactoryBean factory = new MybatisSqlSessionFactoryBean();
            factory.setDataSource(ds); factory.setConfiguration(config); return factory.getObject();
        }
        @Bean SqlSessionTemplate session(SqlSessionFactory f) { return new SqlSessionTemplate(f); }
        @Bean UserMapper userMapper(SqlSessionTemplate s) { return s.getMapper(UserMapper.class); }
        @Bean MemberOrderMapper memberOrderMapper(SqlSessionTemplate s) { return s.getMapper(MemberOrderMapper.class); }
        @Bean PointRecordMapper pointRecordMapper(SqlSessionTemplate s) {
            return mock(PointRecordMapper.class, org.mockito.AdditionalAnswers.delegatesTo(s.getMapper(PointRecordMapper.class)));
        }
        @Bean PointCheckInConfigService pointCheckInConfigService() { return mock(PointCheckInConfigService.class); }
        @Bean MemberPriceConfigService memberPriceConfigService() { return mock(MemberPriceConfigService.class); }
        @Bean AlipayProperties alipayProperties() { return new AlipayProperties(); }
        @Bean PointService pointService() { return new PointServiceImpl(); }
        @Bean MemberService memberService() { return new MemberServiceImpl(); }
        @Bean AlipayMemberPaymentSettlementService settlement() { return new AlipayMemberPaymentSettlementService(); }
    }

    @Resource DataSource dataSource;
    @Resource AlipayMemberPaymentSettlementService settlement;
    @Resource PointRecordMapper pointRecordMapper;
    JdbcTemplate jdbc;

    @BeforeEach void setup() {
        reset(pointRecordMapper);
        jdbc = new JdbcTemplate(dataSource);
        for (Class<?> entity : Arrays.asList(User.class, MemberOrder.class, PointRecord.class)) {
            String table = entity.getAnnotation(TableName.class).value();
            jdbc.execute("DROP TABLE IF EXISTS " + table);
            List<String> columns = new ArrayList<>();
            for (Field field : entity.getDeclaredFields()) {
                if (Modifier.isStatic(field.getModifiers())) continue;
                TableField annotation = field.getAnnotation(TableField.class);
                if (annotation != null && !annotation.exist()) continue;
                String type = field.getType() == Long.class ? "BIGINT" : field.getType() == Integer.class ? "INT"
                        : field.getType() == Date.class ? "TIMESTAMP" : field.getType() == BigDecimal.class ? "DECIMAL(12,2)" : "VARCHAR(4000)";
                columns.add(field.getName() + " " + type + (field.getName().equals("id") ? " PRIMARY KEY" : field.getName().equals("isDelete") ? " DEFAULT 0" : ""));
            }
            jdbc.execute("CREATE TABLE " + table + " (" + String.join(",", columns) + ")");
        }
        jdbc.update("INSERT INTO user(id,memberLevel,pointBalance) VALUES(10,'normal',20)");
        jdbc.update("INSERT INTO member_order(id,orderNo,userId,orderType,planType,paymentChannel,orderStatus,orderAmount,pointsAmount,rechargeQuantity) VALUES(1,'MEM-RECHARGE',10,'point_recharge','points','alipay','pending',3.00,300,3)");
    }

    @Test void concurrentNotificationsCreditExactlyOnceWithoutMembershipChange() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(4);
        try {
            List<Callable<Boolean>> calls = Arrays.asList(this::complete, this::complete, this::complete, this::complete);
            for (Future<Boolean> result : executor.invokeAll(calls)) assertTrue(result.get());
        } finally { executor.shutdownNow(); }
        assertEquals(320, jdbc.queryForObject("SELECT pointBalance FROM user WHERE id=10", Integer.class));
        assertEquals("normal", jdbc.queryForObject("SELECT memberLevel FROM user WHERE id=10", String.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM point_record WHERE changeType='point_recharge' AND relatedId=1 AND changeAmount=300", Integer.class));
        assertEquals("completed", jdbc.queryForObject("SELECT orderStatus FROM member_order WHERE id=1", String.class));
    }

    @Test void ledgerFailureRollsBackOrderAndBalanceThenRetrySucceeds() {
        doThrow(new IllegalStateException("ledger unavailable")).when(pointRecordMapper).insert(any(PointRecord.class));
        assertThrows(IllegalStateException.class, this::complete);
        assertEquals(20, jdbc.queryForObject("SELECT pointBalance FROM user WHERE id=10", Integer.class));
        assertEquals("pending", jdbc.queryForObject("SELECT orderStatus FROM member_order WHERE id=1", String.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM point_record", Integer.class));
        reset(pointRecordMapper);
        assertTrue(complete());
        assertEquals(320, jdbc.queryForObject("SELECT pointBalance FROM user WHERE id=10", Integer.class));
    }

    @Test void wrongAmountAndClosedOrdersNeverCredit() {
        AlipayPaymentQueryResult result = paid(); result.setTotalAmount(new BigDecimal("0.01"));
        assertFalse(settlement.completeOrder("MEM-RECHARGE", result));
        jdbc.update("UPDATE member_order SET orderStatus='cancelled' WHERE id=1");
        assertFalse(complete());
        assertEquals(20, jdbc.queryForObject("SELECT pointBalance FROM user WHERE id=10", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM point_record", Integer.class));
    }

    boolean complete() { return settlement.completeOrder("MEM-RECHARGE", paid()); }
    AlipayPaymentQueryResult paid() {
        AlipayPaymentQueryResult result = new AlipayPaymentQueryResult();
        result.setRequestSuccess(true); result.setTradeStatus("TRADE_SUCCESS");
        result.setTradeNo("ALI-RECHARGE-1"); result.setTotalAmount(new BigDecimal("3.00")); return result;
    }
}
