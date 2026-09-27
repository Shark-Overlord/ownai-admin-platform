package com.yupi.springbootinit.model.dto.traffictag;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class TrafficTagAddRequest implements Serializable {

    private String externalId;
    private String title;
    private String platform;
    private String category;
    private String status;
    private String dateLabel;
    private Integer heat;
    private List<String> tags;
    private List<String> requirements;
    private String description;
    private String sourceUrl;
    private Integer sortOrder;
    private Boolean enabled;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date sourceUpdatedTime;

    private static final long serialVersionUID = 1L;
}
