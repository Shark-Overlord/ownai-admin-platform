package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.file.UploadFileRequest;
import com.yupi.springbootinit.model.dto.file.RemoteImageImportRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.FileUploadBizEnum;
import com.yupi.springbootinit.model.vo.file.RemoteImageImportResultVO;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.service.ContentFileUploadService;
import com.yupi.springbootinit.service.RemoteImageImportService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.Arrays;
import java.util.List;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 文件接口 File Controller
 */
@RestController
@RequestMapping("/file")
@Api(tags = "File")
public class FileController {

    @Resource
    private UserService userService;

    @Resource
    private ContentApiKeyService contentApiKeyService;

    @Resource
    private ContentFileUploadService contentFileUploadService;

    @Resource
    private RemoteImageImportService remoteImageImportService;

    @PostMapping("/admin/import/remote-images")
    @ApiOperation("批量迁移远程博客图片到对象存储")
    public BaseResponse<RemoteImageImportResultVO> importRemoteBlogImages(
            @RequestBody RemoteImageImportRequest importRequest, HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        if (!userService.isAdmin(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        if (importRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(remoteImageImportService.importImages(importRequest.getUrls(), loginUser.getId()));
    }

    /**
     * 上传文件到对象存储 Upload file to object storage
     */
    @PostMapping("/upload")
    @OperationLog(module = "file", action = "upload_file")
    @ApiOperation("上传文件到对象存储 Upload file to object storage")
    public BaseResponse<String> uploadFile(@RequestPart("file") MultipartFile multipartFile,
            UploadFileRequest uploadFileRequest, HttpServletRequest request) {
        if (uploadFileRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String biz = uploadFileRequest.getBiz();
        FileUploadBizEnum fileUploadBizEnum = FileUploadBizEnum.getEnumByValue(biz);
        if (fileUploadBizEnum == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Invalid upload business type");
        }
        User loginUser = resolveUploadUser(uploadFileRequest, request, fileUploadBizEnum);
        if (FileUploadBizEnum.IMAGE_GENERATION_RESULT.equals(fileUploadBizEnum)
                && !userService.isAdmin(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        if ((FileUploadBizEnum.VIDEO_BACKGROUND_COVER.equals(fileUploadBizEnum)
                || FileUploadBizEnum.VIDEO_BACKGROUND_PREVIEW.equals(fileUploadBizEnum)
                || FileUploadBizEnum.VIDEO_BACKGROUND_SOURCE.equals(fileUploadBizEnum)
                || FileUploadBizEnum.BLOG_IMAGE.equals(fileUploadBizEnum)
                || FileUploadBizEnum.BLOG_VIDEO.equals(fileUploadBizEnum))
                && !userService.isAdmin(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
        return ResultUtils.success(contentFileUploadService.uploadTrusted(
                multipartFile, fileUploadBizEnum, loginUser, request));
    }

    private User resolveUploadUser(UploadFileRequest uploadFileRequest, HttpServletRequest request,
            FileUploadBizEnum fileUploadBizEnum) {
        String requestKey = uploadFileRequest == null ? null : uploadFileRequest.getApiSecret();
        List<String> allowedScopes = getUploadAllowedScopes(fileUploadBizEnum);
        if (allowedScopes != null && contentApiKeyService.validateRequestKeyAny(requestKey, request, allowedScopes)) {
            return getDefaultAdminUser();
        }
        return userService.getLoginUser(request);
    }

    private List<String> getUploadAllowedScopes(FileUploadBizEnum fileUploadBizEnum) {
        if (FileUploadBizEnum.ARTWORK_COVER.equals(fileUploadBizEnum)
                || FileUploadBizEnum.ARTWORK_VIDEO.equals(fileUploadBizEnum)
                || FileUploadBizEnum.ARTWORK_PROMPT.equals(fileUploadBizEnum)
                || FileUploadBizEnum.ARTWORK_SOURCE.equals(fileUploadBizEnum)) {
            return Arrays.asList(ContentApiKeyService.SCOPE_ARTWORK_ADD, ContentApiKeyService.SCOPE_ARTWORK_UPDATE);
        }
        if (FileUploadBizEnum.PROMPT_ASSET_COVER.equals(fileUploadBizEnum)) {
            return Arrays.asList(ContentApiKeyService.SCOPE_PROMPT_ASSET_ADD,
                    ContentApiKeyService.SCOPE_PROMPT_ASSET_UPDATE);
        }
        return null;
    }

    private User getDefaultAdminUser() {
        User adminUser = userService.getOne(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<User>()
                .eq("userRole", com.yupi.springbootinit.constant.UserConstant.ADMIN_ROLE)
                .eq("isDelete", 0)
                .orderByAsc("id")
                .last("LIMIT 1"));
        if (adminUser == null) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Default admin user not found");
        }
        return adminUser;
    }

}
