package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.model.dto.mcp.McpAuthorizeRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.mcp.McpAuthCheckVO;
import com.yupi.springbootinit.model.vo.mcp.McpAuthorizeVO;
import com.yupi.springbootinit.model.vo.mcp.McpKeyCreateVO;
import com.yupi.springbootinit.service.UserMcpKeyService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * MCP 浏览器一键授权端点
 */
@Slf4j
@RestController
@RequestMapping("/mcp/oauth")
@Api(tags = "MCP 网页授权")
public class McpAuthController {

    private final UserService userService;
    private final UserMcpKeyService userMcpKeyService;

    public McpAuthController(UserService userService, UserMcpKeyService userMcpKeyService) {
        this.userService = userService;
        this.userMcpKeyService = userMcpKeyService;
    }

    /**
     * 授权页面前置检查接口：检查当前登录态及会员有效性
     */
    @GetMapping("/check")
    @ApiOperation("检查用户登录状态与 MCP 会员资格")
    public BaseResponse<McpAuthCheckVO> checkStatus(HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        McpAuthCheckVO vo = new McpAuthCheckVO();
        if (loginUser == null) {
            vo.setIsLogin(false);
            vo.setIsEligibleMember(false);
            return ResultUtils.success(vo);
        }

        vo.setIsLogin(true);
        vo.setUserId(loginUser.getId());
        vo.setUserAccount(loginUser.getUserAccount());
        vo.setUserName(loginUser.getUserName());
        vo.setUserAvatar(loginUser.getUserAvatar());
        vo.setMemberLevel(loginUser.getMemberLevel());
        vo.setMemberPlanType(loginUser.getMemberPlanType());
        vo.setMemberExpireTime(loginUser.getMemberExpireTime());

        boolean eligible = userMcpKeyService.isEligibleMember(loginUser);
        vo.setIsEligibleMember(eligible);

        boolean lifetime = "lifetime".equalsIgnoreCase(loginUser.getMemberPlanType())
                || loginUser.getMemberExpireTime() == null;
        vo.setIsLifetime(lifetime);

        if (!lifetime && loginUser.getMemberExpireTime() != null) {
            long diff = loginUser.getMemberExpireTime().getTime() - System.currentTimeMillis();
            int days = (int) Math.max(0, TimeUnit.MILLISECONDS.toDays(diff));
            vo.setRemainingDays(days);
        }

        return ResultUtils.success(vo);
    }

    /**
     * 用户在授权页面点击【确认授权】
     */
    @PostMapping("/authorize")
    @ApiOperation("确认授权并颁发 MCP 访问凭证")
    public BaseResponse<McpAuthorizeVO> authorize(@RequestBody(required = false) McpAuthorizeRequest request,
                                                  HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        if (!userMcpKeyService.isEligibleMember(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "MCP 助手仅面向付费会员开放，请先开通会员");
        }

        String clientName = request != null && StringUtils.isNotBlank(request.getClientName())
                ? request.getClientName().trim()
                : "Cursor / Claude Desktop";

        // 生成专用的 MCP API Key
        McpKeyCreateVO keyVO = userMcpKeyService.generateKey(clientName, loginUser);
        ThrowUtils.throwIf(keyVO == null || StringUtils.isBlank(keyVO.getPlainKey()),
                ErrorCode.SYSTEM_ERROR, "生成 MCP 凭证失败");

        McpAuthorizeVO vo = new McpAuthorizeVO();
        vo.setToken(keyVO.getPlainKey());
        vo.setKeyId(keyVO.getId());
        vo.setState(request != null ? request.getState() : null);

        log.info("用户 userId={} 成功完成 MCP 客户端授权 clientName={}", loginUser.getId(), clientName);
        return ResultUtils.success(vo);
    }
}
