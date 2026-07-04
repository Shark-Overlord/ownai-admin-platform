package com.yupi.springbootinit.model.dto.contentapikey;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class ContentApiKeyUpdateRequest implements Serializable {

    private Long id;

    private String keyName;

    private List<String> scopes;

    private Integer status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date expireTime;

    private String remark;

    private static final long serialVersionUID = 1L;
}
