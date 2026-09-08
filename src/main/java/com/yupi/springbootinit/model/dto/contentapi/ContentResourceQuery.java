package com.yupi.springbootinit.model.dto.contentapi;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import java.util.List;
import lombok.Data;
import lombok.EqualsAndHashCode;

/** Common query fields accepted by the unified external content API. */
@Data
@EqualsAndHashCode(callSuper = true)
public class ContentResourceQuery extends PageRequest implements Serializable {
    private String keyword;
    private String status;
    private Long categoryId;
    private Long bookId;
    private Long chapterId;
    private Long tagId;
    private List<Long> tagIdList;
    private Integer memberOnly;
    private String assetType;
    private static final long serialVersionUID = 1L;
}
