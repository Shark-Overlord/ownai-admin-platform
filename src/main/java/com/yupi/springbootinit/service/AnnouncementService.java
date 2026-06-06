package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementAddRequest;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementQueryRequest;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementUpdateRequest;
import com.yupi.springbootinit.model.entity.Announcement;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.announcement.AnnouncementVO;

public interface AnnouncementService extends IService<Announcement> {

    Long addAnnouncement(AnnouncementAddRequest request, User adminUser);

    Boolean updateAnnouncement(AnnouncementUpdateRequest request);

    Boolean deleteAnnouncement(Long id);

    Boolean publishAnnouncement(Long id);

    Boolean offlineAnnouncement(Long id);

    Page<AnnouncementVO> listAdminAnnouncementByPage(AnnouncementQueryRequest request);

    Page<AnnouncementVO> listUserAnnouncementByPage(AnnouncementQueryRequest request, User loginUser);

    AnnouncementVO getUserAnnouncementVO(Long id, User loginUser);

    Boolean markRead(Long id, User loginUser);

    Boolean markAllRead(User loginUser);

    Long getUnreadCount(User loginUser);
}
