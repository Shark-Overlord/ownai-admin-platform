package com.yupi.springbootinit.model.dto.log;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class OperationLogQueryRequest extends PageRequest implements Serializable {

    private Long userId;

    private String module;

    private String action;

    private Integer status;

    private static final long serialVersionUID = 1L;
}
