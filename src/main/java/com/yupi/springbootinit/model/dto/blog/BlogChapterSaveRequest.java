package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import lombok.Data;

@Data
public class BlogChapterSaveRequest implements Serializable {

    private Long id;
    private Long bookId;
    private String title;
    private String description;
    private Integer sort;

    private static final long serialVersionUID = 1L;
}
