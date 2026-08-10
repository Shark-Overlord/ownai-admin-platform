package com.yupi.springbootinit.model.dto.videobackground;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class VideoBackgroundBatchMemberOnlyRequest implements Serializable {
    private List<Long> ids;
    private Integer memberOnly;
    private static final long serialVersionUID = 1L;
}
