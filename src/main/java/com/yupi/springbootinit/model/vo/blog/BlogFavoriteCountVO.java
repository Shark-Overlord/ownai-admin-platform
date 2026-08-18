package com.yupi.springbootinit.model.vo.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogFavoriteCountVO implements Serializable {

    private Long targetId;

    private Integer favoriteCount;

    private static final long serialVersionUID = 1L;
}
