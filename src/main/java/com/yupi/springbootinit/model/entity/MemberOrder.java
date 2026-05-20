package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import lombok.Data;

@TableName(value = "member_order")
@Data
public class MemberOrder implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String orderNo;

    private Long userId;

    private String memberLevel;

    private String planType;

    private Integer durationDays;

    private String orderType;

    private String orderStatus;

    private BigDecimal orderAmount;

    private Integer pointsAmount;

    private String paymentChannel;

    private String thirdPartyOrderNo;

    private Date payTime;

    private Date finishTime;

    private Date createTime;

    private Date updateTime;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
