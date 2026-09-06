package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.entity.PointRechargeConfig;
import com.yupi.springbootinit.service.PointRechargeConfigService;
import javax.annotation.Resource;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/point/recharge-config")
public class PointRechargeConfigController {
    @Resource
    private PointRechargeConfigService service;

    @GetMapping
    public BaseResponse<PointRechargeConfig> getConfig() {
        return ResultUtils.success(service.getConfig());
    }

    @PostMapping("/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "point", action = "update_recharge_config")
    public BaseResponse<PointRechargeConfig> update(@RequestBody PointRechargeConfig config) {
        return ResultUtils.success(service.updateConfig(config));
    }
}
