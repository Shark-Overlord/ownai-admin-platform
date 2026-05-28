package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import cn.hutool.core.collection.CollUtil;
import com.yupi.springbootinit.common.BatchDeleteRequest;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.DeleteRequest;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.artwork.ArtworkAddRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkUpdateRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.ArtworkDetailVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.UserService;
import cn.hutool.core.io.FileUtil;
import cn.hutool.http.HttpUtil;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 艺术作品接口 Artwork Controller
 */
@RestController
@RequestMapping("/artwork")
@Api(tags = "Artwork")
@Slf4j
public class ArtworkController {

    @Resource
    private ArtworkService artworkService;

    @Resource
    private UserService userService;

    @Resource
    private CosManager cosManager;

    @Resource
    private CosClientConfig cosClientConfig;

    /**
     * 管理员添加艺术作品 Admin add artwork
     */
    @PostMapping("/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "artwork", action = "add_artwork")
    @ApiOperation("管理员添加艺术作品 Admin add artwork")
    public BaseResponse<Long> addArtwork(@RequestBody ArtworkAddRequest artworkAddRequest, HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(artworkService.addArtwork(artworkAddRequest, loginUser));
    }

    /**
     * 管理员更新艺术作品 Admin update artwork
     */
    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "artwork", action = "update_artwork")
    @ApiOperation("管理员更新艺术作品 Admin update artwork")
    public BaseResponse<Boolean> updateArtwork(@RequestBody ArtworkUpdateRequest artworkUpdateRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(artworkService.updateArtwork(artworkUpdateRequest, loginUser));
    }

    /**
     * 管理员批量删除艺术作品 Admin batch delete artwork
     */
    @PostMapping("/delete/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "artwork", action = "batch_delete_artwork")
    @ApiOperation("管理员批量删除艺术作品 Admin batch delete artwork")
    public BaseResponse<Boolean> deleteArtworkBatch(@RequestBody BatchDeleteRequest batchDeleteRequest) {
        if (batchDeleteRequest == null || CollUtil.isEmpty(batchDeleteRequest.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        for (Long id : batchDeleteRequest.getIds()) {
            artworkService.deleteArtwork(id);
        }
        return ResultUtils.success(true);
    }

    /**
     * 管理员删除艺术作品 Admin delete artwork
     */
    @PostMapping("/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "artwork", action = "delete_artwork")
    @ApiOperation("管理员删除艺术作品 Admin delete artwork")
    public BaseResponse<Boolean> deleteArtwork(@RequestBody DeleteRequest deleteRequest) {
        if (deleteRequest == null || deleteRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(artworkService.deleteArtwork(deleteRequest.getId()));
    }

    /**
     * 获取作品HTML预览内容 Get artwork HTML preview
     */
    @GetMapping("/preview/{id}")
    @ApiOperation("获取作品HTML预览内容 Get artwork HTML preview")
    public void previewHtml(@PathVariable Long id, HttpServletResponse response) throws IOException {
        Artwork artwork = artworkService.getById(id);
        if (artwork == null || StringUtils.isBlank(artwork.getHtmlUrl())) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        String htmlContent = HttpUtil.get(artwork.getHtmlUrl());
        if (StringUtils.isBlank(htmlContent)) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        String baseDir = artwork.getHtmlUrl().substring(0, artwork.getHtmlUrl().lastIndexOf('/') + 1);
        htmlContent = resolveHtmlUrls(htmlContent, baseDir);
        response.setContentType("text/html; charset=utf-8");
        response.getWriter().write(htmlContent);
    }

    private String resolveHtmlUrls(String htmlContent, String baseDir) {
        Matcher srcMatcher = Pattern.compile("src=\"([^\"]*)\"").matcher(htmlContent);
        StringBuffer sb = new StringBuffer();
        while (srcMatcher.find()) {
            srcMatcher.appendReplacement(sb, "src=\"" + Matcher.quoteReplacement(resolveUrl(baseDir, srcMatcher.group(1))) + "\"");
        }
        srcMatcher.appendTail(sb);
        htmlContent = sb.toString();

        Matcher hrefMatcher = Pattern.compile("href=\"([^\"]*)\"").matcher(htmlContent);
        sb = new StringBuffer();
        while (hrefMatcher.find()) {
            hrefMatcher.appendReplacement(sb, "href=\"" + Matcher.quoteReplacement(resolveUrl(baseDir, hrefMatcher.group(1))) + "\"");
        }
        hrefMatcher.appendTail(sb);
        htmlContent = sb.toString();

        Matcher urlMatcher = Pattern.compile("url\\((['\"]?)([^)'\"]+)\\1\\)").matcher(htmlContent);
        sb = new StringBuffer();
        while (urlMatcher.find()) {
            String replacement = "url(" + urlMatcher.group(1) + Matcher.quoteReplacement(resolveUrl(baseDir, urlMatcher.group(2))) + urlMatcher.group(1) + ")";
            urlMatcher.appendReplacement(sb, replacement);
        }
        urlMatcher.appendTail(sb);
        return sb.toString();
    }

    private String resolveUrl(String baseDir, String url) {
        if (StringUtils.isBlank(url)) {
            return url;
        }
        String trimmed = url.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")
                || trimmed.startsWith("//") || trimmed.startsWith("mailto:")
                || trimmed.startsWith("tel:") || trimmed.startsWith("data:")) {
            return trimmed;
        }
        if (trimmed.startsWith("#")) {
            return trimmed;
        }
        if (trimmed.startsWith("./")) {
            trimmed = trimmed.substring(2);
        }
        if (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        return baseDir + trimmed;
    }

    /**
     * 获取艺术作品详情 Get artwork detail
     */
    @GetMapping("/get/vo")
    @ApiOperation("获取艺术作品详情 Get artwork detail")
    public BaseResponse<ArtworkDetailVO> getArtworkVOById(long id, HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(artworkService.getArtworkDetail(id, loginUser, false));
    }

    /**
     * 获取作品统计 Get artwork statistics
     */
    @GetMapping("/stats")
    @ApiOperation("获取作品统计 Get artwork statistics")
    public BaseResponse<Map<String, Long>> getArtworkStats() {
        long total = artworkService.count();
        Map<String, Long> result = new HashMap<>();
        result.put("total", total);
        return ResultUtils.success(result);
    }

    /**
     * 分页查询艺术作品列表（前台） Page query artwork list for frontend
     */
    @PostMapping("/list/page/vo")
    @ApiOperation("分页查询艺术作品列表（前台） Page query artwork list for frontend")
    public BaseResponse<Page<ArtworkVO>> listArtworkVOByPage(@RequestBody ArtworkQueryRequest artworkQueryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(artworkService.listArtworkVOByPage(artworkQueryRequest, loginUser, false));
    }

    /**
     * 管理员分页查询艺术作品列表 Admin page query artwork list
     */
    @PostMapping("/admin/list/page/vo")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("管理员分页查询艺术作品列表 Admin page query artwork list")
    public BaseResponse<Page<ArtworkVO>> listArtworkVOByPageForAdmin(@RequestBody ArtworkQueryRequest artworkQueryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(artworkService.listArtworkVOByPage(artworkQueryRequest, loginUser, true));
    }

    /**
     * 上传HTML原型压缩包（自动解压、上传COS）
     */
    @PostMapping("/upload/html")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("上传HTML原型压缩包 Upload HTML prototype zip")
    public BaseResponse<Map<String, String>> uploadHtmlZip(@RequestPart("file") MultipartFile multipartFile) {
        String filename = multipartFile.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".zip")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "仅支持 ZIP 压缩包");
        }
        if (multipartFile.getSize() > 50 * 1024 * 1024) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "文件大小不能超过 50MB");
        }

        String tmpDir = System.getProperty("java.io.tmpdir");
        String uuid = UUID.randomUUID().toString().replace("-", "");
        File extractDir = new File(tmpDir, "artwork-html-" + uuid);

        try {
            // 1. 解压
            extractZip(multipartFile.getInputStream(), extractDir);

            // 2. 查找 index.html
            File indexHtml = findIndexHtml(extractDir);
            if (indexHtml == null) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "压缩包内未找到 index.html");
            }

