package com.yupi.springbootinit.service.impl;

import static com.yupi.springbootinit.constant.UserConstant.USER_LOGIN_STATE;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.UserMapper;
import com.yupi.springbootinit.model.dto.user.UserQueryRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.enums.UserRoleEnum;
import java.util.Date;
import com.yupi.springbootinit.model.vo.LoginUserVO;
import com.yupi.springbootinit.model.vo.UserVO;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.utils.JwtUtils;
import com.yupi.springbootinit.utils.SqlUtils;
import io.jsonwebtoken.Claims;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import me.chanjar.weixin.common.bean.WxOAuth2UserInfo;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

@Service
@Slf4j
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    public static final String SALT = "yupi";

    @Override
    public long userRegister(String userAccount, String userPassword, String checkPassword) {
        if (StringUtils.isAnyBlank(userAccount, userPassword, checkPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "参数为空");
        }
        if (userAccount.length() < 4) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "账号长度不能小于 4");
        }
        if (userPassword.length() < 8 || checkPassword.length() < 8) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "密码长度不能小于 8");
        }
        if (!userPassword.equals(checkPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "两次输入的密码不一致");
        }
        synchronized (userAccount.intern()) {
            QueryWrapper<User> queryWrapper = new QueryWrapper<>();
            queryWrapper.eq("userAccount", userAccount);
            long count = this.baseMapper.selectCount(queryWrapper);
            if (count > 0) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "账号已存在");
            }
            String encryptPassword = DigestUtils.md5DigestAsHex((SALT + userPassword).getBytes());
            User user = new User();
            user.setUserAccount(userAccount);
            user.setUserPassword(encryptPassword);
            user.setUserRole(UserRoleEnum.USER.getValue());
            user.setMemberLevel(MemberLevelEnum.NORMAL.getValue());
            user.setPointBalance(0);
            boolean saveResult = this.save(user);
            if (!saveResult) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "注册失败");
            }
            return user.getId();
        }
    }

    @Override
    public LoginUserVO userLogin(String userAccount, String userPassword, HttpServletRequest request) {
        if (StringUtils.isAnyBlank(userAccount, userPassword)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "参数为空");
        }
        if (userAccount.length() < 4) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "账号错误");
        }
        if (userPassword.length() < 8) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "密码错误");
        }
        String encryptPassword = DigestUtils.md5DigestAsHex((SALT + userPassword).getBytes());
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("userAccount", userAccount);
        queryWrapper.eq("userPassword", encryptPassword);
        User user = this.baseMapper.selectOne(queryWrapper);
        if (user == null) {
            log.info("user login failed, account or password not match");
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "账号或密码错误");
        }
        LoginUserVO loginUserVO = this.getLoginUserVO(user);
        loginUserVO.setToken(JwtUtils.generateToken(user));
        return loginUserVO;
    }

    @Override
    public LoginUserVO userLoginByMpOpen(WxOAuth2UserInfo wxOAuth2UserInfo, HttpServletRequest request) {
        String unionId = wxOAuth2UserInfo.getUnionId();
        String mpOpenId = wxOAuth2UserInfo.getOpenid();
        synchronized (unionId.intern()) {
            QueryWrapper<User> queryWrapper = new QueryWrapper<>();
            queryWrapper.eq("unionId", unionId);
            User user = this.getOne(queryWrapper);
            if (user != null && UserRoleEnum.BAN.getValue().equals(user.getUserRole())) {
                throw new BusinessException(ErrorCode.FORBIDDEN_ERROR, "账号已被封禁");
            }
            if (user == null) {
                user = new User();
                user.setUnionId(unionId);
                user.setMpOpenId(mpOpenId);
                user.setUserAvatar(wxOAuth2UserInfo.getHeadImgUrl());
                user.setUserName(wxOAuth2UserInfo.getNickname());
                user.setUserRole(UserRoleEnum.USER.getValue());
                user.setMemberLevel(MemberLevelEnum.NORMAL.getValue());
                user.setPointBalance(0);
                boolean result = this.save(user);
                if (!result) {
                    throw new BusinessException(ErrorCode.SYSTEM_ERROR, "登录失败");
                }
            }
            LoginUserVO loginUserVO = getLoginUserVO(user);
            loginUserVO.setToken(JwtUtils.generateToken(user));
            return loginUserVO;
        }
    }

    @Override
    public User getLoginUser(HttpServletRequest request) {
        String token = JwtUtils.getTokenFromRequest(request);
        Claims claims = JwtUtils.parseToken(token);
        String userIdStr = claims.getSubject();
        if (StringUtils.isBlank(userIdStr)) {
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
        User currentUser = this.getById(Long.valueOf(userIdStr));
        if (currentUser == null) {
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
        checkAndExpireMember(currentUser);
        return currentUser;
    }

    @Override
    public User getLoginUserPermitNull(HttpServletRequest request) {
        try {
            String token = JwtUtils.getTokenFromRequest(request);
            Claims claims = JwtUtils.parseToken(token);
            String userIdStr = claims.getSubject();
            if (StringUtils.isBlank(userIdStr)) {
                return null;
            }
            User user = this.getById(Long.valueOf(userIdStr));
            if (user != null) {
                checkAndExpireMember(user);
            }
            return user;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public boolean isAdmin(HttpServletRequest request) {
        User user = getLoginUser(request);
        return isAdmin(user);
    }

    @Override
    public boolean isAdmin(User user) {
        return user != null && UserRoleEnum.ADMIN.getValue().equals(user.getUserRole());
    }

    @Override
    public boolean userLogout(HttpServletRequest request) {
        // JWT 无状态，前端清除 token 即可，后端无需额外操作
        return true;
    }

    @Override
    public LoginUserVO getLoginUserVO(User user) {
        if (user == null) {
            return null;
        }
        LoginUserVO loginUserVO = new LoginUserVO();
        BeanUtils.copyProperties(user, loginUserVO);
        return loginUserVO;
    }

    @Override
    public UserVO getUserVO(User user) {
        if (user == null) {
            return null;
        }
        UserVO userVO = new UserVO();
        BeanUtils.copyProperties(user, userVO);
        return userVO;
    }

    @Override
    public List<UserVO> getUserVO(List<User> userList) {
        if (CollUtil.isEmpty(userList)) {
            return new ArrayList<>();
        }
        return userList.stream().map(this::getUserVO).collect(Collectors.toList());
    }

    @Override
    public boolean checkAndExpireMember(User user) {
        if (user == null || MemberLevelEnum.NORMAL.getValue().equals(user.getMemberLevel())) {
            return false;
        }
        Date expireTime = user.getMemberExpireTime();
        if (expireTime == null) {
            return false;
        }
        if (expireTime.after(new Date())) {
            return false;
        }
        // 已过期，降级为普通用户
        User updateUser = new User();
        updateUser.setId(user.getId());
        updateUser.setMemberLevel(MemberLevelEnum.NORMAL.getValue());
        updateUser.setMemberPlanType(null);
        updateUser.setMemberExpireTime(null);
        boolean updated = this.updateById(updateUser);
        if (updated) {
            user.setMemberLevel(MemberLevelEnum.NORMAL.getValue());
            user.setMemberPlanType(null);
            user.setMemberExpireTime(null);
        }
        return updated;
    }

    @Override
    public QueryWrapper<User> getQueryWrapper(UserQueryRequest userQueryRequest) {
        if (userQueryRequest == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "请求参数为空");
        }
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq(userQueryRequest.getId() != null, "id", userQueryRequest.getId());
        queryWrapper.eq(StringUtils.isNotBlank(userQueryRequest.getUnionId()), "unionId", userQueryRequest.getUnionId());
        queryWrapper.eq(StringUtils.isNotBlank(userQueryRequest.getMpOpenId()), "mpOpenId", userQueryRequest.getMpOpenId());
        queryWrapper.eq(StringUtils.isNotBlank(userQueryRequest.getUserRole()), "userRole", userQueryRequest.getUserRole());
        queryWrapper.eq(StringUtils.isNotBlank(userQueryRequest.getMemberLevel()), "memberLevel",
                userQueryRequest.getMemberLevel());
        queryWrapper.eq(StringUtils.isNotBlank(userQueryRequest.getMemberPlanType()), "memberPlanType",
                userQueryRequest.getMemberPlanType());
        queryWrapper.like(StringUtils.isNotBlank(userQueryRequest.getUserAccount()), "userAccount",
                userQueryRequest.getUserAccount());
        queryWrapper.like(StringUtils.isNotBlank(userQueryRequest.getUserProfile()), "userProfile",
                userQueryRequest.getUserProfile());
        queryWrapper.like(StringUtils.isNotBlank(userQueryRequest.getUserName()), "userName", userQueryRequest.getUserName());
        String sortField = userQueryRequest.getSortField();
        String sortOrder = userQueryRequest.getSortOrder();
        queryWrapper.orderBy(SqlUtils.validSortField(sortField),
                CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
        return queryWrapper;
    }
}
