package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.DeleteRequest;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.contentapikey.ContentApiKeyAddRequest;
import com.yupi.springbootinit.model.dto.contentapikey.ContentApiKeyQueryRequest;
import com.yupi.springbootinit.model.dto.contentapikey.ContentApiKeyUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.contentapikey.ContentApiKeyCreateVO;
import com.yupi.springbootinit.model.vo.contentapikey.ContentApiKeyVO;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/content-api-key")
@Api(tags = "ContentApiKey")
public class ContentApiKeyController {

    @Resource
    private ContentApiKeyService contentApiKeyService;

    @Resource
    private UserService userService;

    @PostMapping("/admin/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "content_api_key", action = "add_content_api_key")
    @ApiOperation("Admin add content API key")
    public BaseResponse<ContentApiKeyCreateVO> addKey(@RequestBody ContentApiKeyAddRequest request,
            HttpServletRequest httpServletRequest) {
        User loginUser = userService.getLoginUser(httpServletRequest);
        return ResultUtils.success(contentApiKeyService.addKey(request, loginUser));
    }

    @PostMapping("/admin/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "content_api_key", action = "update_content_api_key")
    @ApiOperation("Admin update content API key")
    public BaseResponse<Boolean> updateKey(@RequestBody ContentApiKeyUpdateRequest request) {
        return ResultUtils.success(contentApiKeyService.updateKey(request));
    }

    @PostMapping("/admin/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "content_api_key", action = "delete_content_api_key")
    @ApiOperation("Admin delete content API key")
    public BaseResponse<Boolean> deleteKey(@RequestBody DeleteRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(contentApiKeyService.deleteKey(request.getId()));
    }

    @PostMapping("/admin/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin page query content API keys")
    public BaseResponse<Page<ContentApiKeyVO>> listKeyByPage(
            @RequestBody(required = false) ContentApiKeyQueryRequest request) {
        return ResultUtils.success(contentApiKeyService.listKeyByPage(request));
    }
}
