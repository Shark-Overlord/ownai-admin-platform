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

@TableName(value = "artwork")
@Data
public class Artwork implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String title;

    private String summary;

    private String description;

    private String coverUrl;

    private String videoUrl;

    private String promptContent;

    private Long categoryId;

    private BigDecimal cashPrice;

    private Integer pointsPrice;

    private Integer memberOnly;

    private Integer status;

    private String htmlUrl;

    private Long userId;

    private Integer viewCount;

    private Integer sort;

    private Date createTime;

    private Date updateTime;

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
