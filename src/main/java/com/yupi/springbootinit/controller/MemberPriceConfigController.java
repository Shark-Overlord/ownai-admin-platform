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
import com.yupi.springbootinit.service.MemberPriceConfigService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.List;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 会员价格配置接口 Member Price Config Controller
 */
@RestController
@RequestMapping("/member-price-config")
@Api(tags = "MemberPriceConfig")
public class MemberPriceConfigController {

    @Resource
    private MemberPriceConfigService memberPriceConfigService;

    /**
     * 获取全部会员价格配置（管理员）
     */
    @GetMapping("/list")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("获取全部会员价格配置 List all member price configs")
    public BaseResponse<List<MemberPriceConfig>> listAll() {
        List<MemberPriceConfig> list = memberPriceConfigService.list(
                new QueryWrapper<MemberPriceConfig>().eq("isDelete", 0).orderByAsc("memberLevel", "planType"));
        return ResultUtils.success(list);
    }

    /**
     * 获取启用的会员价格配置（普通用户可查看）
     */
    @GetMapping("/plans")
    @ApiOperation("获取可订阅的会员计划 Get available member plans")
    public BaseResponse<List<MemberPriceConfig>> listAvailablePlans() {
        List<MemberPriceConfig> list = memberPriceConfigService.list(
                new QueryWrapper<MemberPriceConfig>()
                        .eq("status", 1)
                        .eq("isDelete", 0)
                        .orderByAsc("memberLevel", "planType"));
        return ResultUtils.success(list);
    }

    /**
     * 更新会员价格配置
     */
    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "member_price_config", action = "update_member_price_config")
    @ApiOperation("更新会员价格配置 Update member price config")
    public BaseResponse<Boolean> update(@RequestBody MemberPriceConfigUpdateRequest updateRequest) {
        if (updateRequest == null || updateRequest.getId() == null || updateRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        MemberPriceConfig config = new MemberPriceConfig();
        BeanUtils.copyProperties(updateRequest, config);
        if (StringUtils.isNotBlank(updateRequest.getMemberLevel())) {
            config.setMemberLevel(updateRequest.getMemberLevel().trim().toLowerCase());
        }
        if (StringUtils.isNotBlank(updateRequest.getPlanType())) {
            config.setPlanType(updateRequest.getPlanType().trim().toLowerCase());
        }
        boolean result = memberPriceConfigService.updateById(config);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(true);
    }

    /**
     * 新增会员价格配置
     */
    @PostMapping("/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "member_price_config", action = "add_member_price_config")
    @ApiOperation("新增会员价格配置 Add member price config")
    public BaseResponse<Long> add(@RequestBody MemberPriceConfigUpdateRequest addRequest) {
        if (addRequest == null || StringUtils.isBlank(addRequest.getMemberLevel())
                || StringUtils.isBlank(addRequest.getPlanType())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "会员等级和套餐类型不能为空");
        }
        String memberLevel = addRequest.getMemberLevel().trim().toLowerCase();
        String planType = addRequest.getPlanType().trim().toLowerCase();
        MemberPriceConfig existing = memberPriceConfigService.getOne(
                new QueryWrapper<MemberPriceConfig>()
                        .eq("memberLevel", memberLevel)
                        .eq("planType", planType)
                        .eq("isDelete", 0)
                        .last("LIMIT 1"));
        if (existing != null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "该会员等级和套餐类型配置已存在");
        }
        MemberPriceConfig config = new MemberPriceConfig();
        BeanUtils.copyProperties(addRequest, config);
        config.setMemberLevel(memberLevel);
        config.setPlanType(planType);
        if (config.getStatus() == null) {
            config.setStatus(1);
        }
        boolean result = memberPriceConfigService.save(config);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return ResultUtils.success(config.getId());
    }
}
