package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import lombok.Data;

@Data
@TableName("point_recharge_config")
public class PointRechargeConfig {
    @TableId
    private Long id;
    private BigDecimal unitPrice;
    private Integer pointsPerUnit;
    private Integer maxQuantity;
    private Integer status;
}
