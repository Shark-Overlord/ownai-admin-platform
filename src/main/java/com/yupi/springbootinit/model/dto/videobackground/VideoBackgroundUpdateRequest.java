package com.yupi.springbootinit.model.dto.videobackground;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class VideoBackgroundUpdateRequest implements Serializable {
    private Long id;
    private String title;
    private String summary;
    private String promptContent;
    private String coverUrl;
    private String previewVideoUrl;
    private String sourceVideoUrl;
    private Long categoryId;
    private Integer memberOnly;
    private Integer status;
    private Integer videoWidth;
    private Integer videoHeight;
    private Long durationMs;
    private Long fileSize;
    private String videoFormat;
    private Integer sort;
    private List<Long> tagIdList;
    private static final long serialVersionUID = 1L;
}
