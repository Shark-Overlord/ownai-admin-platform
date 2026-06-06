package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageGenerationProviderTestVO implements Serializable {

    private Boolean passed;

    private Integer httpStatus;

    private Long durationMs;

    private String message;

    private String url;

    private static final long serialVersionUID = 1L;
}
