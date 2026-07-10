package com.yupi.springbootinit.manager;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.PageRequest;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.utils.NetUtils;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * Limits enumeration of public content list APIs.
 */
@Component
public class PublicContentAntiCrawlerManager {

    private static final int MAX_PAGE_SIZE = 20;

    private static final int MAX_PAGE_NUMBER = 50;

    private static final int MAX_IP_REQUESTS_PER_MINUTE = 30;

    private static final int MAX_IP_REQUESTS_PER_DAY = 120;

    private static final int MAX_USER_REQUESTS_PER_MINUTE = 60;

    private static final int MAX_USER_REQUESTS_PER_DAY = 240;

    private static final long MINUTE_MILLIS = 60_000L;

    private static final long DAY_MILLIS = 24 * 60 * MINUTE_MILLIS;

    private final ConcurrentHashMap<String, FixedWindowCounter> counterMap = new ConcurrentHashMap<>();

    public void checkRequest(PageRequest request, User loginUser, HttpServletRequest httpServletRequest) {
        PageRequest safeRequest = request == null ? new PageRequest() : request;
        if (safeRequest.getPageSize() < 1 || safeRequest.getPageSize() > MAX_PAGE_SIZE) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "公开内容列表每页最多查询 " + MAX_PAGE_SIZE + " 条");
        }
        if (safeRequest.getCurrent() < 1 || safeRequest.getCurrent() > MAX_PAGE_NUMBER) {
            throw new BusinessException(ErrorCode.FORBIDDEN_ERROR, "公开内容列表分页深度超出访问范围");
        }

        String clientIp = getClientIp(httpServletRequest);
        checkLimit("ip:minute:" + clientIp, MINUTE_MILLIS, MAX_IP_REQUESTS_PER_MINUTE);
        checkLimit("ip:day:" + clientIp, DAY_MILLIS, MAX_IP_REQUESTS_PER_DAY);
        if (loginUser != null && loginUser.getId() != null) {
            String userKey = String.valueOf(loginUser.getId());
            checkLimit("user:minute:" + userKey, MINUTE_MILLIS, MAX_USER_REQUESTS_PER_MINUTE);
            checkLimit("user:day:" + userKey, DAY_MILLIS, MAX_USER_REQUESTS_PER_DAY);
        }
        cleanupExpiredCounters();
    }

    private String getClientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.trim().isEmpty() && !"unknown".equalsIgnoreCase(realIp.trim())) {
            return realIp.trim();
        }
        return NetUtils.getIpAddress(request);
    }

    private void checkLimit(String key, long windowMillis, int maxRequests) {
        long currentWindow = System.currentTimeMillis() / windowMillis;
        FixedWindowCounter counter = counterMap.computeIfAbsent(key, ignored -> new FixedWindowCounter());
        synchronized (counter) {
            if (counter.window != currentWindow) {
                counter.window = currentWindow;
                counter.count = 0;
            }
            if (counter.count >= maxRequests) {
                throw new BusinessException(ErrorCode.FORBIDDEN_ERROR, "访问过于频繁，请稍后再试");
            }
            counter.count++;
        }
    }

    private void cleanupExpiredCounters() {
        if (counterMap.size() < 10_000) {
            return;
        }
        long currentMinute = System.currentTimeMillis() / MINUTE_MILLIS;
        long currentDay = System.currentTimeMillis() / DAY_MILLIS;
        for (Map.Entry<String, FixedWindowCounter> entry : counterMap.entrySet()) {
            long currentWindow = entry.getKey().contains(":minute:") ? currentMinute : currentDay;
            if (entry.getValue().window != currentWindow) {
                counterMap.remove(entry.getKey(), entry.getValue());
            }
        }
    }

    private static class FixedWindowCounter {

        private long window = -1;

        private int count;
    }
}
