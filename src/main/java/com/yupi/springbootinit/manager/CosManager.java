package com.yupi.springbootinit.manager;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.PutObjectRequest;
import com.qcloud.cos.model.PutObjectResult;
import com.yupi.springbootinit.config.CosClientConfig;
import java.io.File;
import javax.annotation.Resource;
import org.springframework.stereotype.Component;

/**
 * Cos 对象存储操作
 *
 * @author <a href="https://github.com/liyupi">程序员鱼皮</a>
 * @from <a href="https://yupi.icu">编程导航知识星球</a>
 */
@Component
public class CosManager {

    private static final String IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

    @Resource
    private CosClientConfig cosClientConfig;

    @Resource
    private COSClient cosClient;

    /**
     * 上传对象
     *
     * @param key 唯一键
     * @param localFilePath 本地文件路径
     * @return
     */
    public PutObjectResult putObject(String key, String localFilePath) {
        PutObjectRequest putObjectRequest = new PutObjectRequest(cosClientConfig.getBucket(), key,
                new File(localFilePath));
        putObjectRequest.setMetadata(buildMetadata(key, null));
        return cosClient.putObject(putObjectRequest);
    }

    /**
     * 上传对象
     *
     * @param key 唯一键
     * @param file 文件
     * @return
     */
    public PutObjectResult putObject(String key, File file) {
        PutObjectRequest putObjectRequest = new PutObjectRequest(cosClientConfig.getBucket(), key,
                file);
        putObjectRequest.setMetadata(buildMetadata(key, null));
        return cosClient.putObject(putObjectRequest);
    }

    /**
     * 上传对象（带指定 Content-Type）
     *
     * @param key 唯一键
     * @param file 文件
     * @param contentType Content-Type
     * @return
     */
    public PutObjectResult putObject(String key, File file, String contentType) {
        PutObjectRequest putObjectRequest = new PutObjectRequest(cosClientConfig.getBucket(), key,
                file);
        putObjectRequest.setMetadata(buildMetadata(key, contentType));
        return cosClient.putObject(putObjectRequest);
    }

    private ObjectMetadata buildMetadata(String key, String explicitContentType) {
        ObjectMetadata metadata = new ObjectMetadata();
        String contentType = explicitContentType != null ? explicitContentType : resolveContentType(key);
        if (contentType != null) {
            metadata.setContentType(contentType);
        }
        if (isVideo(key, contentType)) {
            metadata.setCacheControl(IMMUTABLE_CACHE_CONTROL);
            metadata.setContentDisposition("inline");
        }
        return metadata;
    }

    private boolean isVideo(String key, String contentType) {
        if (contentType != null && contentType.toLowerCase().startsWith("video/")) {
            return true;
        }
        String resolvedContentType = resolveContentType(key);
        return resolvedContentType != null && resolvedContentType.startsWith("video/");
    }

    private String resolveContentType(String key) {
        if (key == null) return null;
        String lower = key.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
        if (lower.endsWith(".css")) return "text/css; charset=utf-8";
        if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (lower.endsWith(".json")) return "application/json; charset=utf-8";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".m4v")) return "video/x-m4v";
        if (lower.endsWith(".zip")) return "application/zip";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".ttf")) return "font/ttf";
        return null;
    }
}
