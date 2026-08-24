package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.dto.home.HomeContentConfigDTO;
import com.yupi.springbootinit.model.vo.home.HomeContentVO;
import com.yupi.springbootinit.service.HomeContentService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import javax.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/home")
@Api(tags = "HomeContent")
public class HomeContentController {

    @Resource
    private HomeContentService homeContentService;

    @GetMapping("/content")
    @ApiOperation("Get public homepage content")
    public BaseResponse<HomeContentVO> getPublicContent() {
        return ResultUtils.success(homeContentService.getPublicContent());
    }

    @GetMapping("/admin/config")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Get homepage content configuration")
    public BaseResponse<HomeContentConfigDTO> getAdminConfig() {
        return ResultUtils.success(homeContentService.getAdminConfig());
    }

    @PostMapping("/admin/config/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "home_content", action = "update_home_content")
    @ApiOperation("Update homepage content configuration")
    public BaseResponse<Boolean> updateAdminConfig(@RequestBody HomeContentConfigDTO config) {
        return ResultUtils.success(homeContentService.saveAdminConfig(config));
    }
}
