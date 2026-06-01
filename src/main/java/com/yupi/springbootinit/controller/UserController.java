package com.yupi.springbootinit.controller;

import static com.yupi.springbootinit.service.impl.UserServiceImpl.SALT;

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
import com.yupi.springbootinit.config.WxOpenConfig;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.model.dto.user.EmailCodeSendRequest;
import com.yupi.springbootinit.model.dto.user.EmailRegisterRequest;
import com.yupi.springbootinit.model.dto.user.UserAddRequest;
import com.yupi.springbootinit.model.dto.user.UserLoginRequest;
import com.yupi.springbootinit.model.dto.user.UserQueryRequest;
import com.yupi.springbootinit.model.dto.user.UserRegisterRequest;
import com.yupi.springbootinit.model.dto.user.UserUpdateMyRequest;
import com.yupi.springbootinit.model.dto.user.UserUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.enums.PointChangeTypeEnum;
import com.yupi.springbootinit.model.vo.LoginUserVO;
import com.yupi.springbootinit.model.vo.UserVO;
import com.yupi.springbootinit.model.vo.user.LoginCaptchaVO;
import com.yupi.springbootinit.service.AuthCodeService;
import com.yupi.springbootinit.service.PointService;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.utils.NetUtils;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import me.chanjar.weixin.common.bean.WxOAuth2UserInfo;
import me.chanjar.weixin.common.bean.oauth2.WxOAuth2AccessToken;
import me.chanjar.weixin.mp.api.WxMpService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.BeanUtils;
import org.springframework.util.DigestUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户接口 User Controller
 */
@RestController
@RequestMapping("/user")
@Slf4j
@Api(tags = "User")
public class UserController {

    @Resource
    private UserService userService;

    @Resource
    private AuthCodeService authCodeService;

    @Resource
    private PointService pointService;

    @Resource
    private WxOpenConfig wxOpenConfig;

    @Value("${auth.login-captcha-required:true}")
    private boolean loginCaptchaRequired;

