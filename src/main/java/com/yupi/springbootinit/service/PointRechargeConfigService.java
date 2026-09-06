package com.yupi.springbootinit.service;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.PointRechargeConfigMapper;
import com.yupi.springbootinit.model.entity.PointRechargeConfig;
import java.math.BigDecimal;
import javax.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PointRechargeConfigService {
    @Resource
    private PointRechargeConfigMapper mapper;

    public PointRechargeConfig getConfig() {
        PointRechargeConfig config = mapper.selectById(1L);
        ThrowUtils.throwIf(config == null, ErrorCode.OPERATION_ERROR, "积分充值尚未配置");
        return config;
    }

    @Transactional(rollbackFor = Exception.class)
    public PointRechargeConfig updateConfig(PointRechargeConfig config) {
        validate(config);
        config.setId(1L);
        ThrowUtils.throwIf(mapper.updateById(config) != 1, ErrorCode.OPERATION_ERROR, "积分充值配置保存失败");
        return getConfig();
    }

    public void validate(PointRechargeConfig config) {
        ThrowUtils.throwIf(config == null || config.getUnitPrice() == null
                || config.getUnitPrice().compareTo(BigDecimal.ZERO) <= 0
                || config.getUnitPrice().compareTo(new BigDecimal("10000")) > 0
                || config.getUnitPrice().scale() > 2, ErrorCode.PARAMS_ERROR, "每份价格须为 0.01 至 10000 元，最多两位小数");
        ThrowUtils.throwIf(config.getPointsPerUnit() == null || config.getPointsPerUnit() < 1
                || config.getPointsPerUnit() > 100000 || config.getMaxQuantity() == null
                || config.getMaxQuantity() < 1 || config.getMaxQuantity() > 1000,
                ErrorCode.PARAMS_ERROR, "每份积分须为 1 至 100000，单笔份数上限须为 1 至 1000");
        ThrowUtils.throwIf(config.getStatus() == null || (config.getStatus() != 0 && config.getStatus() != 1),
                ErrorCode.PARAMS_ERROR, "充值状态无效");
    }
}
