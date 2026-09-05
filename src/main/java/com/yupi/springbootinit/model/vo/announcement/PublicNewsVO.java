package com.yupi.springbootinit.model.vo.announcement;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.util.Date;
import lombok.Data;

/** Explicit public projection: no creator, administration status, or user data. */
@Data
public class PublicNewsVO {
    private String targetType;
    private Long targetId;
    private String id;
    private String title;
    private String summary;
    private String content;
    private String type;
    private String actionLabel;
    private String actionPath;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date publishTime;
}
