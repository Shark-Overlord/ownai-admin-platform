package com.yupi.springbootinit.model.dto.announcement;

import com.fasterxml.jackson.annotation.JsonFormat;
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

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date publishTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date expireTime;

    private static final long serialVersionUID = 1L;
}
