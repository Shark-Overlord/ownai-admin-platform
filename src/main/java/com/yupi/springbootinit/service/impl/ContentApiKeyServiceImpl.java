package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.PageRequest;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.ContentApiKeyMapper;
import com.yupi.springbootinit.model.dto.contentapikey.ContentApiKeyAddRequest;
import com.yupi.springbootinit.model.dto.contentapikey.ContentApiKeyQueryRequest;
import com.yupi.springbootinit.model.dto.contentapikey.ContentApiKeyUpdateRequest;
import com.yupi.springbootinit.model.entity.ContentApiKey;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.contentapikey.ContentApiKeyCreateVO;
import com.yupi.springbootinit.model.vo.contentapikey.ContentApiKeyVO;
import com.yupi.springbootinit.service.ContentApiKeyService;
import com.yupi.springbootinit.utils.SqlUtils;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Service
public class ContentApiKeyServiceImpl extends ServiceImpl<ContentApiKeyMapper, ContentApiKey>
        implements ContentApiKeyService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private static final int KEY_RANDOM_BYTES = 32;

    private static final int KEY_PREFIX_LENGTH = 12;

    private static final Set<String> ALLOWED_SCOPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            SCOPE_ALL,
            SCOPE_ARTWORK_ADD,
            SCOPE_ARTWORK_UPDATE,
            SCOPE_PROMPT_ASSET_ADD,
            SCOPE_PROMPT_ASSET_UPDATE
    )));

    @Override
    public ContentApiKeyCreateVO addKey(ContentApiKeyAddRequest request, User loginUser) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        validateKeyName(request.getKeyName());
        validateStatus(request.getStatus());
        String scopes = normalizeScopes(request.getScopes());
        validateRemark(request.getRemark());

        String plainKey = generatePlainKey();
        ContentApiKey key = new ContentApiKey();
        key.setKeyName(StringUtils.trim(request.getKeyName()));
        key.setKeyHash(sha256Hex(plainKey));
        key.setKeyPrefix(StringUtils.substring(plainKey, 0, KEY_PREFIX_LENGTH));
        key.setScopes(scopes);
        key.setStatus(request.getStatus() == null ? 1 : request.getStatus());
        key.setExpireTime(request.getExpireTime());
        key.setRemark(StringUtils.trimToNull(request.getRemark()));
        key.setCreateUserId(loginUser == null ? null : loginUser.getId());
        boolean saved = this.save(key);
        ThrowUtils.throwIf(!saved, ErrorCode.OPERATION_ERROR, "create api key failed");

        ContentApiKeyCreateVO vo = new ContentApiKeyCreateVO();
        BeanUtils.copyProperties(toVO(this.getById(key.getId())), vo);
        vo.setPlainKey(plainKey);
        return vo;
    }

    @Override
    public Boolean updateKey(ContentApiKeyUpdateRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        ContentApiKey oldKey = this.getById(request.getId());
        ThrowUtils.throwIf(oldKey == null || oldKey.getIsDelete() != null && oldKey.getIsDelete() == 1,
                ErrorCode.NOT_FOUND_ERROR, "api key not found");
        validateKeyName(request.getKeyName());
        validateStatus(request.getStatus());
        String scopes = normalizeScopes(request.getScopes());
        validateRemark(request.getRemark());

        boolean result = this.update(new UpdateWrapper<ContentApiKey>()
                .eq("id", request.getId())
                .eq("isDelete", 0)
                .set("keyName", StringUtils.trim(request.getKeyName()))
                .set("scopes", scopes)
                .set("status", request.getStatus())
                .set("expireTime", request.getExpireTime())
                .set("remark", StringUtils.trimToNull(request.getRemark())));
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "update api key failed");
        return true;
    }

    @Override
    public Page<ContentApiKeyVO> listKeyByPage(ContentApiKeyQueryRequest request) {
        ContentApiKeyQueryRequest safeRequest = request == null ? new ContentApiKeyQueryRequest() : request;
        QueryWrapper<ContentApiKey> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("isDelete", 0);
        if (StringUtils.isNotBlank(safeRequest.getKeyName())) {
            queryWrapper.like("keyName", StringUtils.trim(safeRequest.getKeyName()));
        }
        if (StringUtils.isNotBlank(safeRequest.getScope())) {
            queryWrapper.like("scopes", StringUtils.trim(safeRequest.getScope()));
        }
        if (safeRequest.getStatus() != null) {
            queryWrapper.eq("status", safeRequest.getStatus());
        }
        if (safeRequest.getStartTime() != null) {
            queryWrapper.ge("createTime", safeRequest.getStartTime());
        }
        if (safeRequest.getEndTime() != null) {
            queryWrapper.le("createTime", safeRequest.getEndTime());
        }
        String sortField = safeRequest.getSortField();
        String sortOrder = safeRequest.getSortOrder();
        queryWrapper.orderBy(StringUtils.isNotBlank(sortField) && SqlUtils.validSortField(sortField),
                CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
        queryWrapper.orderByDesc("createTime", "id");
        Page<ContentApiKey> page = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), queryWrapper);
        Page<ContentApiKeyVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(page.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return voPage;
    }

    @Override
    public Boolean deleteKey(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        ContentApiKey key = new ContentApiKey();
        key.setId(id);
        key.setIsDelete(1);
        boolean result = this.updateById(key);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "delete api key failed");
        return true;
    }

    @Override
    public boolean validateRequestKey(String requestKey, HttpServletRequest request, String requiredScope) {
        String plainKey = StringUtils.trimToNull(requestKey);
        if (plainKey == null && request != null) {
            plainKey = StringUtils.trimToNull(request.getHeader(HEADER_CONTENT_ASSET_KEY));
        }
        if (plainKey == null && request != null) {
            plainKey = StringUtils.trimToNull(request.getHeader(HEADER_CONTENT_ASSET_SECRET));
        }
        if (plainKey == null) {
            return false;
        }
        if (StringUtils.isBlank(requiredScope) || !ALLOWED_SCOPES.contains(requiredScope)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "invalid required scope");
        }
        ContentApiKey key = this.getOne(new QueryWrapper<ContentApiKey>()
                .eq("keyHash", sha256Hex(plainKey))
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        if (key == null) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "invalid api key");
        }
        if (key.getStatus() == null || key.getStatus() != 1) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "api key disabled");
        }
        if (key.getExpireTime() != null && key.getExpireTime().before(new Date())) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "api key expired");
        }
        Set<String> scopes = splitScopes(key.getScopes());
        if (!scopes.contains(SCOPE_ALL) && !scopes.contains(requiredScope)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "api key scope denied");
        }
        ContentApiKey update = new ContentApiKey();
        update.setId(key.getId());
        update.setLastUsedTime(new Date());
        update.setLastUsedIp(getClientIp(request));
        this.updateById(update);
        return true;
    }

    private ContentApiKeyVO toVO(ContentApiKey key) {
        if (key == null) {
            return null;
        }
        ContentApiKeyVO vo = new ContentApiKeyVO();
        BeanUtils.copyProperties(key, vo);
        vo.setScopeList(new ArrayList<>(splitScopes(key.getScopes())));
        return vo;
    }

    private void validateKeyName(String keyName) {
        String name = StringUtils.trimToNull(keyName);
        ThrowUtils.throwIf(name == null, ErrorCode.PARAMS_ERROR, "key name is required");
        ThrowUtils.throwIf(StringUtils.length(name) > 100, ErrorCode.PARAMS_ERROR, "key name too long");
    }

    private void validateStatus(Integer status) {
        if (status == null) {
            return;
        }
        ThrowUtils.throwIf(status != 0 && status != 1, ErrorCode.PARAMS_ERROR, "invalid key status");
    }

    private void validateRemark(String remark) {
        ThrowUtils.throwIf(StringUtils.length(remark) > 500, ErrorCode.PARAMS_ERROR, "remark too long");
    }

    private String normalizeScopes(List<String> scopes) {
        ThrowUtils.throwIf(scopes == null || scopes.isEmpty(), ErrorCode.PARAMS_ERROR, "scope is required");
        List<String> normalized = scopes.stream()
                .map(StringUtils::trimToNull)
                .filter(StringUtils::isNotBlank)
                .distinct()
                .collect(Collectors.toList());
        ThrowUtils.throwIf(normalized.isEmpty(), ErrorCode.PARAMS_ERROR, "scope is required");
        for (String scope : normalized) {
            ThrowUtils.throwIf(!ALLOWED_SCOPES.contains(scope), ErrorCode.PARAMS_ERROR, "invalid scope: " + scope);
        }
        return StringUtils.join(normalized, ",");
    }

    private Set<String> splitScopes(String scopes) {
        if (StringUtils.isBlank(scopes)) {
            return Collections.emptySet();
        }
        return Arrays.stream(StringUtils.split(scopes, ','))
                .map(StringUtils::trimToNull)
                .filter(StringUtils::isNotBlank)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private String generatePlainKey() {
        byte[] bytes = new byte[KEY_RANDOM_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return "oak_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "hash api key failed");
        }
    }

    private String getClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String ip = StringUtils.trimToNull(request.getHeader("X-Forwarded-For"));
        if (ip != null) {
            int commaIndex = ip.indexOf(',');
            return commaIndex >= 0 ? ip.substring(0, commaIndex).trim() : ip;
        }
        ip = StringUtils.trimToNull(request.getHeader("X-Real-IP"));
        return ip == null ? request.getRemoteAddr() : ip;
    }
}
