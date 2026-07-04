package com.yupi.springbootinit.model.dto.contentapikey;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class ContentApiKeyQueryRequest extends PageRequest implements Serializable {

    private String keyName;

    private String scope;

    private Integer status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date startTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date endTime;

    private static final long serialVersionUID = 1L;
}
