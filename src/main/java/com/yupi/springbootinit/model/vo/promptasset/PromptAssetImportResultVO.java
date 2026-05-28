package com.yupi.springbootinit.model.vo.promptasset;

import java.io.Serializable;
import lombok.Data;

@Data
public class PromptAssetImportResultVO implements Serializable {

    private Long batchId;

    private Boolean dryRun;

    private String status;

    private Integer totalCount;

    private Integer insertCount;

    private Integer updateCount;

    private Integer skipCount;

    private Integer errorCount;

    private String summary;

    private static final long serialVersionUID = 1L;
}
