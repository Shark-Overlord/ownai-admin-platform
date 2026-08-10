package com.yupi.springbootinit.model.dto.videobackground;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import java.util.List;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class VideoBackgroundQueryRequest extends PageRequest implements Serializable {
    private String searchText;
    private Long categoryId;
    private List<Long> tagIdList;
    private Integer memberOnly;
    private Integer status;
    private static final long serialVersionUID = 1L;
}
