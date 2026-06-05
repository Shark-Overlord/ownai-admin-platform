package com.yupi.springbootinit.model.dto.promptasset;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class PromptAssetAiTagRunRequest implements Serializable {

    private List<Long> idList;

    private String assetType;

    private Long categoryId;

    private Integer status;

    private String searchText;

    private Integer limit;

    private Boolean dryRun;

    private Boolean overwriteExisting;

    private static final long serialVersionUID = 1L;
}
