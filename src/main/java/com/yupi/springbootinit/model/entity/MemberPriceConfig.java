package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import lombok.Data;

@TableName(value = "member_price_config")
@Data
public class MemberPriceConfig implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String memberLevel;

    private String planType;

    private BigDecimal cashPrice;

    private Integer pointsPrice;

    private Integer durationDays;

    private String description;

    private String features;

    private Integer status;

    private Date createTime;

    private Date updateTime;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
