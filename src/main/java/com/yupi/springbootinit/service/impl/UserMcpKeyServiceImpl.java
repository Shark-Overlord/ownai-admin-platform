package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.UserMcpKeyMapper;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.UserMcpKey;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.vo.mcp.McpKeyCreateVO;
import com.yupi.springbootinit.model.vo.mcp.McpKeyVO;
import com.yupi.springbootinit.service.UserMcpKeyService;
import com.yupi.springbootinit.service.UserService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class UserMcpKeyServiceImpl extends ServiceImpl<UserMcpKeyMapper, UserMcpKey>
        implements UserMcpKeyService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int KEY_RANDOM_BYTES = 32;
    private static final int KEY_PREFIX_LENGTH = 12;
    private static final int MAX_KEYS_PER_USER = 5;

    private final UserService userService;

    public UserMcpKeyServiceImpl(UserService userService) {
        this.userService = userService;
    }

    @Override
    public McpKeyCreateVO generateKey(String keyName, User loginUser) {
        ThrowUtils.throwIf(loginUser == null, ErrorCode.NOT_LOGIN_ERROR);
        String name = StringUtils.trimToNull(keyName);
        ThrowUtils.throwIf(name == null, ErrorCode.PARAMS_ERROR, "Key 名称不能为空");
        ThrowUtils.throwIf(StringUtils.length(name) > 100, ErrorCode.PARAMS_ERROR, "Key 名称过长");

        // 校验会员有效性
        requireActiveMember(loginUser);

        // 若超过最大数量限制，自动淘汰最旧的一个有效 Key
        List<UserMcpKey> existingKeys = this.list(new QueryWrapper<UserMcpKey>()
                .eq("userId", loginUser.getId())
                .eq("isDelete", 0)
                .orderByAsc("createTime"));
        if (existingKeys.size() >= MAX_KEYS_PER_USER) {
            UserMcpKey oldest = existingKeys.get(0);
            this.update(new UpdateWrapper<UserMcpKey>()
                    .eq("id", oldest.getId())
                    .set("isDelete", 1));
            log.info("用户 userId={} 的 MCP Key 已达上限，自动废弃最旧的 keyId={}", loginUser.getId(), oldest.getId());
        }

        // 生成 Key
        String plainKey = generatePlainKey();
        UserMcpKey mcpKey = new UserMcpKey();
        mcpKey.setUserId(loginUser.getId());
        mcpKey.setKeyName(name);
        mcpKey.setKeyHash(sha256Hex(plainKey));
        mcpKey.setKeyPrefix(StringUtils.substring(plainKey, 0, KEY_PREFIX_LENGTH));
        mcpKey.setStatus(1);
        boolean saved = this.save(mcpKey);
        ThrowUtils.throwIf(!saved, ErrorCode.OPERATION_ERROR, "创建 MCP Key 失败");

        McpKeyCreateVO vo = new McpKeyCreateVO();
        BeanUtils.copyProperties(toVO(this.getById(mcpKey.getId())), vo);
        vo.setPlainKey(plainKey);
        return vo;
    }

    @Override
    public boolean revokeKey(Long keyId, User loginUser) {
        ThrowUtils.throwIf(loginUser == null, ErrorCode.NOT_LOGIN_ERROR);
        ThrowUtils.throwIf(keyId == null || keyId <= 0, ErrorCode.PARAMS_ERROR);

        // 只能吊销自己的 Key
        UserMcpKey existing = this.getById(keyId);
        ThrowUtils.throwIf(existing == null || existing.getIsDelete() == 1,
                ErrorCode.NOT_FOUND_ERROR, "Key 不存在");
        ThrowUtils.throwIf(!existing.getUserId().equals(loginUser.getId()),
                ErrorCode.NO_AUTH_ERROR, "无权操作此 Key");

        return this.update(new UpdateWrapper<UserMcpKey>()
                .eq("id", keyId)
                .eq("isDelete", 0)
                .set("isDelete", 1));
    }

    @Override
    public List<McpKeyVO> listMyKeys(User loginUser) {
        ThrowUtils.throwIf(loginUser == null, ErrorCode.NOT_LOGIN_ERROR);
        List<UserMcpKey> keys = this.list(new QueryWrapper<UserMcpKey>()
                .eq("userId", loginUser.getId())
                .eq("isDelete", 0)
                .orderByDesc("createTime"));
        return keys.stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    public User validateKey(String plainKey, String clientIp) {
        if (StringUtils.isBlank(plainKey)) {
            return null;
        }
        String hash = sha256Hex(plainKey.trim());
        UserMcpKey mcpKey = this.getOne(new QueryWrapper<UserMcpKey>()
                .eq("keyHash", hash)
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        if (mcpKey == null || mcpKey.getStatus() == null || mcpKey.getStatus() != 1) {
            return null;
        }

        // 查关联用户
        User user = userService.getById(mcpKey.getUserId());
        if (user == null || user.getIsDelete() != null && user.getIsDelete() == 1) {
            return null;
        }

        // 实时校验会员有效性
        if (!isEligibleMember(user)) {
            log.info("MCP Key userId={} 会员已过期或非有效会员，拒绝访问", user.getId());
            return null;
        }

        // 更新最后使用记录
        UserMcpKey update = new UserMcpKey();
        update.setId(mcpKey.getId());
        update.setLastUsedTime(new Date());
        update.setLastUsedIp(clientIp);
        this.updateById(update);

        return user;
    }

    @Override
    public boolean isEligibleMember(User user) {
        if (user == null || (user.getIsDelete() != null && user.getIsDelete() == 1)) {
            return false;
        }
        // 管理员默认拥有全部体验权限
        if (userService.isAdmin(user)) {
            return true;
        }
        // 校验是否为会员等级
        MemberLevelEnum level = MemberLevelEnum.getEnumByValue(user.getMemberLevel());
        if (level == null || !level.canAccessMemberContent()) {
            return false;
        }
        // 永久会员 (expireTime 为 null 或套餐为 lifetime)
        if ("lifetime".equalsIgnoreCase(user.getMemberPlanType()) || user.getMemberExpireTime() == null) {
            return true;
        }
        // 月度/年度等限时会员：过期时间在当前之后
        return user.getMemberExpireTime().after(new Date());
    }

    // ---------- 内部方法 ----------

    private void requireActiveMember(User user) {
        if (!isEligibleMember(user)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR,
                    "MCP 功能仅对付费会员开放，请先开通会员");
        }
    }

    private McpKeyVO toVO(UserMcpKey key) {
        if (key == null) {
            return null;
        }
        McpKeyVO vo = new McpKeyVO();
        BeanUtils.copyProperties(key, vo);
        return vo;
    }

    private String generatePlainKey() {
        byte[] bytes = new byte[KEY_RANDOM_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return "omk_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "hash key failed");
        }
    }
}
