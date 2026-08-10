package com.yupi.springbootinit.model.dto.videobackground;

import java.io.Serializable;
import lombok.Data;

@Data
public class VideoBackgroundFavoriteRequest implements Serializable {

    /**
     * Compatible id field for list records.
     */
    private Long id;

    /**
     * Accepted for compatibility only. The backend always uses the JWT user.
     */
    private Long userId;

    private Long videoBackgroundId;

    private static final long serialVersionUID = 1L;
}
