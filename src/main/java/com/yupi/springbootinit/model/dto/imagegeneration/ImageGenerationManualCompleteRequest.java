package com.yupi.springbootinit.model.dto.imagegeneration;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageGenerationManualCompleteRequest implements Serializable {

    private String taskId;

    private String imageUrl;

    private String note;

    private static final long serialVersionUID = 1L;
}
