package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

@Data
@TableName("announcement_popup_dismissal")
public class AnnouncementPopupDismissal {
    @TableId
    private Long id;
    private Long announcementId;
    private Long userId;
    private Date dismissedTime;
}
