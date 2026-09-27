package com.yupi.springbootinit.model.dto.traffictag;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class TrafficTagQueryRequest extends PageRequest implements Serializable {

    private String keyword;
    private String platform;
    private String category;
    private String status;
    private Boolean enabled;

    private static final long serialVersionUID = 1L;
}
