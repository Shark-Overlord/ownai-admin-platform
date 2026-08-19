package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName("ai_provider_config")
@Data
public class AiProviderConfig implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String providerCode;
    private String providerName;
    private String baseUrl;
    private String chatPath;
    private String modelCode;
    private String authType;
    private String apiKeyEncrypted;
    private String apiKeyLast4;
    private Integer status;
    private Integer timeoutSeconds;
    private Date createTime;
    private Date updateTime;
    @TableLogic
    private Integer isDelete;

    private static final long serialVersionUID = 1L;
}
