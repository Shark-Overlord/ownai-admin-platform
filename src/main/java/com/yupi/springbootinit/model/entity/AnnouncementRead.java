package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "announcement_read")
@Data
public class AnnouncementRead implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long announcementId;

    private Long userId;

    private Date readTime;

    private Date createTime;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
