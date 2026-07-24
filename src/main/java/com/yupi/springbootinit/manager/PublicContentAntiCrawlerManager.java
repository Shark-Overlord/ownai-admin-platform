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

    private static final int MAX_ANONYMOUS_REQUESTS_PER_MINUTE = 120;

    private static final int MAX_AUTHENTICATED_REQUESTS_PER_MINUTE = 300;

    private static final long MINUTE_MILLIS = 60_000L;

    private static final long DUPLICATE_REQUEST_MILLIS = 2_000L;

    private final ConcurrentHashMap<String, FixedWindowCounter> counterMap = new ConcurrentHashMap<>();

    private final ConcurrentHashMap<String, Long> recentRequestMap = new ConcurrentHashMap<>();

    public void checkRequest(PageRequest request, User loginUser, HttpServletRequest httpServletRequest) {
        PageRequest safeRequest = request == null ? new PageRequest() : request;
        if (safeRequest.getPageSize() < 1 || safeRequest.getPageSize() > MAX_PAGE_SIZE) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "公开内容列表每页最多查询 " + MAX_PAGE_SIZE + " 条");
        }
        if (safeRequest.getCurrent() < 1 || safeRequest.getCurrent() > MAX_PAGE_NUMBER) {
            throw new BusinessException(ErrorCode.FORBIDDEN_ERROR, "公开内容列表分页深度超出访问范围");
        }

        String principalKey;
        if (loginUser != null && loginUser.getId() != null) {
            principalKey = "user:" + loginUser.getId();
        } else {
            principalKey = "anonymous:" + getClientIp(httpServletRequest);
        }
        String requestSignature = buildRequestSignature(principalKey, safeRequest, httpServletRequest);
        if (isDuplicateRequest(requestSignature)) {
            return;
        }
        if (loginUser != null && loginUser.getId() != null) {
            checkLimit("minute:" + principalKey, MINUTE_MILLIS, MAX_AUTHENTICATED_REQUESTS_PER_MINUTE);
        } else {
            checkLimit("minute:" + principalKey, MINUTE_MILLIS, MAX_ANONYMOUS_REQUESTS_PER_MINUTE);
        }
        recentRequestMap.put(requestSignature, System.currentTimeMillis());
        cleanupExpiredState();
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

    private String buildRequestSignature(String principalKey, PageRequest request,
            HttpServletRequest httpServletRequest) {
        String requestUri = httpServletRequest == null ? "" : httpServletRequest.getRequestURI();
        return principalKey + ':' + requestUri + ':' + request.getCurrent() + ':'
                + request.getPageSize() + ':' + request.getSortField() + ':' + request.getSortOrder()
                + ':' + request;
    }

    private boolean isDuplicateRequest(String signature) {
        long now = System.currentTimeMillis();
        Long previousRequestTime = recentRequestMap.get(signature);
        return previousRequestTime != null && now - previousRequestTime < DUPLICATE_REQUEST_MILLIS;
    }

    private void cleanupExpiredState() {
        if (counterMap.size() < 10_000 && recentRequestMap.size() < 10_000) {
            return;
        }
        long now = System.currentTimeMillis();
        long currentMinute = System.currentTimeMillis() / MINUTE_MILLIS;
        for (Map.Entry<String, FixedWindowCounter> entry : counterMap.entrySet()) {
            if (entry.getValue().window != currentMinute) {
                counterMap.remove(entry.getKey(), entry.getValue());
            }
        }
        for (Map.Entry<String, Long> entry : recentRequestMap.entrySet()) {
            if (now - entry.getValue() >= DUPLICATE_REQUEST_MILLIS) {
                recentRequestMap.remove(entry.getKey(), entry.getValue());
            }
        }
    }

    private static class FixedWindowCounter {

        private long window = -1;

        private int count;
    }
}
