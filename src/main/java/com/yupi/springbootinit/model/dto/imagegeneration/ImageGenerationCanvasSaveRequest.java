package com.yupi.springbootinit.model.dto.imagegeneration;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageGenerationCanvasSaveRequest implements Serializable {

    private String conversationId;

    private String layoutJson;

    private String viewportJson;

    private static final long serialVersionUID = 1L;
}
