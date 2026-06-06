package com.yupi.springbootinit.model.dto.announcement;

import com.yupi.springbootinit.common.PageRequest;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class AnnouncementQueryRequest extends PageRequest implements Serializable {

    private String title;

    private String type;

    private String status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date endTime;

    private static final long serialVersionUID = 1L;
}
