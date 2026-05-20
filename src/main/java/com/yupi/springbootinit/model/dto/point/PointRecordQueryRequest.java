package com.yupi.springbootinit.model.dto.point;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class PointRecordQueryRequest extends PageRequest implements Serializable {

    private String changeType;

    private static final long serialVersionUID = 1L;
}
