package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.model.dto.member.MemberPriceConfigUpdateRequest;
import com.yupi.springbootinit.model.entity.MemberPriceConfig;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.enums.MemberPlanTypeEnum;
import com.yupi.springbootinit.service.MemberPriceConfigService;
import io.swagger.annotations.Api;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import javax.annotation.Resource;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/member-price-config")
@Api(tags = "MemberPriceConfig")
public class MemberPriceConfigController {

    @Resource
    private MemberPriceConfigService memberPriceConfigService;

    @GetMapping("/plans")
    public BaseResponse<List<MemberPriceConfig>> listEnabledPlans() {
        return ResultUtils.success(loadConfigs(true));
    }

    @GetMapping("/list")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<List<MemberPriceConfig>> listAll() {
        return ResultUtils.success(loadConfigs(false));
    }

    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "member_price_config", action = "update_member_price_config")
    public BaseResponse<Boolean> update(@RequestBody MemberPriceConfigUpdateRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        MemberPriceConfig existing = memberPriceConfigService.getById(request.getId());
        ThrowUtils.throwIf(existing == null, ErrorCode.NOT_FOUND_ERROR, "Membership plan not found");
        MemberPlanTypeEnum planType = MemberPlanTypeEnum.getEnumByValue(existing.getPlanType());
        ThrowUtils.throwIf(planType == null, ErrorCode.PARAMS_ERROR, "Invalid membership plan");
        validatePrice(request.getCashPrice());

        MemberPriceConfig update = new MemberPriceConfig();
        update.setId(existing.getId());
        update.setMemberLevel(MemberLevelEnum.MEMBER.getValue());
        update.setPlanType(planType.getValue());
        update.setCashPrice(request.getCashPrice());
        update.setCurrency(normalizeCurrency(request.getCurrency()));
        update.setPointsPrice(0);
        update.setDurationDays(planType.isLifetime() ? 0 : planType.getDurationDays());
        update.setDescription(request.getDescription());
        update.setFeatures(request.getFeatures());
        update.setStatus(request.getStatus());
        boolean result = memberPriceConfigService.updateById(update);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(true);
    }

    @PostMapping("/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "member_price_config", action = "add_member_price_config")
    public BaseResponse<Long> add(@RequestBody MemberPriceConfigUpdateRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        MemberPlanTypeEnum planType = MemberPlanTypeEnum.getEnumByValue(request.getPlanType());
        ThrowUtils.throwIf(planType == null, ErrorCode.PARAMS_ERROR, "Invalid membership plan");
        validatePrice(request.getCashPrice());
        MemberPriceConfig existing = memberPriceConfigService.getOne(new QueryWrapper<MemberPriceConfig>()
                .eq("memberLevel", MemberLevelEnum.MEMBER.getValue())
                .eq("planType", planType.getValue())
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        ThrowUtils.throwIf(existing != null, ErrorCode.PARAMS_ERROR, "Membership plan already exists");

        MemberPriceConfig config = new MemberPriceConfig();
        BeanUtils.copyProperties(request, config);
        config.setMemberLevel(MemberLevelEnum.MEMBER.getValue());
        config.setPlanType(planType.getValue());
        config.setCurrency(normalizeCurrency(request.getCurrency()));
        config.setPointsPrice(0);
        config.setDurationDays(planType.isLifetime() ? 0 : planType.getDurationDays());
        config.setStatus(config.getStatus() == null ? 1 : config.getStatus());
        boolean result = memberPriceConfigService.save(config);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(config.getId());
    }

    private List<MemberPriceConfig> loadConfigs(boolean enabledOnly) {
        QueryWrapper<MemberPriceConfig> query = new QueryWrapper<MemberPriceConfig>()
                .eq("memberLevel", MemberLevelEnum.MEMBER.getValue())
                .eq("isDelete", 0);
        query.eq(enabledOnly, "status", 1);
        List<MemberPriceConfig> configs = memberPriceConfigService.list(query);
        configs.sort(Comparator.comparingInt(item -> planOrder(item.getPlanType())));
        return configs;
    }

    private int planOrder(String planType) {
        if (MemberPlanTypeEnum.MONTH.getValue().equals(planType)) {
            return 1;
        }
        if (MemberPlanTypeEnum.YEAR.getValue().equals(planType)) {
            return 2;
        }
        return 3;
    }

    private void validatePrice(BigDecimal price) {
        ThrowUtils.throwIf(price == null || price.compareTo(BigDecimal.ZERO) <= 0,
                ErrorCode.PARAMS_ERROR, "Cash price must be positive");
        ThrowUtils.throwIf(price.scale() > 2, ErrorCode.PARAMS_ERROR, "Cash price supports at most two decimal places");
    }

    private String normalizeCurrency(String currency) {
        String value = currency == null ? "CNY" : currency.trim().toUpperCase();
        ThrowUtils.throwIf(value.length() != 3, ErrorCode.PARAMS_ERROR, "Invalid currency");
        return value;
    }
}
