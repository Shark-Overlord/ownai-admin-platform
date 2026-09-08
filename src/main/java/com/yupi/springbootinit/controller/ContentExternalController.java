package com.yupi.springbootinit.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.contentapi.ContentResourceQuery;
import com.yupi.springbootinit.model.entity.ContentApiKey;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.FileUploadBizEnum;
import com.yupi.springbootinit.model.vo.contentapi.ContentResourceVO;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.service.ContentExternalService;
import com.yupi.springbootinit.service.ContentFileUploadService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Unified direct content API for trusted external programs and agents. */
@RestController
@RequestMapping("/content/v1")
@Api(tags = "ContentExternalV1")
public class ContentExternalController {

    private static final List<String> ANY_CONTENT_SCOPE = Arrays.asList(
            ContentApiKeyService.SCOPE_ARTWORK_READ, ContentApiKeyService.SCOPE_ARTWORK_ADD,
            ContentApiKeyService.SCOPE_ARTWORK_UPDATE, ContentApiKeyService.SCOPE_ARTWORK_UPLOAD,
            ContentApiKeyService.SCOPE_PROMPT_ASSET_READ, ContentApiKeyService.SCOPE_PROMPT_ASSET_ADD,
            ContentApiKeyService.SCOPE_PROMPT_ASSET_UPDATE, ContentApiKeyService.SCOPE_PROMPT_ASSET_UPLOAD,
            ContentApiKeyService.SCOPE_VIDEO_BACKGROUND_READ, ContentApiKeyService.SCOPE_VIDEO_BACKGROUND_ADD,
            ContentApiKeyService.SCOPE_VIDEO_BACKGROUND_UPDATE, ContentApiKeyService.SCOPE_VIDEO_BACKGROUND_UPLOAD,
            ContentApiKeyService.SCOPE_COMMUNITY_POST_READ, ContentApiKeyService.SCOPE_COMMUNITY_POST_ADD,
            ContentApiKeyService.SCOPE_COMMUNITY_POST_UPDATE, ContentApiKeyService.SCOPE_COMMUNITY_POST_UPLOAD,
            ContentApiKeyService.SCOPE_TUTORIAL_READ, ContentApiKeyService.SCOPE_TUTORIAL_ADD,
            ContentApiKeyService.SCOPE_TUTORIAL_UPDATE, ContentApiKeyService.SCOPE_TUTORIAL_UPLOAD,
            ContentApiKeyService.SCOPE_TAXONOMY_READ);

    @Resource private ContentApiKeyService contentApiKeyService;
    @Resource private ContentExternalService contentExternalService;
    @Resource private ContentFileUploadService contentFileUploadService;

    @GetMapping("/capabilities")
    @ApiOperation("查看当前密钥可以使用的内容能力")
    public BaseResponse<Map<String, Object>> capabilities(HttpServletRequest request) {
        ContentApiKey key = contentApiKeyService.requireRequestKey(request, ANY_CONTENT_SCOPE);
        return ResultUtils.success(contentExternalService.capabilities(key));
    }

    @PostMapping("/resources/{type}/list")
    @ApiOperation("使用密钥分页查询内容，包括草稿")
    public BaseResponse<Object> list(@PathVariable String type,
            @RequestBody(required = false) ContentResourceQuery query, HttpServletRequest request) {
        ContentApiKey key = authenticate(request, type, "read");
        User operator = contentExternalService.requireOperator(key);
        return ResultUtils.success(contentExternalService.list(type, query, operator));
    }

    @GetMapping("/resources/{type}/{id}")
    @ApiOperation("使用密钥查询内容编辑详情和版本")
    public BaseResponse<ContentResourceVO> get(@PathVariable String type, @PathVariable Long id,
            HttpServletRequest request) {
        ContentApiKey key = authenticate(request, type, "read");
        return ResultUtils.success(contentExternalService.get(type, id,
                contentExternalService.requireOperator(key)));
    }

