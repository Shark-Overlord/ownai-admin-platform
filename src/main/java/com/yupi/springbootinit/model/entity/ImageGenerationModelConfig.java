package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import lombok.Data;

@TableName(value = "image_generation_model_config")
@Data
public class ImageGenerationModelConfig implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String providerCode;

    private String modelCode;

    private String sizeCode;

    private String aspectRatio;

    private String vendorSize;

    private Integer pointCost;

    private BigDecimal apiInputCostCny;

    private BigDecimal apiOutputCostCny;

    private BigDecimal apiCostCny;

    private Integer supportsReferenceImage;

    private Integer status;

    private Integer sortOrder;

    private String description;

    private Date createTime;

    private Date updateTime;

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
