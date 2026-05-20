package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.point.PointRecordQueryRequest;
import com.yupi.springbootinit.model.entity.PointRecord;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.PointChangeTypeEnum;
import com.yupi.springbootinit.model.vo.point.PointOverviewVO;

public interface PointService extends IService<PointRecord> {

    PointOverviewVO getPointOverview(User loginUser);

    int dailyCheckIn(User loginUser);

    Page<PointRecord> listMyPointRecords(PointRecordQueryRequest pointRecordQueryRequest, User loginUser);

    void addPoints(Long userId, int amount, PointChangeTypeEnum pointChangeTypeEnum, String relatedType, Long relatedId,
            String description);

    void deductPoints(Long userId, int amount, PointChangeTypeEnum pointChangeTypeEnum, String relatedType,
            Long relatedId, String description);
}