    @PostMapping("/resources/{type}")
    @OperationLog(module = "content_external", action = "add_draft")
    @ApiOperation("使用密钥新增对应模块的内容草稿")
    public BaseResponse<ContentResourceVO> add(@PathVariable String type, @RequestBody JsonNode fields,
            HttpServletRequest request) {
        ContentApiKey key = authenticate(request, type, "add");
        return ResultUtils.success(contentExternalService.add(type, fields,
                contentExternalService.requireOperator(key)));
    }

    @PatchMapping("/resources/{type}/{id}")
    @OperationLog(module = "content_external", action = "update_draft")
    @ApiOperation("使用密钥局部更新内容草稿")
    public BaseResponse<ContentResourceVO> update(@PathVariable String type, @PathVariable Long id,
            @RequestHeader(value = "If-Match", required = false) String baseVersion,
            @RequestBody JsonNode fields, HttpServletRequest request) {
        ContentApiKey key = authenticate(request, type, "update");
        return ResultUtils.success(contentExternalService.update(type, id, baseVersion, fields,
                contentExternalService.requireOperator(key)));
    }

    @GetMapping("/taxonomy")
    @ApiOperation("使用密钥查询创建内容所需的分类和标签")
    public BaseResponse<Map<String, Object>> taxonomy(HttpServletRequest request) {
        contentApiKeyService.requireRequestKey(request,
                Collections.singletonList(ContentApiKeyService.SCOPE_TAXONOMY_READ));
        return ResultUtils.success(contentExternalService.taxonomy());
    }

    @PostMapping("/uploads")
    @OperationLog(module = "content_external", action = "upload")
    @ApiOperation("使用密钥上传内容素材")
    public BaseResponse<String> upload(@RequestParam String biz, @RequestPart("file") MultipartFile file,
            HttpServletRequest request) {
        FileUploadBizEnum uploadBiz = FileUploadBizEnum.getEnumByValue(biz);
        if (uploadBiz == null || FileUploadBizEnum.USER_AVATAR.equals(uploadBiz)
                || FileUploadBizEnum.IMAGE_GENERATION_RESULT.equals(uploadBiz)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "该 biz 不能通过内容密钥上传");
        }
        ContentApiKey key = contentApiKeyService.requireRequestKey(request, uploadScopes(uploadBiz));
        User operator = contentExternalService.requireOperator(key);
        return ResultUtils.success(contentFileUploadService.uploadTrusted(file, uploadBiz, operator, request));
    }

    private ContentApiKey authenticate(HttpServletRequest request, String type, String operation) {
        return contentApiKeyService.requireRequestKey(request,
                Collections.singletonList(contentExternalService.requiredScope(type, operation)));
    }

    private List<String> uploadScopes(FileUploadBizEnum biz) {
        switch (biz) {
            case ARTWORK_COVER:
            case ARTWORK_VIDEO:
            case ARTWORK_PROMPT:
            case ARTWORK_SOURCE:
                return Collections.singletonList(ContentApiKeyService.SCOPE_ARTWORK_UPLOAD);
            case PROMPT_ASSET_COVER:
                return Collections.singletonList(ContentApiKeyService.SCOPE_PROMPT_ASSET_UPLOAD);
            case VIDEO_BACKGROUND_COVER:
            case VIDEO_BACKGROUND_PREVIEW:
            case VIDEO_BACKGROUND_SOURCE:
                return Collections.singletonList(ContentApiKeyService.SCOPE_VIDEO_BACKGROUND_UPLOAD);
            case BLOG_IMAGE:
            case BLOG_VIDEO:
                return Arrays.asList(ContentApiKeyService.SCOPE_COMMUNITY_POST_UPLOAD,
                        ContentApiKeyService.SCOPE_TUTORIAL_UPLOAD);
            default:
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "该 biz 不能通过内容密钥上传");
        }
    }
}
