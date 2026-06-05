package com.yupi.springbootinit.model.dto.promptasset;

import java.io.Serializable;
import lombok.Data;

@Data
public class PromptAssetFavoriteRequest implements Serializable {

    private Long promptAssetId;

    private static final long serialVersionUID = 1L;
}
