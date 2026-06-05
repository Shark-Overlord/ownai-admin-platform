package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@Data
public class ImageGenerationCanvasVO implements Serializable {

    private Long id;

    private Long userId;

    private String conversationId;

    private String layoutJson;

    private String viewportJson;

    private Date createTime;

    private Date updateTime;

    private static final long serialVersionUID = 1L;
}
