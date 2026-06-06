package com.yupi.springbootinit.model.dto.announcement;

import com.yupi.springbootinit.common.PageRequest;
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

    private Date startTime;

    private Date endTime;

    private static final long serialVersionUID = 1L;
}
