package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.entity.MemberPriceConfig;
import java.math.BigDecimal;

public interface MemberPriceConfigService extends IService<MemberPriceConfig> {

    /**
     * 根据会员等级和套餐类型获取有效配置
     */
    MemberPriceConfig getValidConfig(String memberLevel, String planType);

    /**
     * 获取套餐现金价格
     */
    BigDecimal getCashPrice(String memberLevel, String planType);

    /**
     * 获取套餐积分价格
     */
    Integer getPointsPrice(String memberLevel, String planType);
}
