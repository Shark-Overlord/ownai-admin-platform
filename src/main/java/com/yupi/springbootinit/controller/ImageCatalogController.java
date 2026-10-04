package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogCreateRequest;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogImportRequest;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogVersionActionRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.ContentApiKey;
import com.yupi.springbootinit.model.vo.imagecatalog.ImageCatalogImportResultVO;
import com.yupi.springbootinit.model.vo.imagecatalog.ImageCatalogVO;
import com.yupi.springbootinit.service.ImageCatalogService;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.service.ContentExternalService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.ApiOperation;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/imageCatalog")
public class ImageCatalogController {
    private final ImageCatalogService imageCatalogService;
    private final UserService userService;
    private final ContentApiKeyService contentApiKeyService;
    private final ContentExternalService contentExternalService;

    public ImageCatalogController(ImageCatalogService imageCatalogService, UserService userService,
            ContentApiKeyService contentApiKeyService, ContentExternalService contentExternalService) {
        this.imageCatalogService = imageCatalogService;
        this.userService = userService;
        this.contentApiKeyService = contentApiKeyService;
        this.contentExternalService = contentExternalService;
    }

    @GetMapping("/active")
    @ApiOperation("Get the active image classification catalog")
    public BaseResponse<ImageCatalogVO> getActive(@RequestParam Long categoryId, @RequestParam String assetType) {
        return ResultUtils.success(imageCatalogService.getActiveCatalog(categoryId, assetType));
    }

    @GetMapping("/admin/version")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Inspect an image catalog version")
    public BaseResponse<ImageCatalogVO> getVersion(@RequestParam Long versionId) {
        return ResultUtils.success(imageCatalogService.getVersion(versionId));
    }

    @PostMapping("/admin/version/create")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "image_catalog", action = "create_version")
    public BaseResponse<Long> createVersion(@RequestBody ImageCatalogCreateRequest request,
            HttpServletRequest httpRequest) {
        return ResultUtils.success(imageCatalogService.createVersion(request, loginUser(httpRequest).getId()));
    }

    @PostMapping("/admin/member/import")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "image_catalog", action = "import_members")
    public BaseResponse<ImageCatalogImportResultVO> importMembers(@RequestBody ImageCatalogImportRequest request,
            HttpServletRequest httpRequest) {
        return ResultUtils.success(imageCatalogService.importMembers(request, loginUser(httpRequest).getId()));
    }

    @PostMapping("/admin/version/review")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "image_catalog", action = "review_version")
    public BaseResponse<ImageCatalogVO> reviewVersion(@RequestBody ImageCatalogVersionActionRequest request,
            HttpServletRequest httpRequest) {
        return ResultUtils.success(imageCatalogService.reviewVersion(request, loginUser(httpRequest).getId()));
    }

    @PostMapping("/admin/version/activate")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "image_catalog", action = "activate_version")
    public BaseResponse<ImageCatalogVO> activateVersion(@RequestBody ImageCatalogVersionActionRequest request,
            HttpServletRequest httpRequest) {
        return ResultUtils.success(imageCatalogService.activateVersion(request, loginUser(httpRequest).getId()));
    }

    @PostMapping("/admin/version/deactivate")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "image_catalog", action = "deactivate_version")
    public BaseResponse<ImageCatalogVO> deactivateVersion(@RequestBody ImageCatalogVersionActionRequest request,
            HttpServletRequest httpRequest) {
        return ResultUtils.success(imageCatalogService.deactivateVersion(request, loginUser(httpRequest).getId()));
    }

    @PostMapping("/external/schema/ensure")
    @OperationLog(module = "image_catalog", action = "ensure_schema_external")
    public BaseResponse<Map<String, Object>> ensureSchemaExternal(HttpServletRequest request) {
        externalOperator(request);
        return ResultUtils.success(imageCatalogService.ensureSchema());
    }

    @GetMapping("/external/preflight")
    public BaseResponse<Map<String, Object>> preflightExternal(@RequestParam Long categoryId,
            @RequestParam String assetType, HttpServletRequest request) {
        externalOperator(request);
        return ResultUtils.success(imageCatalogService.preflight(categoryId, assetType));
    }

    @GetMapping("/external/version")
    public BaseResponse<ImageCatalogVO> getVersionExternal(@RequestParam Long versionId,
            HttpServletRequest request) {
        externalOperator(request);
        return ResultUtils.success(imageCatalogService.getVersion(versionId));
    }

    @PostMapping("/external/version/create")
    @OperationLog(module = "image_catalog", action = "create_version_external")
    public BaseResponse<Long> createVersionExternal(@RequestBody ImageCatalogCreateRequest body,
            HttpServletRequest request) {
        return ResultUtils.success(imageCatalogService.createVersion(body, externalOperator(request).getId()));
    }

    @PostMapping("/external/member/import")
    @OperationLog(module = "image_catalog", action = "import_members_external")
    public BaseResponse<ImageCatalogImportResultVO> importMembersExternal(@RequestBody ImageCatalogImportRequest body,
            HttpServletRequest request) {
        return ResultUtils.success(imageCatalogService.importMembers(body, externalOperator(request).getId()));
    }

    @PostMapping("/external/version/review")
    @OperationLog(module = "image_catalog", action = "review_version_external")
    public BaseResponse<ImageCatalogVO> reviewVersionExternal(@RequestBody ImageCatalogVersionActionRequest body,
            HttpServletRequest request) {
        return ResultUtils.success(imageCatalogService.reviewVersion(body, externalOperator(request).getId()));
    }

    @PostMapping("/external/version/activate")
    @OperationLog(module = "image_catalog", action = "activate_version_external")
    public BaseResponse<ImageCatalogVO> activateVersionExternal(@RequestBody ImageCatalogVersionActionRequest body,
            HttpServletRequest request) {
        return ResultUtils.success(imageCatalogService.activateVersion(body, externalOperator(request).getId()));
    }

    @PostMapping("/external/version/deactivate")
    @OperationLog(module = "image_catalog", action = "deactivate_version_external")
    public BaseResponse<ImageCatalogVO> deactivateVersionExternal(@RequestBody ImageCatalogVersionActionRequest body,
            HttpServletRequest request) {
        return ResultUtils.success(imageCatalogService.deactivateVersion(body, externalOperator(request).getId()));
    }

    private User loginUser(HttpServletRequest request) {
        return userService.getLoginUser(request);
    }

    private User externalOperator(HttpServletRequest request) {
        ContentApiKey key = contentApiKeyService.requireRequestKey(request,
                Collections.singletonList(ContentApiKeyService.SCOPE_CATEGORY_MANAGE));
        return contentExternalService.requireOperator(key);
    }
}
