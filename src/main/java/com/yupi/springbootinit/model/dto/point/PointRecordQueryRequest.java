package com.yupi.springbootinit.model.dto.point;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class PointRecordQueryRequest extends PageRequest implements Serializable {

    private Long userId;

    private String changeType;

    private Date startTime;

    private Date endTime;

    private static final long serialVersionUID = 1L;
}
