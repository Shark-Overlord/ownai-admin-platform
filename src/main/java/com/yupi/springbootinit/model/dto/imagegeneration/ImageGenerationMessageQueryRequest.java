package com.yupi.springbootinit.model.dto.imagegeneration;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class ImageGenerationMessageQueryRequest extends PageRequest implements Serializable {

    private Long userId;

    private String conversationId;

    private String role;

    private String status;

    private String aspectRatio;

    private String providerCode;

    private String modelCode;

    private String imageSize;

    private String taskId;

    private String searchText;

    /**
     * Only query pending tasks that have waited longer than the configured threshold.
     */
    private Boolean timeoutOnly;

    private Date startTime;

    private Date endTime;

    private static final long serialVersionUID = 1L;
}
