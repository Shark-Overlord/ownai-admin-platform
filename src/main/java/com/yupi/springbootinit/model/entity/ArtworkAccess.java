package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "artwork_access")
@Data
public class ArtworkAccess implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private Long artworkId;

    private Long userId;

    private Long orderId;

    private String accessType;

    private Date createTime;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
