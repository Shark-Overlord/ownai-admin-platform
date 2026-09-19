package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.model.dto.mcp.McpKeyGenerateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.mcp.McpKeyCreateVO;
import com.yupi.springbootinit.model.vo.mcp.McpKeyVO;
import com.yupi.springbootinit.service.UserMcpKeyService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户 MCP API Key 管理
 */
@RestController
@RequestMapping("/mcp/key")
@Api(tags = "MCP Key 管理")
public class UserMcpKeyController {

    private final UserMcpKeyService userMcpKeyService;
    private final UserService userService;

    public UserMcpKeyController(UserMcpKeyService userMcpKeyService, UserService userService) {
        this.userMcpKeyService = userMcpKeyService;
        this.userService = userService;
    }

    @PostMapping("/generate")
    @ApiOperation("生成 MCP API Key（需要有效会员）")
    public BaseResponse<McpKeyCreateVO> generateKey(@RequestBody McpKeyGenerateRequest request,
                                                     HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        ThrowUtils.throwIf(request == null, ErrorCode.PARAMS_ERROR);
        McpKeyCreateVO result = userMcpKeyService.generateKey(request.getKeyName(), loginUser);
        return ResultUtils.success(result);
    }

    @PostMapping({"/revoke", "/revoke/{id}"})
    @ApiOperation("吊销 MCP API Key")
    public BaseResponse<Boolean> revokeKey(@PathVariable(value = "id", required = false) Long pathId,
                                           @org.springframework.web.bind.annotation.RequestParam(value = "id", required = false) Long queryId,
                                           HttpServletRequest httpRequest) {
        Long targetId = pathId != null ? pathId : queryId;
        ThrowUtils.throwIf(targetId == null || targetId <= 0, ErrorCode.PARAMS_ERROR, "Key ID 不能为空");
        User loginUser = userService.getLoginUser(httpRequest);
        boolean result = userMcpKeyService.revokeKey(targetId, loginUser);
        return ResultUtils.success(result);
    }

    @GetMapping({"/list", "/my"})
    @ApiOperation("列出当前用户的所有 MCP Key")
    public BaseResponse<List<McpKeyVO>> listMyKeys(HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        List<McpKeyVO> keys = userMcpKeyService.listMyKeys(loginUser);
        return ResultUtils.success(keys);
    }
}
