package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.PointCheckInConfigMapper;
import com.yupi.springbootinit.model.dto.point.PointCheckInConfigUpdateRequest;
import com.yupi.springbootinit.model.entity.PointCheckInConfig;
import com.yupi.springbootinit.service.PointCheckInConfigService;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Service
public class PointCheckInConfigServiceImpl extends ServiceImpl<PointCheckInConfigMapper, PointCheckInConfig>
        implements PointCheckInConfigService {

    private static final int DEFAULT_REWARD_POINTS = 20;

    @Override
    public PointCheckInConfig getActiveConfig() {
        PointCheckInConfig config = getAdminConfig();
        if (config == null || config.getStatus() == null || config.getStatus() != 1) {
            return null;
        }
        return config;
    }

    @Override
    public PointCheckInConfig getAdminConfig() {
        PointCheckInConfig config = this.getOne(new QueryWrapper<PointCheckInConfig>()
                .eq("isDelete", 0)
                .orderByDesc("id")
                .last("LIMIT 1"));
        if (config != null) {
            return config;
        }
        PointCheckInConfig defaultConfig = new PointCheckInConfig();
        defaultConfig.setRewardPoints(DEFAULT_REWARD_POINTS);
        defaultConfig.setStatus(1);
        defaultConfig.setDescription("每日签到默认奖励");
        this.save(defaultConfig);
        return defaultConfig;
    }

    @Override
    public PointCheckInConfig updateConfig(PointCheckInConfigUpdateRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        Integer rewardPoints = request.getRewardPoints();
        ThrowUtils.throwIf(rewardPoints == null || rewardPoints < 1 || rewardPoints > 10000,
                ErrorCode.PARAMS_ERROR, "签到奖励积分必须在 1-10000 之间");
        Integer status = request.getStatus();
        ThrowUtils.throwIf(status == null || (status != 0 && status != 1), ErrorCode.PARAMS_ERROR,
                "状态只能是启用或停用");
        if (StringUtils.length(request.getDescription()) > 512) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "说明不能超过 512 个字符");
        }
        PointCheckInConfig config = new PointCheckInConfig();
        BeanUtils.copyProperties(request, config);
        if (config.getId() == null || config.getId() <= 0) {
            PointCheckInConfig existing = getAdminConfig();
            config.setId(existing.getId());
        }
        boolean result = this.updateById(config);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "更新签到配置失败");
        return this.getById(config.getId());
    }
}
