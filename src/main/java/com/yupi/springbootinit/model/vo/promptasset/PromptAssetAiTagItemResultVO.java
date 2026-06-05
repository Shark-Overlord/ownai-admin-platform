package com.yupi.springbootinit.model.vo.promptasset;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class PromptAssetAiTagItemResultVO implements Serializable {

    private Long id;

    private String title;

    private Boolean success;

    private Boolean updated;

    private List<String> assetTagList;

    private String errorMessage;

    private static final long serialVersionUID = 1L;
}
