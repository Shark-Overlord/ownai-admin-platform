package com.yupi.springbootinit.service.impl;

import com.yupi.springbootinit.model.vo.codex.CodexResetOverviewVO;
import com.yupi.springbootinit.service.CodexResetMonitorService;
import com.yupi.springbootinit.service.support.CodexResetMonitorParser;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicReference;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class CodexResetMonitorServiceImpl implements CodexResetMonitorService {

    private static final int MAX_BODY_SIZE = 2 * 1024 * 1024;
    private static final String USER_AGENT = "OwnAI-CodexResetMonitor/1.0 (+https://ownai.icu)";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

    @Value("${codex.reset-monitor.enabled:true}")
    private boolean enabled;

    @Value("${codex.reset-monitor.source-url:https://betteropc.com/ai-products/reset-signals/codex}")
    private String sourceUrl;

    @Value("${codex.reset-monitor.history-url:https://betteropc.com/api/browser/product-tracking/codex/history}")
    private String historyUrl;

    @Value("${codex.reset-monitor.history-months:12}")
    private int historyMonths;

    @Value("${codex.reset-monitor.request-timeout-ms:15000}")
    private int requestTimeoutMs;

    @Value("${codex.reset-monitor.stale-after-ms:1800000}")
    private long staleAfterMs;

    private final AtomicReference<CodexResetOverviewVO> snapshot = new AtomicReference<>();
    private final Object refreshLock = new Object();
    private final CodexResetMonitorParser parser = new CodexResetMonitorParser();

    @Override
    public CodexResetOverviewVO getOverview() {
        CodexResetOverviewVO current = snapshot.get();
        if (current == null && enabled) {
            refresh();
            current = snapshot.get();
        }
        if (current == null) {
            return unavailable(enabled ? "暂时无法获取 Codex 重置信号" : "Codex 重置监控未启用");
        }
        current.setStale(isStale(current.getLastCheckedAt()));
        if (current.isStale()) {
            current.setMessage("数据源暂未更新，当前显示最后一次成功快照");
        }
        return current;
    }

    @Override
    public void refresh() {
        if (!enabled || StringUtils.isBlank(sourceUrl)) {
            return;
        }
        synchronized (refreshLock) {
            try {
                CodexResetOverviewVO parsed;
                try {
                    parsed = fetchCompleteHistory();
                } catch (Exception historyError) {
                    log.warn("refresh complete Codex reset history failed, using page fallback: {}",
                            historyError.getMessage());
                    parsed = fetchPageFallback();
                }
                if (parsed.getHistory().isEmpty() && parsed.getLatestSignal() == null) {
                    throw new IllegalStateException("source page did not contain reset signals");
                }
                CodexResetOverviewVO current = snapshot.get();
                if (current != null && current.getHistory().size() > parsed.getHistory().size()) {
                    log.warn("ignored smaller Codex reset snapshot: current={}, incoming={}",
                            current.getHistory().size(), parsed.getHistory().size());
                    return;
                }
                snapshot.set(parsed);
                log.info("refreshed Codex reset signals: history={}, announcements={}",
                        parsed.getHistory().size(), parsed.getAnnouncements().size());
            } catch (Exception e) {
                log.warn("refresh Codex reset signals failed: {}", e.getMessage());
            }
        }
    }

    private CodexResetOverviewVO fetchCompleteHistory() throws Exception {
        if (StringUtils.isBlank(historyUrl)) {
            throw new IllegalStateException("history URL is not configured");
        }
        String endMonth = YearMonth.now(BUSINESS_ZONE).toString();
        Connection.Response response = Jsoup.connect(historyUrl)
                .userAgent(USER_AGENT)
                .header("Accept", "application/json")
                .data("endMonth", endMonth)
                .data("kind", "reset")
                .data("months", String.valueOf(Math.max(1, Math.min(historyMonths, 12))))
                .ignoreContentType(true)
                .timeout(requestTimeoutMs)
                .maxBodySize(MAX_BODY_SIZE)
                .followRedirects(true)
                .execute();
        requireSuccess(response, "history API");
        return parser.parseHistoryJson(response.body(), sourceUrl, Instant.now());
    }

    private CodexResetOverviewVO fetchPageFallback() throws Exception {
        Connection.Response response = Jsoup.connect(sourceUrl)
                .userAgent(USER_AGENT)
                .timeout(requestTimeoutMs)
                .maxBodySize(MAX_BODY_SIZE)
                .followRedirects(true)
                .execute();
        requireSuccess(response, "source page");
        return parser.parse(response.body(), sourceUrl, Instant.now());
    }

    private void requireSuccess(Connection.Response response, String sourceName) {
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("unexpected " + sourceName + " status " + response.statusCode());
        }
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    private boolean isStale(String lastCheckedAt) {
        if (StringUtils.isBlank(lastCheckedAt)) {
            return true;
        }
        try {
            return Duration.between(Instant.parse(lastCheckedAt), Instant.now()).toMillis() > staleAfterMs;
        } catch (Exception ignored) {
            return true;
        }
    }

    private CodexResetOverviewVO unavailable(String message) {
        CodexResetOverviewVO result = new CodexResetOverviewVO();
        result.setAvailable(false);
        result.setStale(true);
        result.setMessage(message);
        result.setSourceName("BetterOPC / X 公开信号");
        result.setSourcePageUrl(sourceUrl);
        result.setSourceProfileUrl("https://x.com/thsottiaux");
        result.setSourceHandle("thsottiaux");
        return result;
    }
}
