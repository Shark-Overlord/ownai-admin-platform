package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.point.PointCheckInConfigUpdateRequest;
import com.yupi.springbootinit.model.entity.PointCheckInConfig;

public interface PointCheckInConfigService extends IService<PointCheckInConfig> {

    PointCheckInConfig getActiveConfig();

    PointCheckInConfig getAdminConfig();

    PointCheckInConfig updateConfig(PointCheckInConfigUpdateRequest request);
}
