package com.yupi.springbootinit.model.dto.artwork;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class ArtworkQueryRequest extends PageRequest implements Serializable {

    private String searchText;

    private Long categoryId;

    private java.util.List<Long> tagIdList;

    private String tagName;

    private Integer memberOnly;

    private Integer status;

    private static final long serialVersionUID = 1L;
}
