package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.mapper.AnnouncementReadMapper;
import com.yupi.springbootinit.model.entity.AnnouncementRead;
import com.yupi.springbootinit.service.AnnouncementReadService;
import org.springframework.stereotype.Service;

@Service
public class AnnouncementReadServiceImpl extends ServiceImpl<AnnouncementReadMapper, AnnouncementRead>
        implements AnnouncementReadService {
}
