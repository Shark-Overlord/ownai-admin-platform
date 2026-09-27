package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagAddRequest;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagPublicQueryRequest;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagQueryRequest;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagUpdateRequest;
import com.yupi.springbootinit.model.entity.TrafficTag;
import com.yupi.springbootinit.model.vo.traffictag.TrafficTagOverviewVO;
import com.yupi.springbootinit.model.vo.traffictag.TrafficTagVO;

public interface TrafficTagService extends IService<TrafficTag> {

    long addTrafficTag(TrafficTagAddRequest request);

    boolean updateTrafficTag(TrafficTagUpdateRequest request);

    boolean deleteTrafficTag(long id);

    TrafficTagVO getTrafficTag(long id);

    Page<TrafficTagVO> listAdminByPage(TrafficTagQueryRequest request);

    TrafficTagOverviewVO getPublicOverview(TrafficTagPublicQueryRequest request);
}
