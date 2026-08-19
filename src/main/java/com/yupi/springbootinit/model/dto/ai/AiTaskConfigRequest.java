package com.yupi.springbootinit.model.dto.ai;

import java.io.Serializable;
import lombok.Data;

@Data
public class AiTaskConfigRequest implements Serializable {
    private Long id;
    private String taskCode;
    private String providerCode;
    private String taskName;
    private String systemPrompt;
    private Integer maxResultCount;
    private Integer status;
    private static final long serialVersionUID = 1L;
}
