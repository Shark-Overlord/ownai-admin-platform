package com.yupi.springbootinit.model.vo.ai;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class AiTaskConfigVO implements Serializable {
    private Long id;
    private String taskCode;
    private String providerCode;
    private String taskName;
    private String systemPrompt;
    private Integer maxResultCount;
    private Integer status;
    private Date createTime;
    private Date updateTime;
    private static final long serialVersionUID = 1L;
}
