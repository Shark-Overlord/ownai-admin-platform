package com.yupi.springbootinit.model.dto.artwork;

import java.io.Serializable;
import lombok.Data;

@Data
public class ArtworkFavoriteRequest implements Serializable {

    /**
     * Compatible id field. Frontend favorite list returns artwork id as id.
     */
    private Long id;

    /**
     * Accepted for compatibility, but backend always uses the current login user.
     */
    private Long userId;

    private Long artworkId;

    private static final long serialVersionUID = 1L;
}
