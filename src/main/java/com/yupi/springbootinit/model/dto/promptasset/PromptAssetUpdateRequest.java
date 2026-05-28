package com.yupi.springbootinit.model.dto.promptasset;

import java.io.Serializable;
import lombok.Data;

@Data
public class PromptAssetUpdateRequest implements Serializable {

    private Long id;

    private String title;

    private Long categoryId;

    private String summary;

    private String promptContent;

    private String promptCn;

    private String coverUrl;

    private String previewMediaUrl;

    private String visualAssetType;

    private String scenario;

    private String visualStyle;

    private String qualityLevel;

    private String selectionStatus;

    private String license;

    private String commercialRisk;

    private Integer memberOnly;

    private Integer status;

    private Integer sort;

    private static final long serialVersionUID = 1L;
}
