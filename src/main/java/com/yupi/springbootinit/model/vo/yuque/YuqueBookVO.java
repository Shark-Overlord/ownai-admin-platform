package com.yupi.springbootinit.model.vo.yuque;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class YuqueBookVO implements Serializable {

    private Long id;

    private String namespace;

    private String slug;

    private String name;

    private String description;

    private String visibility;

    private String status;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date lastSyncAt;

    private static final long serialVersionUID = 1L;
}
