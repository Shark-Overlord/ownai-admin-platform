package com.yupi.springbootinit.model.vo.artwork;

import java.io.Serializable;
import lombok.Data;

/**
 * Frontend artwork list item. Keep list responses lightweight; use the detail API for full data.
 */
@Data
public class ArtworkListVO implements Serializable {

    private Long id;

    private String title;

    private String coverUrl;

    private String videoUrl;

    private Integer imageWidth;

    private Integer imageHeight;

    private Double imageAspectRatio;

    /**
     * Whether the artwork is exclusive to members: 0 = no, 1 = yes.
     */
    private Integer memberOnly;

    /**
     * Whether the current user can access this artwork.
     */
    private Boolean canAccess;

    private Boolean favorited;

    private Integer favoriteCount;

    /**
     * Whether a downloadable source package exists. The real COS URL is never exposed here.
     */
    private Boolean hasSourceCode;

    private static final long serialVersionUID = 1L;
}
