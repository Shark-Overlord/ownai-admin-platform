package com.yupi.springbootinit.model.dto.promptasset;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

/**
 * Batch review decisions for prompt assets.
 */
@Data
public class PromptAssetBatchReviewRequest implements Serializable {

    private List<Long> approveIds;

    private List<Long> deleteIds;

    private static final long serialVersionUID = 1L;
}