            // 3. 上传所有资源到 COS
            String cosPrefix = "artwork/html/" + uuid + "/";
            String htmlKey = null;
            for (File file : FileUtil.loopFiles(extractDir)) {
                String relativePath = extractDir.toURI().relativize(file.toURI()).getPath().replace("\\", "/");
                String key = cosPrefix + relativePath;
                cosManager.putObject(key, file);
                if ("index.html".equals(relativePath)) {
                    htmlKey = key;
                }
            }

            if (htmlKey == null) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "COS 上传异常");
            }

            Map<String, String> result = new HashMap<>();
            result.put("htmlUrl", cosClientConfig.getHost() + "/" + htmlKey);
            return ResultUtils.success(result);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("upload html zip error", e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "上传失败: " + e.getMessage());
        } finally {
            FileUtil.del(extractDir);
        }
    }

    private void extractZip(InputStream inputStream, File destDir) throws IOException {
        if (!destDir.exists()) {
            destDir.mkdirs();
        }
        try (ZipInputStream zis = new ZipInputStream(inputStream)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                File entryFile = new File(destDir, entry.getName());
                if (entry.isDirectory()) {
                    entryFile.mkdirs();
                    continue;
                }
                File parent = entryFile.getParentFile();
                if (parent != null && !parent.exists()) {
                    parent.mkdirs();
                }
                try (FileOutputStream fos = new FileOutputStream(entryFile)) {
                    byte[] buffer = new byte[1024];
                    int len;
                    while ((len = zis.read(buffer)) > 0) {
                        fos.write(buffer, 0, len);
                    }
                }
                zis.closeEntry();
            }
        }
    }

    private File findIndexHtml(File dir) {
        for (File file : FileUtil.loopFiles(dir)) {
            if ("index.html".equalsIgnoreCase(file.getName())) {
                return file;
            }
        }
        return null;
    }
}
