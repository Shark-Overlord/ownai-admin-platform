package com.yupi.springbootinit.service;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.User;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.function.Supplier;
import javax.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class ResourceDownloadService {
    private final ResourceAnalyticsService analytics;
    private final CosClientConfig cos;
    @Value("${resource.download.trusted-origins:}")
    private String trustedOrigins;
    public ResourceDownloadService(ResourceAnalyticsService analytics,CosClientConfig cos) { this.analytics=analytics;this.cos=cos; }

    void validateSource(String source) {
        try {
            URI uri=new URI(source);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo()!=null || uri.getHost()==null)
                throw new IllegalArgumentException();
            String candidates=StringUtils.defaultString(cos.getHost())+","+StringUtils.defaultString(trustedOrigins);
            for(String origin:candidates.split(",")) {
                if(StringUtils.isBlank(origin)) continue;
                URI allowed=new URI(origin.trim());
                if(uri.getScheme().equalsIgnoreCase(allowed.getScheme()) && uri.getHost().equalsIgnoreCase(allowed.getHost())
                        && port(uri)==port(allowed)) return;
            }
        } catch(Exception ignored) { /* Uniform failure avoids exposing internal storage details. */ }
        throw new BusinessException(ErrorCode.OPERATION_ERROR,"原文件地址不可用");
    }
    private static int port(URI uri) { return uri.getPort()<0 ? 443 : uri.getPort(); }
    protected HttpURLConnection connect(String source) throws IOException {
        return (HttpURLConnection)new URL(source).openConnection();
    }
    public void download(String type,long resourceId,Long mediaId,User user,Supplier<String> source,
                         String filename,HttpServletResponse response) throws IOException {
        long event=analytics.startDownload(type,resourceId,mediaId,user);
        long bytes=0,lastProgress=System.currentTimeMillis();
        boolean success=false;
        String failure="source_error";
        HttpURLConnection connection=null;
        try {
            String url=source.get();
            validateSource(url);
            connection=connect(url);
            connection.setConnectTimeout(15_000);connection.setReadTimeout(300_000);
            connection.setInstanceFollowRedirects(false);connection.setRequestMethod("GET");
            int code=connection.getResponseCode();
            if(code!=200) throw new BusinessException(ErrorCode.OPERATION_ERROR,"原文件读取失败");
            response.setContentType(StringUtils.defaultIfBlank(connection.getContentType(),"application/octet-stream"));
            String extension=new URL(url).getPath();
            extension=extension.substring(extension.lastIndexOf('.')+1);
            String safeName=filename+(extension.matches("[A-Za-z0-9]{1,8}") ? "."+extension : "");
            response.setHeader("Content-Disposition","attachment; filename*=UTF-8''"+URLEncoder.encode(safeName,StandardCharsets.UTF_8.name()).replace("+","%20"));
            response.setHeader("Cache-Control","private, no-store");
            response.setHeader("X-Content-Type-Options","nosniff");
            long expected=connection.getContentLengthLong();
            if(expected>=0) response.setContentLengthLong(expected);
            failure="transfer_interrupted";
            try(InputStream input=new BufferedInputStream(connection.getInputStream())) {
                OutputStream output=response.getOutputStream();
                byte[] buffer=new byte[16*1024];int count;
                while((count=input.read(buffer))!=-1) {
                    output.write(buffer,0,count);bytes+=count;
                    if(System.currentTimeMillis()-lastProgress>=5000) {
                        analytics.progress(event,bytes);lastProgress=System.currentTimeMillis();
                    }
                }
                output.flush();
                if(expected>=0 && bytes!=expected) throw new IOException("Incomplete upstream file");
                success=true;failure=null;
            }
        } catch (IOException e) {
            if (!response.isCommitted()) {
                response.reset();
                throw new BusinessException(ErrorCode.OPERATION_ERROR, "原文件传输失败，请重试");
            }
            throw e;
        } catch (RuntimeException e) {
            if (!response.isCommitted()) {
                response.reset();
                throw e;
            }
            throw new IOException("File transfer failed after response was committed", e);
        } finally {
            if(connection!=null) connection.disconnect();
            // Do not replace a transfer failure with a logging failure or serialize JSON into a file stream.
            try { analytics.finish(event,bytes,success,failure); }
            catch(RuntimeException e) { log.error("Could not finalize resource download {} (bytes={}, completed={})",event,bytes,success,e); }
        }
    }
}
