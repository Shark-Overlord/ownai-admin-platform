package com.yupi.springbootinit.model.vo.promptasset;

import java.io.Serializable;
import lombok.Data;

@Data
public class PromptAssetImageSyncResultVO implements Serializable {

    private Integer totalCount;

    private Integer successCount;

    private Integer skipCount;

    private Integer errorCount;

    private static final long serialVersionUID = 1L;
}
