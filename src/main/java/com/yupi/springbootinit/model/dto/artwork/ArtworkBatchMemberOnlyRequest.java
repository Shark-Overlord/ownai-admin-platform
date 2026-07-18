package com.yupi.springbootinit.model.dto.artwork;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

/**
 * Batch update request for artwork membership access.
 */
@Data
public class ArtworkBatchMemberOnlyRequest implements Serializable {

    /**
     * Artwork id list.
     */
    private List<Long> ids;

    /**
     * Whether the artworks are member-only: 0 no, 1 yes.
     */
    private Integer memberOnly;

    private static final long serialVersionUID = 1L;
}