    /**
     * 用户注册 User register
     */
    @PostMapping("/register")
    @ApiOperation("用户注册 User register")
    public BaseResponse<Long> userRegister(@RequestBody UserRegisterRequest userRegisterRequest) {
        if (userRegisterRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String userAccount = userRegisterRequest.getUserAccount();
        String userPassword = userRegisterRequest.getUserPassword();
        String checkPassword = userRegisterRequest.getCheckPassword();
        if (StringUtils.isAnyBlank(userAccount, userPassword, checkPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        long result = userService.userRegister(userAccount, userPassword, checkPassword);
        return ResultUtils.success(result);
    }

    /**
     * 账号密码登录 Account password login
     */
    @GetMapping("/login/captcha")
    @ApiOperation("Get login captcha")
    public BaseResponse<LoginCaptchaVO> getLoginCaptcha() {
        return ResultUtils.success(authCodeService.generateLoginCaptcha());
    }

    @PostMapping("/register/email/code")
    @ApiOperation("Send email register code")
    public BaseResponse<Boolean> sendEmailRegisterCode(@RequestBody EmailCodeSendRequest emailCodeSendRequest,
            HttpServletRequest request) {
        if (emailCodeSendRequest == null || StringUtils.isBlank(emailCodeSendRequest.getUserEmail())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String ip = NetUtils.getIpAddress(request);
        return ResultUtils.success(authCodeService.sendRegisterEmailCode(emailCodeSendRequest.getUserEmail(), ip));
    }

    @PostMapping("/register/email")
    @ApiOperation("Register by email")
    public BaseResponse<Long> userRegisterByEmail(@RequestBody EmailRegisterRequest emailRegisterRequest) {
        if (emailRegisterRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String userEmail = emailRegisterRequest.getUserEmail();
        String emailCode = emailRegisterRequest.getEmailCode();
        String userPassword = emailRegisterRequest.getUserPassword();
        String checkPassword = emailRegisterRequest.getCheckPassword();
        if (StringUtils.isAnyBlank(userEmail, emailCode, userPassword, checkPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        authCodeService.validateEmailRegisterCode(userEmail, emailCode);
        long result = userService.userRegisterByEmail(userEmail, userPassword, checkPassword);
        authCodeService.invalidateEmailRegisterCode(userEmail);
        return ResultUtils.success(result);
    }

    @PostMapping("/login")
    @ApiOperation("账号密码登录 Account password login")
    public BaseResponse<LoginUserVO> userLogin(@RequestBody UserLoginRequest userLoginRequest, HttpServletRequest request) {
        if (userLoginRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String userAccount = userLoginRequest.getUserAccount();
        String userPassword = userLoginRequest.getUserPassword();
        if (StringUtils.isAnyBlank(userAccount, userPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String captchaId = userLoginRequest.getCaptchaId();
        String captchaCode = userLoginRequest.getCaptchaCode();
        if (loginCaptchaRequired || StringUtils.isNotBlank(captchaId) || StringUtils.isNotBlank(captchaCode)) {
            authCodeService.validateLoginCaptcha(captchaId, captchaCode);
        }
        return ResultUtils.success(userService.userLogin(userAccount, userPassword, request));
    }

    /**
     * 微信开放平台登录 WeChat open platform login
     */
    @GetMapping("/login/wx_open")
    @ApiOperation("微信开放平台登录 WeChat open platform login")
    public BaseResponse<LoginUserVO> userLoginByWxOpen(HttpServletRequest request, HttpServletResponse response,
            @RequestParam("code") String code) {
        try {
            WxMpService wxService = wxOpenConfig.getWxMpService();
            WxOAuth2AccessToken accessToken = wxService.getOAuth2Service().getAccessToken(code);
            WxOAuth2UserInfo userInfo = wxService.getOAuth2Service().getUserInfo(accessToken, code);
            String unionId = userInfo.getUnionId();
            String mpOpenId = userInfo.getOpenid();
            if (StringUtils.isAnyBlank(unionId, mpOpenId)) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "WeChat login failed");
            }
            return ResultUtils.success(userService.userLoginByMpOpen(userInfo, request));
        } catch (Exception e) {
            log.error("userLoginByWxOpen error", e);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "WeChat login failed");
        }
    }

    /**
     * 用户登出 User logout
     */
    @PostMapping("/logout")
    @ApiOperation("用户登出 User logout")
    public BaseResponse<Boolean> userLogout(HttpServletRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        // 校验 token 有效性
        userService.getLoginUser(request);
        return ResultUtils.success(userService.userLogout(request));
    }

    /**
     * 获取当前登录用户 Get current login user
     */
    @GetMapping("/get/login")
    @ApiOperation("获取当前登录用户 Get current login user")
    public BaseResponse<LoginUserVO> getLoginUser(HttpServletRequest request) {
        User user = userService.getLoginUser(request);
        return ResultUtils.success(userService.getLoginUserVO(user));
    }

    /**
     * 管理员添加用户 Admin add user
     */
    @PostMapping("/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "user", action = "add_user")
    @ApiOperation("管理员添加用户 Admin add user")
    public BaseResponse<Long> addUser(@RequestBody UserAddRequest userAddRequest, HttpServletRequest request) {
        if (userAddRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User user = new User();
        BeanUtils.copyProperties(userAddRequest, user);
        String defaultPassword = "12345678";
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + defaultPassword).getBytes());
        user.setUserPassword(encryptPassword);
        if (StringUtils.isBlank(user.getUserRole())) {
            user.setUserRole(UserConstant.DEFAULT_ROLE);
        }
        if (StringUtils.isBlank(user.getMemberLevel())) {
            user.setMemberLevel(MemberLevelEnum.NORMAL.getValue());
        }
        Integer initialPointBalance = user.getPointBalance();
        ThrowUtils.throwIf(initialPointBalance != null && initialPointBalance < 0, ErrorCode.PARAMS_ERROR,
                "Point balance cannot be negative");
        user.setPointBalance(0);
        boolean result = userService.save(user);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        if (initialPointBalance != null && initialPointBalance > 0) {
            pointService.addPoints(user.getId(), initialPointBalance, PointChangeTypeEnum.MANUAL_ADJUST,
                    "admin_user", user.getId(), "Admin initial points");
        }
        return ResultUtils.success(user.getId());
    }

    /**
     * 管理员批量删除用户 Admin batch delete user
     */
    @PostMapping("/delete/batch")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "user", action = "batch_delete_user")
    @ApiOperation("管理员批量删除用户 Admin batch delete user")
    public BaseResponse<Boolean> deleteUserBatch(@RequestBody BatchDeleteRequest batchDeleteRequest, HttpServletRequest request) {
        if (batchDeleteRequest == null || CollUtil.isEmpty(batchDeleteRequest.getIds())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(userService.removeByIds(batchDeleteRequest.getIds()));
    }

    /**
     * 管理员删除用户 Admin delete user
     */
    @PostMapping("/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "user", action = "delete_user")
    @ApiOperation("管理员删除用户 Admin delete user")
    public BaseResponse<Boolean> deleteUser(@RequestBody DeleteRequest deleteRequest, HttpServletRequest request) {
        if (deleteRequest == null || deleteRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(userService.removeById(deleteRequest.getId()));
    }

    /**
     * 管理员更新用户 Admin update user
     */
    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "user", action = "update_user")
    @ApiOperation("管理员更新用户 Admin update user")
    public BaseResponse<Boolean> updateUser(@RequestBody UserUpdateRequest userUpdateRequest, HttpServletRequest request) {
        if (userUpdateRequest == null || userUpdateRequest.getId() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        syncPointBalanceUpdate(userUpdateRequest);
        User user = new User();
        BeanUtils.copyProperties(userUpdateRequest, user);
        user.setPointBalance(null);
        boolean result = userService.updateById(user);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(true);
    }

    /**
     * 管理员根据ID获取用户 Admin get user by id
     */
    @GetMapping("/get")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("管理员根据ID获取用户 Admin get user by id")
    public BaseResponse<User> getUserById(long id, HttpServletRequest request) {
        if (id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User user = userService.getById(id);
        ThrowUtils.throwIf(user == null, ErrorCode.NOT_FOUND_ERROR);
        return ResultUtils.success(user);
    }

    /**
     * 根据ID获取脱敏用户信息 Get sanitized user info by id
     */
    @GetMapping("/get/vo")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("根据ID获取脱敏用户信息 Get sanitized user info by id")
    public BaseResponse<UserVO> getUserVOById(long id, HttpServletRequest request) {
        User user = userService.getById(id);
        ThrowUtils.throwIf(user == null, ErrorCode.NOT_FOUND_ERROR);
        return ResultUtils.success(userService.getUserVO(user));
    }

    /**
     * 管理员分页查询用户 Admin page query users
     */
    @PostMapping("/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("管理员分页查询用户 Admin page query users")
    public BaseResponse<Page<User>> listUserByPage(@RequestBody UserQueryRequest userQueryRequest,
            HttpServletRequest request) {
        UserQueryRequest safeRequest = userQueryRequest == null ? new UserQueryRequest() : userQueryRequest;
        Page<User> userPage = userService.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()),
                userService.getQueryWrapper(safeRequest));
        return ResultUtils.success(userPage);
    }

    /**
     * 分页查询脱敏用户列表 Page query sanitized users
     */
    @PostMapping("/list/page/vo")
    @ApiOperation("分页查询脱敏用户列表 Page query sanitized users")
    public BaseResponse<Page<UserVO>> listUserVOByPage(@RequestBody UserQueryRequest userQueryRequest,
            HttpServletRequest request) {
        if (userQueryRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        long current = userQueryRequest.getCurrent();
        long size = userQueryRequest.getPageSize();
        ThrowUtils.throwIf(size > 20, ErrorCode.PARAMS_ERROR);
        Page<User> userPage = userService.page(new Page<>(current, size), userService.getQueryWrapper(userQueryRequest));
        Page<UserVO> userVOPage = new Page<>(current, size, userPage.getTotal());
        List<UserVO> userVOList = userService.getUserVO(userPage.getRecords());
        userVOPage.setRecords(userVOList);
        return ResultUtils.success(userVOPage);
    }

    /**
     * 获取用户统计 Get user statistics
     */
    @GetMapping("/stats")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("获取用户统计 Get user statistics")
    public BaseResponse<Map<String, Long>> getUserStats(HttpServletRequest request) {
        long total = userService.count();
        long plusCount = userService.count(new QueryWrapper<User>().eq("memberLevel", "plus"));
        long proCount = userService.count(new QueryWrapper<User>().eq("memberLevel", "pro"));
        Map<String, Long> result = new HashMap<>();
        result.put("total", total);
        result.put("plus", plusCount);
        result.put("pro", proCount);
        return ResultUtils.success(result);
    }

    /**
     * 用户更新个人信息 User update profile
     */
    @PostMapping("/update/my")
    @OperationLog(module = "user", action = "update_my_user")
    @ApiOperation("用户更新个人信息 User update profile")
    public BaseResponse<Boolean> updateMyUser(@RequestBody UserUpdateMyRequest userUpdateMyRequest,
            HttpServletRequest request) {
        if (userUpdateMyRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        User user = new User();
        BeanUtils.copyProperties(userUpdateMyRequest, user);
        user.setId(loginUser.getId());
        boolean result = userService.updateById(user);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(true);
    }

    private void syncPointBalanceUpdate(UserUpdateRequest userUpdateRequest) {
        Integer targetPointBalance = userUpdateRequest.getPointBalance();
        if (targetPointBalance == null) {
            return;
        }
        ThrowUtils.throwIf(targetPointBalance < 0, ErrorCode.PARAMS_ERROR, "Point balance cannot be negative");
        User oldUser = userService.getById(userUpdateRequest.getId());
        ThrowUtils.throwIf(oldUser == null, ErrorCode.NOT_FOUND_ERROR);
        int currentPointBalance = oldUser.getPointBalance() == null ? 0 : oldUser.getPointBalance();
        int delta = targetPointBalance - currentPointBalance;
        if (delta > 0) {
            pointService.addPoints(oldUser.getId(), delta, PointChangeTypeEnum.MANUAL_ADJUST, "admin_user",
                    oldUser.getId(), "Admin adjusted points");
        } else if (delta < 0) {
            pointService.deductPoints(oldUser.getId(), -delta, PointChangeTypeEnum.MANUAL_ADJUST, "admin_user",
                    oldUser.getId(), "Admin adjusted points");
        }
        userUpdateRequest.setPointBalance(null);
    }
}
