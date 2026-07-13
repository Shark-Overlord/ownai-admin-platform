package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
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
import com.yupi.springbootinit.model.dto.artwork.ArtworkFavoriteRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkUpdateRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.ArtworkListVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkHomeOverviewVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.manager.CosManager;
import com.yupi.springbootinit.manager.PublicContentAntiCrawlerManager;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.service.UserService;
import cn.hutool.core.io.FileUtil;
import cn.hutool.http.HttpUtil;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
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
import org.springframework.web.bind.annotation.RequestParam;
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

    @Resource
    private ContentApiKeyService contentApiKeyService;

    @Resource
    private PublicContentAntiCrawlerManager publicContentAntiCrawlerManager;

    /**
     * 管理员添加艺术作品 Admin add artwork
     */
    @PostMapping("/add")
    @OperationLog(module = "artwork", action = "add_artwork")
    @ApiOperation("管理员添加艺术作品 Admin add artwork")
    public BaseResponse<Long> addArtwork(@RequestBody ArtworkAddRequest artworkAddRequest, HttpServletRequest request) {
        User operator = resolveAdminOrSecretOperator(
                artworkAddRequest == null ? null : artworkAddRequest.getApiSecret(),
                request,
                ContentApiKeyService.SCOPE_ARTWORK_ADD);
        return ResultUtils.success(artworkService.addArtwork(artworkAddRequest, operator));
    }

    private User resolveAdminOrSecretOperator(String requestSecret, HttpServletRequest request, String requiredScope) {
        if (contentApiKeyService.validateRequestKey(requestSecret, request, requiredScope)) {
            return getDefaultAdminUser();
        }
        User loginUser = userService.getLoginUser(request);
        if (!userService.isAdmin(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        return loginUser;
    }

    private User getDefaultAdminUser() {
        User adminUser = userService.getOne(new QueryWrapper<User>()
                .eq("userRole", UserConstant.ADMIN_ROLE)
                .eq("isDelete", 0)
                .orderByAsc("id")
                .last("LIMIT 1"));
        if (adminUser == null) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Default admin user not found");
        }
        return adminUser;
    }

    /**
     * 管理员更新艺术作品 Admin update artwork
     */
    @PostMapping("/update")
    @OperationLog(module = "artwork", action = "update_artwork")
    @ApiOperation("管理员更新艺术作品 Admin update artwork")
    public BaseResponse<Boolean> updateArtwork(@RequestBody ArtworkUpdateRequest artworkUpdateRequest,
            HttpServletRequest request) {
        User operator = resolveAdminOrSecretOperator(
                artworkUpdateRequest == null ? null : artworkUpdateRequest.getApiSecret(),
                request,
                ContentApiKeyService.SCOPE_ARTWORK_UPDATE);
        return ResultUtils.success(artworkService.updateArtwork(artworkUpdateRequest, operator));
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
    @PostMapping("/publish/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "artwork", action = "batch_publish_artwork")
    @ApiOperation("Admin batch publish artworks")
    public BaseResponse<Boolean> publishArtworkBatch(@RequestBody BatchDeleteRequest batchDeleteRequest) {
        if (batchDeleteRequest == null || CollUtil.isEmpty(batchDeleteRequest.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(artworkService.publishArtworkBatch(batchDeleteRequest.getIds()));
    }

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
     * 获取已解锁作品的提示词 Get unlocked artwork prompt
     */
    @GetMapping("/get/vo")
    @ApiOperation("获取已解锁作品的提示词 Get unlocked artwork prompt")
    public BaseResponse<String> getArtworkVOById(long id, HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(artworkService.getArtworkPromptContent(id, loginUser));
    }

    /**
     * Download an artwork source package after checking login and membership access.
     */
    @GetMapping("/source/download")
    @ApiOperation("下载作品源码 ZIP Download artwork source ZIP")
    public void downloadArtworkSource(@RequestParam("id") long id, HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        User loginUser = userService.getLoginUser(request);
        String sourceZipUrl = artworkService.getArtworkSourceZipUrl(id, loginUser);
        validateSourceZipUrl(sourceZipUrl);

        Artwork artwork = artworkService.getById(id);
        String downloadName = StringUtils.defaultIfBlank(artwork == null ? null : artwork.getTitle(),
                "artwork-" + id) + "-source.zip";
        String encodedName = URLEncoder.encode(downloadName, StandardCharsets.UTF_8.name())
                .replace("+", "%20");

        HttpURLConnection connection = (HttpURLConnection) new URL(sourceZipUrl).openConnection();
        connection.setConnectTimeout(15_000);
        connection.setReadTimeout(120_000);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestMethod("GET");
        int statusCode = connection.getResponseCode();
        if (statusCode < 200 || statusCode >= 300) {
            connection.disconnect();
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "源码文件读取失败");
        }

        response.setContentType("application/zip");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"artwork-source.zip\"; filename*=UTF-8''" + encodedName);
        response.setHeader("Cache-Control", "private, no-store");
        long contentLength = connection.getContentLengthLong();
        if (contentLength >= 0) {
            response.setContentLengthLong(contentLength);
        }

        try (InputStream inputStream = new BufferedInputStream(connection.getInputStream());
                OutputStream outputStream = new BufferedOutputStream(response.getOutputStream())) {
            byte[] buffer = new byte[16 * 1024];
            int length;
            while ((length = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, length);
            }
            outputStream.flush();
        } finally {
            connection.disconnect();
        }
    }

    private void validateSourceZipUrl(String sourceZipUrl) {
        String cosHost = StringUtils.removeEnd(StringUtils.trimToEmpty(cosClientConfig.getHost()), "/");
        if (StringUtils.isBlank(cosHost) || !StringUtils.startsWith(sourceZipUrl, cosHost + "/")) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "源码文件地址无效");
        }
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
     * 获取前台作品首页概览 Get frontend artwork home overview
     */
    @GetMapping("/home/overview")
    @ApiOperation("获取前台作品首页概览 Get frontend artwork home overview")
    public BaseResponse<ArtworkHomeOverviewVO> getArtworkHomeOverview(HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(artworkService.getHomeOverview(loginUser));
    }

    /**
     * 分页查询艺术作品列表（前台） Page query artwork list for frontend
     */
    @PostMapping("/list/page/vo")
    @ApiOperation("分页查询艺术作品列表（前台） Page query artwork list for frontend")
    public BaseResponse<Page<ArtworkListVO>> listArtworkVOByPage(@RequestBody ArtworkQueryRequest artworkQueryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        publicContentAntiCrawlerManager.checkRequest(artworkQueryRequest, loginUser, request);
        Page<ArtworkVO> artworkPage = artworkService.listArtworkVOByPage(artworkQueryRequest, loginUser, false);
        Page<ArtworkListVO> listPage = new Page<>(artworkPage.getCurrent(), artworkPage.getSize(), artworkPage.getTotal());
        listPage.setRecords(artworkPage.getRecords().stream().map(artworkVO -> {
            ArtworkListVO artworkListVO = new ArtworkListVO();
            artworkListVO.setId(artworkVO.getId());
            artworkListVO.setTitle(artworkVO.getTitle());
            artworkListVO.setCoverUrl(artworkVO.getCoverUrl());
            artworkListVO.setVideoUrl(artworkVO.getVideoUrl());
            artworkListVO.setImageWidth(artworkVO.getImageWidth());
            artworkListVO.setImageHeight(artworkVO.getImageHeight());
            artworkListVO.setImageAspectRatio(artworkVO.getImageAspectRatio());
            artworkListVO.setMemberOnly(artworkVO.getMemberOnly());
            artworkListVO.setCanAccess(artworkVO.getCanAccessPrompt());
            artworkListVO.setFavorited(artworkVO.getFavorited());
            artworkListVO.setFavoriteCount(artworkVO.getFavoriteCount());
            artworkListVO.setHasSourceCode(artworkVO.getHasSourceCode());
            return artworkListVO;
        }).collect(Collectors.toList()));
        return ResultUtils.success(listPage);
    }

    @PostMapping("/favorite/add")
    @OperationLog(module = "artwork", action = "favorite_artwork")
    @ApiOperation("Favorite artwork")
    public BaseResponse<Boolean> addFavorite(@RequestBody ArtworkFavoriteRequest favoriteRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(artworkService.addFavorite(favoriteRequest, loginUser));
    }

    @PostMapping("/favorite/cancel")
    @OperationLog(module = "artwork", action = "cancel_favorite_artwork")
    @ApiOperation("Cancel artwork favorite")
    public BaseResponse<Boolean> cancelFavorite(@RequestBody ArtworkFavoriteRequest favoriteRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(artworkService.cancelFavorite(favoriteRequest, loginUser));
    }

    @GetMapping("/favorite/check")
    @ApiOperation("Check artwork favorite status")
    public BaseResponse<Boolean> checkFavorite(Long artworkId, HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(artworkService.isFavorited(artworkId, loginUser));
    }

    @PostMapping("/favorite/my/list/page")
    @ApiOperation("Page query my favorite artworks")
    public BaseResponse<Page<ArtworkListVO>> listMyFavoriteArtworks(@RequestBody ArtworkQueryRequest queryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(artworkService.listMyFavoriteArtworkVOByPage(queryRequest, loginUser));
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
        File sourceZipFile = null;

        try {
            sourceZipFile = File.createTempFile("artwork-source-", ".zip");
            multipartFile.transferTo(sourceZipFile);

            // 1. 解压
            try (InputStream inputStream = new java.io.FileInputStream(sourceZipFile)) {
                extractZip(inputStream, extractDir);
            }

            // 2. 查找 index.html
            File indexHtml = findIndexHtml(extractDir);
            if (indexHtml == null) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "压缩包内未找到 index.html");
            }

            // 3. 上传所有资源到 COS
            String cosPrefix = "artwork/html/" + uuid + "/";
            String sourceKey = "artwork/source/" + uuid + ".zip";
            cosManager.putObject(sourceKey, sourceZipFile, "application/zip");
            String htmlKey = null;
            for (File file : FileUtil.loopFiles(extractDir)) {
                String relativePath = extractDir.toURI().relativize(file.toURI()).getPath().replace("\\", "/");
                String key = cosPrefix + relativePath;
                cosManager.putObject(key, file);
                if (file.getCanonicalFile().equals(indexHtml.getCanonicalFile())) {
                    htmlKey = key;
                }
            }

            if (htmlKey == null) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "COS 上传异常");
            }

            Map<String, String> result = new HashMap<>();
            result.put("htmlUrl", cosClientConfig.getHost() + "/" + htmlKey);
            result.put("sourceZipUrl", cosClientConfig.getHost() + "/" + sourceKey);
            return ResultUtils.success(result);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("upload html zip error", e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "上传失败: " + e.getMessage());
        } finally {
            FileUtil.del(extractDir);
            if (sourceZipFile != null) {
                FileUtil.del(sourceZipFile);
            }
        }
    }

    private void extractZip(InputStream inputStream, File destDir) throws IOException {
        if (!destDir.exists()) {
            destDir.mkdirs();
        }
        String destinationPath = destDir.getCanonicalPath() + File.separator;
        long extractedSize = 0L;
        final long maxExtractedSize = 200L * 1024 * 1024;
        try (ZipInputStream zis = new ZipInputStream(inputStream)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                File entryFile = new File(destDir, entry.getName());
                if (!entryFile.getCanonicalPath().startsWith(destinationPath)) {
                    throw new BusinessException(ErrorCode.PARAMS_ERROR, "ZIP 压缩包包含非法路径");
                }
                if (entry.isDirectory()) {
                    entryFile.mkdirs();
                    continue;
                }
                File parent = entryFile.getParentFile();
                if (parent != null && !parent.exists()) {
                    parent.mkdirs();
                }
                try (FileOutputStream fos = new FileOutputStream(entryFile)) {
                    byte[] buffer = new byte[8192];
                    int len;
                    while ((len = zis.read(buffer)) > 0) {
                        extractedSize += len;
                        if (extractedSize > maxExtractedSize) {
                            throw new BusinessException(ErrorCode.PARAMS_ERROR, "ZIP 解压后文件不能超过 200MB");
                        }
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
