package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName("traffic_tag")
@Data
public class TrafficTag implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String seedKey;

    private String title;

    private String platform;

    private String category;

    private String status;

    private String dateLabel;

    private Integer heat;

    private String tagsJson;

    private String requirementsJson;

    private String description;

    private String sourceUrl;

    private Integer sortOrder;

    private Boolean enabled;

    private Date sourceUpdatedTime;

    private Date createTime;

    private Date updateTime;

    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
