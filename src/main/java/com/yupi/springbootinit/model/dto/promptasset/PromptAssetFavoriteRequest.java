package com.yupi.springbootinit.model.dto.promptasset;

import java.io.Serializable;
import lombok.Data;

@Data
public class PromptAssetFavoriteRequest implements Serializable {

    /**
     * Compatible id field. For cancel, this may be either favorite record id or prompt asset id.
     */
    private Long id;

    /**
     * Current user id from frontend is accepted for compatibility, but backend uses login user for security.
     */
    private Long userId;

    private Long promptAssetId;

    private static final long serialVersionUID = 1L;
}
