package com.yupi.springbootinit.model.vo.contentapikey;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class ContentApiKeyVO implements Serializable {

    private Long id;

    private String keyName;

    private String keyPrefix;

    private String scopes;

    private List<String> scopeList;

    private Integer status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date expireTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date lastUsedTime;

    private String lastUsedIp;

    private String remark;

    private Long createUserId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date createTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
