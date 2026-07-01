package com.yupi.springbootinit.manager;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.URLUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.YuqueProperties;
import com.yupi.springbootinit.exception.BusinessException;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

@Component
public class YuqueClient {

    @Resource
    private YuqueProperties yuqueProperties;

    private final Object requestLock = new Object();

    private long lastRequestAt = 0L;

    public JSONArray listDocs(String namespace) {
        JSONObject payload = get("/repos/" + encode(namespace) + "/docs");
        Object data = payload.get("data");
        if (data instanceof JSONArray) {
            return (JSONArray) data;
        }
        return new JSONArray();
    }

    public JSONArray listToc(String namespace) {
        JSONObject payload = get("/repos/" + encode(namespace) + "/toc");
        Object data = payload.get("data");
        if (data instanceof JSONArray) {
            return (JSONArray) data;
        }
        return new JSONArray();
    }

    public JSONObject getDoc(String namespace, String slug) {
        JSONObject payload = get("/repos/" + encode(namespace) + "/docs/" + encode(slug));
        Object data = payload.get("data");
        if (data instanceof JSONObject) {
            return (JSONObject) data;
        }
        return new JSONObject();
    }

    private JSONObject get(String path) {
        if (StringUtils.isBlank(yuqueProperties.getToken())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Yuque token is not configured");
        }
        String baseUrl = StringUtils.removeEnd(StringUtils.defaultIfBlank(yuqueProperties.getBaseUrl(),
                "https://www.yuque.com/api/v2"), "/");
        int maxAttempts = Math.max(1, getInt(yuqueProperties.getMaxRetries(), 3) + 1);
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            waitForRequestSlot();
            HttpRequest request = HttpRequest.get(baseUrl + path)
                    .header("X-Auth-Token", yuqueProperties.getToken())
                    .header("User-Agent", "ownai-docs-sync/1.0")
                    .timeout(yuqueProperties.getReadTimeoutMs() == null ? 15000 : yuqueProperties.getReadTimeoutMs())
                    .setConnectionTimeout(yuqueProperties.getConnectTimeoutMs() == null ? 5000
                            : yuqueProperties.getConnectTimeoutMs());
            try (HttpResponse response = request.execute()) {
                String body = response.body();
                if (response.isOk()) {
                    return JSONUtil.parseObj(body);
                }
                int status = response.getStatus();
                if (shouldRetry(status) && attempt < maxAttempts) {
                    sleepBeforeRetry(response, attempt);
                    continue;
                }
                if (status == 429) {
                    throw new BusinessException(ErrorCode.OPERATION_ERROR,
                            "Yuque request rate limited: 429, please retry later");
                }
                throw new BusinessException(ErrorCode.OPERATION_ERROR, "Yuque request failed: " + status);
            } catch (BusinessException e) {
                throw e;
            } catch (Exception e) {
                if (attempt < maxAttempts) {
                    sleepSilently(getRetryDelayMs(attempt));
                    continue;
                }
                throw new BusinessException(ErrorCode.OPERATION_ERROR, "Yuque request failed: " + e.getMessage());
            }
        }
        throw new BusinessException(ErrorCode.OPERATION_ERROR, "Yuque request failed");
    }

    private void waitForRequestSlot() {
        int intervalMs = Math.max(0, getInt(yuqueProperties.getMinRequestIntervalMs(), 1200));
        synchronized (requestLock) {
            long now = System.currentTimeMillis();
            long nextRequestAt = lastRequestAt + intervalMs;
            if (nextRequestAt > now) {
                sleepSilently(nextRequestAt - now);
            }
            lastRequestAt = System.currentTimeMillis();
        }
    }

    private boolean shouldRetry(int status) {
        return status == 429 || status == 500 || status == 502 || status == 503 || status == 504;
    }

    private void sleepBeforeRetry(HttpResponse response, int attempt) {
        Long retryAfterMs = parseRetryAfterMs(response.header("Retry-After"));
        sleepSilently(retryAfterMs == null ? getRetryDelayMs(attempt) : retryAfterMs);
    }

    private Long parseRetryAfterMs(String retryAfter) {
        if (StringUtils.isBlank(retryAfter)) {
            return null;
        }
        try {
            long seconds = Long.parseLong(retryAfter.trim());
            return Math.max(0L, TimeUnit.SECONDS.toMillis(seconds));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private long getRetryDelayMs(int attempt) {
        int baseMs = Math.max(1000, getInt(yuqueProperties.getRetryBaseSleepMs(), 3000));
        int maxMs = Math.max(baseMs, getInt(yuqueProperties.getRetryMaxSleepMs(), 20000));
        long delay = (long) baseMs * (1L << Math.max(0, attempt - 1));
        return Math.min(delay, maxMs);
    }

    private void sleepSilently(long millis) {
        if (millis <= 0) {
            return;
        }
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Yuque request interrupted");
        }
    }

    private int getInt(Integer value, int defaultValue) {
        return value == null ? defaultValue : value;
    }

    private String encode(String value) {
        if (value == null) {
            return "";
        }
        String[] parts = StringUtils.split(value, "/");
        if (parts == null || parts.length == 0) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                builder.append("/");
            }
            builder.append(URLUtil.encodeAll(parts[i], StandardCharsets.UTF_8));
        }
        return builder.toString();
    }

    public String getString(JSONObject object, String... keys) {
        if (object == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            String value = object.getStr(key);
            if (StringUtils.isNotBlank(value)) {
                return value;
            }
        }
        return null;
    }

    public Date getDate(JSONObject object, String... keys) {
        String value = getString(object, keys);
        if (StringUtils.isBlank(value)) {
            return null;
        }
        try {
            return DateUtil.parse(value);
        } catch (Exception e) {
            return null;
        }
    }
}
