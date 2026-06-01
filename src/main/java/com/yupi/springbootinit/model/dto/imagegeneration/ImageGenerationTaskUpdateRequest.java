package com.yupi.springbootinit.model.dto.imagegeneration;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageGenerationTaskUpdateRequest implements Serializable {

    private String taskId;

    private String status;

    private String prompt;

    private Object resultImageUrls;

    private Object responsePayload;

    private String errorMessage;

    private static final long serialVersionUID = 1L;
}
