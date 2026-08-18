package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogBookFavoriteRequest implements Serializable {

    private Long id;

    private Long bookId;

    private static final long serialVersionUID = 1L;
}
