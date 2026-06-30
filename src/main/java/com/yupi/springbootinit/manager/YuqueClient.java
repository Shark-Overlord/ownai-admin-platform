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
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

@Component
public class YuqueClient {

    @Resource
    private YuqueProperties yuqueProperties;

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
        HttpRequest request = HttpRequest.get(baseUrl + path)
                .header("X-Auth-Token", yuqueProperties.getToken())
                .header("User-Agent", "ownai-docs-sync/1.0")
                .timeout(yuqueProperties.getReadTimeoutMs() == null ? 15000 : yuqueProperties.getReadTimeoutMs())
                .setConnectionTimeout(yuqueProperties.getConnectTimeoutMs() == null ? 5000
                        : yuqueProperties.getConnectTimeoutMs());
        try (HttpResponse response = request.execute()) {
            String body = response.body();
            if (!response.isOk()) {
                throw new BusinessException(ErrorCode.OPERATION_ERROR, "Yuque request failed: " + response.getStatus());
            }
            return JSONUtil.parseObj(body);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Yuque request failed: " + e.getMessage());
        }
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
