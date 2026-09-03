package com.yupi.springbootinit.service;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.model.vo.file.RemoteImageImportItemVO;
import com.yupi.springbootinit.model.vo.file.RemoteImageImportResultVO;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import javax.annotation.Resource;
import javax.net.ssl.HttpsURLConnection;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class RemoteImageImportService {

    static final int MAX_IMAGE_COUNT = 50;
    static final long MAX_IMAGE_SIZE = 20L * 1024 * 1024;
    private static final int MAX_REDIRECTS = 3;
    private static final int HTTP_TIMEOUT_MS = 10_000;

    @Resource
    private CosManager cosManager;

    @Resource
    private CosClientConfig cosClientConfig;

    public RemoteImageImportResultVO importImages(List<String> rawUrls, Long userId) {
        if (rawUrls == null || rawUrls.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "图片地址不能为空");
        }
        Set<String> uniqueUrls = new LinkedHashSet<>();
        for (String rawUrl : rawUrls) {
            uniqueUrls.add(StringUtils.trimToEmpty(rawUrl));
        }
        if (uniqueUrls.size() > MAX_IMAGE_COUNT) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "单次最多导入 50 张图片");
        }

        List<RemoteImageImportItemVO> items = new ArrayList<>();
        int successCount = 0;
        for (String sourceUrl : uniqueUrls) {
            RemoteImageImportItemVO item = importOne(sourceUrl, userId);
            items.add(item);
            if (Boolean.TRUE.equals(item.getSuccess())) {
                successCount++;
            }
        }
        return new RemoteImageImportResultVO(items, successCount, items.size() - successCount);
    }

    private RemoteImageImportItemVO importOne(String sourceUrl, Long userId) {
        File tempFile = null;
        try {
            tempFile = File.createTempFile("blog-remote-image-", ".tmp");
            DownloadedImage downloadedImage = download(sourceUrl, tempFile);
            String filename = RandomStringUtils.randomAlphanumeric(12) + "-imported." + downloadedImage.extension;
            String objectPath = String.format("blog_image/%s/%s", userId, filename);
            String filepath = "/" + objectPath;
            cosManager.putObject(filepath, tempFile, downloadedImage.contentType);
            return new RemoteImageImportItemVO(sourceUrl, cosClientConfig.getHost() + filepath, true, null);
        } catch (Exception e) {
            String message = e instanceof BusinessException ? e.getMessage() : "图片下载或上传失败";
            log.warn("remote blog image import failed, sourceUrl = {}, reason = {}", sanitizeUrlForLog(sourceUrl), message);
            return new RemoteImageImportItemVO(sourceUrl, null, false, message);
        } finally {
            if (tempFile != null && tempFile.exists() && !tempFile.delete()) {
                log.warn("remote blog image temp file delete failed, path = {}", tempFile.getAbsolutePath());
            }
        }
    }

    private DownloadedImage download(String sourceUrl, File target) throws IOException {
        URI currentUri = parseAndValidateUri(sourceUrl);
        for (int redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
            validatePublicHost(currentUri.getHost());
            HttpsURLConnection connection = (HttpsURLConnection) currentUri.toURL().openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(HTTP_TIMEOUT_MS);
            connection.setReadTimeout(HTTP_TIMEOUT_MS);
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Accept", "image/jpeg,image/png,image/webp");
            connection.setRequestProperty("User-Agent", "OwnAI-Blog-Image-Importer/1.0");
            try {
                int status = connection.getResponseCode();
                if (isRedirect(status)) {
                    if (redirectCount == MAX_REDIRECTS) {
                        throw new BusinessException(ErrorCode.OPERATION_ERROR, "图片重定向次数过多");
                    }
                    String location = connection.getHeaderField("Location");
                    if (StringUtils.isBlank(location)) {
                        throw new BusinessException(ErrorCode.OPERATION_ERROR, "图片重定向地址无效");
                    }
                    currentUri = parseAndValidateUri(currentUri.resolve(location).toString());
                    continue;
                }
                if (status < 200 || status >= 300) {
                    throw new BusinessException(ErrorCode.OPERATION_ERROR, "图片服务器返回 " + status);
                }
                long contentLength = connection.getContentLengthLong();
                if (contentLength > MAX_IMAGE_SIZE) {
                    throw new BusinessException(ErrorCode.PARAMS_ERROR, "图片不能超过 20MB");
                }
                try (InputStream input = new BufferedInputStream(connection.getInputStream());
                        FileOutputStream output = new FileOutputStream(target)) {
                    byte[] buffer = new byte[8192];
                    long total = 0;
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        total += read;
                        if (total > MAX_IMAGE_SIZE) {
                            throw new BusinessException(ErrorCode.PARAMS_ERROR, "图片不能超过 20MB");
                        }
                        output.write(buffer, 0, read);
                    }
                }
                return inspectImage(target);
            } finally {
                connection.disconnect();
            }
        }
        throw new BusinessException(ErrorCode.OPERATION_ERROR, "图片下载失败");
    }

    URI parseAndValidateUri(String sourceUrl) {
        try {
            URI uri = new URI(sourceUrl);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || StringUtils.isBlank(uri.getHost())
                    || uri.getUserInfo() != null) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "仅支持公开的 HTTPS 图片地址");
            }
            return uri;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "图片地址格式无效");
        }
    }

    void validatePublicHost(String host) {
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            if (addresses.length == 0) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "图片域名无法解析");
            }
            for (InetAddress address : addresses) {
                byte[] bytes = address.getAddress();
                boolean uniqueLocalIpv6 = bytes.length == 16 && (bytes[0] & 0xfe) == 0xfc;
                if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress() || address.isMulticastAddress() || uniqueLocalIpv6) {
                    throw new BusinessException(ErrorCode.PARAMS_ERROR, "不允许导入内网或本机图片");
                }
            }
        } catch (UnknownHostException e) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "图片域名无法解析");
        }
    }

    private DownloadedImage inspectImage(File file) throws IOException {
        byte[] header = new byte[12];
        int length;
        try (FileInputStream input = new FileInputStream(file)) {
            length = input.read(header);
        }
        if (length >= 8 && (header[0] & 0xff) == 0x89 && header[1] == 0x50 && header[2] == 0x4e
                && header[3] == 0x47 && header[4] == 0x0d && header[5] == 0x0a
                && header[6] == 0x1a && header[7] == 0x0a) {
            return new DownloadedImage("png", "image/png");
        }
        if (length >= 3 && (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8
                && (header[2] & 0xff) == 0xff) {
            return new DownloadedImage("jpg", "image/jpeg");
        }
        if (length >= 12 && new String(header, 0, 4, StandardCharsets.US_ASCII).toUpperCase(Locale.ROOT).equals("RIFF")
                && new String(header, 8, 4, StandardCharsets.US_ASCII).equals("WEBP")) {
            return new DownloadedImage("webp", "image/webp");
        }
        throw new BusinessException(ErrorCode.PARAMS_ERROR, "仅支持 JPG、PNG、WebP 图片");
    }

    private boolean isRedirect(int status) {
        return status == HttpURLConnection.HTTP_MOVED_PERM || status == HttpURLConnection.HTTP_MOVED_TEMP
                || status == HttpURLConnection.HTTP_SEE_OTHER || status == 307 || status == 308;
    }

    private String sanitizeUrlForLog(String sourceUrl) {
        try {
            URI uri = new URI(sourceUrl);
            return new URI(uri.getScheme(), null, uri.getHost(), uri.getPort(), uri.getPath(), null, null).toString();
        } catch (Exception ignored) {
            return "<invalid-url>";
        }
    }

    private static class DownloadedImage {
        private final String extension;
        private final String contentType;

        private DownloadedImage(String extension, String contentType) {
            this.extension = extension;
            this.contentType = contentType;
        }
    }
}
