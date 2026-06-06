package com.yupi.springbootinit.model.dto.promptasset;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import java.util.List;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class PromptAssetQueryRequest extends PageRequest implements Serializable {

    private String searchText;

    private String listType;

    private String assetType;

    private Long categoryId;

    private List<Long> tagIdList;

    private List<Long> sceneTagIdList;

    private List<Long> assetTagIdList;

    private String mediaType;

    private String visualAssetType;

    private String selectionStatus;

    private String qualityLevel;

    private String commercialRisk;

    private Integer memberOnly;

    private Integer status;

    private Integer isFeatured;

    private Integer aiTagStatus;

    private String sourceRepoName;

    private static final long serialVersionUID = 1L;
}
