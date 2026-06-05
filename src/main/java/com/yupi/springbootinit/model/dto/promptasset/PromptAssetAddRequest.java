package com.yupi.springbootinit.model.dto.promptasset;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class PromptAssetAddRequest implements Serializable {

    private String assetType;

    private Long categoryId;

    private String title;

    private String summary;

    private String promptContent;

    private String promptCn;

    private String coverUrl;

    private String previewMediaUrl;

    private Integer memberOnly;

    private Integer status;

    private Integer sort;

    private List<Long> sceneTagIdList;

    private List<Long> assetTagIdList;

    private static final long serialVersionUID = 1L;
}
