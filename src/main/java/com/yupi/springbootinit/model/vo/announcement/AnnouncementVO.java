package com.yupi.springbootinit.model.vo.announcement;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class AnnouncementVO implements Serializable {

    private Long id;

    private String title;

    private String content;

    private String type;

    private String status;

    private Integer priority;

    private Date publishTime;

    private Date expireTime;

    private Long createUserId;

    private Date createTime;

    private Date updateTime;

    private Boolean readStatus;

    private Date readTime;

    private static final long serialVersionUID = 1L;
}
