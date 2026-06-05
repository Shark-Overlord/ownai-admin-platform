package com.yupi.springbootinit.model.vo.promptasset;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class PromptAssetAiTagRunResultVO implements Serializable {

    private Boolean dryRun;

    private Integer totalCount = 0;

    private Integer successCount = 0;

    private Integer updateCount = 0;

    private Integer skipCount = 0;

    private Integer errorCount = 0;

    private List<PromptAssetAiTagItemResultVO> itemList = new ArrayList<>();

    private static final long serialVersionUID = 1L;
}
