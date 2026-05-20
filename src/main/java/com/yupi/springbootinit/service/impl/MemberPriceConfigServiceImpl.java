package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.MemberPriceConfigMapper;
import com.yupi.springbootinit.model.entity.MemberPriceConfig;
import com.yupi.springbootinit.service.MemberPriceConfigService;
import java.math.BigDecimal;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

@Service
public class MemberPriceConfigServiceImpl extends ServiceImpl<MemberPriceConfigMapper, MemberPriceConfig>
        implements MemberPriceConfigService {

    @Override
    public MemberPriceConfig getValidConfig(String memberLevel, String planType) {
        if (StringUtils.isBlank(memberLevel) || StringUtils.isBlank(planType)) {
            return null;
        }
        return this.getOne(new QueryWrapper<MemberPriceConfig>()
                .eq("memberLevel", memberLevel)
                .eq("planType", planType)
                .eq("status", 1)
                .eq("isDelete", 0)
                .last("LIMIT 1"));
    }

    @Override
    public BigDecimal getCashPrice(String memberLevel, String planType) {
        MemberPriceConfig config = getValidConfig(memberLevel, planType);
        if (config == null || config.getCashPrice() == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "会员价格配置不存在: " + memberLevel + " / " + planType);
        }
        return config.getCashPrice();
    }

    @Override
    public Integer getPointsPrice(String memberLevel, String planType) {
        MemberPriceConfig config = getValidConfig(memberLevel, planType);
        if (config == null || config.getPointsPrice() == null) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "会员价格配置不存在: " + memberLevel + " / " + planType);
        }
        return config.getPointsPrice();
    }
}
