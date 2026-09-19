package com.yupi.springbootinit.mcp;

import java.io.Serializable;
import java.util.Calendar;
import java.util.concurrent.ConcurrentHashMap;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * MCP 多级流控限流器（按用户 ID 隔离，全内存纳秒级响应，无需外部中间件依赖）。
 * <p>
 * 1. 秒级突发限流: 默认 3 次/秒（防止脚本或死循环瞬间高并发打满连接池）
 * 2. 分钟级限流: 默认 30 次/分钟（满足正常重度使用，支持严格成本控制模式设为 20 次/分）
 * 3. 每日软上限: 默认 800 次/天（在 600~1000 建议区间内，防账号共享与爬取，次日 00:00 自动重置）
 */
@Slf4j
@Component
public class McpRateLimiter {

    @Getter
    @Setter
    @Value("${ownai.mcp.rate-limit.requests-per-second:3}")
    private int maxRequestsPerSecond = 3;

    @Getter
    @Setter
    @Value("${ownai.mcp.rate-limit.requests-per-minute:30}")
    private int maxRequestsPerMinute = 30;

    @Getter
    @Setter
    @Value("${ownai.mcp.rate-limit.requests-per-day:800}")
    private int maxRequestsPerDay = 800;

    public McpRateLimiter() {
    }

    public McpRateLimiter(int maxRequestsPerSecond, int maxRequestsPerMinute, int maxRequestsPerDay) {
        this.maxRequestsPerSecond = maxRequestsPerSecond;
        this.maxRequestsPerMinute = maxRequestsPerMinute;
        this.maxRequestsPerDay = maxRequestsPerDay;
    }

    public record RateLimitResult(
            boolean allowed,
            String message,
            int retryAfterSeconds
    ) implements Serializable {}

    private final ConcurrentHashMap<Long, UserRateState> userStates = new ConcurrentHashMap<>();

    /**
     * 校验指定用户是否允许发起一次 MCP 请求
     *
     * @param userId 用户 ID
     * @return 校验结果
     */
    public RateLimitResult checkLimit(Long userId) {
        if (userId == null) {
            return new RateLimitResult(true, null, 0);
        }

        long now = System.currentTimeMillis();
        long secondSlot = now / 1000L;
        Calendar cal = Calendar.getInstance();
        int dayOfYear = cal.get(Calendar.DAY_OF_YEAR);
        int year = cal.get(Calendar.YEAR);

        UserRateState state = userStates.computeIfAbsent(userId, k -> new UserRateState());
        synchronized (state) {
            state.lastActiveTime = now;

            // 1. 日度重置与校验
            if (state.currentYear != year || state.currentDayOfYear != dayOfYear) {
                state.currentYear = year;
                state.currentDayOfYear = dayOfYear;
                state.dailyCount = 0;
            }
            if (state.dailyCount >= maxRequestsPerDay) {
                log.warn("MCP 用户 userId={} 达到每日上限 {}", userId, maxRequestsPerDay);
                return new RateLimitResult(false,
                        "今日 MCP 调用已达单日安全上限（" + maxRequestsPerDay + "次/天），将在明日 00:00 自动重置。",
                        3600);
            }

            // 2. 分钟级重置与校验
            if (now - state.minuteWindowStart >= 60_000L) {
                state.minuteWindowStart = now;
                state.minuteCount = 0;
            }
            if (state.minuteCount >= maxRequestsPerMinute) {
                long remainingMillis = 60_000L - (now - state.minuteWindowStart);
                int waitSec = (int) Math.max(1, (remainingMillis + 999) / 1000);
                log.warn("MCP 用户 userId={} 达到分钟级上限 {}", userId, maxRequestsPerMinute);
                return new RateLimitResult(false,
                        "MCP 调用过于频繁，已达到 " + maxRequestsPerMinute + "次/分钟 安全保护上限，请稍等 " + waitSec + " 秒后再试。",
                        waitSec);
            }

            // 3. 秒级突发校验
            if (state.currentSecond != secondSlot) {
                state.currentSecond = secondSlot;
                state.secondCount = 0;
            }
            if (state.secondCount >= maxRequestsPerSecond) {
                log.warn("MCP 用户 userId={} 触发秒级突发流控 {}", userId, maxRequestsPerSecond);
                return new RateLimitResult(false,
                        "请求过于密集，已触发突发频率保护（" + maxRequestsPerSecond + "次/秒），请稍等 1 秒后再试。",
                        1);
            }

            // 通过：累加各层级计数
            state.secondCount++;
            state.minuteCount++;
            state.dailyCount++;

            return new RateLimitResult(true, null, 0);
        }
    }

    /**
     * 定期内存清理（淘汰 24 小时未活跃的用户状态，防止内存膨胀）
     */
    public void pruneExpired() {
        long expireThreshold = System.currentTimeMillis() - 86_400_000L;
        userStates.entrySet().removeIf(e -> e.getValue().lastActiveTime < expireThreshold);
    }

    /**
     * 重置指定用户的限流状态（用于测试或管理员手动解除流控）
     */
    public void resetUser(Long userId) {
        if (userId != null) {
            userStates.remove(userId);
        }
    }

    private static class UserRateState {
        long currentSecond = 0L;
        int secondCount = 0;

        long minuteWindowStart = 0L;
        int minuteCount = 0;

        int currentDayOfYear = 0;
        int currentYear = 0;
        int dailyCount = 0;

        long lastActiveTime = System.currentTimeMillis();
    }
}
