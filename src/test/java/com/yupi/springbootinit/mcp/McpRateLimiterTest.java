package com.yupi.springbootinit.mcp;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * McpRateLimiter 单元测试
 */
class McpRateLimiterTest {

    private McpRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        // 突发 3次/秒, 分钟 30次/分, 每日 800次/天
        rateLimiter = new McpRateLimiter(3, 30, 800);
    }

    @Test
    @DisplayName("null 用户放行")
    void testNullUser() {
        McpRateLimiter.RateLimitResult res = rateLimiter.checkLimit(null);
        assertTrue(res.allowed());
    }

    @Test
    @DisplayName("秒级突发流控测试：同一秒第4次请求被拦截")
    void testSecondBurstLimit() {
        Long userId = 1001L;

        // 前3次通过
        for (int i = 0; i < 3; i++) {
            McpRateLimiter.RateLimitResult res = rateLimiter.checkLimit(userId);
            assertTrue(res.allowed(), "第 " + (i + 1) + " 次应该允许");
        }

        // 第4次被拦截（同一秒内）
        McpRateLimiter.RateLimitResult blocked = rateLimiter.checkLimit(userId);
        assertFalse(blocked.allowed());
        assertTrue(blocked.message().contains("突发频率保护"));
        assertEquals(1, blocked.retryAfterSeconds());
    }

    @Test
    @DisplayName("分钟级流控测试：达到分钟上限后被拦截")
    void testMinuteLimit() {
        Long userId = 1002L;
        // 构造一个自定义限流器：突发10次/秒，分钟5次/分，每日100次/天
        McpRateLimiter customLimiter = new McpRateLimiter(10, 5, 100);

        for (int i = 0; i < 5; i++) {
            McpRateLimiter.RateLimitResult res = customLimiter.checkLimit(userId);
            assertTrue(res.allowed(), "第 " + (i + 1) + " 次应该允许");
        }

        // 第6次被拦截
        McpRateLimiter.RateLimitResult blocked = customLimiter.checkLimit(userId);
        assertFalse(blocked.allowed());
        assertTrue(blocked.message().contains("5次/分钟"));
        assertTrue(blocked.retryAfterSeconds() > 0);
    }

    @Test
    @DisplayName("每日软上限流控测试：达到单日上限后被拦截")
    void testDailyLimit() {
        Long userId = 1003L;
        // 构造一个自定义限流器：突发10次/秒，分钟10次/分，每日3次/天
        McpRateLimiter customLimiter = new McpRateLimiter(10, 10, 3);

        for (int i = 0; i < 3; i++) {
            McpRateLimiter.RateLimitResult res = customLimiter.checkLimit(userId);
            assertTrue(res.allowed(), "第 " + (i + 1) + " 次应该允许");
        }

        // 第4次被拦截
        McpRateLimiter.RateLimitResult blocked = customLimiter.checkLimit(userId);
        assertFalse(blocked.allowed());
        assertTrue(blocked.message().contains("单日安全上限"));
        assertEquals(3600, blocked.retryAfterSeconds());
    }

    @Test
    @DisplayName("多用户隔离测试：用户A超限不影响用户B")
    void testUserIsolation() {
        Long userA = 2001L;
        Long userB = 2002L;

        // 消耗完用户 A 的秒级配额
        for (int i = 0; i < 3; i++) {
            assertTrue(rateLimiter.checkLimit(userA).allowed());
        }
        assertFalse(rateLimiter.checkLimit(userA).allowed());

        // 用户 B 仍然正常通行
        assertTrue(rateLimiter.checkLimit(userB).allowed());
    }

    @Test
    @DisplayName("重置用户流控状态测试")
    void testResetUser() {
        Long userId = 3001L;

        for (int i = 0; i < 3; i++) {
            assertTrue(rateLimiter.checkLimit(userId).allowed());
        }
        assertFalse(rateLimiter.checkLimit(userId).allowed());

        // 重置用户
        rateLimiter.resetUser(userId);

        // 重置后应该重新允许
        assertTrue(rateLimiter.checkLimit(userId).allowed());
    }
}
