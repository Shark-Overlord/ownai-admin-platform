package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.AnnouncementPopupDismissal;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;

public interface AnnouncementPopupDismissalMapper extends BaseMapper<AnnouncementPopupDismissal> {
    @Insert("INSERT INTO announcement_popup_dismissal (id, announcementId, userId) "
            + "VALUES (#{id}, #{announcementId}, #{userId}) ON DUPLICATE KEY UPDATE userId = VALUES(userId)")
    int dismissOnce(@Param("id") Long id, @Param("announcementId") Long announcementId,
            @Param("userId") Long userId);
}
