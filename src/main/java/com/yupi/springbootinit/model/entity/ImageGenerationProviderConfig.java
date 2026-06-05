package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "image_generation_provider_config")
@Data
public class ImageGenerationProviderConfig implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String providerCode;

    private String providerName;

    private String baseUrl;

    private String generationPath;

    private String authType;

    private String apiKeyEncrypted;

    private String apiKeyLast4;

    private Integer status;

    private Integer isDefault;

    private Integer timeoutSeconds;

    private String requestSchema;

    private Date createTime;

    private Date updateTime;

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
