package com.yupi.springbootinit.model.dto.announcement;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class AnnouncementUpdateRequest implements Serializable {

    private Long id;

    private String title;

    private String content;

    private String type;

    private String status;

    private Integer priority;

    private Date publishTime;

    private Date expireTime;

    private static final long serialVersionUID = 1L;
}
